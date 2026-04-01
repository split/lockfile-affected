/**
 * A normalized snapshot of a lockfile: maps each context (importer/workspace path)
 * to a map of package name → resolved version.
 *
 * The context is the workspace/importer path:
 * - pnpm: "." for root, "packages/pkg-a" for workspace packages
 * - npm/yarn/bun: "." for root, workspace paths
 *
 * This hierarchical structure preserves per-context version resolution, ensuring
 * changes in specific workspace packages are detected even if the same package
 * exists elsewhere with a different version.
 */
export type LockfileSnapshot = ReadonlyMap<string, ReadonlyMap<string, string>>;

/**
 * Changes within a single context (importer/workspace).
 */
export type ContextDiff = {
  /** Packages added in this context. key = name, value = new version */
  readonly added: ReadonlyMap<string, string>;
  /** Packages removed from this context. key = name, value = old version */
  readonly removed: ReadonlyMap<string, string>;
  /** Packages whose resolved version changed in this context. key = name, value = { from, to } */
  readonly changed: ReadonlyMap<string, { readonly from: string; readonly to: string }>;
};

/**
 * The result of comparing two lockfile snapshots.
 * Compares per-context to detect changes in specific workspace packages.
 */
export type LockfileDiff = {
  /** Contexts added in the new snapshot (new workspace packages). key = context path */
  readonly addedContexts: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** Contexts removed from the new snapshot. key = context path, value = packages that were there */
  readonly removedContexts: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** Changes per context. key = context path, value = diff for that context */
  readonly changed: ReadonlyMap<string, ContextDiff>;
};

/**
 * The dependency types tracked per workspace package.
 * Mirrors the fields in package.json.
 */
export type DependencyGroups = {
  readonly dependencies: ReadonlySet<string>;
  readonly devDependencies: ReadonlySet<string>;
  readonly peerDependencies: ReadonlySet<string>;
  readonly optionalDependencies: ReadonlySet<string>;
};

/**
 * Controls which dependency types are considered when resolving affected packages.
 * Omitting a field (or setting it to false) excludes that type.
 */
export type DependencyFilter = {
  readonly dependencies?: boolean;
  readonly devDependencies?: boolean;
  readonly peerDependencies?: boolean;
  readonly optionalDependencies?: boolean;
};

export const allDependencyTypes = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] satisfies (keyof DependencyFilter)[];

export type DependencyTypeKey = (typeof allDependencyTypes)[number];

export const allDependencyTypesEnabled = {
  dependencies: true,
  devDependencies: true,
  peerDependencies: true,
  optionalDependencies: true,
} satisfies DependencyFilter;

/**
 * Represents a single package in the workspace (monorepo member).
 */
export type WorkspacePackage = {
  /** The package name from its package.json */
  readonly name: string;
  /** Dependencies grouped by type, as declared in package.json */
  readonly dependencyGroups: DependencyGroups;
};

/**
 * The full workspace graph: all packages in the monorepo.
 */
export type WorkspaceGraph = ReadonlyMap<string, WorkspacePackage>;

/**
 * Contract for lockfile adapters. Each lockfile format provides one of these.
 */
export type LockfileParser = {
  /** Human-readable name for this format, e.g. "pnpm" */
  readonly format: string;
  /** Filenames this parser handles, e.g. ["pnpm-lock.yaml"] */
  readonly lockfileNames?: readonly string[];
  /** Detect if this parser can handle the given lockfile content */
  readonly detect: (content: string) => boolean;
  /** Parse raw lockfile content into a normalized snapshot */
  readonly parse: (content: string) => Promise<LockfileSnapshot>;
};
