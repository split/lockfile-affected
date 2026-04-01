import { describe, expect, it } from 'vitest';
import type { LockfileParser, LockfileSnapshot } from '../types/lockfile.js';
import { detectLockfile } from './detect-lockfile.js';

function makeParser(format: string, detect: (content: string) => boolean): LockfileParser {
  return {
    format,
    detect,
    parse: async (_content: string): Promise<LockfileSnapshot> => new Map(),
  };
}

describe('detectLockfile', () => {
  it('detects pnpm lockfile content', () => {
    const content = `
importers:
  .:
    dependencies:
      react: ^18.0.0
`;
    const parsers = [
      makeParser('pnpm', (c) => c.includes('importers:')),
      makeParser('npm', (c) => c.includes('"packages"')),
    ];

    const result = detectLockfile(content, parsers);

    expect(result).toBe('pnpm');
  });

  it('detects npm lockfile content', () => {
    const content = JSON.stringify({
      name: 'test',
      packages: {
        'node_modules/react': { version: '18.0.0' },
      },
    });
    const parsers = [
      makeParser('pnpm', (c) => c.includes('importers:')),
      makeParser('npm', (c) => c.includes('"packages"')),
    ];

    const result = detectLockfile(content, parsers);

    expect(result).toBe('npm');
  });

  it('prefers the first parser when multiple match', () => {
    const content = `
importers:
  .:
    dependencies:
      react: ^18.0.0
`;
    const parsers = [
      makeParser('pnpm', (c) => c.includes('importers:')),
      makeParser('npm', (c) => c.includes('importers:')),
    ];

    const result = detectLockfile(content, parsers);

    expect(result).toBe('pnpm');
  });

  it('throws when no parser matches', () => {
    const content = 'some unknown format';
    const parsers = [
      makeParser('pnpm', (c) => c.includes('importers:')),
      makeParser('npm', (c) => c.includes('"packages"')),
    ];

    expect(() => detectLockfile(content, parsers)).toThrow(/Unable to detect lockfile format/);
  });

  it('includes available formats in error message', () => {
    const content = 'unknown';
    const parsers = [
      makeParser('pnpm', (c) => c.includes('importers:')),
      makeParser('npm', (c) => c.includes('packages')),
      makeParser('yarn', (c) => c.includes('metadata')),
    ];

    try {
      detectLockfile(content, parsers);
    } catch (e) {
      const error = e as Error;
      expect(error.message).toContain('pnpm');
      expect(error.message).toContain('npm');
      expect(error.message).toContain('yarn');
    }
  });
});
