import { describe, expect, it } from 'vitest';
import { parseYarnLockfile, yarnLockfileParser } from './parse-yarn-lockfile.js';

const BERRY_FIXTURE = `\
__metadata:
  version: 6
  cacheKey: 8

"lodash@npm:^4.17.20":
  version: 4.17.21
  resolution: "lodash@npm:4.17.21"
  checksum: abc123
  languageName: node
  linkType: hard

"react@npm:^18.2.0":
  version: 18.2.0
  resolution: "react@npm:18.2.0"
  checksum: def456
  languageName: node
  linkType: hard
`;

const BERRY_WORKSPACES_FIXTURE = `\
__metadata:
  version: 6
  cacheKey: 8

"lodash@npm:^4.17.20":
  version: 4.17.21
  resolution: "lodash@npm:4.17.21"
  checksum: abc123
  languageName: node
  linkType: hard

"packages/pkg-a/node-modules/lodash@npm:^4.17.20":
  version: 4.17.25
  resolution: "lodash@npm:4.17.25"
  checksum: def456
  languageName: node
  linkType: hard

"packages/pkg-b/node-modules/lodash@npm:4.17.15":
  version: 4.17.15
  resolution: "lodash@npm:4.17.15"
  checksum: ghi789
  languageName: node
  linkType: hard
`;

describe('parseYarnLockfile', () => {
  it('parses packages into name → version entries in root context', async () => {
    const snapshot = await parseYarnLockfile(BERRY_FIXTURE);

    expect(snapshot.has('.')).toBe(true);
    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
    expect(snapshot.get('.')?.get('react')).toBe('18.2.0');
  });

  it('handles workspaces with separate node-modules paths', async () => {
    const snapshot = await parseYarnLockfile(BERRY_WORKSPACES_FIXTURE);

    expect(snapshot.has('.')).toBe(true);
    expect(snapshot.has('packages/pkg-a')).toBe(true);
    expect(snapshot.has('packages/pkg-b')).toBe(true);

    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
    expect(snapshot.get('packages/pkg-a')?.get('lodash')).toBe('4.17.25');
    expect(snapshot.get('packages/pkg-b')?.get('lodash')).toBe('4.17.15');
  });

  it('returns empty snapshot for empty content', async () => {
    const snapshot = await parseYarnLockfile('__metadata:\n  version: 6\n');

    expect(snapshot.size).toBe(0);
  });
});

describe('yarnLockfileParser', () => {
  it('has format "yarn"', () => {
    expect(yarnLockfileParser.format).toBe('yarn');
  });

  it('handles yarn.lock filename', () => {
    expect(yarnLockfileParser.lockfileNames).toContain('yarn.lock');
  });

  it('parse delegates to parseYarnLockfile', async () => {
    const snapshot = await yarnLockfileParser.parse(BERRY_FIXTURE);

    expect(snapshot.get('.')?.get('lodash')).toBe('4.17.21');
  });
});
