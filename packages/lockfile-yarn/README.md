# @lockfile-affected/lockfile-yarn

yarn.lock adapter for [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected).

Parses `yarn.lock` content into a normalized `name → version` snapshot
consumed by `@lockfile-affected/core`. Supports both classic (v1) and
berry (v2+) yarn lockfile formats.

## Installation

```sh
npm install @lockfile-affected/lockfile-yarn
```

## Usage

```ts
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';

const snapshot = await yarnLockfileParser.parse(lockfileContent);
// ReadonlyMap<string, string>  (name → resolved version)
```

The parser implements the `LockfileParser` interface from `@lockfile-affected/core`:

```ts
yarnLockfileParser.format; // "yarn"
yarnLockfileParser.lockfileNames; // ["yarn.lock"]
```

Classic v1 and berry v2+ formats are detected automatically from the file content.

## Related packages

- [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected) — CLI
- [`@lockfile-affected/core`](https://www.npmjs.com/package/@lockfile-affected/core) — diff engine and types
- [`@lockfile-affected/lockfile-pnpm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-pnpm) — pnpm adapter
- [`@lockfile-affected/lockfile-npm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-npm) — npm adapter
