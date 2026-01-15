/**
 * Token types for the Clausewitz script tokenizer
 */
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

/**
 * Represents a single token from the tokenizer
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Result of tokenizing an input string
 */
export interface TokenizerResult {
  success: boolean;
  tokens?: Token[];
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

/**
 * Tokenizer class for Clausewitz script files
 */
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
