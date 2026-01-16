# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 - 2026-01-16

### Added

- Clausewitz script tokenizer with 14 token types (Identifier, String, Number, Boolean, Equals, LeftBrace, RightBrace, LessThan, GreaterThan, LessThanOrEqual, GreaterThanOrEqual, NotEqual, Comment, EOF)
- `tokenize()` function to tokenize scripts with comments
- `tokenizeWithoutComments()` function to tokenize scripts without comments
- Full AST parser with line and column tracking
- `parse()` function to parse scripts into a Document AST
- Support for comparison operators (`<`, `>`, `<=`, `>=`, `!=`, `<>`)
- Support for value arrays (`{ 1 2 3 }`)
- Duplicate key preservation in blocks
- `ClausewitzDocument` class for document manipulation
- Path-based value access with `get()` and `getAll()` methods
- Document modification with `set()`, `add()`, and `removeAll()` methods
- `getRootProperties()` and `getDocument()` accessor methods
- `stringify()` function to convert AST back to Clausewitz script format
- Configurable stringify options (indent, spaces, spaceBetweenTopLevel)
- Automatic formatting: inline small blocks, multi-line large blocks, proper quoting
- Special identifier support (`@variables`, namespaced keys, array syntax)
- Error reporting with line and column information
