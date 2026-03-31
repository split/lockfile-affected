import { describe, expect, it } from 'vitest';
import { npmLockfileParser, parseNpmLockfile } from './parse-npm-lockfile.js';

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

  it('returns empty snapshot for empty packages', async () => {
    const emptyLock = JSON.stringify({
      name: 'empty-project',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {},
    });

    const snapshot = await parseNpmLockfile(emptyLock);
    expect(snapshot.size).toBe(0);
  });

  it('extracts workspace packages into separate contexts', async () => {
    const workspaceLock = JSON.stringify({
      name: 'my-monorepo',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': {
          name: 'my-monorepo',
          dependencies: {
            lodash: '^4.17.21',
          },
        },
        'node_modules/lodash': {
          version: '4.17.21',
          resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
        },
        'packages/pkg-a': {
          version: '1.0.0',
          dependencies: {
            react: '^18.2.0',
          },
        },
        'packages/pkg-a/node_modules/react': {
          version: '18.2.0',
          resolved: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
        },
      },
    });

    const snapshot = await parseNpmLockfile(workspaceLock);

    expect(snapshot.has('.')).toBe(true);
    expect(snapshot.has('packages/pkg-a')).toBe(true);

    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
    expect(snapshot.get('packages/pkg-a')?.get('react')).toBe('18.2.0');
  });

  it('handles scoped packages (@org/name)', async () => {
    const scopedLock = JSON.stringify({
      name: 'my-app',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': {
          name: 'my-app',
          dependencies: {
            '@babel/core': '^7.23.0',
          },
        },
        'node_modules/@babel/core': {
          version: '7.23.5',
          resolved: 'https://registry.npmjs.org/@babel/core/-/core-7.23.5.tgz',
        },
      },
    });

    const snapshot = await parseNpmLockfile(scopedLock);
    const rootPackages = snapshot.get('.');

    expect(rootPackages?.has('@babel/core')).toBe(true);
    expect(rootPackages?.get('@babel/core')).toBe('7.23.5');
  });
});

describe('npmLockfileParser', () => {
  it('has format "npm"', () => {
    expect(npmLockfileParser.format).toBe('npm');
  });

  it('handles package-lock.json filename', () => {
    expect(npmLockfileParser.lockfileNames).toContain('package-lock.json');
  });

  it('parse delegates to parseNpmLockfile', async () => {
    const snapshot = await npmLockfileParser.parse(NPM_LOCK_V3);
    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
  });
});
