import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LockfileParser, LockfileSnapshot } from '../types/lockfile.js';
import { findAffectedPackages } from './find-affected-packages.js';

function makeTempDir(): string {
  return join(tmpdir(), `find-affected-test-${randomBytes(6).toString('hex')}`);
}

/** A fake parser that treats content as newline-separated "name@version" pairs. */
function makeParser(): LockfileParser {
  return {
    format: 'fake',
    lockfileNames: ['fake.lock'],
    parse: async (content: string): Promise<LockfileSnapshot> => {
      const map = new Map<string, string>();
      for (const line of content.split('\n').filter(Boolean)) {
        const [name, version] = line.split('@');
        if (name && version) map.set(name, version);
      }
      return map;
    },
  };
}

function lockfile(...entries: string[]): string {
  return entries.join('\n');
}

describe('findAffectedPackages', () => {
  let dir: string;

  beforeEach(async () => {
    dir = makeTempDir();
    await mkdir(dir, { recursive: true });
  });

  it('returns empty set when no packages depend on changed deps', async () => {
    await mkdir(join(dir, 'packages', 'pkg-a'), { recursive: true });
    await writeFile(
      join(dir, 'packages', 'pkg-a', 'package.json'),
      JSON.stringify({ name: 'pkg-a', dependencies: { lodash: '^4.0.0' } }),
    );

    const result = await findAffectedPackages({
      beforeContent: lockfile('react@18.0.0'),
      afterContent: lockfile('react@18.1.0'),
      parser: makeParser(),
      workspaceRoot: dir,
    });

    expect(result.size).toBe(0);
  });

  it('returns packages that depend on a changed dep', async () => {
    await mkdir(join(dir, 'packages', 'pkg-a'), { recursive: true });
    await writeFile(
      join(dir, 'packages', 'pkg-a', 'package.json'),
      JSON.stringify({ name: 'pkg-a', dependencies: { react: '^18.0.0' } }),
    );

    const result = await findAffectedPackages({
      beforeContent: lockfile('react@18.0.0'),
      afterContent: lockfile('react@18.1.0'),
      parser: makeParser(),
      workspaceRoot: dir,
    });

    expect(result).toContain('pkg-a');
  });

  it('respects the dependency filter', async () => {
    await mkdir(join(dir, 'packages', 'pkg-a'), { recursive: true });
    await writeFile(
      join(dir, 'packages', 'pkg-a', 'package.json'),
      JSON.stringify({ name: 'pkg-a', devDependencies: { react: '^18.0.0' } }),
    );

    const result = await findAffectedPackages({
      beforeContent: lockfile('react@18.0.0'),
      afterContent: lockfile('react@18.1.0'),
      parser: makeParser(),
      workspaceRoot: dir,
      filter: { dependencies: true }, // only prod deps — devDeps excluded
    });

    expect(result.size).toBe(0);
  });

  it('returns a ReadonlySet', async () => {
    const result = await findAffectedPackages({
      beforeContent: lockfile('react@18.0.0'),
      afterContent: lockfile('react@18.0.0'),
      parser: makeParser(),
      workspaceRoot: dir,
    });

    expect(result).toBeInstanceOf(Set);
  });
});
