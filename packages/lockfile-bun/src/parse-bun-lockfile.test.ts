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
  it('returns a snapshot with normalized package name -> version entries', async () => {
    const snapshot = await parseBunLockfile(BUN_LOCK_FIXTURE);

    expect(snapshot.size).toBeGreaterThan(0);
    expect(snapshot.get('lodash')).toBe('4.17.21');
    expect(snapshot.get('react')).toBe('18.3.0');
  });

  it('deduplicates package names and keeps first encountered version', async () => {
    const snapshot = await parseBunLockfile(BUN_LOCK_FIXTURE);

    expect(snapshot.get('loose-envify')).toBe('1.4.0');
    expect(snapshot.get('js-tokens')).toBe('4.0.0');
  });

  it('returns a LockfileSnapshot (ReadonlyMap)', async () => {
    const snapshot = await parseBunLockfile(BUN_LOCK_FIXTURE);

    expect(snapshot).toBeInstanceOf(Map);
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

    expect(snapshot.get('lodash')).toBe('4.17.21');
  });
});
