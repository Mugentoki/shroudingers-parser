import type { Token } from '../tokenizer';

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

/**
 * Parser class for Clausewitz script tokens
 */
export declare class Parser {
  constructor(tokens: Token[]);
  
  /**
   * Parse tokens into an AST Document
   */
  parse(): ParseResult;
}

/**
 * Parse a Clausewitz script string into an AST
 * @param input - The input string to parse
 * @returns A ParseResult object
 */
export declare function parse(input: string): ParseResult;
