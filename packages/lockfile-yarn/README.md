# @lockfile-affected/lockfile-yarn

`yarn.lock` adapter for [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected).

Supports both classic (v1) and berry (v2+) lockfile formats.

## Minimal usage

Parse lockfile content into a normalized `name -> version` snapshot.

```ts
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';

const snapshot = await yarnLockfileParser.parse(lockfileContent);
```

The parser implements the `LockfileParser` interface from `@lockfile-affected/core`.

## Installation

```sh
npm install @lockfile-affected/lockfile-yarn
```

For Git-based and CI usage patterns, see
[`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected)
or the [CLI README](https://github.com/split/lockfile-affected/tree/main/packages/cli#readme).
