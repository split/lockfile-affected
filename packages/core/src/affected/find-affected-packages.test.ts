import { describe, expect, it } from 'vitest';
import { findAffectedPackages } from './find-affected-packages.js';

function makeSnapshot(...entries: string[]): Map<string, ReadonlyMap<string, string>> {
  const snapshot = new Map<string, ReadonlyMap<string, string>>();
  const rootPackages = new Map<string, string>();
  for (const entry of entries) {
    const [name, version] = entry.split('@');
    if (name && version) rootPackages.set(name, version);
  }
  snapshot.set('.', rootPackages);
  return snapshot;
}

function makeManifests(
  ...manifests: { name: string; deps?: Record<string, string>; devDeps?: Record<string, string> }[]
) {
  return manifests.map((m) => ({
    name: m.name,
    dependencies: m.deps,
    devDependencies: m.devDeps,
    peerDependencies: undefined,
    optionalDependencies: undefined,
  }));
}

describe('findAffectedPackages', () => {
  it('returns empty set when no packages depend on changed deps', () => {
    const snapshotBefore = makeSnapshot('react@18.0.0');
    const snapshotAfter = makeSnapshot('react@18.1.0');
    const manifests = makeManifests({ name: 'pkg-a', deps: { lodash: '^4.0.0' } });

    const result = findAffectedPackages({
      snapshotBefore,
      snapshotAfter,
      manifests,
    });

    expect(result.size).toBe(0);
  });

  it('returns packages that depend on a changed dep', () => {
    const snapshotBefore = makeSnapshot('react@18.0.0');
    const snapshotAfter = makeSnapshot('react@18.1.0');
    const manifests = makeManifests({ name: 'pkg-a', deps: { react: '^18.0.0' } });

    const result = findAffectedPackages({
      snapshotBefore,
      snapshotAfter,
      manifests,
    });

    expect(result).toContain('pkg-a');
  });

  it('respects the dependency filter', () => {
    const snapshotBefore = makeSnapshot('react@18.0.0');
    const snapshotAfter = makeSnapshot('react@18.1.0');
    const manifests = makeManifests({ name: 'pkg-a', devDeps: { react: '^18.0.0' } });

    const result = findAffectedPackages({
      snapshotBefore,
      snapshotAfter,
      manifests,
      filter: { dependencies: true },
    });

    expect(result.size).toBe(0);
  });

  it('returns a ReadonlySet', () => {
    const snapshotBefore = makeSnapshot('react@18.0.0');
    const snapshotAfter = makeSnapshot('react@18.0.0');
    const manifests: { name: string }[] = [];

    const result = findAffectedPackages({
      snapshotBefore,
      snapshotAfter,
      manifests,
    });

    expect(result).toBeInstanceOf(Set);
  });
});
