export type KnowledgeSetVisibility = "PRIVATE" | "PUBLIC";
export type KnowledgeSetStatus = "ENABLED" | "DISABLED";

export type KnowledgeSourceType = "MARKDOWN" | "FILE" | "DB";
export type KnowledgeSourceStatus = "PENDING" | "PARSING" | "SUCCESS" | "FAILED";

export type KnowledgeSearchMode = "VECTOR" | "TEXT";

export interface KnowledgeSetListFilters {
  keyword: string;
  status: "ALL" | KnowledgeSetStatus;
  visibility: "ALL" | KnowledgeSetVisibility;
  page: number;
  pageSize: number;
}

export interface KnowledgeSetListItem {
  id: string;
  name: string;
  descr: string;
  tags: string[];
  visibility: KnowledgeSetVisibility;
  status: KnowledgeSetStatus;
  isSystem: boolean;
  sourceCount: number;
  successSourceCount: number;
  createUserName: string;
  createDate: string;
  updateDate: string;
  canEdit: boolean;
  canDelete: boolean;
  canManageSources: boolean;
  canChat: boolean;
}

export interface KnowledgeSetListSummary {
  total: number;
  enabled: number;
  disabled: number;
  system: number;
}

export interface KnowledgeSetListResult {
  items: KnowledgeSetListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: KnowledgeSetListSummary;
}

export interface KnowledgeSetMutationInput {
  name: string;
  descr: string;
  tags: string[];
  visibility: KnowledgeSetVisibility;
  status: KnowledgeSetStatus;
}

export interface KnowledgeSourceListFilters {
  keyword: string;
  status: "ALL" | KnowledgeSourceStatus;
  page: number;
  pageSize: number;
}

export interface KnowledgeSourceListItem {
  id: string;
  knowledgeSetId: string;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  descr: string;
  content: string;
  fileName: string;
  dbHost: string;
  dbName: string;
  updateDate: string;
  createUserName: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface KnowledgeSourceListResult {
  items: KnowledgeSourceListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KnowledgeSourceMutationInput {
  name: string;
  type: KnowledgeSourceType;
  descr: string;
  content: string;
  fileName: string;
  dbHost: string;
  dbName: string;
}

export interface KnowledgeSearchInput {
  knowledgeSetId: string;
  mode: KnowledgeSearchMode;
  query: string;
  topK: number;
}

export interface KnowledgeSearchHit {
  sourceId: string;
  sourceName: string;
  score: number;
  snippet: string;
}

export interface KnowledgeSearchResult {
  mode: KnowledgeSearchMode;
  query: string;
  topK: number;
  hits: KnowledgeSearchHit[];
}

export interface VectorSyncIssue {
  id: string;
  type: "MISSING_CHUNK" | "MISSING_VECTOR" | "FAILED_SOURCE";
  sourceName: string;
  detail: string;
}

export interface VectorSyncCheckResult {
  knowledgeSetId: string;
  sourceTotal: number;
  successSources: number;
  processingSources: number;
  failedSources: number;
  chunkCount: number;
  vectorCount: number;
  issues: VectorSyncIssue[];
  checkedAt: string;
}

export interface DbConnectionTestInput {
  dbHost: string;
  dbName: string;
}

export interface DbConnectionTestResult {
  success: boolean;
  message: string;
}

export interface KnowledgeChatCitation {
  sourceId: string;
  sourceName: string;
  quote: string;
}

export interface KnowledgeChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  citations: KnowledgeChatCitation[];
}
