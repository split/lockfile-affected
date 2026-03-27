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
