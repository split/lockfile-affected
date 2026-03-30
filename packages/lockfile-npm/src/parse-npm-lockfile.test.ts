import { describe, expect, it } from 'vitest';
import { parseNpmLockfile } from './parse-npm-lockfile.js';

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
      integrity: 'sha512-sha512-dummy',
    },
    'node_modules/react': {
      version: '18.3.0',
      resolved: 'https://registry.npmjs.org/react/-/react-18.3.0.tgz',
      integrity: 'sha512-dummy2',
    },
  },
});

describe('parseNpmLockfile', () => {
  it('returns a hierarchical snapshot with root context', async () => {
    const snapshot = await parseNpmLockfile(NPM_LOCK_V3);

    expect(snapshot.size).toBeGreaterThan(0);
    expect(snapshot.has('.')).toBe(true);

    const rootPackages = snapshot.get('.');
    expect(rootPackages?.has('lodash')).toBe(true);
    expect(rootPackages?.get('lodash')).toBe('4.17.21');
  });

  it('returns a LockfileSnapshot (ReadonlyMap of ReadonlyMaps)', async () => {
    const snapshot = await parseNpmLockfile(NPM_LOCK_V3);

    expect(snapshot).toBeInstanceOf(Map);
    expect(snapshot.get('.')).toBeInstanceOf(Map);
  });
});
