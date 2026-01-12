import { describe, it, expect } from 'vitest';
import { tokenize, tokenizeWithoutComments, TokenType, parse, ClausewitzDocument, Block, ValueArray, stringify } from '../src/index';

describe('Tokenizer', () => {
  describe('tokenize', () => {
    it('should reject empty input', () => {
      const result = tokenize('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input cannot be empty');
    });

    it('should tokenize simple key-value pair', () => {
      const result = tokenize('name = "Test"');
      expect(result.success).toBe(true);
      expect(result.tokens).toHaveLength(4); // identifier, equals, string, EOF
      expect(result.tokens![0]).toMatchObject({ type: TokenType.Identifier, value: 'name' });
      expect(result.tokens![1]).toMatchObject({ type: TokenType.Equals, value: '=' });
      expect(result.tokens![2]).toMatchObject({ type: TokenType.String, value: 'Test' });
      expect(result.tokens![3]).toMatchObject({ type: TokenType.EOF });
    });

    it('should tokenize integers', () => {
      const result = tokenize('priority = 0');
      expect(result.success).toBe(true);
      expect(result.tokens![2]).toMatchObject({ type: TokenType.Number, value: '0' });
    });

    it('should tokenize negative numbers', () => {
      const result = tokenize('x = -75');
      expect(result.success).toBe(true);
      expect(result.tokens![2]).toMatchObject({ type: TokenType.Number, value: '-75' });
    });

    it('should tokenize floating point numbers', () => {
      const result = tokenize('odds = 1.75');
      expect(result.success).toBe(true);
      expect(result.tokens![2]).toMatchObject({ type: TokenType.Number, value: '1.75' });
    });

    it('should tokenize boolean yes', () => {
      const result = tokenize('default = yes');
      expect(result.success).toBe(true);
      expect(result.tokens![2]).toMatchObject({ type: TokenType.Boolean, value: 'yes' });
    });

    it('should tokenize boolean no', () => {
      const result = tokenize('random_hyperlanes = no');
      expect(result.success).toBe(true);
      expect(result.tokens![2]).toMatchObject({ type: TokenType.Boolean, value: 'no' });
    });

    it('should tokenize braces', () => {
      const result = tokenize('block = { }');
      expect(result.success).toBe(true);
      expect(result.tokens![2]).toMatchObject({ type: TokenType.LeftBrace, value: '{' });
      expect(result.tokens![3]).toMatchObject({ type: TokenType.RightBrace, value: '}' });
    });

    it('should tokenize comments', () => {
      const result = tokenize('value = 1 # this is a comment');
      expect(result.success).toBe(true);
      const commentToken = result.tokens!.find(t => t.type === TokenType.Comment);
      expect(commentToken).toBeDefined();
      expect(commentToken!.value).toBe('this is a comment');
    });

    it('should tokenize identifiers with underscores', () => {
      const result = tokenize('static_galaxy_scenario = {}');
      expect(result.success).toBe(true);
      expect(result.tokens![0]).toMatchObject({ type: TokenType.Identifier, value: 'static_galaxy_scenario' });
    });

    it('should tokenize identifiers with colons', () => {
      const result = tokenize('some:scoped:value = 1');
      expect(result.success).toBe(true);
      expect(result.tokens![0]).toMatchObject({ type: TokenType.Identifier, value: 'some:scoped:value' });
    });

    it('should tokenize comparison operators', () => {
      const result = tokenize('value < 10 value > 5 value <= 20 value >= 0');
      expect(result.success).toBe(true);
      expect(result.tokens!.find(t => t.type === TokenType.LessThan)).toBeDefined();
      expect(result.tokens!.find(t => t.type === TokenType.GreaterThan)).toBeDefined();
      expect(result.tokens!.find(t => t.type === TokenType.LessThanOrEqual)).toBeDefined();
      expect(result.tokens!.find(t => t.type === TokenType.GreaterThanOrEqual)).toBeDefined();
    });

    it('should tokenize nested blocks', () => {
      const result = tokenize(`position = { x = 7 y = 33 }`);
      expect(result.success).toBe(true);
      expect(result.tokens).toHaveLength(11); // position, =, {, x, =, 7, y, =, 33, }, EOF
      expect(result.tokens![0]).toMatchObject({ type: TokenType.Identifier, value: 'position' });
      expect(result.tokens![2]).toMatchObject({ type: TokenType.LeftBrace });
      expect(result.tokens![9]).toMatchObject({ type: TokenType.RightBrace });
    });

    it('should track line and column numbers', () => {
      const result = tokenize('a = 1\nb = 2');
      expect(result.success).toBe(true);
      expect(result.tokens![0]).toMatchObject({ line: 1, column: 1 }); // 'a'
      expect(result.tokens![3]).toMatchObject({ line: 2, column: 1 }); // 'b'
    });

    it('should handle complex Stellaris-style input', () => {
      const input = `
system = {
  id = "15"
  name = ""
  position = { x = 7 y = 33 z = 4 }
  initializer = dyson_sphere_init_01
}`;
      const result = tokenize(input);
      expect(result.success).toBe(true);
      
      // Check for key tokens
      const tokens = result.tokens!;
      expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'system')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.String && t.value === '15')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'position')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'dyson_sphere_init_01')).toBe(true);
    });

    it('should handle number arrays in braces', () => {
      const result = tokenize('values = { 5.5 6 6.5 7 }');
      expect(result.success).toBe(true);
      const numbers = result.tokens!.filter(t => t.type === TokenType.Number);
      expect(numbers).toHaveLength(4);
      expect(numbers.map(n => n.value)).toEqual(['5.5', '6', '6.5', '7']);
    });

    it('should handle min/max blocks', () => {
      const result = tokenize('num_empires = { min = 3 max = 3 }');
      expect(result.success).toBe(true);
      expect(result.tokens!.some(t => t.value === 'min')).toBe(true);
      expect(result.tokens!.some(t => t.value === 'max')).toBe(true);
    });

    it('should handle add_hyperlane syntax', () => {
      const result = tokenize('add_hyperlane = { from = "0" to = "9" }');
      expect(result.success).toBe(true);
      expect(result.tokens![0]).toMatchObject({ type: TokenType.Identifier, value: 'add_hyperlane' });
    });

    it('should handle @ prefix in identifiers', () => {
      const result = tokenize('@my_variable = 10');
      expect(result.success).toBe(true);
      expect(result.tokens![0]).toMatchObject({ type: TokenType.Identifier, value: '@my_variable' });
    });
  });

  describe('tokenizeWithoutComments', () => {
    it('should filter out comments', () => {
      const result = tokenizeWithoutComments('value = 1 # comment\nother = 2');
      expect(result.success).toBe(true);
      expect(result.tokens!.filter(t => t.type === TokenType.Comment)).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should report unterminated strings', () => {
      const result = tokenize('name = "unterminated');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unterminated string');
    });

    it('should report error location', () => {
      const result = tokenize('valid = 1\ninvalid = "unterminated');
      expect(result.success).toBe(false);
      expect(result.errorLine).toBe(2);
    });
  });
});

