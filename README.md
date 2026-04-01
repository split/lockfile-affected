# lockfile-affected

[![CI](https://github.com/split/lockfile-affected/actions/workflows/ci.yml/badge.svg)](https://github.com/split/lockfile-affected/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/lockfile-affected)](https://www.npmjs.com/package/lockfile-affected)

> **Warning:** This tool is still in early development. The API may change, and some features are incomplete or not yet fully tested. Use in production at your own risk.

Find which workspace packages are affected by lockfile changes.

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

Works with pnpm, npm, Yarn Berry (v2+), and Bun lockfiles (`bun.lock`).

For full Git and CI usage patterns, see the CLI guide:
[`packages/cli/README.md`](packages/cli/README.md).

## Packages

- [`lockfile-affected`](packages/cli) — CLI
- [`@lockfile-affected/core`](packages/core) — pure diff and resolution engine
- [`@lockfile-affected/lockfile-pnpm`](packages/lockfile-pnpm) — pnpm-lock.yaml parser
- [`@lockfile-affected/lockfile-npm`](packages/lockfile-npm) — package-lock.json parser
- [`@lockfile-affected/lockfile-yarn`](packages/lockfile-yarn) — yarn.lock parser (Yarn Berry v2+)
- [`@lockfile-affected/lockfile-bun`](packages/lockfile-bun) — bun.lock parser

## Development

This project was developed with AI assistance.
