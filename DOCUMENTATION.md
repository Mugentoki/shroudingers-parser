# Documentation

Detailed documentation for shroudingers-parser.

## Table of Contents

- [Reading Scripts](#reading-scripts)
  - [Tokenizing](#tokenizing)
  - [Parsing](#parsing)
  - [Token Types](#token-types)
  - [AST Structure](#ast-structure)
- [Navigating Documents](#navigating-documents)
  - [Creating a ClausewitzDocument](#creating-a-clausewitzdocument)
  - [Getting Values](#getting-values)
  - [Path Syntax](#path-syntax)
- [Modifying Documents](#modifying-documents)
  - [Setting Values](#setting-values)
  - [Adding Properties](#adding-properties)
  - [Removing Properties](#removing-properties)
- [Writing Scripts](#writing-scripts)
  - [Stringify Options](#stringify-options)
  - [Formatting Behavior](#formatting-behavior)
- [Error Handling](#error-handling)
- [Types Reference](#types-reference)

---

## Reading Scripts

### Tokenizing

For low-level access to individual tokens, use the tokenizer directly:

```typescript
import { tokenize, tokenizeWithoutComments, TokenType } from 'shroudingers-parser';

const input = 'name = "Test" # comment\npriority = 5';

// Tokenize with comments included
const result = tokenize(input);

if (result.success) {
  for (const token of result.tokens) {
    console.log(`${token.type}: "${token.value}" at ${token.line}:${token.column}`);
  }
}

// Tokenize with comments filtered out
const resultNoComments = tokenizeWithoutComments(input);
```

### Parsing

Parse a Clausewitz script string into an Abstract Syntax Tree:

```typescript
import { parse } from 'shroudingers-parser';

const input = `
config = {
  name = "Example"
  value = 42
  enabled = yes
}
`;

const result = parse(input);

if (result.success) {
  console.log(result.document); // AST root node
} else {
  console.error(result.error);
}
```

### Token Types

| Token Type | Description | Example |
|------------|-------------|---------|
| `Identifier` | Variable names, keywords | `name`, `position`, `@my_var` |
| `String` | Quoted strings | `"My Galaxy"` |
| `Number` | Integers and floats | `42`, `-7.5` |
| `Boolean` | Boolean values | `yes`, `no` |
| `Equals` | Assignment operator | `=` |
| `LessThan` | Comparison operator | `<` |
| `GreaterThan` | Comparison operator | `>` |
| `LessThanOrEqual` | Comparison operator | `<=` |
| `GreaterThanOrEqual` | Comparison operator | `>=` |
| `NotEqual` | Comparison operator | `!=`, `<>` |
| `LeftBrace` | Block open | `{` |
| `RightBrace` | Block close | `}` |
| `Comment` | Comment text | `# this is a comment` |
| `EOF` | End of file | — |

### AST Structure

The parser produces the following node types:

**Document** — Root node containing all top-level properties
```typescript
{
  type: 'Document',
  properties: Property[]
}
```

**Property** — A key-operator-value triplet
```typescript
{
  type: 'Property',
  key: string,
  operator: '=' | '<' | '>' | '<=' | '>=' | '!=' | '<>',
  value: Value,
  line?: number,
  column?: number
}
```

**Block** — Nested block with properties (preserves order and allows duplicates)
```typescript
{
  type: 'Block',
  properties: Property[]
}
```

**ValueArray** — Array of primitive values
```typescript
{
  type: 'ValueArray',
  values: PrimitiveValue[]
}
```

**PrimitiveValue** — `string | number | boolean`

---

## Navigating Documents

### Creating a ClausewitzDocument

Wrap a parsed document for easier manipulation:

```typescript
import { parse, ClausewitzDocument } from 'shroudingers-parser';

const result = parse(input);

if (result.success) {
  const doc = new ClausewitzDocument(result.document);
}
```

### Getting Values

**`get(path)`** — Get the first value at a path:

```typescript
const name = doc.get('config.name');           // "Example"
const value = doc.get('config.value');         // 42
const nested = doc.get('config.settings.x');   // Access nested blocks
```

**`getAll(path)`** — Get all values for duplicate keys:

```typescript
const input = `
scenario = {
  system = { id = "0" }
  system = { id = "1" }
  system = { id = "2" }
}
`;

const doc = new ClausewitzDocument(parse(input).document);
const systems = doc.getAll('scenario.system');
console.log(systems.length); // 3
```

**`getRootProperties()`** — Get all top-level properties:

```typescript
const properties = doc.getRootProperties();
```

**`getDocument()`** — Get the raw Document AST:

```typescript
const rawDocument = doc.getDocument();
```

### Path Syntax

Paths use dot notation to navigate nested blocks:

- `config` — Top-level property
- `config.name` — Property inside a block
- `config.settings.value` — Deeply nested property

---

## Modifying Documents

### Setting Values

**`set(path, value)`** — Update the first matching property:

```typescript
doc.set('config.name', 'New Name');
doc.set('config.value', 100);
doc.set('config.enabled', false);
```

### Adding Properties

**`add(parentPath, key, value, operator?)`** — Add a new property to a block:

```typescript
// Add a primitive value
doc.add('config', 'new_key', 'new_value');

// Add with a different operator
doc.add('config', 'threshold', 50, '>');

// Add a nested block
doc.add('config', 'settings', {
  type: 'Block',
  properties: [
    { type: 'Property', key: 'x', operator: '=', value: 10 },
    { type: 'Property', key: 'y', operator: '=', value: 20 }
  ]
});
```

### Removing Properties

**`removeAll(parentPath, key)`** — Remove all properties with a matching key:

```typescript
doc.removeAll('config', 'deprecated_key');
```

---

## Writing Scripts

Convert a document back to Clausewitz script format:

```typescript
import { stringify, ClausewitzDocument } from 'shroudingers-parser';

// Using the standalone function
const output = stringify(result.document);

// Or using ClausewitzDocument
const doc = new ClausewitzDocument(result.document);
const output = doc.stringify();
```

### Stringify Options

```typescript
stringify(document, {
  indent: '\t',              // Indentation string (default: '\t')
  spaces: 2,                 // Use spaces instead (overrides indent)
  spaceBetweenTopLevel: true // Add blank lines between top-level properties
});

// Or with ClausewitzDocument
doc.stringify({ spaces: 4 });
```

### Formatting Behavior

- **Identifiers**: Output without quotes when valid
- **Strings**: Automatically quoted if containing spaces or special characters
- **Booleans**: Converted to `yes`/`no`
- **Small blocks**: Inline when ≤3 primitive properties: `{ x = 10 y = 20 }`
- **Large blocks**: Multi-line with indentation
- **Value arrays**: Always inline: `{ 1 2 3 4 5 }`

---

## Error Handling

Both tokenizer and parser return result objects with error information:

```typescript
const result = parse(input);

if (!result.success) {
  console.error(`Error: ${result.error}`);
  console.error(`Location: line ${result.errorLine}, column ${result.errorColumn}`);
}
```

**TokenizerResult**:
```typescript
{
  success: boolean;
  tokens?: Token[];
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}
```

**ParseResult**:
```typescript
{
  success: boolean;
  document?: Document;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}
```

---

## Types Reference

### Tokenizer Types

```typescript
enum TokenType {
  Identifier,
  String,
  Number,
  Boolean,
  Equals,
  LeftBrace,
  RightBrace,
  LessThan,
  GreaterThan,
  LessThanOrEqual,
  GreaterThanOrEqual,
  NotEqual,
  Comment,
  EOF
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

interface TokenizerResult {
  success: boolean;
  tokens?: Token[];
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}
```

### Parser Types

```typescript
type Operator = '=' | '<' | '>' | '<=' | '>=' | '!=' | '<>';
type PrimitiveValue = string | number | boolean;
type Value = PrimitiveValue | Block | ValueArray;

interface BaseNode {
  type: string;
  line?: number;
  column?: number;
}

interface Property extends BaseNode {
  type: 'Property';
  key: string;
  operator: Operator;
  value: Value;
}

interface Block extends BaseNode {
  type: 'Block';
  properties: Property[];
}

interface ValueArray extends BaseNode {
  type: 'ValueArray';
  values: PrimitiveValue[];
}

interface Document extends BaseNode {
  type: 'Document';
  properties: Property[];
}

interface ParseResult {
  success: boolean;
  document?: Document;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}
```

### Stringify Types

```typescript
interface StringifyOptions {
  indent?: string;
  spaces?: number;
  spaceBetweenTopLevel?: boolean;
}
```
