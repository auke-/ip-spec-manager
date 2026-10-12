# Implementation Plan: Client-side Project Metadata Caching & Lazy Specification Inspection

## Context & Problem
Every time the application loads, it fetches all repositories under the root group (~300 projects). Previously, `GitlabApi.refreshData()` immediately triggered `resolveAllProjectMetadata(projectsList)` for all 300 projects simultaneously in batches of 6, where each project initiated 6–10 subsequent requests (tags, branch commits, commits history, recursive tree scans across multiple paths, raw service.properties file downloads, and OpenAPI YAML checks). For 300+ repositories, this led to **over 3,000 network requests** to the GitLab instance on every page load, causing browser congestion, network timeouts, and potential GitLab API rate limiting.

Based on the user's requirements:
1. **Cache key:** Cache metadata keyed by `projectId`, storing the `latestCommitSha`, `specType`, `currentTag`, `serviceProperties`, `operations`, and cached timestamp.
2. **Persistence:** Use **IndexedDB** for persistent offline and multi-session storage, with graceful fallback to `localStorage` (and in-memory fallback if storage APIs are restricted).
3. **Execution strategy:** **Lazy inspection plus on-demand single-project and bulk refresh**:
   - Initial load only fetches the project & subgroup list (only a few paginated requests to `/groups/:id/projects`).
   - If cached metadata exists for a project in IndexedDB, the project table immediately displays cached information (spec type, version tag, operations count, etc.) without making any additional requests.
   - When a user opens/inspects a specific project drawer or clicks an inline "Refresh" button on a row, check the project's default branch latest commit hash against the cached commit hash. If unchanged, reuse the cached metadata; if changed or missing, fetch and update the cache.
   - Provide a "Scan All Unresolved" / "Bulk Refresh" button with progress indication so users can update all projects on demand when desired without forcing 3,000 requests on start.
   - Provide visual cache indicators in the UI (e.g. cached badge, last verified timestamp, one-click refresh button per project, and cache management in settings with a "Clear Cache" button).

---

## Proposed Changes

### 1. New Service: `ProjectCacheService` (`/src/app/services/project-cache.ts`)
- Implements an IndexedDB store (`gitlab_spec_cache_db`, store: `project_metadata`) with `localStorage` and memory fallbacks.
- Store schema per project record:
  ```ts
  export interface CachedProjectMetadata {
    projectId: number;
    defaultBranch: string;
    latestCommitSha: string;
    specType: SpecType;
    currentTag: string;
    operations?: string[];
    suwimlHeaderVersion?: string;
    serviceProperties?: SuwimlServiceProperties;
    cachedAt: number; // timestamp
    lastVerifiedAt?: number;
  }
  ```
- Exposes async methods:
  - `get(projectId: number): Promise<CachedProjectMetadata | null>`
  - `getAll(): Promise<Map<number, CachedProjectMetadata>>`
  - `set(record: CachedProjectMetadata): Promise<void>`
  - `setBatch(records: CachedProjectMetadata[]): Promise<void>`
  - `delete(projectId: number): Promise<void>`
  - `clear(): Promise<void>`
  - `getStorageStats(): Promise<{ count: number; storageType: 'indexeddb' | 'localstorage' | 'memory' }>`

### 2. Update `GitlabApi` (`/src/app/services/gitlab-api.ts`)
- Inject `ProjectCacheService`.
- On `refreshData()`:
  - Fetch subgroup list and projects list via `/groups/:id/projects`.
  - Load all cached entries from `ProjectCacheService` in a single fast IndexedDB query.
  - Merge existing cached metadata immediately into the `projects` signal: projects with cached metadata immediately show their `specType`, `currentTag`, `operations`, and `serviceProperties` with zero extra network requests!
  - **Crucially: Do NOT automatically run `resolveAllProjectMetadata` for all projects.**
- Implement targeted single-project resolution:
  - `resolveProjectMetadata(project: GitlabProject, force = false): Promise<GitlabProject>`:
    1. Fetch current commit SHA of the project's default branch (1 cheap request to `/repository/branches/:branch`).
    2. If not `force`, compare with cached `latestCommitSha`. If matching, return cached data and update `lastVerifiedAt`.
    3. If different or uncached, perform metadata resolution (resolve version tag, service.properties, and OpenAPI YAML), persist to IndexedDB, and update `this.projects` signal.
- Provide `resolveAllProjectMetadata(projectsList?: GitlabProject[], force = false)` as an explicit user-triggered action (with abort/cancel capability and progress tracking), instead of running automatically on startup.
- Update `executeAtomicCommitAndPipeline`: upon successful commit, invalidate/update the cache for that project.

### 3. Update Project Detail Drawer (`/src/app/components/project-detail/project-detail-drawer.ts`)
- When the drawer opens for a project:
  - Check if the project is already verified or needs commit hash check.
  - Trigger `resolveProjectMetadata(project)` in the background if uncached or to verify latest commit hash.
  - Display cache status in drawer header:
    - E.g., `Cached (SHA: 7a8b9c...) · Verified just now` with a "Force Refresh" button to re-fetch even if commit hash matches.

### 4. Update Project Explorer (`/src/app/components/project-explorer/project-explorer.ts`)
- Add a cache status badge/indicator in the table for each project (`Cached`, `Live Verified`, or `Unresolved`).
- Add a single-click "Refresh" icon action on each table row to check/refresh that specific project.
- In the toolbar:
  - Add an on-demand button: "Scan Unresolved (X)" or "Refresh All Metadata" with clear tooltip explaining it will fetch only uncached/changed projects.
  - Show cache statistics: e.g., "302 / 315 projects cached in IndexedDB".

### 5. Update Connection Modal / Settings (`/src/app/components/connection-modal/connection-modal.ts`)
- Add a "Cache Management" section:
  - Shows cache storage type (IndexedDB), number of cached projects, and a "Clear Cache" button.

---

## Verification Plan
1. **Compilation Check**: Run `compile_applet` and `lint_applet` to ensure strictly typed Angular 21 zoneless code without compilation or lint errors.
2. **Startup Request Count**: Verify that starting the application only issues requests for the groups/projects list, and no longer spawns 300 concurrent batches of tags, branches, commits, and tree calls.
3. **Cache Storage**: Verify records are stored and loaded from IndexedDB on refresh.
4. **On-Demand & Inspection**: Verify that clicking "Inspect" on a project or clicking the row refresh button checks the commit SHA and only updates when changed.
5. **Manual Trigger**: Verify that "Scan Unresolved" bulk action works when initiated by the user with accurate progress counters.
