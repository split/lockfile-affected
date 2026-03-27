import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import { detectLockfile } from './detect-lockfile.js';

function makeTempDir(): string {
  return join(tmpdir(), `detect-lockfile-test-${randomBytes(6).toString('hex')}`);
}

function makeParser(format: string, lockfileNames: readonly string[]): LockfileParser {
  return {
    format,
    lockfileNames,
    parse: async (_content: string): Promise<LockfileSnapshot> => new Map(),
  };
}

describe('detectLockfile', () => {
  let dir: string;

  beforeEach(async () => {
    dir = makeTempDir();
    await mkdir(dir, { recursive: true });
  });

  it('detects a lockfile matching the first parser', async () => {
    await writeFile(join(dir, 'pnpm-lock.yaml'), '');
    const parsers = [
      makeParser('pnpm', ['pnpm-lock.yaml']),
      makeParser('npm', ['package-lock.json']),
    ];

    const result = await detectLockfile(dir, parsers);

    expect(result.format).toBe('pnpm');
    expect(result.path).toBe(join(dir, 'pnpm-lock.yaml'));
  });

  it('detects a lockfile matching the second parser when first is absent', async () => {
    await writeFile(join(dir, 'package-lock.json'), '');
    const parsers = [
      makeParser('pnpm', ['pnpm-lock.yaml']),
      makeParser('npm', ['package-lock.json']),
    ];

    const result = await detectLockfile(dir, parsers);

    expect(result.format).toBe('npm');
    expect(result.path).toBe(join(dir, 'package-lock.json'));
  });

  it('prefers the first parser when multiple lockfiles exist', async () => {
    await writeFile(join(dir, 'pnpm-lock.yaml'), '');
    await writeFile(join(dir, 'package-lock.json'), '');
    const parsers = [
      makeParser('pnpm', ['pnpm-lock.yaml']),
      makeParser('npm', ['package-lock.json']),
    ];

    const result = await detectLockfile(dir, parsers);

    expect(result.format).toBe('pnpm');
  });

  it('checks all lockfileNames within a parser', async () => {
    await writeFile(join(dir, 'npm-shrinkwrap.json'), '');
    const parsers = [makeParser('npm', ['package-lock.json', 'npm-shrinkwrap.json'])];

    const result = await detectLockfile(dir, parsers);

    expect(result.format).toBe('npm');
    expect(result.path).toBe(join(dir, 'npm-shrinkwrap.json'));
  });

  it('throws when no lockfile is found', async () => {
    const parsers = [
      makeParser('pnpm', ['pnpm-lock.yaml']),
      makeParser('npm', ['package-lock.json']),
    ];

    await expect(detectLockfile(dir, parsers)).rejects.toThrow(/No lockfile found/);
  });

  it('includes all candidate names in the error message', async () => {
    const parsers = [
      makeParser('pnpm', ['pnpm-lock.yaml']),
      makeParser('npm', ['package-lock.json', 'npm-shrinkwrap.json']),
    ];

    await expect(detectLockfile(dir, parsers)).rejects.toThrow(
      /pnpm-lock\.yaml.*package-lock\.json.*npm-shrinkwrap\.json/,
    );
  });
});
