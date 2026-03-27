import { describe, expect, it } from 'vitest';
import { parsePnpmLockfile } from './parse-pnpm-lockfile.js';

// Minimal valid pnpm-lock.yaml v9 fixture
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
    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZbet2yk9dzQ1uFR5/0w==}

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
  it('returns a snapshot with normalized package name → version entries', async () => {
    const snapshot = await parsePnpmLockfile(PNPM_LOCK_V9);

    // Should contain the resolved packages from the lockfile
    expect(snapshot.size).toBeGreaterThan(0);
    expect(snapshot.has('lodash')).toBe(true);
    expect(snapshot.get('lodash')).toBe('4.17.21');
  });

  it('strips peer dependency suffixes from package identifiers', async () => {
    const snapshot = await parsePnpmLockfile(PNPM_LOCK_V9);

    // react@18.3.0(typescript@5.7.0) should resolve to react → 18.3.0
    expect(snapshot.has('react')).toBe(true);
    expect(snapshot.get('react')).toBe('18.3.0');
  });

  it('returns a LockfileSnapshot (ReadonlyMap)', async () => {
    const snapshot = await parsePnpmLockfile(PNPM_LOCK_V9);

    expect(snapshot).toBeInstanceOf(Map);
  });
});
