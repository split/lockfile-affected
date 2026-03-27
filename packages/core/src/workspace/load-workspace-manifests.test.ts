import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadWorkspaceManifests } from './load-workspace-manifests.js';

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

  it('finds a package.json in the root dir', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root' }));

    const result = await loadWorkspaceManifests(dir);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'root' });
  });

  it('finds package.json files recursively', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root' }));
    await mkdir(join(dir, 'packages', 'a'), { recursive: true });
    await writeFile(join(dir, 'packages', 'a', 'package.json'), JSON.stringify({ name: 'pkg-a' }));
    await mkdir(join(dir, 'packages', 'b'), { recursive: true });
    await writeFile(join(dir, 'packages', 'b', 'package.json'), JSON.stringify({ name: 'pkg-b' }));

    const result = await loadWorkspaceManifests(dir);
    const names = result.map((m) => m.name).sort();

    expect(names).toEqual(['pkg-a', 'pkg-b', 'root']);
  });

  it('skips node_modules directories', async () => {
    await mkdir(join(dir, 'node_modules', 'some-dep'), { recursive: true });
    await writeFile(
      join(dir, 'node_modules', 'some-dep', 'package.json'),
      JSON.stringify({ name: 'some-dep' }),
    );
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root' }));

    const result = await loadWorkspaceManifests(dir);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'root' });
  });

  it('skips malformed package.json files', async () => {
    await writeFile(join(dir, 'package.json'), 'not valid json');

    const result = await loadWorkspaceManifests(dir);

    expect(result).toEqual([]);
  });

  it('accepts package.json without a name field', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ version: '1.0.0' }));

    const result = await loadWorkspaceManifests(dir);

    expect(result).toHaveLength(1);
  });
});