describe('Parser', () => {
  describe('parse', () => {
    it('should reject empty input', () => {
      const result = parse('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input cannot be empty');
    });

    it('should parse simple key-value pair', () => {
      const result = parse('name = "Test"');
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.properties).toHaveLength(1);
      expect(result.document!.properties[0].key).toBe('name');
      expect(result.document!.properties[0].value).toBe('Test');
    });

    it('should parse integers', () => {
      const result = parse('priority = 0');
      expect(result.success).toBe(true);
      expect(result.document!.properties[0].value).toBe(0);
    });

    it('should parse negative numbers', () => {
      const result = parse('x = -75');
      expect(result.success).toBe(true);
      expect(result.document!.properties[0].value).toBe(-75);
    });

    it('should parse floating point numbers', () => {
      const result = parse('odds = 1.75');
      expect(result.success).toBe(true);
      expect(result.document!.properties[0].value).toBe(1.75);
    });

    it('should parse boolean yes as true', () => {
      const result = parse('default = yes');
      expect(result.success).toBe(true);
      expect(result.document!.properties[0].value).toBe(true);
    });

    it('should parse boolean no as false', () => {
      const result = parse('random = no');
      expect(result.success).toBe(true);
      expect(result.document!.properties[0].value).toBe(false);
    });

    it('should parse identifier values', () => {
      const result = parse('initializer = dyson_sphere_init_01');
      expect(result.success).toBe(true);
      expect(result.document!.properties[0].value).toBe('dyson_sphere_init_01');
    });

    it('should parse nested blocks', () => {
      const result = parse('position = { x = 7 y = 33 }');
      expect(result.success).toBe(true);
      
      const position = result.document!.properties[0].value as Block;
      expect(position.type).toBe('Block');
      expect(position.properties).toHaveLength(2);
      expect(position.properties[0].key).toBe('x');
      expect(position.properties[0].value).toBe(7);
      expect(position.properties[1].key).toBe('y');
      expect(position.properties[1].value).toBe(33);
    });

    it('should parse value arrays', () => {
      const result = parse('values = { 5.5 6 6.5 7 }');
      expect(result.success).toBe(true);
      
      const values = result.document!.properties[0].value as ValueArray;
      expect(values.type).toBe('ValueArray');
      expect(values.values).toEqual([5.5, 6, 6.5, 7]);
    });

    it('should parse duplicate keys', () => {
      const result = parse(`
        system = { id = "1" }
        system = { id = "2" }
        system = { id = "3" }
      `);
      expect(result.success).toBe(true);
      expect(result.document!.properties).toHaveLength(3);
      expect(result.document!.properties.every(p => p.key === 'system')).toBe(true);
    });

    it('should parse comparison operators', () => {
      const result = parse('value < 10');
      expect(result.success).toBe(true);
      expect(result.document!.properties[0].operator).toBe('<');
    });

    it('should parse complex Stellaris-style input', () => {
      const input = `
static_galaxy_scenario = {
  name = "Test Galaxy"
  priority = 0
  default = yes
  num_empires = { min = 3 max = 3 }
  system = { id = "0" position = { x = 0 y = 0 } }
  system = { id = "1" position = { x = 10 y = 5 } }
  add_hyperlane = { from = "0" to = "1" }
}`;
      const result = parse(input);
      expect(result.success).toBe(true);
      
      const scenario = result.document!.properties[0].value as Block;
      expect(scenario.type).toBe('Block');
      
      // Check for expected properties
      const name = scenario.properties.find(p => p.key === 'name');
      expect(name?.value).toBe('Test Galaxy');
      
      const priority = scenario.properties.find(p => p.key === 'priority');
      expect(priority?.value).toBe(0);
      
      const defaultVal = scenario.properties.find(p => p.key === 'default');
      expect(defaultVal?.value).toBe(true);
      
      // Check for duplicate systems
      const systems = scenario.properties.filter(p => p.key === 'system');
      expect(systems).toHaveLength(2);
    });

    it('should ignore comments', () => {
      const result = parse('value = 1 # this is a comment\nother = 2');
      expect(result.success).toBe(true);
      expect(result.document!.properties).toHaveLength(2);
    });
  });
});

