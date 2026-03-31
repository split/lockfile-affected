import type { ContextDiff, LockfileDiff, LockfileSnapshot } from '../types/lockfile.js';

/**
 * Computes the difference between two lockfile snapshots.
 * Compares per-context to detect changes in specific workspace packages.
 * Pure function: no side effects, same input always produces same output.
 */
export function diffLockfileSnapshots(
  before: LockfileSnapshot,
  after: LockfileSnapshot,
): LockfileDiff {
  const addedContexts = new Map<string, ReadonlyMap<string, string>>();
  const removedContexts = new Map<string, ReadonlyMap<string, string>>();
  const changed = new Map<string, ContextDiff>();

  for (const [context, packages] of after) {
    const beforePackages = before.get(context);

    if (beforePackages === undefined) {
      addedContexts.set(context, packages);
    } else {
      const contextDiff = diffContext(beforePackages, packages);
      if (
        contextDiff.added.size > 0 ||
        contextDiff.removed.size > 0 ||
        contextDiff.changed.size > 0
      ) {
        changed.set(context, contextDiff);
      }
    }
  }

  for (const [context, packages] of before) {
    if (!after.has(context)) {
      removedContexts.set(context, packages);
    }
  }

  return { addedContexts, removedContexts, changed };
}

function diffContext(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): ContextDiff {
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
