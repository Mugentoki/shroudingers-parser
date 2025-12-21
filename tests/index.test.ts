import { describe, it, expect } from 'vitest';
import { parse, getVersion } from '../src/index';

describe('Parser', () => {
  describe('parse', () => {
    it('should parse valid input', () => {
      const result = parse('test input');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject empty input', () => {
      const result = parse('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input cannot be empty');
    });

    it('should reject whitespace-only input', () => {
      const result = parse('   ');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input cannot be empty');
    });
  });

  describe('getVersion', () => {
    it('should return a version string', () => {
      const version = getVersion();
      expect(version).toBe('1.0.0');
      expect(typeof version).toBe('string');
    });
  });
});
