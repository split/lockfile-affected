import type { LockfileDiff, LockfileSnapshot } from '../types/lockfile.js';

/**
 * Computes the difference between two lockfile snapshots.
 * Pure function: no side effects, same input always produces same output.
 */
export function diffLockfileSnapshots(
  before: LockfileSnapshot,
  after: LockfileSnapshot,
): LockfileDiff {
  const added = new Map<string, string>();
  const removed = new Map<string, string>();
  const changed = new Map<string, { from: string; to: string }>();

  for (const [name, version] of after) {
    const previousVersion = before.get(name);
    if (previousVersion === undefined) {
      added.set(name, version);
    } else if (previousVersion !== version) {
      changed.set(name, { from: previousVersion, to: version });
    }
  }

  for (const [name, version] of before) {
    if (!after.has(name)) {
      removed.set(name, version);
    }
  }

  return { added, removed, changed };
}
