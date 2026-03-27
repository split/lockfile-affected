# @lockfile-affected/lockfile-npm

package-lock.json adapter for [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected).

Parses `package-lock.json` content into a normalized `name → version` snapshot
consumed by `@lockfile-affected/core`.

## Installation

```sh
npm install @lockfile-affected/lockfile-npm
```

## Usage

```ts
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';

const snapshot = await npmLockfileParser.parse(lockfileContent);
// ReadonlyMap<string, string>  (name → resolved version)
```

The parser implements the `LockfileParser` interface from `@lockfile-affected/core`:

```ts
npmLockfileParser.format; // "npm"
npmLockfileParser.lockfileNames; // ["package-lock.json"]
```

## Related packages

- [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected) — CLI
- [`@lockfile-affected/core`](https://www.npmjs.com/package/@lockfile-affected/core) — diff engine and types
- [`@lockfile-affected/lockfile-pnpm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-pnpm) — pnpm adapter
- [`@lockfile-affected/lockfile-yarn`](https://www.npmjs.com/package/@lockfile-affected/lockfile-yarn) — yarn adapter
