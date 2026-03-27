# @lockfile-affected/core

Pure diff engine and affected-package resolver for `lockfile-affected`.

This package contains all domain logic with no I/O. It is format-agnostic —
lockfile parsers live in separate adapter packages.

## Installation

```sh
npm install @lockfile-affected/core
```

## API

### `diffLockfileSnapshots(before, after)`

Compares two lockfile snapshots and returns what changed.

```ts
import { diffLockfileSnapshots } from '@lockfile-affected/core';

const diff = diffLockfileSnapshots(snapshotBefore, snapshotAfter);
// diff.added   — Map<name, newVersion>
// diff.removed — Map<name, oldVersion>
// diff.changed — Map<name, { from, to }>
```

### `resolveAffectedPackages(diff, workspaceGraph, filter?)`

Returns the names of workspace packages that depend on any package in the diff.

```ts
import { resolveAffectedPackages, ALL_DEPENDENCY_TYPES } from '@lockfile-affected/core';

const affected = resolveAffectedPackages(diff, workspaceGraph, ALL_DEPENDENCY_TYPES);
// Set<string> of affected package names
```

The optional `filter` is a `DependencyFilter` controlling which dependency types
are considered. Omitting a field (or setting it to `false`) excludes that type.
When omitted entirely, all types are included.

```ts
type DependencyFilter = {
  dependencies?: boolean;
  devDependencies?: boolean;
  peerDependencies?: boolean;
  optionalDependencies?: boolean;
};
```

### `buildWorkspaceGraph(manifests)`

Builds a workspace graph from an array of parsed `package.json` objects.

```ts
import { buildWorkspaceGraph } from '@lockfile-affected/core';

const graph = buildWorkspaceGraph(manifests);
// ReadonlyMap<name, WorkspacePackage>
```

## Types

```ts
type LockfileSnapshot = ReadonlyMap<string, string>;

type LockfileDiff = {
  added: ReadonlyMap<string, string>;
  removed: ReadonlyMap<string, string>;
  changed: ReadonlyMap<string, { from: string; to: string }>;
};

type LockfileParser = {
  format: string;
  lockfileNames: readonly string[];
  parse: (content: string) => Promise<LockfileSnapshot>;
};
```

## Related packages

- [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected) — CLI
- [`@lockfile-affected/lockfile-pnpm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-pnpm) — pnpm adapter
- [`@lockfile-affected/lockfile-npm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-npm) — npm adapter
- [`@lockfile-affected/lockfile-yarn`](https://www.npmjs.com/package/@lockfile-affected/lockfile-yarn) — yarn adapter
