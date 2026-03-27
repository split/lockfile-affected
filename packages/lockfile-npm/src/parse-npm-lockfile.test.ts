import { describe, expect, it } from 'vitest';
import { parseNpmLockfile } from './parse-npm-lockfile.js';

// Minimal valid package-lock.json v3 fixture
const NPM_LOCK_V3 = JSON.stringify({
  name: 'my-app',
  version: '1.0.0',
  lockfileVersion: 3,
  requires: true,
  packages: {
    '': {
      name: 'my-app',
      version: '1.0.0',
      dependencies: {
        lodash: '^4.17.21',
      },
    },
    'node_modules/lodash': {
      version: '4.17.21',
      resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
      integrity: 'sha512-dummy',
    },
    'node_modules/react': {
      version: '18.3.0',
      resolved: 'https://registry.npmjs.org/react/-/react-18.3.0.tgz',
      integrity: 'sha512-dummy2',
    },
  },
});

describe('parseNpmLockfile', () => {
  it('returns a snapshot with normalized package name → version entries', async () => {
    const snapshot = await parseNpmLockfile(NPM_LOCK_V3);

    expect(snapshot.size).toBeGreaterThan(0);
    expect(snapshot.has('lodash')).toBe(true);
    expect(snapshot.get('lodash')).toBe('4.17.21');
  });

  it('includes all packages from node_modules', async () => {
    const snapshot = await parseNpmLockfile(NPM_LOCK_V3);

    expect(snapshot.has('react')).toBe(true);
    expect(snapshot.get('react')).toBe('18.3.0');
  });

  it('returns a LockfileSnapshot (ReadonlyMap)', async () => {
    const snapshot = await parseNpmLockfile(NPM_LOCK_V3);

    expect(snapshot).toBeInstanceOf(Map);
  });
});
