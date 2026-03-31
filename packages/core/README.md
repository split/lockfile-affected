# @lockfile-affected/core

Diff engine, affected-package resolver, and programmatic API for `lockfile-affected`.

## Installation

```sh
npm install @lockfile-affected/core
```

## Programmatic API

### `findAffectedPackages(options)` - high-level entry point

Parses two lockfile snapshots, diffs them, loads workspace manifests from disk,
and returns the names of affected packages. This is the primary API for
programmatic use.

```ts
import { findAffectedPackages } from '@lockfile-affected/core';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';

const affected = await findAffectedPackages({
  beforeContent: fs.readFileSync('pnpm-lock.yaml.old', 'utf-8'),
  afterContent: fs.readFileSync('pnpm-lock.yaml', 'utf-8'),
  parser: pnpmLockfileParser,
  workspaceRoot: process.cwd(),
  // filter: { dependencies: true, devDependencies: true } - optional
});
// ReadonlySet<string> of affected package names
```

### `detectLockfile(dir, parsers)`

Finds the first known lockfile in `dir` by checking each parser's `lockfileNames`.

```ts
import { detectLockfile } from '@lockfile-affected/core';
import { pnpmLockfileParser, npmLockfileParser, yarnLockfileParser } from '...';

const { format, path } = await detectLockfile(process.cwd(), [
  pnpmLockfileParser,
  npmLockfileParser,
  yarnLockfileParser,
]);
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
// diff.added   - Map<name, newVersion>
// diff.removed - Map<name, oldVersion>
// diff.changed - Map<name, { from, to }>
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
  lockfileNames: readonly string[];
  parse: (content: string) => Promise<LockfileSnapshot>;
};

type LockfileSnapshot = ReadonlyMap<string, string>;

type LockfileDiff = {
  added: ReadonlyMap<string, string>;
  removed: ReadonlyMap<string, string>;
  changed: ReadonlyMap<string, { from: string; to: string }>;
};
```

For Git-based and CI usage patterns, see the CLI guide:
`https://github.com/split/lockfile-affected/tree/main/packages/cli#readme`.
