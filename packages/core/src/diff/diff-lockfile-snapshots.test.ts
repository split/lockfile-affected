import { describe, expect, it } from 'vitest';
import { diffLockfileSnapshots } from './diff-lockfile-snapshots.js';

const makeSnapshot = (entries: Record<string, string>): Map<string, Map<string, string>> => {
  const snapshot = new Map<string, Map<string, string>>();
  const rootPackages = new Map<string, string>(Object.entries(entries));
  snapshot.set('.', rootPackages);
  return snapshot;
};

describe('diffLockfileSnapshots', () => {
  it('returns empty diff when both snapshots are identical', () => {
    const snapshot = makeSnapshot({ lodash: '4.17.21' });
    const diff = diffLockfileSnapshots(snapshot, snapshot);

    expect(diff.addedContexts.size).toBe(0);
    expect(diff.removedContexts.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });

  it('detects added packages', () => {
    const before = makeSnapshot({ lodash: '4.17.21' });
    const after = makeSnapshot({ lodash: '4.17.21', react: '18.3.0' });

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.changed.get('.')?.added.size).toBe(1);
    expect(diff.changed.get('.')?.added.get('react')).toBe('18.3.0');
    expect(diff.changed.get('.')?.removed.size).toBe(0);
    expect(diff.changed.get('.')?.changed.size).toBe(0);
  });

  it('detects removed packages', () => {
    const before = makeSnapshot({ lodash: '4.17.21', react: '18.3.0' });
    const after = makeSnapshot({ lodash: '4.17.21' });

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.changed.get('.')?.removed.size).toBe(1);
    expect(diff.changed.get('.')?.removed.get('react')).toBe('18.3.0');
    expect(diff.changed.get('.')?.added.size).toBe(0);
    expect(diff.changed.get('.')?.changed.size).toBe(0);
  });

  it('detects changed packages', () => {
    const before = makeSnapshot({ lodash: '4.17.20' });
    const after = makeSnapshot({ lodash: '4.17.21' });

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.changed.size).toBe(1);
    expect(diff.changed.get('.')?.changed.get('lodash')).toEqual({
      from: '4.17.20',
      to: '4.17.21',
    });
    expect(diff.changed.get('.')?.added.size).toBe(0);
    expect(diff.changed.get('.')?.removed.size).toBe(0);
  });

  it('handles multiple simultaneous changes', () => {
    const before = makeSnapshot({
      lodash: '4.17.20',
      react: '17.0.2',
      unused: '1.0.0',
    });
    const after = makeSnapshot({
      lodash: '4.17.21',
      react: '17.0.2',
      'new-pkg': '2.0.0',
    });

    const diff = diffLockfileSnapshots(before, after);

    const rootChanged = diff.changed.get('.');
    expect(rootChanged?.changed.size).toBe(1);
    expect(rootChanged?.changed.get('lodash')).toEqual({ from: '4.17.20', to: '4.17.21' });
    expect(rootChanged?.added.size).toBe(1);
    expect(rootChanged?.added.get('new-pkg')).toBe('2.0.0');
    expect(rootChanged?.removed.size).toBe(1);
    expect(rootChanged?.removed.get('unused')).toBe('1.0.0');
  });

  it('handles empty before snapshot', () => {
    const before = new Map<string, Map<string, string>>();
    const after = makeSnapshot({ react: '18.0.0' });

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.addedContexts.size).toBe(1);
    expect(diff.addedContexts.get('.')?.get('react')).toBe('18.0.0');
    expect(diff.removedContexts.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });

  it('handles empty after snapshot', () => {
    const before = makeSnapshot({ react: '18.0.0' });
    const after = new Map<string, Map<string, string>>();

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.removedContexts.size).toBe(1);
    expect(diff.removedContexts.get('.')?.get('react')).toBe('18.0.0');
    expect(diff.addedContexts.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });

  it('detects changes in specific importer context', () => {
    const before = new Map<string, Map<string, string>>([
      ['.', new Map([['lodash', '4.17.21']])],
      ['packages/pkg-a', new Map([['lodash', '4.17.20']])],
    ]);
    const after = new Map<string, Map<string, string>>([
      ['.', new Map([['lodash', '4.17.21']])],
      ['packages/pkg-a', new Map([['lodash', '4.17.25']])],
    ]);

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.changed.size).toBe(1);
    expect(diff.changed.get('packages/pkg-a')?.changed.get('lodash')).toEqual({
      from: '4.17.20',
      to: '4.17.25',
    });
    expect(diff.changed.get('.')).toBeUndefined();
  });
});
