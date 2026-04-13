export type KnowledgeSetVisibility = "PRIVATE" | "PUBLIC";
export type KnowledgeSetStatus = "ENABLED" | "DISABLED";
export type KnowledgeSetScope = "OWNED" | "SHARED";

export type KnowledgeSourceType = "MARKDOWN" | "FILE";
export type KnowledgeSourceStatus = "PENDING" | "PARSING" | "SUCCESS" | "FAILED";

export interface KnowledgeSetEntity {
  id: string;
  name: string;
  descr: string;
  visibility: KnowledgeSetVisibility;
  status: KnowledgeSetStatus;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface KnowledgeSetListItem extends KnowledgeSetEntity {
  scope: KnowledgeSetScope;
  sourceCount: number;
  successSourceCount: number;
  processingSourceCount: number;
  failedSourceCount: number;
  latestSourceDate: string | null;
  canManage: boolean;
  canChat: boolean;
}

export interface KnowledgeCollectionsFilters {
  keyword: string;
}

export interface KnowledgeCollectionsSummary {
  totalSets: number;
  ownedSets: number;
  sharedSets: number;
  totalSources: number;
  processingSources: number;
}

export interface KnowledgeCollectionsResult {
  created: KnowledgeSetListItem[];
  shared: KnowledgeSetListItem[];
  summary: KnowledgeCollectionsSummary;
}

export interface KnowledgeSetMutationInput {
  name: string;
  descr?: string;
  visibility: KnowledgeSetVisibility;
  status: KnowledgeSetStatus;
}

export interface KnowledgeSourceEntity {
  id: string;
  knowledgeSetId: string;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  descr: string;
  content: string;
  fileName: string;
  simulateFailure?: boolean;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface KnowledgeSourceListItem extends KnowledgeSourceEntity {
  previewText: string;
  canManage: boolean;
}

export interface KnowledgeSourceMutationInput {
  name: string;
  type: KnowledgeSourceType;
  descr?: string;
  content?: string;
  fileName?: string;
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

export interface KnowledgeChatSession {
  knowledgeSetId: string;
  messages: KnowledgeChatMessage[];
}

export interface KnowledgeQuestionInput {
  question: string;
}
