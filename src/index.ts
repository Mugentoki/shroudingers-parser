/**
 * A tokenizer and parser for Clausewitz scripting files (Stellaris, EU4, CK3, etc.)
 */

// ============================================================================
// Token Types
// ============================================================================

export enum TokenType {
  // Literals
  Identifier = 'Identifier',
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',

  // Operators
  Equals = 'Equals',
  LeftBrace = 'LeftBrace',
  RightBrace = 'RightBrace',

  // Comparison operators (used in triggers/conditions)
  LessThan = 'LessThan',
  GreaterThan = 'GreaterThan',
  LessThanOrEqual = 'LessThanOrEqual',
  GreaterThanOrEqual = 'GreaterThanOrEqual',
  NotEqual = 'NotEqual',

  // Special
  Comment = 'Comment',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export interface TokenizerResult {
  success: boolean;
  tokens?: Token[];
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

// ============================================================================
// Tokenizer
// ============================================================================

export class Tokenizer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the input string
   */
  tokenize(): TokenizerResult {
    try {
      while (!this.isAtEnd()) {
        this.skipWhitespace();
        if (this.isAtEnd()) break;

        const token = this.scanToken();
        if (token) {
          this.tokens.push(token);
        }
      }

      // Add EOF token
      this.tokens.push({
        type: TokenType.EOF,
        value: '',
        line: this.line,
        column: this.column,
      });

      return {
        success: true,
        tokens: this.tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown tokenizer error',
        errorLine: this.line,
        errorColumn: this.column,
      };
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  private advance(): string {
    const char = this.input[this.position];
    this.position++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private scanToken(): Token | null {
    const startLine = this.line;
    const startColumn = this.column;
    const char = this.peek();

    // Comments
    if (char === '#') {
      return this.scanComment(startLine, startColumn);
    }

    // String literals
    if (char === '"') {
      return this.scanString(startLine, startColumn);
    }

    // Numbers (including negative)
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peekNext()))) {
      return this.scanNumber(startLine, startColumn);
    }

    // Operators
    if (char === '=') {
      this.advance();
      return { type: TokenType.Equals, value: '=', line: startLine, column: startColumn };
    }

    if (char === '{') {
      this.advance();
      return { type: TokenType.LeftBrace, value: '{', line: startLine, column: startColumn };
    }

    if (char === '}') {
      this.advance();
      return { type: TokenType.RightBrace, value: '}', line: startLine, column: startColumn };
    }

    // Comparison operators
    if (char === '<') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        return { type: TokenType.LessThanOrEqual, value: '<=', line: startLine, column: startColumn };
      }
      if (this.peek() === '>') {
        this.advance();
        return { type: TokenType.NotEqual, value: '<>', line: startLine, column: startColumn };
      }
      return { type: TokenType.LessThan, value: '<', line: startLine, column: startColumn };
    }

