# @lockfile-affected/core

> **Warning:** This tool is still in early development. The API may change, and some features are incomplete or not yet fully tested. Use in production at your own risk.

Diff engine, affected-package resolver, and programmatic API for `lockfile-affected`.

## Installation

```sh
npm install @lockfile-affected/core
```

## Programmatic API

### `findAffectedPackages(options)` - high-level entry point

Diffs two lockfile snapshots and returns the names of affected packages.
Caller is responsible for parsing lockfiles and loading manifests.

```ts
import { findAffectedPackages, loadWorkspaceManifests } from '@lockfile-affected/core';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';

const [snapshotBefore, snapshotAfter, manifests] = await Promise.all([
  pnpmLockfileParser.parse(fs.readFileSync('pnpm-lock.yaml.old', 'utf-8')),
  pnpmLockfileParser.parse(fs.readFileSync('pnpm-lock.yaml', 'utf-8')),
  loadWorkspaceManifests(process.cwd()),
]);

const affected = findAffectedPackages({
  snapshotBefore,
  snapshotAfter,
  manifests,
  // filter: { dependencies: true } - optional
  // rootDepsAffectAll: true - optional
});
// ReadonlySet<string> of affected package names
```

### `detectLockfile(content, parsers)`

Detects the lockfile format by trying each parser's `detect` method.

```ts
import { detectLockfile } from '@lockfile-affected/core';
import { pnpmLockfileParser, npmLockfileParser, yarnLockfileParser } from '...';

const format = detectLockfile(lockfileContent, [
  pnpmLockfileParser,
  npmLockfileParser,
  yarnLockfileParser,
]);
// format: "pnpm" | "npm" | "yarn" | "bun"
```

### `loadWorkspaceManifests(dir)`

Recursively walks `dir` and returns all valid `package.json` manifests,
skipping `node_modules` and malformed files.

```ts
import { loadWorkspaceManifests } from '@lockfile-affected/core';

const manifests = await loadWorkspaceManifests(process.cwd());
```

## Low-level API

These primitives are useful for building custom pipelines.

### `diffLockfileSnapshots(before, after)`

```ts
import { diffLockfileSnapshots } from '@lockfile-affected/core';

const diff = diffLockfileSnapshots(snapshotBefore, snapshotAfter);
// diff.addedContexts - Map<context, Map<name, version>>
// diff.removedContexts - Map<context, Map<name, version>>
// diff.changed - Map<context, { added, removed, changed }>
```

### `resolveAffectedPackages(diff, workspaceGraph, filter?)`

```ts
import { resolveAffectedPackages, allDependencyTypes } from '@lockfile-affected/core';

const affected = resolveAffectedPackages(diff, workspaceGraph, allDependencyTypes);
// ReadonlySet<string> of affected package names
```

### `buildWorkspaceGraph(manifests)`

```ts
import { buildWorkspaceGraph } from '@lockfile-affected/core';

const graph = buildWorkspaceGraph(manifests);
// ReadonlyMap<name, WorkspacePackage>
```

## Types

```ts
type DependencyFilter = {
  dependencies?: boolean;
  devDependencies?: boolean;
  peerDependencies?: boolean;
  optionalDependencies?: boolean;
};

type LockfileParser = {
  format: string;
  lockfileNames?: readonly string[];
  detect: (content: string) => boolean;
  parse: (content: string) => Promise<LockfileSnapshot>;
};

// Maps context (workspace path) to package name -> resolved version
// e.g., "." for root, "packages/pkg-a" for workspace packages
type LockfileSnapshot = ReadonlyMap<string, ReadonlyMap<string, string>>;

type LockfileDiff = {
  addedContexts: ReadonlyMap<string, ReadonlyMap<string, string>>;
  removedContexts: ReadonlyMap<string, ReadonlyMap<string, string>>;
  changed: ReadonlyMap<
    string,
    {
      added: ReadonlyMap<string, string>;
      removed: ReadonlyMap<string, string>;
      changed: ReadonlyMap<string, { from: string; to: string }>;
    }
  >;
};
```

For Git-based and CI usage patterns, see the CLI guide:
`https://github.com/split/lockfile-affected/tree/main/packages/cli#readme`.
