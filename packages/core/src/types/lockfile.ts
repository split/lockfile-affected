/**
 * A normalized snapshot of a lockfile: maps each package name to its resolved version.
 * This is the common representation all lockfile adapters produce.
 */
export type LockfileSnapshot = ReadonlyMap<string, string>;

/**
 * The result of comparing two lockfile snapshots.
 */
export type LockfileDiff = {
  /** Packages added in the new snapshot. key = name, value = new version */
  readonly added: ReadonlyMap<string, string>;
  /** Packages removed from the new snapshot. key = name, value = old version */
  readonly removed: ReadonlyMap<string, string>;
  /** Packages whose resolved version changed. key = name, value = { from, to } */
  readonly changed: ReadonlyMap<string, { readonly from: string; readonly to: string }>;
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

/** A DependencyFilter that includes all dependency types. */
export const ALL_DEPENDENCY_TYPES: DependencyFilter = {
  dependencies: true,
  devDependencies: true,
  peerDependencies: true,
  optionalDependencies: true,
};

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
  readonly lockfileNames: readonly string[];
  /** Parse raw lockfile content into a normalized snapshot */
  readonly parse: (content: string) => Promise<LockfileSnapshot>;
};
