# lockfile-affected

Find which workspace packages are affected by lockfile changes.

## Installation

```sh
npm install -g lockfile-affected
# or
pnpm add -g lockfile-affected
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

Works with pnpm, npm, and yarn lockfiles (classic v1 and berry v2+).

See the [`lockfile-affected` package](https://www.npmjs.com/package/lockfile-affected)
for the full list of options.

## Packages

- [`lockfile-affected`](packages/cli) — CLI
- [`@lockfile-affected/core`](packages/core) — pure diff and resolution engine
- [`@lockfile-affected/lockfile-pnpm`](packages/lockfile-pnpm) — pnpm-lock.yaml parser
- [`@lockfile-affected/lockfile-npm`](packages/lockfile-npm) — package-lock.json parser
- [`@lockfile-affected/lockfile-yarn`](packages/lockfile-yarn) — yarn.lock parser
