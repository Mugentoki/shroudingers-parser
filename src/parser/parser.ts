import { Token, TokenType, tokenize } from '../tokenizer';

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

/**
 * Parser class for Clausewitz script tokens
 */
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
// Convenience Functions
// ============================================================================

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
