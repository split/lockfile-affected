# @lockfile-affected/lockfile-pnpm

`pnpm-lock.yaml` adapter for [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected).

## Minimal usage

Parse lockfile content into a normalized `name -> version` snapshot.

```ts
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';

const snapshot = await pnpmLockfileParser.parse(lockfileContent);
```

The parser implements the `LockfileParser` interface from `@lockfile-affected/core`.

## Installation

```sh
npm install @lockfile-affected/lockfile-pnpm
```

For Git-based and CI usage patterns, see
[`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected)
or the [CLI README](https://github.com/split/lockfile-affected/tree/main/packages/cli#readme).
