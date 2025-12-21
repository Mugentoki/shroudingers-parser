# shroudingers-parser

A parser for clausewitz scripting files

## Installation

```bash
npm install shroudingers-parser
```

## Usage

```typescript
import { parse, getVersion } from 'shroudingers-parser';

// Parse a Clausewitz script
const result = parse('your script content');
if (result.success) {
  console.log('Parsed successfully:', result.data);
} else {
  console.error('Parse error:', result.error);
}

// Get parser version
console.log('Version:', getVersion());
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

