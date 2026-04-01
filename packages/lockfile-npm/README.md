# @lockfile-affected/lockfile-npm

> **Warning:** This tool is still in early development. The API may change, and some features are incomplete or not yet fully tested. Use in production at your own risk.

`package-lock.json` adapter for [`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected).

## Minimal usage

Parse lockfile content into a normalized `name -> version` snapshot.

```ts
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';

const snapshot = await npmLockfileParser.parse(lockfileContent);
```

The parser implements the `LockfileParser` interface from `@lockfile-affected/core`.

## Installation

```sh
npm install @lockfile-affected/lockfile-npm
```

For Git-based and CI usage patterns, see
[`lockfile-affected`](https://www.npmjs.com/package/lockfile-affected)
or the [CLI README](https://github.com/split/lockfile-affected/tree/main/packages/cli#readme).

## Publishing

This package is automatically published to npm via GitHub Actions with provenance attestation.
