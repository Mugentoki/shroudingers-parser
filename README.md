# shroudingers-parser

A parser for clausewitz scripting files

## Installation

```bash
npm install shroudingers-parser
```

## Usage

### Parsing

The main way to use the library is through the `parse` function and `ClausewitzDocument` helper:

```typescript
import { parse, ClausewitzDocument, Block } from 'shroudingers-parser';

const input = `
static_galaxy_scenario = {
  name = "My Galaxy"
  priority = 0
  default = yes
  num_empires = { min = 3 max = 5 }
  system = { id = "0" position = { x = 0 y = 0 } }
  system = { id = "1" position = { x = 10 y = 5 } }
  add_hyperlane = { from = "0" to = "1" }
}
`;

const result = parse(input);

if (result.success) {
  const doc = new ClausewitzDocument(result.document);
  
  // Get values by path
  console.log(doc.get('static_galaxy_scenario.name')); // "My Galaxy"
  console.log(doc.get('static_galaxy_scenario.priority')); // 0
  console.log(doc.get('static_galaxy_scenario.default')); // true
  
  // Get all values for duplicate keys
  const systems = doc.getAll('static_galaxy_scenario.system');
  console.log(`Found ${systems.length} systems`); // 2
  
  // Modify values
  doc.set('static_galaxy_scenario.priority', 10);
  
  // Add new properties
  doc.add('static_galaxy_scenario', 'add_hyperlane', {
    type: 'Block',
    properties: [
      { type: 'Property', key: 'from', operator: '=', value: '1' },
      { type: 'Property', key: 'to', operator: '=', value: '2' },
    ]
  });
  
  // Remove properties
  doc.removeAll('static_galaxy_scenario', 'add_hyperlane');
} else {
  console.error('Parse error:', result.error);
}
```

### Tokenizing

For lower-level access, you can use the tokenizer directly:

```typescript
import { tokenize, tokenizeWithoutComments, TokenType } from 'shroudingers-parser';

const input = 'name = "Test" # comment\npriority = 5';

// Tokenize with comments
const result = tokenize(input);

if (result.success) {
  for (const token of result.tokens) {
    console.log(`${token.type}: "${token.value}" at ${token.line}:${token.column}`);
  }
}

// Tokenize without comments
const resultNoComments = tokenizeWithoutComments(input);
```

### Token Types

- `Identifier` - Variable names, keywords (e.g., `name`, `position`)
- `String` - Quoted strings (e.g., `"My Galaxy"`)
- `Number` - Integers and floats (e.g., `42`, `-7.5`)
- `Boolean` - `yes` or `no`
- `Equals`, `LessThan`, `GreaterThan`, `LessThanOrEqual`, `GreaterThanOrEqual`, `NotEqual` - Operators
- `LeftBrace`, `RightBrace` - `{` and `}`
- `Comment` - Text after `#`
- `EOF` - End of file

### AST Types

- **`Document`** - Root node containing all properties
- **`Property`** - A key-operator-value triplet
- **`Block`** - Nested block with properties (preserves order and allows duplicates)
- **`ValueArray`** - Array of primitive values (e.g., `{ 5.5 6 6.5 }`)
- **`PrimitiveValue`** - `string | number | boolean`

### Stringify (Converting Back to Text)

Convert a parsed document back to Clausewitz script format:

```typescript
import { parse, stringify, ClausewitzDocument } from 'shroudingers-parser';

const input = `
scenario = {
  name = "My Galaxy"
  priority = 0
  default = yes
}
`;

const result = parse(input);

if (result.success) {
  // Using the standalone function
  const output = stringify(result.document);
  console.log(output);
  
  // Or using ClausewitzDocument helper
  const doc = new ClausewitzDocument(result.document);
  doc.set('scenario.priority', 10);
  console.log(doc.stringify());
}
```

#### Stringify Options

```typescript
stringify(doc, {
  indent: '\t',           // Indentation string (default: '\t')
  spaces: 2,              // Use spaces instead of tabs (overrides indent)
  spaceBetweenTopLevel: true  // Add blank lines between top-level properties
});
```

#### Formatting Behavior

- Valid identifiers are output without quotes
- Strings with spaces or special characters are automatically quoted
- Booleans are converted to `yes`/`no`
- Small blocks (≤3 primitive properties) are kept inline: `{ x = 10 y = 20 }`
- Larger blocks use multi-line format with indentation
- Value arrays are always inline: `{ 1 2 3 4 5 }`

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## License

ISC

