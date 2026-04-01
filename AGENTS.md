## Code style

- Pure functions preferred; side effects only at I/O boundaries
- Name files after what they do: `parse-pnpm-lockfile.ts`, `resolve-affected-packages.ts`
- No force casts (`as Foo`) — use type guards and narrowing
- Imports require `.js` extensions (NodeNext module resolution)
- Conventional commits for commit messages

## Architecture

Vertical slice — one package per concern:

- `@lockfile-affected/core` — pure domain logic, cli and adapter agnostic
- `@lockfile-affected/lockfile-*` — one package per lockfile format
- `@lockfile-affected/cli` — I/O boundary, orchestration

## Adding a lockfile format

1. Create `packages/lockfile-<format>/`
2. Export a `LockfileParser` from `@lockfile-affected/core`
3. Write tests against fixture content before implementing
4. Register the parser in `@lockfile-affected/cli`

## Feedback loop

After every change:

```
pnpm test && pnpm typecheck && pnpm format:check && pnpm lint
```

Write tests before implementation. One logical change per commit.

If CLI or API changes are made, update the relevant README files:

- CLI changes → `packages/cli/README.md`
- Core API changes → `packages/core/README.md`
- Root-level changes → `README.md`
