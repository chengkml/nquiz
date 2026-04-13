export type OrchestrationWorkflowStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "DISABLED";
export type OrchestrationNodeType = "start" | "knowledge" | "llm" | "skill" | "end";
export type OrchestrationRunStatus = "SUCCESS" | "FAILED";
export type OrchestrationTriggerType = "MANUAL";

export interface OrchestrationNodePosition {
  x: number;
  y: number;
}

export interface OrchestrationNodeConfig {
  inputSchema?: string;
  knowledgeBase?: string;
  retrievalQuery?: string;
  topK?: string;
  modelName?: string;
  prompt?: string;
  skillName?: string;
  action?: string;
  payloadTemplate?: string;
  outputKey?: string;
  responseTemplate?: string;
}

export interface OrchestrationWorkflowNode {
  id: string;
  type: OrchestrationNodeType;
  name: string;
  position: OrchestrationNodePosition;
  config: OrchestrationNodeConfig;
}

export interface OrchestrationWorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface OrchestrationWorkflowGraph {
  version: 1;
  nodes: OrchestrationWorkflowNode[];
  edges: OrchestrationWorkflowEdge[];
}

export interface OrchestrationWorkflowEntity {
  id: string;
  code: string;
  name: string;
  description: string;
  status: OrchestrationWorkflowStatus;
  currentVersionId?: string;
  currentVersionNumber?: number;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface OrchestrationWorkflowVersionEntity {
  id: string;
  workflowId: string;
  versionNumber: number;
  remark: string;
  definitionGraph: OrchestrationWorkflowGraph;
  createDate: string;
  createUserId: string;
  createUserName: string;
}

export interface OrchestrationRunStep {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: OrchestrationNodeType;
  status: OrchestrationRunStatus;
  startedAt: string;
  endedAt: string;
  inputSummary: string;
  outputSummary: string;
}

export interface OrchestrationWorkflowRunEntity {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  workflowVersionNumber: number;
  status: OrchestrationRunStatus;
  triggerType: OrchestrationTriggerType;
  triggerParams: {
    inputText: string;
    variablesJson?: string;
  };
  startTime: string;
  endTime: string;
  durationMs: number;
  outputSummary?: string;
  errorSummary?: string;
  steps: OrchestrationRunStep[];
}

export interface OrchestrationWorkflowFilters {
  keyword: string;
  status: "ALL" | OrchestrationWorkflowStatus;
  page: number;
  pageSize: number;
}

export interface OrchestrationWorkflowMutationInput {
  code: string;
  name: string;
  description: string;
}

export interface OrchestrationVersionMutationInput {
  remark: string;
  definitionGraph: OrchestrationWorkflowGraph;
}

export interface OrchestrationRunMutationInput {
  versionId?: string;
  inputText: string;
  variablesJson?: string;
}

export interface OrchestrationWorkflowListItem extends OrchestrationWorkflowEntity {
  versionCount: number;
  runCount: number;
  latestVersionId?: string;
  latestVersionNumber?: number;
  lastRunStatus?: OrchestrationRunStatus;
  lastRunEndedAt?: string;
  lastRunOutputSummary?: string;
}

export interface OrchestrationWorkflowListResult {
  items: OrchestrationWorkflowListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalWorkflows: number;
    draftWorkflows: number;
    pendingWorkflows: number;
    publishedWorkflows: number;
    disabledWorkflows: number;
    totalRuns: number;
  };
}

export interface OrchestrationWorkflowDetail {
  workflow: OrchestrationWorkflowListItem;
  currentVersion: OrchestrationWorkflowVersionEntity | null;
  latestVersion: OrchestrationWorkflowVersionEntity | null;
  recentVersions: OrchestrationWorkflowVersionEntity[];
  recentRuns: OrchestrationWorkflowRunEntity[];
}
