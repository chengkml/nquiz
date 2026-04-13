export type FuncDocParseStatus = "UPLOADED" | "PARSING" | "READY" | "FAILED";

export type FuncDocAIGenerationStatus = "IDLE" | "RUNNING" | "READY" | "FAILED";

export interface FuncDocListFilters {
  keyword: string;
  status: "ALL" | FuncDocParseStatus;
  page: number;
  pageSize: number;
}

export interface FuncDocListItem {
  id: string;
  fileName: string;
  remark: string;
  parseStatus: FuncDocParseStatus;
  parseError: string | null;
  createDate: string;
  updateDate: string;
  parseCompletedAt: string | null;
  fileSize: number;
  md5: string;
  headingCount: number;
  processNodeCount: number;
  featureCount: number;
}

export interface FuncDocListSummary {
  total: number;
  ready: number;
  parsing: number;
  failed: number;
}

export interface FuncDocListResult {
  items: FuncDocListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: FuncDocListSummary;
}

export interface FuncDocDetail extends FuncDocListItem {
  createUserName: string;
  parseStartedAt: string;
}

export interface FuncDocUploadInput {
  fileName: string;
  fileSize: number;
  remark: string;
}

export interface FuncDocHeadingNode {
  id: string;
  title: string;
  level: number;
  order: number;
  children: FuncDocHeadingNode[];
}

export interface FuncDocProcessNode {
  id: string;
  docId: string;
  headingId: string;
  headingTitle: string;
  stepNo: number;
  content: string;
}

export interface FuncDocProcessNodeFilters {
  docId: string;
  headingId: string;
  keyword: string;
  page: number;
  pageSize: number;
}

export interface FuncDocProcessNodeListResult {
  items: FuncDocProcessNode[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FuncDocFeatureTreeNode {
  id: string;
  name: string;
  level: 1 | 2;
  count: number;
  children: FuncDocFeatureTreeNode[];
}

export interface FuncDocFeaturePoint {
  id: string;
  docId: string;
  level1Id: string;
  level1Name: string;
  level2Id: string;
  level2Name: string;
  level3Name: string;
  processDetail: string;
  businessDesc: string;
  processSummary: string;
  functionDesc: string;
  mermaidCode: string;
  infDesc: string;
  infDetail: string;
  processGenStatus: FuncDocAIGenerationStatus;
  flowGenStatus: FuncDocAIGenerationStatus;
  infGenStatus: FuncDocAIGenerationStatus;
  updateDate: string;
}

export interface FuncDocFeatureFilters {
  docId: string;
  level2Id: string;
  keyword: string;
  page: number;
  pageSize: number;
}

export interface FuncDocFeatureListResult {
  items: FuncDocFeaturePoint[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FuncDocExportPayload {
  fileName: string;
  content: string;
  mimeType: string;
}
