# lockfile-affected

[![CI](https://github.com/split/lockfile-affected/actions/workflows/ci.yml/badge.svg)](https://github.com/split/lockfile-affected/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/lockfile-affected)](https://www.npmjs.com/package/lockfile-affected)

Find which workspace packages are affected by lockfile changes.

## Purpose

In monorepos, it is hard to build automation that reacts reliably to transitive
dependency updates recorded only in lockfiles.

That gap can prevent dependency and security fixes from being rebuilt,
retested, and deployed in the workspace packages they actually impact.

`lockfile-affected` maps lockfile deltas to affected workspace packages so
Git and CI pipelines can react deterministically.

## Installation

Install globally when you want a persistent `lockfile-affected` command:

```sh
npm install -g lockfile-affected
# or
pnpm add -g lockfile-affected
```

Install in a repository:

```sh
pnpm add -D lockfile-affected
```

## Usage

Pass the before and after lockfile snapshots as arguments. Use shell process
substitution to avoid temp files:

```sh
# Compare against a specific branch
lockfile-affected <(git show origin/main:pnpm-lock.yaml) pnpm-lock.yaml

# Compare against the merge base (typical CI usage)
BASE=$(git merge-base HEAD origin/main)
lockfile-affected <(git show $BASE:pnpm-lock.yaml) pnpm-lock.yaml
```

Or pipe the before snapshot via stdin using `-` (works with `npx`):

```sh
git show origin/main:pnpm-lock.yaml | npx lockfile-affected - pnpm-lock.yaml
```

Works with pnpm, npm, and yarn lockfiles (classic v1 and berry v2+).

## Options

```
--workspace <path>         Root directory to search for package.json files (defaults to cwd)
--format <pnpm|npm|yarn>   Lockfile format override (auto-detected by default)
--json                     Output as a JSON array instead of newline-separated
--deps                     Include production dependencies
--dev                      Include dev dependencies
--peer                     Include peer dependencies
--optional                 Include optional dependencies
                           (when no dep flags are set, all types are included)
--help                     Show help
```

## Related packages

- [`@lockfile-affected/core`](https://www.npmjs.com/package/@lockfile-affected/core) — programmatic API, pure diff and resolution engine
- [`@lockfile-affected/lockfile-pnpm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-pnpm) — pnpm-lock.yaml parser
- [`@lockfile-affected/lockfile-npm`](https://www.npmjs.com/package/@lockfile-affected/lockfile-npm) — package-lock.json parser
- [`@lockfile-affected/lockfile-yarn`](https://www.npmjs.com/package/@lockfile-affected/lockfile-yarn) — yarn.lock parser
