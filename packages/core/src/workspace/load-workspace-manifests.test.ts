import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadWorkspaceManifests, loadRootManifest } from './load-workspace-manifests.js';

function makeTempDir(): string {
  return join(tmpdir(), `load-workspace-manifests-test-${randomBytes(6).toString('hex')}`);
}

describe('loadWorkspaceManifests', () => {
  let dir: string;

  beforeEach(async () => {
    dir = makeTempDir();
    await mkdir(dir, { recursive: true });
  });

  it('returns an empty array when no package.json files exist', async () => {
    const result = await loadWorkspaceManifests(dir);
    expect(result).toEqual([]);
  });

  it('finds package.json files recursively but not root', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root' }));
    await mkdir(join(dir, 'packages', 'a'), { recursive: true });
    await writeFile(join(dir, 'packages', 'a', 'package.json'), JSON.stringify({ name: 'pkg-a' }));
    await mkdir(join(dir, 'packages', 'b'), { recursive: true });
    await writeFile(join(dir, 'packages', 'b', 'package.json'), JSON.stringify({ name: 'pkg-b' }));

    const result = await loadWorkspaceManifests(dir);
    const names = result.map((m) => m.name).sort();

    expect(names).toEqual(['pkg-a', 'pkg-b']);
  });

  it('skips node_modules directories', async () => {
    await mkdir(join(dir, 'node_modules', 'some-dep'), { recursive: true });
    await writeFile(
      join(dir, 'node_modules', 'some-dep', 'package.json'),
      JSON.stringify({ name: 'some-dep' }),
    );
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root' }));

    const result = await loadWorkspaceManifests(dir);

    expect(result).toHaveLength(0);
  });

  it('skips malformed package.json files', async () => {
    await writeFile(join(dir, 'package.json'), 'not valid json');

    const result = await loadWorkspaceManifests(dir);

    expect(result).toEqual([]);
  });

  it('accepts package.json without a name field (skips it)', async () => {
    await mkdir(join(dir, 'packages', 'no-name'), { recursive: true });
    await writeFile(
      join(dir, 'packages', 'no-name', 'package.json'),
      JSON.stringify({ version: '1.0.0' }),
    );
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root' }));

    const result = await loadWorkspaceManifests(dir);

    expect(result).toHaveLength(0);
  });
});

describe('loadRootManifest', () => {
  let dir: string;

  beforeEach(async () => {
    dir = makeTempDir();
    await mkdir(dir, { recursive: true });
  });

  it('loads root package.json', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '1.0.0' }));

    const result = await loadRootManifest(dir);

    expect(result).toMatchObject({ name: 'root', version: '1.0.0' });
  });

  it('returns undefined when no root package.json exists', async () => {
    const result = await loadRootManifest(dir);

    expect(result).toBeUndefined();
  });

  it('returns undefined for malformed package.json', async () => {
    await writeFile(join(dir, 'package.json'), 'not valid json');

    const result = await loadRootManifest(dir);

    expect(result).toBeUndefined();
  });
});