describe('ClausewitzDocument', () => {
  it('should get values by path', () => {
    const result = parse('scenario = { name = "Test" priority = 5 }');
    expect(result.success).toBe(true);
    
    const doc = new ClausewitzDocument(result.document!);
    expect(doc.get('scenario.name')).toBe('Test');
    expect(doc.get('scenario.priority')).toBe(5);
  });

  it('should return undefined for non-existent paths', () => {
    const result = parse('a = 1');
    const doc = new ClausewitzDocument(result.document!);
    expect(doc.get('nonexistent')).toBeUndefined();
    expect(doc.get('a.nested')).toBeUndefined();
  });

  it('should get all values for duplicate keys', () => {
    const result = parse(`
      root = {
        item = { id = 1 }
        item = { id = 2 }
        item = { id = 3 }
      }
    `);
    const doc = new ClausewitzDocument(result.document!);
    const items = doc.getAll('root.item');
    expect(items).toHaveLength(3);
  });

  it('should set values by path', () => {
    const result = parse('config = { value = 1 }');
    const doc = new ClausewitzDocument(result.document!);
    
    const success = doc.set('config.value', 42);
    expect(success).toBe(true);
    expect(doc.get('config.value')).toBe(42);
  });

  it('should add new properties', () => {
    const result = parse('block = { existing = 1 }');
    const doc = new ClausewitzDocument(result.document!);
    
    doc.add('block', 'new_key', 'new_value');
    
    const block = doc.get('block') as Block;
    expect(block.properties).toHaveLength(2);
    expect(block.properties[1].key).toBe('new_key');
    expect(block.properties[1].value).toBe('new_value');
  });

  it('should remove properties by key', () => {
    const result = parse(`
      block = {
        keep = 1
        remove = 2
        remove = 3
        keep_also = 4
      }
    `);
    const doc = new ClausewitzDocument(result.document!);
    
    const removed = doc.removeAll('block', 'remove');
    expect(removed).toBe(2);
    
    const block = doc.get('block') as Block;
    expect(block.properties).toHaveLength(2);
    expect(block.properties.every(p => p.key !== 'remove')).toBe(true);
  });
});

