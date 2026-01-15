import { Document, Property, Value, Operator } from '../parser';

// ============================================================================
// Stringify Options
// ============================================================================

/**
 * Options for stringifying a document
 */
export interface StringifyOptions {
  /** Indentation string (default: '\t') */
  indent?: string;
  /** Use spaces instead of tabs (overrides indent) */
  spaces?: number;
  /** Add newlines between top-level properties */
  spaceBetweenTopLevel?: boolean;
}

// ============================================================================
// ClausewitzDocument Helper
// ============================================================================

/**
 * Helper class for easy value access and modification
 */
export class ClausewitzDocument {
  private root: Document;

  constructor(doc: Document) {
    this.root = doc;
  }

  /**
   * Get first value by key path (e.g., "static_galaxy_scenario.name")
   */
  get(path: string): Value | undefined {
    const keys = path.split('.');
    let current: Property[] = this.root.properties;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const prop = current.find(p => p.key === key);
      
      if (!prop) return undefined;
      
      if (i === keys.length - 1) {
        return prop.value;
      }
      
      if (typeof prop.value === 'object' && 'type' in prop.value && prop.value.type === 'Block') {
        current = prop.value.properties;
      } else {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Get ALL values for a key (handles duplicates like multiple "system" entries)
   */
  getAll(path: string): Value[] {
    const keys = path.split('.');
    let current: Property[] = this.root.properties;

    for (let i = 0; i < keys.length - 1; i++) {
      const prop = current.find(p => p.key === keys[i]);
      if (!prop || typeof prop.value !== 'object' || !('type' in prop.value) || prop.value.type !== 'Block') {
        return [];
      }
      current = prop.value.properties;
    }

    const lastKey = keys[keys.length - 1];
    return current.filter(p => p.key === lastKey).map(p => p.value);
  }

  /**
   * Set first matching value by key path
   */
  set(path: string, value: Value): boolean {
    const keys = path.split('.');
    let current: Property[] = this.root.properties;

    for (let i = 0; i < keys.length - 1; i++) {
      const prop = current.find(p => p.key === keys[i]);
      if (!prop || typeof prop.value !== 'object' || !('type' in prop.value) || prop.value.type !== 'Block') {
        return false;
      }
      current = prop.value.properties;
    }

    const lastKey = keys[keys.length - 1];
    const prop = current.find(p => p.key === lastKey);
    
    if (prop) {
      prop.value = value;
      return true;
    }
    return false;
  }

  /**
   * Add a new property at the given path (useful for duplicate keys)
   */
  add(path: string, key: string, value: Value, operator: Operator = '='): boolean {
    let target: Property[];
    
    if (path === '') {
      target = this.root.properties;
    } else {
      const block = this.get(path);
      if (!block || typeof block !== 'object' || !('type' in block) || block.type !== 'Block') {
        return false;
      }
      target = block.properties;
    }

    target.push({
      type: 'Property',
      key,
      operator,
      value,
    });
    return true;
  }

  /**
   * Remove all properties with matching key at the given path
   */
  removeAll(path: string, key: string): number {
    let target: Property[];
    
    if (path === '') {
      target = this.root.properties;
    } else {
      const block = this.get(path);
      if (!block || typeof block !== 'object' || !('type' in block) || block.type !== 'Block') {
        return 0;
      }
      target = block.properties;
    }

    const before = target.length;
    const remaining = target.filter(p => p.key !== key);
    
    // Mutate in place
    target.length = 0;
    target.push(...remaining);
    
    return before - remaining.length;
  }

  /**
   * Get the raw document
   */
  getDocument(): Document {
    return this.root;
  }

  /**
   * Get all properties at the root level
   */
  getProperties(): Property[] {
    return this.root.properties;
  }

  /**
   * Convert the document back to Clausewitz script format
   * @param options - Formatting options
   */
  stringify(options: StringifyOptions = {}): string {
    return stringify(this.root, options);
  }
}

// ============================================================================
// Stringify Function
// ============================================================================

/**
 * Convert an AST Document or ClausewitzDocument back to Clausewitz script format
 * @param doc - The document to stringify (Document or ClausewitzDocument)
 * @param options - Formatting options
 * @returns The formatted Clausewitz script string
 */
export function stringify(doc: Document | ClausewitzDocument, options: StringifyOptions = {}): string {
  // Handle ClausewitzDocument by extracting the raw document
  const rawDoc: Document = doc instanceof ClausewitzDocument ? doc.getDocument() : doc;
  
  // Validate the document
  if (!rawDoc || !rawDoc.properties) {
    throw new Error('Invalid document: expected a Document with properties array');
  }

  const indent = options.spaces !== undefined 
    ? ' '.repeat(options.spaces) 
    : (options.indent ?? '\t');
  
  const spaceBetweenTopLevel = options.spaceBetweenTopLevel ?? false;

  function stringifyValue(value: Value, depth: number): string {
    // Primitive values
    if (typeof value === 'string') {
      // Check if it looks like an identifier (no spaces, no special chars)
      if (/^[a-zA-Z_@][a-zA-Z0-9_:.\[\]@]*$/.test(value)) {
        return value;
      }
      // Otherwise quote it
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    
    if (typeof value === 'number') {
      return String(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'yes' : 'no';
    }

    // ValueArray
    if (value.type === 'ValueArray') {
      const values = value.values.map(v => stringifyValue(v, depth)).join(' ');
      return `{ ${values} }`;
    }

    // Block
    if (value.type === 'Block') {
      if (value.properties.length === 0) {
        return '{ }';
      }

      // Check if block can be inline (few short properties)
      const canBeInline = value.properties.length <= 3 && 
        value.properties.every(p => isPrimitiveValue(p.value));
      
      if (canBeInline) {
        const props = value.properties
          .map(p => `${p.key} ${p.operator} ${stringifyValue(p.value, depth)}`)
          .join(' ');
        return `{ ${props} }`;
      }

      // Multi-line block
      const innerIndent = indent.repeat(depth + 1);
      const closingIndent = indent.repeat(depth);
      
      const props = value.properties
        .map(p => `${innerIndent}${p.key} ${p.operator} ${stringifyValue(p.value, depth + 1)}`)
        .join('\n');
      
      return `{\n${props}\n${closingIndent}}`;
    }

    return String(value);
  }

  function isPrimitiveValue(value: Value): boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  const lines: string[] = [];
  
  for (let i = 0; i < rawDoc.properties.length; i++) {
    const prop = rawDoc.properties[i];
    const line = `${prop.key} ${prop.operator} ${stringifyValue(prop.value, 0)}`;
    lines.push(line);
    
    // Add blank line between top-level properties if option is set
    if (spaceBetweenTopLevel && i < rawDoc.properties.length - 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
}
