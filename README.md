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

Works with pnpm, npm, and yarn lockfiles.

## Options

```
--workspace <path>    Root directory to search for package.json files (defaults to cwd)
--format <pnpm|npm|yarn>  Lockfile format override (auto-detected by default)
--json                Output as a JSON array instead of newline-separated
--deps                Include production dependencies
--dev                 Include dev dependencies
--peer                Include peer dependencies
--optional            Include optional dependencies
                      (when no dep flags are set, all types are included)
--help                Show help
```
