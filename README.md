# shroudingers-parser

A TypeScript parser for Clausewitz scripting files used by Paradox Interactive games (Stellaris, EU4, CK3, HOI4). Parse, manipulate, and serialize game script files with full support for nested blocks, duplicate keys, comparison operators, and value arrays.

> **Note:** This library has only been tested with map scripts so far. Other script types are most probably not working right now.

## Installation

```bash
npm install shroudingers-parser
```

## Usage

For detailed documentation, see [DOCUMENTATION.md](DOCUMENTATION.md).

### Parsing a Script

```typescript
import { parse, ClausewitzDocument } from 'shroudingers-parser';

const input = `
config = {
  name = "Example"
  value = 42
  enabled = yes
}
`;

const result = parse(input);

if (result.success) {
  const doc = new ClausewitzDocument(result.document);
  console.log(doc.get('config.name'));  // "Example"
}
```

### Manipulating Values

```typescript
const doc = new ClausewitzDocument(result.document);

// Get values
const name = doc.get('config.name');
const items = doc.getAll('config.item'); // For duplicate keys

// Modify values
doc.set('config.value', 100);

// Add new properties
doc.add('config', 'new_key', 'new_value');

// Remove properties
doc.removeAll('config', 'deprecated');
```

### Converting Back to Text

```typescript
import { stringify } from 'shroudingers-parser';

// Using standalone function
const output = stringify(result.document);

// Or using ClausewitzDocument
const output = doc.stringify({ spaces: 2 });
```

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

