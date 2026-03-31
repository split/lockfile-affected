import { describe, expect, it } from 'vitest';
import { parsePnpmLockfile, pnpmLockfileParser } from './parse-pnpm-lockfile.js';

const PNPM_LOCK_V9 = `
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      lodash:
        specifier: ^4.17.21
        version: 4.17.21
      react:
        specifier: ^18.3.0
        version: 18.3.0(typescript@5.7.0)

packages:
  lodash@4.17.21:
    resolution: {integrity: sha512-sha1}

  react@18.3.0:
    resolution: {integrity: sha512-dummy}
    peerDependencies:
      typescript: '>=4'

  typescript@5.7.0:
    resolution: {integrity: sha512-dummy2}

snapshots:
  lodash@4.17.21: {}

  react@18.3.0(typescript@5.7.0):
    dependencies:
      typescript: 5.7.0

  typescript@5.7.0: {}
`.trim();

describe('parsePnpmLockfile', () => {
  it('returns a hierarchical snapshot with importer contexts', async () => {
    const snapshot = await parsePnpmLockfile(PNPM_LOCK_V9);

    expect(snapshot.size).toBeGreaterThan(0);
    expect(snapshot.has('.')).toBe(true);

    const rootPackages = snapshot.get('.');
    expect(rootPackages?.has('lodash')).toBe(true);
    expect(rootPackages?.get('lodash')).toBe('4.17.21');
  });

  it('strips peer dependency suffixes from package identifiers', async () => {
    const snapshot = await parsePnpmLockfile(PNPM_LOCK_V9);

    const rootPackages = snapshot.get('.');
    expect(rootPackages?.has('react')).toBe(true);
    expect(rootPackages?.get('react')).toBe('18.3.0');
  });

  it('returns a LockfileSnapshot (ReadonlyMap of ReadonlyMaps)', async () => {
    const snapshot = await parsePnpmLockfile(PNPM_LOCK_V9);

    expect(snapshot).toBeInstanceOf(Map);
    expect(snapshot.get('.')).toBeInstanceOf(Map);
  });

  it('returns empty snapshot for empty importers', async () => {
    const emptyLock = `
lockfileVersion: '9.0'

importers: {}
`.trim();

    const snapshot = await parsePnpmLockfile(emptyLock);
    expect(snapshot.size).toBe(0);
  });

  it('includes all dependency types (dev, optional, peer)', async () => {
    const allTypesLock = `
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      lodash:
        specifier: ^4.17.0
        version: 4.17.21
    devDependencies:
      vitest:
        specifier: ^1.0.0
        version: 1.5.0
    optionalDependencies:
      fsevents:
        specifier: ^2.3.0
        version: 2.3.3
    peerDependencies:
      react:
        specifier: ^18.0.0
        version: 18.2.0
`.trim();

    const snapshot = await parsePnpmLockfile(allTypesLock);
    const rootPackages = snapshot.get('.');

    expect(rootPackages?.get('lodash')).toBe('4.17.21');
    expect(rootPackages?.get('vitest')).toBe('1.5.0');
    expect(rootPackages?.get('fsevents')).toBe('2.3.3');
    expect(rootPackages?.get('react')).toBe('18.2.0');
  });
});

describe('pnpmLockfileParser', () => {
  it('has format "pnpm"', () => {
    expect(pnpmLockfileParser.format).toBe('pnpm');
  });

  it('handles pnpm-lock.yaml filename', () => {
    expect(pnpmLockfileParser.lockfileNames).toContain('pnpm-lock.yaml');
  });

  it('parse delegates to parsePnpmLockfile', async () => {
    const snapshot = await pnpmLockfileParser.parse(PNPM_LOCK_V9);
    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
  });
});

describe('pnpm multi-importer snapshots', () => {
  it('parses multiple importers into separate contexts', async () => {
    const multiImporterLock = `
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      lodash:
        specifier: ^4.17.0
        version: 4.17.21
  packages/pkg-a:
    dependencies:
      lodash:
        specifier: ^4.17.0
        version: 4.17.25

packages:
  lodash@4.17.21:
    resolution: { integrity: sha-sha1 }
  lodash@4.17.25:
    resolution: { integrity: sha-sha2 }
`.trim();

    const snapshot = await parsePnpmLockfile(multiImporterLock);

    expect(snapshot.has('.')).toBe(true);
    expect(snapshot.has('packages/pkg-a')).toBe(true);

    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
    expect(snapshot.get('packages/pkg-a')?.get('lodash')).toBe('4.17.25');
  });
});
