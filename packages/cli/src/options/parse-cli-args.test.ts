import { describe, expect, it } from 'vitest';
import { parseCliArgs } from './parse-cli-args.js';

/** Unwrap the options result, failing the test if it's a help result. */
function opts(args: string[]) {
  const result = parseCliArgs(args);
  if (result.kind !== 'options') throw new Error('Expected options result, got help');
  return result.options;
}

describe('parseCliArgs', () => {
  describe('--help', () => {
    it('returns help result for --help', () => {
      expect(parseCliArgs(['--help']).kind).toBe('help');
    });

    it('returns help result for -h', () => {
      expect(parseCliArgs(['-h']).kind).toBe('help');
    });

    it('returns help result even when other args are present', () => {
      expect(parseCliArgs(['before.lock', 'after.lock', '--help']).kind).toBe('help');
    });
  });

  describe('positional args', () => {
    it('parses required positional args', () => {
      const result = opts(['before.lock', 'after.lock']);

      expect(result.lockfileBefore).toBe('before.lock');
      expect(result.lockfileAfter).toBe('after.lock');
    });

    it('throws when no positional args are given', () => {
      expect(() => parseCliArgs([])).toThrow();
    });

    it('throws when only one positional arg is given', () => {
      expect(() => parseCliArgs(['only-one.lock'])).toThrow();
    });
  });

  describe('flags', () => {
    it('defaults output to lines', () => {
      expect(opts(['before.lock', 'after.lock']).output).toBe('lines');
    });

    it('sets output to json when --json is provided', () => {
      expect(opts(['before.lock', 'after.lock', '--json']).output).toBe('json');
    });

    it('defaults workspace root to cwd', () => {
      expect(opts(['before.lock', 'after.lock']).workspaceRoot).toBe(process.cwd());
    });

    it('sets workspaceRoot from --workspace', () => {
      expect(opts(['before.lock', 'after.lock', '--workspace', '/my/repo']).workspaceRoot).toBe(
        '/my/repo',
      );
    });

    it('leaves format undefined when not set', () => {
      expect(opts(['before.lock', 'after.lock']).format).toBeUndefined();
    });

    it('sets format from --format', () => {
      expect(opts(['before.lock', 'after.lock', '--format', 'npm']).format).toBe('npm');
    });

    it('throws when an unsupported format is given', () => {
      expect(() => parseCliArgs(['a.lock', 'b.lock', '--format', 'yarn'])).toThrow();
    });

    it('defaults all dep type flags to false', () => {
      const result = opts(['before.lock', 'after.lock']);

      expect(result.deps).toBe(false);
      expect(result.dev).toBe(false);
      expect(result.peer).toBe(false);
      expect(result.optional).toBe(false);
    });

    it('sets --deps flag', () => {
      const result = opts(['before.lock', 'after.lock', '--deps']);

      expect(result.deps).toBe(true);
      expect(result.dev).toBe(false);
    });

    it('sets --dev flag', () => {
      const result = opts(['before.lock', 'after.lock', '--dev']);

      expect(result.dev).toBe(true);
      expect(result.deps).toBe(false);
    });

    it('sets --peer flag', () => {
      expect(opts(['before.lock', 'after.lock', '--peer']).peer).toBe(true);
    });

    it('sets --optional flag', () => {
      expect(opts(['before.lock', 'after.lock', '--optional']).optional).toBe(true);
    });

    it('allows multiple dep type flags together', () => {
      const result = opts(['before.lock', 'after.lock', '--deps', '--dev']);

      expect(result.deps).toBe(true);
      expect(result.dev).toBe(true);
      expect(result.peer).toBe(false);
      expect(result.optional).toBe(false);
    });
  });
});
