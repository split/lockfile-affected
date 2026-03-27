# @lockfile-affected/lockfile-pnpm

pnpm-lock.yaml adapter for [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected).

Parses `pnpm-lock.yaml` content into a normalized `name → version` snapshot
consumed by `@lockfile-affected/core`.

## Installation

```sh
npm install @lockfile-affected/lockfile-pnpm
```

## Usage

```ts
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';

const snapshot = await pnpmLockfileParser.parse(lockfileContent);
// ReadonlyMap<string, string>  (name → resolved version)
```

The parser implements the `LockfileParser` interface from `@lockfile-affected/core`:

```ts
pnpmLockfileParser.format; // "pnpm"
pnpmLockfileParser.lockfileNames; // ["pnpm-lock.yaml"]
```

## Related packages

- [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected) — CLI
- [`@lockfile-affected/core`](https://www.npmjs.com/package/@lockfile-affected/core) — diff engine and types
- [`@lockfile-affected/lockfile-npm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-npm) — npm adapter
- [`@lockfile-affected/lockfile-yarn`](https://www.npmjs.com/package/@lockfile-affected/lockfile-yarn) — yarn adapter
