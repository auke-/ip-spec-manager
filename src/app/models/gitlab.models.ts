export type SpecType = 'suwiml' | 'soap' | 'openapi' | 'unknown';

export interface GitlabConnectionConfig {
  hostUrl: string;
  token: string;
  tokenType: 'pat' | 'oauth';
  rootGroupPath: string; // e.g., 'service-specifications'
  isDemoMode: boolean;
}

export interface GitlabUser {
  id: number;
  username: string;
  name: string;
  avatar_url?: string;
  web_url?: string;
}

export interface GitlabGroup {
  id: number;
  name: string;
  path: string;
  full_path: string;
  description: string;
  web_url: string;
  parent_id?: number | null;
  subgroups_count?: number;
  projects_count?: number;
}

export interface GitlabPipelineSummary {
  id: number;
  status: 'success' | 'failed' | 'running' | 'pending' | 'canceled';
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  finished_at?: string;
  duration?: number;
  stageNames?: string[];
}

export interface SuwimlOperationDetails {
  name: string;
  requestName?: string;
  requestNamespace?: string;
  requestAction?: string;
  responseName?: string;
  responseNamespace?: string;
  responseAction?: string;
  faultName?: string;
  faultNamespace?: string;
  faultAction?: string;
  requestValid?: string;
  requestNotFound?: string;
}

export interface SuwimlServiceProperties {
  filePath?: string;
  serviceName: string;
  operations: string[];
  operationCount: number;
  operationDetails: Record<string, SuwimlOperationDetails>;
  rawProperties: Record<string, string>;
  headerRaw?: string;
  headerVersionAbbr: string;
  fwiRaw?: string;
  fwiVersionAbbr: string;
  nietsgevonden?: boolean;
  addressing?: boolean;
  security?: boolean;
  soapaction?: boolean;
  schemaWsdl?: string;
  schemaRequest?: string;
  schemaResponse?: string;
  schemaTypeless?: string;
  schemaSample?: string;
  filterKeyExpression?: string;
}

export interface GitlabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  description: string;
  default_branch: string;
  web_url: string;
  last_activity_at: string;
  specType: SpecType;
  currentTag?: string;
  latestPipeline?: GitlabPipelineSummary;
  subgroupId: number;
  subgroupPath: string;
  operations?: string[];
  suwimlHeaderVersion?: string;
  serviceProperties?: SuwimlServiceProperties;
  filesCount?: number;
  readme?: string;
  propertyMetadata?: Record<string, string>;
  files?: { path: string; content: string }[];
  isCached?: boolean;
  cachedCommitSha?: string;
  cachedAt?: number;
  lastVerifiedAt?: number;
}

export interface UnpackedFile {
  path: string;
  name: string;
  extension: string;
  content: string; // normalized content
  originalContent: string;
  originalLineEnding: 'crlf' | 'lf' | 'mixed' | 'none';
  hasBom: boolean;
  isBinary: boolean;
  size: number;
  isNormalized: boolean;
  selectedForCommit: boolean;
}

export interface ZipAnalysisResult {
  fileName: string;
  fileSize: number;
  files: UnpackedFile[];
  detectedSpecType: SpecType;
  primarySpecPath: string;
  totalFiles: number;
  crlfCount: number;
  bomCount: number;
  detectedOperations: string[];
  targetNamespace?: string;
  suwimlHeaderVersion?: string;
  suwimlFaultVersion?: string;
  serviceProperties?: SuwimlServiceProperties;
  parsedSummary: string;
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface FileDiff {
  path: string;
  changeType: 'added' | 'modified' | 'deleted' | 'identical';
  oldContent: string | null;
  newContent: string | null;
  diffLines: DiffLine[];
  additionsCount: number;
  deletionsCount: number;
  isBreakingChangeDetected?: boolean;
  breakingReason?: string;
}

export type SemverBumpType = 'major' | 'minor' | 'patch' | 'none';

export interface SemverAnalysis {
  currentVersion: string;
  suggestedBump: SemverBumpType;
  calculatedNextVersion: string;
  customVersionOverride?: string;
  commitType: 'feat!' | 'feat' | 'fix' | 'chore' | 'docs' | 'refactor';
  commitScope: string;
  commitSubject: string;
  commitDescription: string;
  breakingChangeReason?: string;
  isBreakingChange: boolean;
  generatedCommitMessage: string;
}

export interface GitlabCommitAction {
  action: 'create' | 'update' | 'delete' | 'move';
  file_path: string;
  content?: string;
  encoding?: 'text' | 'base64';
}

export interface CommitExecutionResult {
  commitSha: string;
  commitUrl: string;
  branch: string;
  commitMessage: string;
  pipelineId?: number;
  pipelineUrl?: string;
  pipelineStatus: 'pending' | 'running' | 'success' | 'failed';
  extractedArtifacts?: {
    propertiesPath: string;
    modelJsonPath: string;
    grpcProtoPath: string;
    testDataPath: string;
  };
}
