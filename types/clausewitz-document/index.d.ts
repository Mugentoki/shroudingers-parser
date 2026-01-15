import type { Document, Property, Value, Operator } from '../parser';

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

/**
 * Helper class for easy value access and modification
 */
export declare class ClausewitzDocument {
  constructor(doc: Document);

  /**
   * Get first value by key path (e.g., "static_galaxy_scenario.name")
   */
  get(path: string): Value | undefined;

  /**
   * Get ALL values for a key (handles duplicates like multiple "system" entries)
   */
  getAll(path: string): Value[];

  /**
   * Set first matching value by key path
   */
  set(path: string, value: Value): boolean;

  /**
   * Add a new property at the given path (useful for duplicate keys)
   */
  add(path: string, key: string, value: Value, operator?: Operator): boolean;

  /**
   * Remove all properties with matching key at the given path
   */
  removeAll(path: string, key: string): number;

  /**
   * Get the raw document
   */
  getDocument(): Document;

  /**
   * Get all properties at the root level
   */
  getProperties(): Property[];

  /**
   * Convert the document back to Clausewitz script format
   * @param options - Formatting options
   */
  stringify(options?: StringifyOptions): string;
}

/**
 * Convert an AST Document or ClausewitzDocument back to Clausewitz script format
 * @param doc - The document to stringify (Document or ClausewitzDocument)
 * @param options - Formatting options
 * @returns The formatted Clausewitz script string
 */
export declare function stringify(doc: Document | ClausewitzDocument, options?: StringifyOptions): string;