describe('stringify', () => {
  it('should stringify simple key-value pairs', () => {
    const result = parse('name = "Test"');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    // Valid identifiers are output without quotes
    expect(output).toBe('name = Test');
  });

  it('should quote strings with spaces', () => {
    const result = parse('name = "Test Value"');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toBe('name = "Test Value"');
  });

  it('should stringify identifier values without quotes', () => {
    const result = parse('initializer = dyson_sphere_init_01');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toBe('initializer = dyson_sphere_init_01');
  });

  it('should stringify numbers', () => {
    const result = parse('x = -75\ny = 1.5');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toBe('x = -75\ny = 1.5');
  });

  it('should stringify booleans as yes/no', () => {
    const result = parse('enabled = yes\ndisabled = no');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toBe('enabled = yes\ndisabled = no');
  });

  it('should stringify value arrays inline', () => {
    const result = parse('values = { 1 2 3 4 5 }');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toBe('values = { 1 2 3 4 5 }');
  });

  it('should stringify small blocks inline', () => {
    const result = parse('position = { x = 10 y = 20 }');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toBe('position = { x = 10 y = 20 }');
  });

  it('should stringify large blocks with newlines', () => {
    const result = parse(`
      config = {
        a = 1
        b = 2
        c = 3
        d = 4
      }
    `);
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toContain('{\n');
    expect(output).toContain('\ta = 1');
  });

  it('should use custom indentation', () => {
    const result = parse(`
      config = {
        a = 1
        b = 2
        c = 3
        d = 4
      }
    `);
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!, { spaces: 2 });
    expect(output).toContain('  a = 1');
  });

  it('should stringify comparison operators', () => {
    const result = parse('value < 10');
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toBe('value < 10');
  });

  it('should stringify duplicate keys', () => {
    const result = parse(`
      system = { id = "1" }
      system = { id = "2" }
    `);
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    expect(output).toContain('system = { id = "1" }');
    expect(output).toContain('system = { id = "2" }');
  });

  it('should round-trip parse and stringify', () => {
    const input = `scenario = {
\tname = "Test Galaxy"
\tpriority = 0
\tdefault = yes
\tposition = { x = 10 y = 20 }
}`;
    
    const result = parse(input);
    expect(result.success).toBe(true);
    
    const output = stringify(result.document!);
    
    // Parse the output again
    const result2 = parse(output);
    expect(result2.success).toBe(true);
    
    // The documents should be equivalent
    const doc1 = new ClausewitzDocument(result.document!);
    const doc2 = new ClausewitzDocument(result2.document!);
    
    expect(doc1.get('scenario.name')).toBe(doc2.get('scenario.name'));
    expect(doc1.get('scenario.priority')).toBe(doc2.get('scenario.priority'));
    expect(doc1.get('scenario.default')).toBe(doc2.get('scenario.default'));
  });

  it('should work via ClausewitzDocument.stringify()', () => {
    const result = parse('name = "Test"');
    expect(result.success).toBe(true);
    
    const doc = new ClausewitzDocument(result.document!);
    const output = doc.stringify();
    
    // Valid identifiers are output without quotes
    expect(output).toBe('name = Test');
  });
});
