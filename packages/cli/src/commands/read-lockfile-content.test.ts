import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLockfileContent } from './read-lockfile-content.js';

function makeTempPath(): string {
  return join(tmpdir(), `read-lockfile-test-${randomBytes(6).toString('hex')}.yaml`);
}

describe('readLockfileContent', () => {
  it('reads content from a file path', async () => {
    const path = makeTempPath();
    await writeFile(path, 'lockfile content');

    const result = await readLockfileContent(path);

    expect(result).toBe('lockfile content');
  });

  describe('when path is "-"', () => {
    let originalStdin: NodeJS.ReadStream;

    beforeEach(() => {
      originalStdin = process.stdin;
    });

    afterEach(() => {
      Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    });

    it('reads content from stdin', async () => {
      const stream = Readable.from(['pnpm lockfile content']);
      Object.defineProperty(process, 'stdin', { value: stream, writable: true });

      const result = await readLockfileContent('-');

      expect(result).toBe('pnpm lockfile content');
    });

    it('reads multi-chunk stdin content', async () => {
      const stream = Readable.from(['chunk one\n', 'chunk two\n']);
      Object.defineProperty(process, 'stdin', { value: stream, writable: true });

      const result = await readLockfileContent('-');

      expect(result).toBe('chunk one\nchunk two\n');
    });
  });
});
