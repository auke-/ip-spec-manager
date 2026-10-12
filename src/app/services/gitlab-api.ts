import { inject, Injectable, signal } from '@angular/core';
import {
  CommitExecutionResult,
  GitlabCommitAction,
  GitlabConnectionConfig,
  GitlabGroup,
  GitlabProject,
  GitlabUser,
  SpecType,
  SuwimlServiceProperties
} from '../models/gitlab.models';
import { MOCK_PROJECTS, MOCK_SUBGROUPS } from './mock-data';
import { CachedProjectMetadata, ProjectCacheService } from './project-cache';
import { SemverService } from './semver';
import { ServicePropertiesParser } from './service-properties-parser';

interface RawGitlabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  description?: string | null;
  default_branch?: string | null;
  web_url: string;
  last_activity_at: string;
  namespace?: { id: number; path: string };
}

interface RawGitlabCommit {
  id: string;
  web_url: string;
}

interface RawGitlabPipeline {
  id: number;
  web_url: string;
}

interface RawGitlabTag {
  name: string;
  target?: string;
  commit?: {
    id: string;
    created_at?: string;
  };
}

interface RawGitlabBranch {
  name: string;
  commit: {
    id: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GitlabApi {
  private readonly STORAGE_KEY = 'spec_manager_gitlab_config';
  private readonly semverService = inject(SemverService);
  private readonly servicePropertiesParser = inject(ServicePropertiesParser);
  readonly projectCache = inject(ProjectCacheService);

  readonly config = signal<GitlabConnectionConfig>({
    hostUrl: 'https://gitlab.example.corp',
    token: '',
    tokenType: 'pat',
    rootGroupPath: 'service-specifications',
    isDemoMode: true
  });

  readonly connectionStatus = signal<'connected' | 'disconnected' | 'testing' | 'error'>('connected');
  readonly connectionError = signal<string | null>(null);
  readonly currentUser = signal<GitlabUser | null>({
    id: 42,
    username: 'api-architect',
    name: 'API Governance Architect',
    avatar_url: ''
  });

  readonly subgroups = signal<GitlabGroup[]>([]);
  readonly projects = signal<GitlabProject[]>([]);
  readonly selectedGroup = signal<GitlabGroup | null>(null);
  readonly selectedProject = signal<GitlabProject | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isResolvingMetadata = signal<boolean>(false);
  readonly metadataProgress = signal<{ resolved: number; total: number }>({ resolved: 0, total: 0 });
  readonly inspectingProjectIds = signal<Set<number>>(new Set());
  readonly cachedStats = signal<{ count: number; storageType: string }>({ count: 0, storageType: 'indexeddb' });

  constructor() {
    this.loadSavedConfig();
    this.refreshData();
  }

  private loadSavedConfig() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config.set({ ...this.config(), ...parsed });
      }
    } catch {
      // ignore
    }
  }

  saveConfig(newConfig: GitlabConnectionConfig) {
    this.config.set(newConfig);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newConfig));
    } catch {
      // ignore
    }
    this.refreshData();
  }

  switchToLive(): boolean {
    const cfg = this.config();
    const updated = { ...cfg, isDemoMode: false };
    this.saveConfig(updated);
    if (!cfg.hostUrl || !cfg.token) {
      return false; // requires configuration
    }
    return true;
  }

  switchToDemo() {
    const updated = { ...this.config(), isDemoMode: true };
    this.saveConfig(updated);
  }

  async testConnection(testCfg?: GitlabConnectionConfig): Promise<{
    success: boolean;
    message: string;
    user?: GitlabUser;
    rootGroupFound?: boolean;
  }> {
    const cfg = testCfg || this.config();
    if (cfg.isDemoMode) {
      this.connectionStatus.set('connected');
      this.connectionError.set(null);
      return {
        success: true,
        message: 'Connected to Offline Demo Mode (Mock service-specifications hierarchy)',
        user: this.currentUser() || undefined,
        rootGroupFound: true
      };
    }

    if (!cfg.hostUrl || !cfg.token) {
      return { success: false, message: 'GitLab Host URL and Access Token are required to connect to live instance.' };
    }

    this.connectionStatus.set('testing');
    try {
      const normalizedHost = cfg.hostUrl.replace(/\/+$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (cfg.tokenType === 'pat') {
        headers['PRIVATE-TOKEN'] = cfg.token;
      } else {
        headers['Authorization'] = `Bearer ${cfg.token}`;
      }

      // 1. Direct browser fetch to /api/v4/user
      const userRes = await fetch(`${normalizedHost}/api/v4/user`, {
        method: 'GET',
        headers
      });

      if (!userRes.ok) {
        const errText = await userRes.text();
        throw new Error(`GitLab responded with HTTP ${userRes.status}: ${errText || userRes.statusText}`);
      }

      const userData = await userRes.json() as GitlabUser;
      this.currentUser.set(userData);

      // 2. Check root group existence (optional check)
      let rootGroupFound = false;
      try {
        const rootPath = encodeURIComponent(cfg.rootGroupPath);
        const groupRes = await fetch(`${normalizedHost}/api/v4/groups/${rootPath}`, {
          method: 'GET',
          headers
        });
        rootGroupFound = groupRes.ok;
      } catch {
        // non-blocking
      }

      this.connectionStatus.set('connected');
      this.connectionError.set(null);
      return {
        success: true,
        message: `Successfully authenticated as ${userData.name} (@${userData.username})${rootGroupFound ? ` · Found group '${cfg.rootGroupPath}'` : ` · Note: group '${cfg.rootGroupPath}' not found or no read access`}`,
        user: userData,
        rootGroupFound
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      this.connectionStatus.set('error');
      this.connectionError.set(msg);
      return {
        success: false,
        message: msg.includes('Failed to fetch')
          ? `Direct browser request failed to reach ${cfg.hostUrl}. Please verify: (1) You are on the corporate VPN/intranet, (2) The URL is correct with https://, (3) GitLab server permits CORS or browser access.`
          : msg
      };
    }
  }

  /**
   * Helper to fetch all paginated records from a GitLab REST endpoint.
   * Traverses pages with per_page=100 up to maxPages (default 100 pages = 10,000 items),
   * overcoming the single-page 100 limit.
   * Robust against CORS restrictions that may hide X-Next-Page / X-Total-Pages headers.
   */
  private async fetchAllPages<T>(
    endpointUrl: string,
    headers: Record<string, string>,
    maxPages = 100
  ): Promise<T[]> {
    const allItems: T[] = [];
    const perPage = 100;
    const urlObj = new URL(endpointUrl);
    urlObj.searchParams.set('per_page', perPage.toString());

    let page = 1;
    while (page <= maxPages) {
      urlObj.searchParams.set('page', page.toString());
      const res = await fetch(urlObj.toString(), {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        if (page === 1) {
          throw new Error(`GitLab responded with HTTP ${res.status}: ${res.statusText}`);
        }
        // If a subsequent page fails, stop and return everything gathered so far
        break;
      }

      const pageData = await res.json() as T[];
      if (!Array.isArray(pageData) || pageData.length === 0) {
        break;
      }

      allItems.push(...pageData);

      // If fewer items than perPage were returned, this was the last page
      if (pageData.length < perPage) {
        break;
      }

      // Check GitLab pagination headers if exposed in browser
      const xNext = res.headers.get('x-next-page');
      const xTotalPages = res.headers.get('x-total-pages');
      if (xNext !== null) {
        if (!xNext.trim()) {
          break; // Empty string indicates end of pages
        }
        page = parseInt(xNext, 10);
      } else if (xTotalPages !== null && xTotalPages.trim()) {
        const totalPages = parseInt(xTotalPages, 10);
        if (page >= totalPages) {
          break;
        }
        page++;
      } else {
        // Headers not exposed through CORS; probe next page
        page++;
      }
    }

    return allItems;
  }

  async refreshData() {
    this.isLoading.set(true);
    const cfg = this.config();

    if (cfg.isDemoMode) {
      // Load seed data with verified raw x.y.z tags
      this.subgroups.set([...MOCK_SUBGROUPS]);
      this.projects.set([...MOCK_PROJECTS]);
      this.connectionStatus.set('connected');
      this.connectionError.set(null);
      this.isLoading.set(false);
      this.isResolvingMetadata.set(false);
      this.metadataProgress.set({ resolved: MOCK_PROJECTS.length, total: MOCK_PROJECTS.length });
      const stats = await this.projectCache.getStorageStats();
      this.cachedStats.set({ count: stats.count, storageType: stats.storageType });
      return;
    }

    try {
      const normalizedHost = cfg.hostUrl.replace(/\/+$/, '');
      const headers = this.getAuthHeaders();
      const rootPath = encodeURIComponent(cfg.rootGroupPath);

      // Fetch all subgroups across all pages directly from browser
      const subData = await this.fetchAllPages<GitlabGroup>(
        `${normalizedHost}/api/v4/groups/${rootPath}/subgroups?all_available=true`,
        headers
      );
      this.subgroups.set(subData);

      // Fetch all projects across all pages (overcoming the 100 projects default cap)
      const projData = await this.fetchAllPages<RawGitlabProject>(
        `${normalizedHost}/api/v4/groups/${rootPath}/projects?include_subgroups=true`,
        headers
      );

      // Load all cached project records from IndexedDB in a single query
      const cachedMap = await this.projectCache.getAll();
      const stats = await this.projectCache.getStorageStats();
      this.cachedStats.set({ count: stats.count, storageType: stats.storageType });

      const mapped: GitlabProject[] = projData.map(p => {
        const cached = cachedMap.get(p.id);
        if (cached) {
          // Immediately populate with cached metadata - zero extra network calls on startup!
          return {
            id: p.id,
            name: p.name,
            path: p.path,
            path_with_namespace: p.path_with_namespace,
            description: p.description || '',
            default_branch: p.default_branch || cached.defaultBranch || 'master',
            web_url: p.web_url,
            last_activity_at: p.last_activity_at,
            specType: cached.specType,
            currentTag: cached.currentTag,
            subgroupId: p.namespace?.id || 0,
            subgroupPath: p.namespace?.path || '',
            operations: cached.operations,
            suwimlHeaderVersion: cached.suwimlHeaderVersion,
            serviceProperties: cached.serviceProperties,
            isCached: true,
            cachedCommitSha: cached.latestCommitSha,
            cachedAt: cached.cachedAt,
            lastVerifiedAt: cached.lastVerifiedAt
          };
        }

        return {
          id: p.id,
          name: p.name,
          path: p.path,
          path_with_namespace: p.path_with_namespace,
          description: p.description || '',
          default_branch: p.default_branch || 'master',
          web_url: p.web_url,
          last_activity_at: p.last_activity_at,
          specType: 'unknown',
          currentTag: '0.1.0',
          subgroupId: p.namespace?.id || 0,
          subgroupPath: p.namespace?.path || '',
          isCached: false
        };
      });

      this.projects.set(mapped);
      this.connectionStatus.set('connected');
      this.connectionError.set(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading GitLab data';
      this.connectionError.set(msg);
      this.connectionStatus.set('error');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fetches the latest commit SHA for a project's default branch.
   */
  async fetchLatestCommitSha(projectId: number, defaultBranch = 'master'): Promise<string> {
    const normalizedHost = this.config().hostUrl.replace(/\/+$/, '');
    const headers = this.getAuthHeaders();

    try {
      const branchRes = await fetch(
        `${normalizedHost}/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(defaultBranch)}`,
        { headers }
      );
      if (branchRes.ok) {
        const branchData = await branchRes.json() as RawGitlabBranch;
        return branchData.commit?.id || '';
      }
      // Fallback: master <-> main check
      const altBranch = defaultBranch === 'master' ? 'main' : 'master';
      const altBranchRes = await fetch(
        `${normalizedHost}/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(altBranch)}`,
        { headers }
      );
      if (altBranchRes.ok) {
        const altData = await altBranchRes.json() as RawGitlabBranch;
        return altData.commit?.id || '';
      }
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Resolves project version from the latest commit on the default branch ('master' / 'main').
   * If that commit has multiple tags, sorts them using SemVer and picks the highest x.y.z.
   */
  async resolveDefaultBranchVersion(
    projectId: number,
    defaultBranch = 'master',
    knownCommitSha?: string
  ): Promise<string> {
    const normalizedHost = this.config().hostUrl.replace(/\/+$/, '');
    const headers = this.getAuthHeaders();

    try {
      // 1. Fetch tags for the repository
      const tagsRes = await fetch(`${normalizedHost}/api/v4/projects/${projectId}/repository/tags?per_page=100`, { headers });
      if (!tagsRes.ok) return '0.1.0';
      const tags = await tagsRes.json() as RawGitlabTag[];
      if (tags.length === 0) return '0.1.0';

      // 2. Fetch the latest commit on the default branch if not passed
      let latestCommitSha = knownCommitSha || '';
      if (!latestCommitSha) {
        latestCommitSha = await this.fetchLatestCommitSha(projectId, defaultBranch);
      }

      if (latestCommitSha) {
        // Find tags pointing to the latest commit on the default branch
        const commitTags = tags
          .filter(t => t.commit?.id === latestCommitSha || t.target === latestCommitSha)
          .map(t => t.name);

        if (commitTags.length > 0) {
          // Commit has tag(s). If multiple tags exist on this commit, sort by highest SemVer
          const highestOnCommit = this.semverService.findHighestSemver(commitTags);
          if (highestOnCommit) return highestOnCommit;
        }

        // If the latest commit has no tag, check commits history on the default branch
        const commitsRes = await fetch(`${normalizedHost}/api/v4/projects/${projectId}/repository/commits?ref_name=${encodeURIComponent(defaultBranch)}&per_page=20`, { headers });
        if (commitsRes.ok) {
          const commits = await commitsRes.json() as { id: string }[];
          for (const c of commits) {
            const matching = tags.filter(t => t.commit?.id === c.id || t.target === c.id).map(t => t.name);
            if (matching.length > 0) {
              const highestOnAncestor = this.semverService.findHighestSemver(matching);
              if (highestOnAncestor) return highestOnAncestor;
            }
          }
        }
      }

      // Fallback: highest semver tag in repository
      const allHighest = this.semverService.findHighestSemver(tags.map(t => t.name));
      return allHighest || '0.1.0';
    } catch {
      return '0.1.0';
    }
  }

  /**
   * Fetches and parses generated-reference/nl/bkwi/specification/wsdl/* /service.properties
   * from the default branch of a project in real GitLab.
   * Handles non-recursive tree responses from GitLab where subdirectories (type: 'tree')
   * must be probed for service.properties directly.
   */
  async fetchServiceProperties(
    projectId: number,
    defaultBranch = 'master'
  ): Promise<SuwimlServiceProperties | null> {
    const normalizedHost = this.config().hostUrl.replace(/\/+$/, '');
    const headers = this.getAuthHeaders();
    const branchRef = (defaultBranch && defaultBranch.trim()) ? defaultBranch.trim() : 'master';
    const refParam = `ref=${encodeURIComponent(branchRef)}`;

    try {
      let propertyFilePath = '';
      let propertyContent = '';

      // Strategy 1: Targeted query on generated-reference/nl/bkwi/specification/wsdl
      // In GitLab API, `path=...` often returns immediate child entries (type: 'tree' for subdirectories)
      // without expanding blobs recursively. Each subfolder (e.g. Kadaster-KIK-v0510) is a service candidate!
      const targetedUrl = `${normalizedHost}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent('generated-reference/nl/bkwi/specification/wsdl')}&per_page=100&recursive=true&${refParam}`;
      const targetedRes = await fetch(targetedUrl, { headers });

      if (targetedRes.ok) {
        const treeItems = await targetedRes.json() as { path: string; type: string; name: string }[];
        
        // 1a. If GitLab did recurse blobs
        const blobItem = treeItems.find(t => t.type === 'blob' && t.path.endsWith('service.properties'));
        if (blobItem) {
          propertyFilePath = blobItem.path;
        } else {
          // 1b. If GitLab returned directories (type: 'tree'), probe each directory for service.properties
          const dirItems = treeItems.filter(t => t.type === 'tree');
          for (const dir of dirItems) {
            const candidatePath = `${dir.path}/service.properties`;
            const checkRes = await fetch(
              `${normalizedHost}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(candidatePath)}/raw?${refParam}`,
              { headers }
            );
            if (checkRes.ok) {
              propertyFilePath = candidatePath;
              propertyContent = await checkRes.text();
              break;
            }
          }
        }
      }

      // Strategy 2: If not found, inspect generated-reference root
      if (!propertyFilePath) {
        const genRefUrl = `${normalizedHost}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent('generated-reference')}&per_page=100&recursive=true&${refParam}`;
        const genRefRes = await fetch(genRefUrl, { headers });
        if (genRefRes.ok) {
          const genRefItems = await genRefRes.json() as { path: string; type: string }[];
          const blobItem = genRefItems.find(t => t.type === 'blob' && t.path.endsWith('service.properties'));
          if (blobItem) {
            propertyFilePath = blobItem.path;
          } else {
            // Check any directory with wsdl in its path
            const wsdlDirs = genRefItems.filter(t => t.type === 'tree' && t.path.includes('wsdl'));
            for (const dir of wsdlDirs) {
              const candidatePath = `${dir.path}/service.properties`;
              const checkRes = await fetch(
                `${normalizedHost}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(candidatePath)}/raw?${refParam}`,
                { headers }
              );
              if (checkRes.ok) {
                propertyFilePath = candidatePath;
                propertyContent = await checkRes.text();
                break;
              }
            }
          }
        }
      }

      // Strategy 3: Multi-page scan through repository tree (up to 3 pages = 300 files)
      if (!propertyFilePath) {
        for (let page = 1; page <= 3; page++) {
          const rootTreeUrl = `${normalizedHost}/api/v4/projects/${projectId}/repository/tree?recursive=true&per_page=100&page=${page}&${refParam}`;
          const rootTreeRes = await fetch(rootTreeUrl, { headers });
          if (!rootTreeRes.ok) break;
          const rootTreeItems = await rootTreeRes.json() as { path: string; type: string }[];
          if (!rootTreeItems || rootTreeItems.length === 0) break;

          const propItem = rootTreeItems.find(t =>
            t.type === 'blob' &&
            t.path.endsWith('service.properties')
          );
          if (propItem) {
            propertyFilePath = propItem.path;
            break;
          }
        }
      }

      // If we found the path but haven't fetched the content yet, fetch it now
      if (propertyFilePath && !propertyContent) {
        const rawRes = await fetch(
          `${normalizedHost}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(propertyFilePath)}/raw?${refParam}`,
          { headers }
        );
        if (rawRes.ok) {
          propertyContent = await rawRes.text();
        }
      }

      if (!propertyFilePath || !propertyContent) return null;

      return this.servicePropertiesParser.parse(propertyContent, propertyFilePath);
    } catch {
      return null;
    }
  }

  /**
   * Checks if project has src/main/resources/nl/bkwi/specification/openapi/*.yaml (or .yml)
   * on the default branch.
   */
  async fetchOpenApiSpec(
    projectId: number,
    defaultBranch = 'master'
  ): Promise<{ path: string; operations: string[]; content?: string } | null> {
    const normalizedHost = this.config().hostUrl.replace(/\/+$/, '');
    const headers = this.getAuthHeaders();
    const branchRef = (defaultBranch && defaultBranch.trim()) ? defaultBranch.trim() : 'master';
    const refParam = `ref=${encodeURIComponent(branchRef)}`;

    try {
      const openApiPath = 'src/main/resources/nl/bkwi/specification/openapi';
      const treeUrl = `${normalizedHost}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(openApiPath)}&per_page=100&recursive=true&${refParam}`;
      let treeRes = await fetch(treeUrl, { headers });

      // Fallback without ref parameter (GitLab automatically queries repo default branch)
      if (!treeRes.ok) {
        const fallbackTreeUrl = `${normalizedHost}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(openApiPath)}&per_page=100&recursive=true`;
        treeRes = await fetch(fallbackTreeUrl, { headers });
      }

      if (!treeRes.ok) return null;
      const treeItems = await treeRes.json() as { path: string; type: string; name: string }[];
      if (!Array.isArray(treeItems)) return null;

      const yamlItem = treeItems.find(t =>
        (t.type === 'blob' || !t.type) &&
        (t.name?.endsWith('.yaml') || t.name?.endsWith('.yml') || t.path?.endsWith('.yaml') || t.path?.endsWith('.yml'))
      );

      let foundPath = yamlItem?.path;

      // If no blob was found at top level, check if any subfolder contains yaml
      if (!foundPath) {
        const dirItems = treeItems.filter(t => t.type === 'tree');
        for (const dir of dirItems) {
          const subUrl = `${normalizedHost}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(dir.path)}&per_page=100&${refParam}`;
          let subRes = await fetch(subUrl, { headers });
          if (!subRes.ok) {
            subRes = await fetch(`${normalizedHost}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(dir.path)}&per_page=100`, { headers });
          }
          if (subRes.ok) {
            const subItems = await subRes.json() as { path: string; type: string; name: string }[];
            const subYaml = subItems.find(t =>
              (t.type === 'blob' || !t.type) &&
              (t.name?.endsWith('.yaml') || t.name?.endsWith('.yml') || t.path?.endsWith('.yaml') || t.path?.endsWith('.yml'))
            );
            if (subYaml) {
              foundPath = subYaml.path;
              break;
            }
          }
        }
      }

      if (!foundPath) return null;

      // Fetch file content to discover endpoints/operations
      let content = '';
      const operations: string[] = [];
      try {
        let rawRes = await fetch(
          `${normalizedHost}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(foundPath)}/raw?${refParam}`,
          { headers }
        );
        if (!rawRes.ok) {
          rawRes = await fetch(
            `${normalizedHost}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(foundPath)}/raw`,
            { headers }
          );
        }

        if (rawRes.ok) {
          content = await rawRes.text();
          const pathMatches = content.matchAll(/^\s{2}(\/[a-zA-Z0-9_\-{}/.]+):\s*$/gm);
          for (const match of pathMatches) {
            operations.push(`ROUTE ${match[1]}`);
          }
        }
      } catch {
        // Content reading error is non-fatal; the presence of the yaml file marks it as OpenAPI
      }

      return {
        path: foundPath,
        operations,
        content
      };
    } catch {
      return null;
    }
  }

  /**
   * Resolves tags, service.properties, and OpenAPI specifications strictly adhering to the user classification rules:
   * 1. Only project not having the wsdl service.properties but having src/main/resources/nl/bkwi/specification/openapi/*.yaml
   *    should be considered an openapi project.
   * 2. Only wsdl projects with either a SuwiML header or fault version should be considered a SuwiML project;
   *    other wsdl projects are non-SuwiML soap projects.
   * 3. Projects which are not a SuwiML project, non-suwiml soap or openapi should be considered of type unknown.
   */
  /**
   * Resolves specification metadata for a single project:
   * 1. Checks current default branch commit hash.
   * 2. If cached and commit hash unchanged (and not force), returns cached metadata and marks verified.
   * 3. If commit hash changed or not cached, fetches service.properties / OpenAPI YAML / version tag,
   *    updates IndexedDB cache, and updates the in-memory project.
   */
  async resolveProjectMetadata(project: GitlabProject, force = false): Promise<GitlabProject> {
    if (this.config().isDemoMode) {
      return project;
    }

    const projectId = project.id;
    this.inspectingProjectIds.update(set => new Set(set).add(projectId));

    try {
      const defaultBranch = project.default_branch || 'master';
      const latestSha = await this.fetchLatestCommitSha(projectId, defaultBranch);

      // Check if cache has matching commit SHA
      const cached = await this.projectCache.get(projectId);
      if (!force && cached && cached.latestCommitSha && latestSha && cached.latestCommitSha === latestSha) {
        // Cache is fresh! Update lastVerifiedAt
        const verifiedRecord: CachedProjectMetadata = {
          ...cached,
          lastVerifiedAt: Date.now()
        };
        await this.projectCache.set(verifiedRecord);

        const updatedProject: GitlabProject = {
          ...project,
          specType: cached.specType,
          currentTag: cached.currentTag,
          operations: cached.operations,
          suwimlHeaderVersion: cached.suwimlHeaderVersion,
          serviceProperties: cached.serviceProperties,
          isCached: true,
          cachedCommitSha: cached.latestCommitSha,
          cachedAt: cached.cachedAt,
          lastVerifiedAt: verifiedRecord.lastVerifiedAt
        };

        this.projects.update(list => list.map(p => p.id === projectId ? updatedProject : p));
        return updatedProject;
      }

      // Metadata must be resolved
      const [tag, serviceProps] = await Promise.all([
        this.resolveDefaultBranchVersion(projectId, defaultBranch, latestSha),
        this.fetchServiceProperties(projectId, defaultBranch)
      ]);

      let finalSpecType: SpecType = 'unknown';
      let openApiOperations: string[] = [];

      if (serviceProps) {
        const hasHeader = !!(serviceProps.headerRaw && serviceProps.headerRaw.trim());
        const hasFault = !!(serviceProps.fwiRaw && serviceProps.fwiRaw.trim());
        if (hasHeader || hasFault) {
          finalSpecType = 'suwiml';
        } else {
          finalSpecType = 'soap';
        }
      } else {
        const openApiSpec = await this.fetchOpenApiSpec(projectId, defaultBranch);
        if (openApiSpec) {
          finalSpecType = 'openapi';
          openApiOperations = openApiSpec.operations;
        } else {
          finalSpecType = 'unknown';
        }
      }

      const operationsToStore = serviceProps?.operations?.length ? serviceProps.operations : openApiOperations;
      const headerVersionToStore = serviceProps?.headerVersionAbbr || undefined;

      const recordToCache: CachedProjectMetadata = {
        projectId,
        defaultBranch,
        latestCommitSha: latestSha,
        specType: finalSpecType,
        currentTag: tag,
        operations: operationsToStore,
        suwimlHeaderVersion: headerVersionToStore,
        serviceProperties: serviceProps || undefined,
        cachedAt: Date.now(),
        lastVerifiedAt: Date.now()
      };

      await this.projectCache.set(recordToCache);
      const stats = await this.projectCache.getStorageStats();
      this.cachedStats.set({ count: stats.count, storageType: stats.storageType });

      const updatedProject: GitlabProject = {
        ...project,
        specType: finalSpecType,
        currentTag: tag,
        operations: operationsToStore,
        suwimlHeaderVersion: headerVersionToStore,
        serviceProperties: serviceProps || undefined,
        isCached: true,
        cachedCommitSha: latestSha,
        cachedAt: recordToCache.cachedAt,
        lastVerifiedAt: recordToCache.lastVerifiedAt
      };

      this.projects.update(list => list.map(p => p.id === projectId ? updatedProject : p));
      return updatedProject;
    } finally {
      this.inspectingProjectIds.update(set => {
        const next = new Set(set);
        next.delete(projectId);
        return next;
      });
    }
  }

  /**
   * On-demand bulk metadata scan across projects.
   * Can be invoked by user to scan unresolved or all projects.
   */
  async resolveAllProjectMetadata(projectsList?: GitlabProject[], force = false): Promise<void> {
    const targets = projectsList || this.projects();
    if (targets.length === 0 || this.config().isDemoMode) return;

    this.isResolvingMetadata.set(true);
    this.metadataProgress.set({ resolved: 0, total: targets.length });
    let resolvedCount = 0;

    const batchSize = 6;
    try {
      for (let i = 0; i < targets.length; i += batchSize) {
        const batch = targets.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async p => {
            try {
              await this.resolveProjectMetadata(p, force);
            } catch {
              // individual failure non-blocking
            }
          })
        );
        resolvedCount += batch.length;
        this.metadataProgress.set({
          resolved: Math.min(resolvedCount, targets.length),
          total: targets.length
        });
      }
    } finally {
      this.isResolvingMetadata.set(false);
      const stats = await this.projectCache.getStorageStats();
      this.cachedStats.set({ count: stats.count, storageType: stats.storageType });
    }
  }

  async clearCache(): Promise<void> {
    await this.projectCache.clear();
    const stats = await this.projectCache.getStorageStats();
    this.cachedStats.set({ count: stats.count, storageType: stats.storageType });
    // Invalidate cached flag in memory
    this.projects.update(list => list.map(p => ({ ...p, isCached: false })));
  }

  private getAuthHeaders(): Record<string, string> {
    const cfg = this.config();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (cfg.tokenType === 'pat') {
      headers['PRIVATE-TOKEN'] = cfg.token;
    } else {
      headers['Authorization'] = `Bearer ${cfg.token}`;
    }
    return headers;
  }

  /**
   * Fetch raw files of a project for visual diffing
   */
  async getProjectFiles(project: GitlabProject): Promise<{ path: string; content: string }[]> {
    if (this.config().isDemoMode) {
      if (project.files && project.files.length > 0) {
        return project.files;
      }
      const files: { path: string; content: string }[] = [];
      if (project.serviceProperties) {
        const propPath = project.serviceProperties.filePath || `generated-reference/nl/bkwi/specification/wsdl/${project.name}/service.properties`;
        const propLines = Object.entries(project.serviceProperties.rawProperties || {})
          .map(([k, v]) => `${k}=${v}`)
          .join('\n');
        files.push({ path: propPath, content: propLines });
      }
      files.push({
        path: project.specType === 'openapi'
          ? `src/main/resources/nl/bkwi/specification/openapi/${project.path}.yaml`
          : `nl/bkwi/specification/wsdl/${project.name}/Impl/BKWI.wsdl`,
        content: project.specType === 'openapi'
          ? `openapi: 3.0.3\ninfo:\n  title: ${project.name}\n  version: ${project.currentTag || '1.0.0'}\npaths:\n  /v1/resource:\n    get:\n      summary: Sample query`
          : `<?xml version="1.0" encoding="UTF-8"?>\n<definitions xmlns="http://schemas.xmlsoap.org/wsdl/" name="${project.name}">\n  <!-- Base definition -->\n</definitions>`
      });
      return files;
    }

    try {
      const normalizedHost = this.config().hostUrl.replace(/\/+$/, '');
      const headers = this.getAuthHeaders();
      const treeRes = await fetch(`${normalizedHost}/api/v4/projects/${project.id}/repository/tree?recursive=true&per_page=100`, { headers });
      if (!treeRes.ok) return [];

      const tree = await treeRes.json() as { path: string; type: string }[];
      const filePromises = tree
        .filter(item => item.type === 'blob')
        .slice(0, 30) // limit to avoid rate limits
        .map(async item => {
          const rawRes = await fetch(`${normalizedHost}/api/v4/projects/${project.id}/repository/files/${encodeURIComponent(item.path)}/raw?ref=${project.default_branch}`, { headers });
          const content = rawRes.ok ? await rawRes.text() : '';
          return { path: item.path, content };
        });

      return await Promise.all(filePromises);
    } catch {
      return [];
    }
  }

  /**
   * Create a new project in the chosen subgroup
   */
  async createNewProject(params: {
    subgroupId: number;
    name: string;
    description: string;
    specType: 'suwiml' | 'soap' | 'openapi';
  }): Promise<GitlabProject> {
    const sub = this.subgroups().find(s => s.id === params.subgroupId) || this.subgroups()[0];
    const pathSlug = params.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (this.config().isDemoMode) {
      const newProj: GitlabProject = {
        id: Date.now(),
        name: params.name,
        path: pathSlug,
        path_with_namespace: `${sub ? sub.full_path : 'service-specifications'}/${pathSlug}`,
        description: params.description,
        default_branch: 'master',
        web_url: `https://gitlab.example.corp/${sub?.full_path || 'service-specifications'}/${pathSlug}`,
        last_activity_at: new Date().toISOString(),
        specType: params.specType,
        currentTag: '1.0.0',
        subgroupId: params.subgroupId,
        subgroupPath: sub ? sub.path : '',
        operations: [],
        filesCount: 0
      };

      this.projects.update(list => [newProj, ...list]);
      return newProj;
    }

    const normalizedHost = this.config().hostUrl.replace(/\/+$/, '');
    const headers = this.getAuthHeaders();
    const res = await fetch(`${normalizedHost}/api/v4/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: params.name,
        path: pathSlug,
        namespace_id: params.subgroupId,
        description: params.description,
        default_branch: 'master',
        initialize_with_readme: true
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitLab project creation failed: ${err}`);
    }

    const created = await res.json() as RawGitlabProject;
    const mapped: GitlabProject = {
      id: created.id,
      name: created.name,
      path: created.path,
      path_with_namespace: created.path_with_namespace,
      description: created.description || '',
      default_branch: created.default_branch || 'master',
      web_url: created.web_url,
      last_activity_at: created.last_activity_at,
      specType: params.specType,
      currentTag: '0.1.0',
      subgroupId: params.subgroupId,
      subgroupPath: sub ? sub.path : ''
    };

    this.projects.update(list => [mapped, ...list]);
    return mapped;
  }

  /**
   * Commit normalized files atomically via GitLab Commits API and trigger artifact pipeline
   */
  async executeAtomicCommitAndPipeline(params: {
    project: GitlabProject;
    branch: string;
    commitMessage: string;
    actions: GitlabCommitAction[];
    newVersionTag: string;
  }): Promise<CommitExecutionResult> {
    const isDemo = this.config().isDemoMode;

    if (isDemo) {
      const mockSha = Math.random().toString(16).substring(2, 12);
      const pipelineId = Math.floor(90000 + Math.random() * 9999);

      // Update project in-memory
      const updatedFiles = params.actions.map(a => ({ path: a.file_path, content: a.content || '' }));
      this.projects.update(list =>
        list.map(p => {
          if (p.id === params.project.id) {
            return {
              ...p,
              currentTag: params.newVersionTag,
              last_activity_at: new Date().toISOString(),
              files: updatedFiles,
              filesCount: updatedFiles.length,
              latestPipeline: {
                id: pipelineId,
                status: 'running',
                ref: params.branch,
                sha: mockSha,
                web_url: `${p.web_url}/-/pipelines/${pipelineId}`,
                created_at: new Date().toISOString(),
                stageNames: ['validate-specs', 'extract-artifacts', 'check-backwards-compatibility', 'publish-grpc']
              }
            };
          }
          return p;
        })
      );

      // Simulate pipeline progressing to success
      setTimeout(() => {
        this.projects.update(list =>
          list.map(p => {
            if (p.id === params.project.id && p.latestPipeline) {
              return {
                ...p,
                latestPipeline: {
                  ...p.latestPipeline,
                  status: 'success',
                  finished_at: new Date().toISOString()
                }
              };
            }
            return p;
          })
        );
      }, 4000);

      return {
        commitSha: mockSha,
        commitUrl: `${params.project.web_url}/-/commit/${mockSha}`,
        branch: params.branch,
        commitMessage: params.commitMessage,
        pipelineId,
        pipelineUrl: `${params.project.web_url}/-/pipelines/${pipelineId}`,
        pipelineStatus: 'running',
        extractedArtifacts: {
          propertiesPath: 'extracted/metadata.properties',
          modelJsonPath: 'extracted/service-model.json',
          grpcProtoPath: 'extracted/service.proto',
          testDataPath: 'extracted/sample-test-payloads.json'
        }
      };
    }

    // Real GitLab API call: POST /projects/:id/repository/commits
    const normalizedHost = this.config().hostUrl.replace(/\/+$/, '');
    const headers = this.getAuthHeaders();

    const commitPayload = {
      branch: params.branch || params.project.default_branch || 'master',
      commit_message: params.commitMessage,
      actions: params.actions
    };

    const commitRes = await fetch(`${normalizedHost}/api/v4/projects/${params.project.id}/repository/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commitPayload)
    });

    if (!commitRes.ok) {
      const err = await commitRes.text();
      throw new Error(`GitLab Commit failed: ${err}`);
    }

    const commitData = await commitRes.json() as RawGitlabCommit;

    // Invalidate cached metadata for this project so fresh specs are queried next inspection
    try {
      await this.projectCache.delete(params.project.id);
      // Immediately resolve with new commit SHA in background
      this.resolveProjectMetadata({
        ...params.project,
        currentTag: params.newVersionTag
      }, true);
    } catch {
      // non-blocking
    }

    // Trigger CI Pipeline
    let pipelineId: number | undefined;
    let pipelineUrl: string | undefined;

    try {
      const pipeRes = await fetch(`${normalizedHost}/api/v4/projects/${params.project.id}/pipeline`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: params.branch || params.project.default_branch || 'master',
          variables: [
            { key: 'TRIGGER_SOURCE', value: 'spec-manager-web-ui' },
            { key: 'SPEC_VERSION', value: params.newVersionTag }
          ]
        })
      });

      if (pipeRes.ok) {
        const pipeData = await pipeRes.json() as RawGitlabPipeline;
        pipelineId = pipeData.id;
        pipelineUrl = pipeData.web_url;
      }
    } catch {
      // Pipeline trigger non-blocking error
    }

    return {
      commitSha: commitData.id,
      commitUrl: commitData.web_url,
      branch: params.branch,
      commitMessage: params.commitMessage,
      pipelineId,
      pipelineUrl,
      pipelineStatus: pipelineId ? 'running' : 'pending'
    };
  }
}
