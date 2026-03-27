import { describe, expect, it } from 'vitest';
import { parseYarnLockfile, yarnLockfileParser } from './parse-yarn-lockfile.js';

// Yarn classic (v1) format
const CLASSIC_FIXTURE = `\
# yarn lockfile v1

lodash@^4.17.20, lodash@^4.17.21:
  version "4.17.21"
  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz#679591c564c3bffaae8454cf0b3df370c3d6911c"
  integrity sha512-abc

react@^18.2.0:
  version "18.2.0"
  resolved "https://registry.yarnpkg.com/react/-/react-18.2.0.tgz"
  integrity sha512-def
  dependencies:
    loose-envify "^1.1.0"
`;

// Yarn berry (v2+) format
const BERRY_FIXTURE = `\
__metadata:
  version: 6
  cacheKey: 8

"lodash@npm:^4.17.20, lodash@npm:^4.17.21":
  version: 4.17.21
  resolution: "lodash@npm:4.17.21"
  checksum: abc
  languageName: node
  linkType: hard

"react@npm:^18.2.0":
  version: 18.2.0
  resolution: "react@npm:18.2.0"
  checksum: def
  languageName: node
  linkType: hard
`;

describe('parseYarnLockfile', () => {
  describe('classic (v1)', () => {
    it('parses packages into name → version entries', async () => {
      const snapshot = await parseYarnLockfile(CLASSIC_FIXTURE);

      expect(snapshot.get('lodash')).toBe('4.17.21');
      expect(snapshot.get('react')).toBe('18.2.0');
    });

    it('deduplicates multi-range entries to a single version', async () => {
      const snapshot = await parseYarnLockfile(CLASSIC_FIXTURE);

      // lodash appears twice (two ranges) but must only be in the snapshot once
      expect(snapshot.size).toBe(2);
    });

    it('returns a map with exactly the packages in the lockfile', async () => {
      const snapshot = await parseYarnLockfile(CLASSIC_FIXTURE);

      expect([...snapshot.keys()].sort()).toEqual(['lodash', 'react']);
    });
  });

  describe('berry (v2+)', () => {
    it('parses packages into name → version entries', async () => {
      const snapshot = await parseYarnLockfile(BERRY_FIXTURE);

      expect(snapshot.get('lodash')).toBe('4.17.21');
      expect(snapshot.get('react')).toBe('18.2.0');
    });

    it('deduplicates multi-range entries to a single version', async () => {
      const snapshot = await parseYarnLockfile(BERRY_FIXTURE);

      expect(snapshot.size).toBe(2);
    });
  });

  it('returns an empty snapshot for an empty lockfile', async () => {
    const snapshot = await parseYarnLockfile('# yarn lockfile v1\n');

    expect(snapshot.size).toBe(0);
  });
});

describe('yarnLockfileParser', () => {
  it('has format "yarn"', () => {
    expect(yarnLockfileParser.format).toBe('yarn');
  });

  it('lists both classic and berry filenames', () => {
    expect(yarnLockfileParser.lockfileNames).toContain('yarn.lock');
  });

  it('parse delegates to parseYarnLockfile', async () => {
    const snapshot = await yarnLockfileParser.parse(CLASSIC_FIXTURE);

    expect(snapshot.get('lodash')).toBe('4.17.21');
  });
});
