import { describe, expect, it } from 'vitest';
import { diffLockfileSnapshots } from './diff-lockfile-snapshots.js';

describe('diffLockfileSnapshots', () => {
  it('returns empty diff when both snapshots are identical', () => {
    const snapshot = new Map([['lodash', '4.17.21']]);
    const diff = diffLockfileSnapshots(snapshot, snapshot);

    expect(diff.added.size).toBe(0);
    expect(diff.removed.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });

  it('detects added packages', () => {
    const before = new Map([['lodash', '4.17.21']]);
    const after = new Map([
      ['lodash', '4.17.21'],
      ['react', '18.3.0'],
    ]);

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.added.size).toBe(1);
    expect(diff.added.get('react')).toBe('18.3.0');
    expect(diff.removed.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });

  it('detects removed packages', () => {
    const before = new Map([
      ['lodash', '4.17.21'],
      ['react', '18.3.0'],
    ]);
    const after = new Map([['lodash', '4.17.21']]);

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.removed.size).toBe(1);
    expect(diff.removed.get('react')).toBe('18.3.0');
    expect(diff.added.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });

  it('detects changed packages', () => {
    const before = new Map([['lodash', '4.17.20']]);
    const after = new Map([['lodash', '4.17.21']]);

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.changed.size).toBe(1);
    expect(diff.changed.get('lodash')).toEqual({ from: '4.17.20', to: '4.17.21' });
    expect(diff.added.size).toBe(0);
    expect(diff.removed.size).toBe(0);
  });

  it('handles multiple simultaneous changes', () => {
    const before = new Map([
      ['lodash', '4.17.20'],
      ['react', '17.0.2'],
      ['unused', '1.0.0'],
    ]);
    const after = new Map([
      ['lodash', '4.17.21'],
      ['react', '17.0.2'],
      ['new-pkg', '2.0.0'],
    ]);

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.changed.size).toBe(1);
    expect(diff.changed.get('lodash')).toEqual({ from: '4.17.20', to: '4.17.21' });
    expect(diff.added.size).toBe(1);
    expect(diff.added.get('new-pkg')).toBe('2.0.0');
    expect(diff.removed.size).toBe(1);
    expect(diff.removed.get('unused')).toBe('1.0.0');
  });

  it('handles empty before snapshot', () => {
    const before = new Map<string, string>();
    const after = new Map([['react', '18.0.0']]);

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.added.size).toBe(1);
    expect(diff.removed.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });

  it('handles empty after snapshot', () => {
    const before = new Map([['react', '18.0.0']]);
    const after = new Map<string, string>();

    const diff = diffLockfileSnapshots(before, after);

    expect(diff.removed.size).toBe(1);
    expect(diff.added.size).toBe(0);
    expect(diff.changed.size).toBe(0);
  });
});
