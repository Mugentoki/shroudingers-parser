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
export declare class Tokenizer {
  constructor(input: string);
  
  /**
   * Tokenize the input string
   */
  tokenize(): TokenizerResult;
}

/**
 * Tokenize a Clausewitz script string
 * @param input - The input string to tokenize
 * @returns A TokenizerResult object
 */
export declare function tokenize(input: string): TokenizerResult;

/**
 * Tokenize and filter out comments
 * @param input - The input string to tokenize
 * @returns A TokenizerResult object with comments removed
 */
export declare function tokenizeWithoutComments(input: string): TokenizerResult;
