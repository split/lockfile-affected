import { describe, expect, it } from 'vitest';
import { bunLockfileParser, parseBunLockfile } from './parse-bun-lockfile.js';

const BUN_LOCK_FIXTURE = `\
{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "my-app",
      "version": "1.0.0",
      "dependencies": {
        "lodash": "^4.17.21",
        "react": "^18.3.0"
      }
    }
  },
  "packages": {
    "lodash": [
      "lodash@4.17.21",
      "",
      {
        "dependencies": {}
      }
    ],
    "react": [
      "react@18.3.0",
      "",
      {
        "dependencies": {
          "loose-envify": "^1.4.0"
        }
      }
    ],
    "react/loose-envify": [
      "loose-envify@1.4.0",
      "",
      {
        "dependencies": {
          "js-tokens": "^4.0.0"
        }
      }
    ],
    "react/loose-envify/js-tokens": [
      "js-tokens@4.0.0",
      "",
      {
        "dependencies": {}
      }
    ]
  }
}
`;

describe('parseBunLockfile', () => {
  it('returns a hierarchical snapshot with root context', async () => {
    const snapshot = await parseBunLockfile(BUN_LOCK_FIXTURE);

    expect(snapshot.size).toBeGreaterThan(0);
    expect(snapshot.has('.')).toBe(true);

    const rootPackages = snapshot.get('.');
    expect(rootPackages?.get('lodash')).toBe('4.17.21');
    expect(rootPackages?.get('react')).toBe('18.3.0');
  });

  it('only includes direct dependencies (not transitive)', async () => {
    const snapshot = await parseBunLockfile(BUN_LOCK_FIXTURE);
    const rootPackages = snapshot.get('.');

    expect(rootPackages?.get('lodash')).toBe('4.17.21');
    expect(rootPackages?.get('react')).toBe('18.3.0');
    expect(rootPackages?.get('loose-envify')).toBeUndefined();
    expect(rootPackages?.get('js-tokens')).toBeUndefined();
  });

  it('returns a LockfileSnapshot (ReadonlyMap of ReadonlyMaps)', async () => {
    const snapshot = await parseBunLockfile(BUN_LOCK_FIXTURE);

    expect(snapshot).toBeInstanceOf(Map);
    expect(snapshot.get('.')).toBeInstanceOf(Map);
  });

  it('returns empty snapshot for empty workspaces', async () => {
    const emptyLock = JSON.stringify({
      lockfileVersion: 1,
      packages: {},
    });

    const snapshot = await parseBunLockfile(emptyLock);
    expect(snapshot.size).toBe(0);
  });

  it('extracts workspace packages into separate contexts', async () => {
    const multiWorkspaceLock = JSON.stringify({
      lockfileVersion: 1,
      workspaces: {
        '': {
          name: 'root',
          dependencies: { lodash: '^4.17.0' },
        },
        'packages/pkg-a': {
          dependencies: { react: '^18.0.0' },
        },
      },
      packages: {
        lodash: ['lodash@4.17.21', '', {}],
        react: ['react@18.2.0', '', {}],
      },
    });

    const snapshot = await parseBunLockfile(multiWorkspaceLock);

    expect(snapshot.has('.')).toBe(true);
    expect(snapshot.has('packages/pkg-a')).toBe(true);

    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
    expect(snapshot.get('packages/pkg-a')?.get('react')).toBe('18.2.0');
  });
});

describe('bunLockfileParser', () => {
  it('has format "bun"', () => {
    expect(bunLockfileParser.format).toBe('bun');
  });

  it('handles bun.lock filename', () => {
    expect(bunLockfileParser.lockfileNames).toContain('bun.lock');
  });

  it('parse delegates to parseBunLockfile', async () => {
    const snapshot = await bunLockfileParser.parse(BUN_LOCK_FIXTURE);

    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
  });
});
