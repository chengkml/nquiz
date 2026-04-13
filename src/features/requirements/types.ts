export const requirementStatusOptions = [
  "PENDING_ANALYSIS",
  "PENDING_REVIEW",
  "PENDING_REVISION",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CLOSED",
] as const;

export const requirementPriorityOptions = ["LOW", "MEDIUM", "HIGH"] as const;

export type RequirementStatus = (typeof requirementStatusOptions)[number];

export type RequirementPriority = (typeof requirementPriorityOptions)[number];

export type RequirementReviewDecision = "APPROVE" | "REJECT";

export interface RequirementListFilters {
  title: string;
  projectName: string;
  status: "ALL" | RequirementStatus;
  priority: "ALL" | RequirementPriority;
  pageNum: number;
  pageSize: number;
}

export interface RequirementListItem {
  id: string;
  title: string;
  projectName: string;
  gitUrl: string;
  branch: string;
  descr: string;
  status: RequirementStatus;
  priority: RequirementPriority;
  progressPercent: number;
  resultMsg: string;
  createDate: string;
  updateDate: string;
  createUser: string;
  createUserName: string;
}

export interface RequirementListSummary {
  total: number;
  pendingAnalysis: number;
  pendingReview: number;
  pendingRevision: number;
  open: number;
  inProgress: number;
  completed: number;
  closed: number;
}

export interface RequirementSearchResult {
  content: RequirementListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  summary: RequirementListSummary;
}

export interface RequirementHistoryOptionsResult {
  projectNames: string[];
  gitUrls: string[];
  branches: string[];
}

export interface RequirementMutationInput {
  title: string;
  projectName: string;
  gitUrl: string;
  branch: string;
  descr: string;
  status: RequirementStatus;
  priority: RequirementPriority;
  progressPercent: number;
  resultMsg: string;
}

export interface RequirementUpdateInput extends RequirementMutationInput {
  id: string;
}

export type RequirementLifecycleEventType =
  | "CREATE"
  | "EDIT"
  | "STATUS_CHANGE"
  | "ANALYZE"
  | "REVIEW"
  | "DELETE";

export interface RequirementLifecycleItem {
  id: string;
  requirementId: string;
  eventType: RequirementLifecycleEventType;
  note: string;
  fromStatus: RequirementStatus | null;
  toStatus: RequirementStatus | null;
  fromDescr: string | null;
  toDescr: string | null;
  operatorId: string;
  operatorName: string;
  createDate: string;
}

export interface RequirementAnalyzeInput {
  descr: string;
  note: string;
}

export interface RequirementReviewInput {
  decision: RequirementReviewDecision;
  comment: string;
}
