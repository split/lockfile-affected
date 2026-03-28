# @lockfile-affected/lockfile-bun

bun.lock adapter for [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected).

Parses `bun.lock` content into a normalized `name -> version` snapshot
consumed by `@lockfile-affected/core`.

## Installation

```sh
npm install @lockfile-affected/lockfile-bun
```

## Usage

```ts
import { bunLockfileParser } from '@lockfile-affected/lockfile-bun';

const snapshot = await bunLockfileParser.parse(lockfileContent);
// ReadonlyMap<string, string> (name -> resolved version)
```

The parser implements the `LockfileParser` interface from `@lockfile-affected/core`:

```ts
bunLockfileParser.format; // "bun"
bunLockfileParser.lockfileNames; // ["bun.lock"]
```

## Related packages

- [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected) - CLI
- [`@lockfile-affected/core`](https://www.npmjs.com/package/@lockfile-affected/core) - diff engine and types
- [`@lockfile-affected/lockfile-pnpm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-pnpm) - pnpm adapter
- [`@lockfile-affected/lockfile-npm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-npm) - npm adapter
- [`@lockfile-affected/lockfile-yarn`](https://www.npmjs.com/package/@lockfile-affected/lockfile-yarn) - yarn adapter