    if (char === '>') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        return { type: TokenType.GreaterThanOrEqual, value: '>=', line: startLine, column: startColumn };
      }
      return { type: TokenType.GreaterThan, value: '>', line: startLine, column: startColumn };
    }

    if (char === '!') {
      if (this.peekNext() === '=') {
        this.advance();
        this.advance();
        return { type: TokenType.NotEqual, value: '!=', line: startLine, column: startColumn };
      }
    }

    // Identifiers (including keywords like yes/no)
    if (this.isIdentifierStart(char)) {
      return this.scanIdentifier(startLine, startColumn);
    }

    throw new Error(`Unexpected character '${char}' at line ${startLine}, column ${startColumn}`);
  }

  private scanComment(startLine: number, startColumn: number): Token {
    this.advance(); // consume '#'
    let value = '';

    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }

    return {
      type: TokenType.Comment,
      value: value.trim(),
      line: startLine,
      column: startColumn,
    };
  }

  private scanString(startLine: number, startColumn: number): Token {
    this.advance(); // consume opening quote
    let value = '';

    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\n') {
        // Allow multi-line strings but track them
        value += this.advance();
      } else if (this.peek() === '\\' && this.peekNext() === '"') {
        // Handle escaped quotes
        this.advance(); // consume backslash
        value += this.advance(); // add the quote
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string starting at line ${startLine}, column ${startColumn}`);
    }

    this.advance(); // consume closing quote

    return {
      type: TokenType.String,
      value,
      line: startLine,
      column: startColumn,
    };
  }

  private scanNumber(startLine: number, startColumn: number): Token {
    let value = '';

    // Handle negative sign
    if (this.peek() === '-') {
      value += this.advance();
    }

    // Integer part
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    return {
      type: TokenType.Number,
      value,
      line: startLine,
      column: startColumn,
    };
  }

  private scanIdentifier(startLine: number, startColumn: number): Token {
    let value = '';

    while (!this.isAtEnd() && this.isIdentifierChar(this.peek())) {
      value += this.advance();
    }

    // Check for boolean keywords
    if (value === 'yes' || value === 'no') {
      return {
        type: TokenType.Boolean,
        value,
        line: startLine,
        column: startColumn,
      };
    }

    return {
      type: TokenType.Identifier,
      value,
      line: startLine,
      column: startColumn,
    };
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isIdentifierStart(char: string): boolean {
    return this.isAlpha(char) || char === '_' || char === '@';
  }

  private isIdentifierChar(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char) || char === '_' || char === ':' || char === '.' || char === '[' || char === ']' || char === '@';
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Tokenize a Clausewitz script string
 * @param input - The input string to tokenize
 * @returns A TokenizerResult object
 */
export function tokenize(input: string): TokenizerResult {
  if (!input || input.trim().length === 0) {
    return {
      success: false,
      error: 'Input cannot be empty',
    };
  }

  const tokenizer = new Tokenizer(input);
  return tokenizer.tokenize();
}

/**
 * Tokenize and filter out comments
 * @param input - The input string to tokenize
 * @returns A TokenizerResult object with comments removed
 */
export function tokenizeWithoutComments(input: string): TokenizerResult {
  const result = tokenize(input);
  if (result.success && result.tokens) {
    result.tokens = result.tokens.filter(t => t.type !== TokenType.Comment);
  }
  return result;
}

// ============================================================================
// AST Types
// ============================================================================

/**
 * Base node type for AST
 */
export interface BaseNode {
  type: string;
  line?: number;
  column?: number;
}

/**
 * Primitive value types
 */
export type PrimitiveValue = string | number | boolean;

/**
 * Operator types used in properties
 */
export type Operator = '=' | '<' | '>' | '<=' | '>=' | '!=' | '<>';

/**
 * A single key-value property
 */
export interface Property extends BaseNode {
  type: 'Property';
  key: string;
  operator: Operator;
  value: Value;
}

/**
 * A block containing properties (preserves order and allows duplicates)
 */
export interface Block extends BaseNode {
  type: 'Block';
  properties: Property[];
}

/**
 * An array of values (e.g., `extra_crisis_strength = { 5.5 6 6.5 }`)
 */
export interface ValueArray extends BaseNode {
  type: 'ValueArray';
  values: PrimitiveValue[];
}

/**
 * All possible value types
 */
export type Value = PrimitiveValue | Block | ValueArray;

/**
 * Root document node
 */
export interface Document extends BaseNode {
  type: 'Document';
  properties: Property[];
}

/**
 * Parse result type
 */
export interface ParseResult {
  success: boolean;
  document?: Document;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

// ============================================================================
// Parser
// ============================================================================

export class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter(t => t.type !== TokenType.Comment);
  }

  /**
   * Parse tokens into an AST Document
   */
  parse(): ParseResult {
    try {
      const properties = this.parseProperties();
      
      const document: Document = {
        type: 'Document',
        properties,
      };

      return {
        success: true,
        document,
      };
    } catch (error) {
      const token = this.peek();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parser error',
        errorLine: token?.line,
        errorColumn: token?.column,
      };
    }
  }

  private parseProperties(): Property[] {
    const properties: Property[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.RightBrace)) {
      const property = this.parseProperty();
      if (property) {
        properties.push(property);
      }
    }

    return properties;
  }

  private parseProperty(): Property | null {
    // Expect an identifier as the key
    if (!this.check(TokenType.Identifier)) {
      // Skip unexpected tokens
      if (!this.isAtEnd()) {
        this.advance();
      }
      return null;
    }

    const keyToken = this.advance();
    const key = keyToken.value;
    const line = keyToken.line;
    const column = keyToken.column;

    // Expect an operator
    const operator = this.parseOperator();
    if (!operator) {
      throw new Error(`Expected operator after '${key}' at line ${line}, column ${column}`);
    }

    // Parse the value
    const value = this.parseValue();

    return {
      type: 'Property',
      key,
      operator,
      value,
      line,
      column,
    };
  }

  private parseOperator(): Operator | null {
    if (this.check(TokenType.Equals)) {
      this.advance();
      return '=';
    }
    if (this.check(TokenType.LessThan)) {
      this.advance();
      return '<';
    }
    if (this.check(TokenType.GreaterThan)) {
      this.advance();
      return '>';
    }
    if (this.check(TokenType.LessThanOrEqual)) {
      this.advance();
      return '<=';
    }
    if (this.check(TokenType.GreaterThanOrEqual)) {
      this.advance();
      return '>=';
    }
    if (this.check(TokenType.NotEqual)) {
      this.advance();
      const token = this.tokens[this.position - 1];
      return token.value as Operator;
    }
    return null;
  }

  private parseValue(): Value {
    const token = this.peek();

    // Block or ValueArray
    if (this.check(TokenType.LeftBrace)) {
      return this.parseBlockOrArray();
    }

    // String
    if (this.check(TokenType.String)) {
      this.advance();
      return token.value;
    }

    // Number
    if (this.check(TokenType.Number)) {
      this.advance();
      const num = parseFloat(token.value);
      return Number.isInteger(num) ? parseInt(token.value, 10) : num;
    }

    // Boolean
    if (this.check(TokenType.Boolean)) {
      this.advance();
      return token.value === 'yes';
    }

    // Identifier (used as a value, like `initializer = dyson_sphere_init_01`)
    if (this.check(TokenType.Identifier)) {
      this.advance();
      return token.value;
    }

    throw new Error(`Unexpected token '${token.value}' at line ${token.line}, column ${token.column}`);
  }

  private parseBlockOrArray(): Block | ValueArray {
    const startToken = this.advance(); // consume '{'
    const line = startToken.line;
    const column = startToken.column;

    // Check if this is a value array (just values, no key=value pairs)
    // Look ahead to determine the structure
    if (this.isValueArray()) {
      const values = this.parseValueArray();
      
      if (!this.check(TokenType.RightBrace)) {
        throw new Error(`Expected '}' at line ${this.peek().line}, column ${this.peek().column}`);
      }
      this.advance(); // consume '}'

      return {
        type: 'ValueArray',
        values,
        line,
        column,
      };
    }

    // It's a block with properties
    const properties = this.parseProperties();

    if (!this.check(TokenType.RightBrace)) {
      throw new Error(`Expected '}' at line ${this.peek().line}, column ${this.peek().column}`);
    }
    this.advance(); // consume '}'

    return {
      type: 'Block',
      properties,
      line,
      column,
    };
  }

  private isValueArray(): boolean {
    // Empty block is treated as a block, not an array
    if (this.check(TokenType.RightBrace)) {
      return false;
    }

    // Look at the first two tokens to determine if this is a value array
    // Value arrays have values without operators (e.g., { 5.5 6 6.5 })
    // Blocks have key = value pairs

    const first = this.peek();
    
    // If first token is a literal value (number, string, boolean) followed by 
    // another value or closing brace, it's a value array
    if (first.type === TokenType.Number || first.type === TokenType.Boolean) {
      const next = this.peekNext();
      // If next is not an operator, it's a value array
      if (next && !this.isOperatorType(next.type)) {
        return true;
      }
    }

    // If first is an identifier followed by an operator, it's a block
    if (first.type === TokenType.Identifier) {
      const next = this.peekNext();
      if (next && this.isOperatorType(next.type)) {
        return false;
      }
      // Identifier not followed by operator could be a value array of identifiers
      // But this is rare in Clausewitz, so we treat it as a block by default
    }

    return false;
  }

  private isOperatorType(type: TokenType): boolean {
    return type === TokenType.Equals ||
           type === TokenType.LessThan ||
           type === TokenType.GreaterThan ||
           type === TokenType.LessThanOrEqual ||
           type === TokenType.GreaterThanOrEqual ||
           type === TokenType.NotEqual;
  }

  private parseValueArray(): PrimitiveValue[] {
    const values: PrimitiveValue[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.RightBrace)) {
      const token = this.peek();

      if (this.check(TokenType.Number)) {
        this.advance();
        const num = parseFloat(token.value);
        values.push(Number.isInteger(num) ? parseInt(token.value, 10) : num);
      } else if (this.check(TokenType.String)) {
        this.advance();
        values.push(token.value);
      } else if (this.check(TokenType.Boolean)) {
        this.advance();
        values.push(token.value === 'yes');
      } else if (this.check(TokenType.Identifier)) {
        this.advance();
        values.push(token.value);
      } else {
        break;
      }
    }

    return values;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private peekNext(): Token | null {
    if (this.position + 1 >= this.tokens.length) {
      return null;
    }
    return this.tokens[this.position + 1];
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.tokens[this.position - 1];
  }
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
// Stringify Options
// ============================================================================

export interface StringifyOptions {
  /** Indentation string (default: '\t') */
  indent?: string;
  /** Use spaces instead of tabs (overrides indent) */
  spaces?: number;
  /** Add newlines between top-level properties */
  spaceBetweenTopLevel?: boolean;
}

// ============================================================================
// Stringify Function
// ============================================================================

/**
 * Convert an AST Document back to Clausewitz script format
 * @param doc - The document to stringify
 * @param options - Formatting options
 * @returns The formatted Clausewitz script string
 */
export function stringify(doc: Document, options: StringifyOptions = {}): string {
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
  
  for (let i = 0; i < doc.properties.length; i++) {
    const prop = doc.properties[i];
    const line = `${prop.key} ${prop.operator} ${stringifyValue(prop.value, 0)}`;
    lines.push(line);
    
    // Add blank line between top-level properties if option is set
    if (spaceBetweenTopLevel && i < doc.properties.length - 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Parse a Clausewitz script string into an AST
 * @param input - The input string to parse
 * @returns A ParseResult object
 */
export function parse(input: string): ParseResult {
  if (!input || input.trim().length === 0) {
    return {
      success: false,
      error: 'Input cannot be empty',
    };
  }

  const tokenizerResult = tokenize(input);
  if (!tokenizerResult.success || !tokenizerResult.tokens) {
    return {
      success: false,
      error: tokenizerResult.error,
      errorLine: tokenizerResult.errorLine,
      errorColumn: tokenizerResult.errorColumn,
    };
  }

  const parser = new Parser(tokenizerResult.tokens);
  return parser.parse();
}