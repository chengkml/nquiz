export type CodeReviewTaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";

export type CodeReviewIssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CodeReviewIssueStatus = "OPEN" | "TRIAGED" | "CONVERTED" | "RESOLVED" | "IGNORED";

export type CodeReviewIssueSource = "OPENCLAW" | "MANUAL" | "CI_BOT";

export interface CodeReviewTaskEntity {
  id: string;
  title: string;
  projectName: string;
  gitUrl: string;
  branch: string;
  targetPage: string;
  reviewStandard: string;
  descr: string;
  status: CodeReviewTaskStatus;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface CodeReviewIssueEntity {
  id: string;
  taskId: string;
  title: string;
  projectName: string;
  moduleName: string;
  filePath: string;
  lineNo: number | null;
  severity: CodeReviewIssueSeverity;
  status: CodeReviewIssueStatus;
  source: CodeReviewIssueSource;
  issueDetail: string;
  suggestion: string;
  requirementId: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface CodeReviewTaskListFilters {
  keyword: string;
  projectName: string;
  status: "ALL" | CodeReviewTaskStatus;
  page: number;
  pageSize: number;
}

export interface CodeReviewTaskListItem extends CodeReviewTaskEntity {
  issueCount: number;
  openIssueCount: number;
  convertedIssueCount: number;
}

export interface CodeReviewTaskSummary {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  blocked: number;
}

export interface CodeReviewTaskListResult {
  items: CodeReviewTaskListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: CodeReviewTaskSummary;
}

export interface CodeReviewTaskMutationInput {
  title: string;
  projectName: string;
  gitUrl: string;
  branch: string;
  targetPage: string;
  reviewStandard: string;
  descr: string;
}

export interface CodeReviewTaskDetail extends CodeReviewTaskListItem {
  issueStatusSummary: Record<CodeReviewIssueStatus, number>;
}

export interface CodeReviewTaskHistoryOptions {
  projectNames: string[];
  gitUrls: string[];
  branches: string[];
}

export interface CodeReviewIssueListFilters {
  taskId: string;
  keyword: string;
  status: "ALL" | CodeReviewIssueStatus;
  severity: "ALL" | CodeReviewIssueSeverity;
  page: number;
  pageSize: number;
}

export interface CodeReviewIssueListResult {
  items: CodeReviewIssueEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CodeReviewIssueMutationInput {
  title: string;
  moduleName: string;
  filePath: string;
  lineNo: number | null;
  severity: CodeReviewIssueSeverity;
  status: CodeReviewIssueStatus;
  source: CodeReviewIssueSource;
  issueDetail: string;
  suggestion: string;
}

export interface CodeReviewIssueConvertResult {
  issueId: string;
  requirementId: string;
  title: string;
  severity: CodeReviewIssueSeverity;
  mappedPriority: "LOW" | "MEDIUM" | "HIGH";
}
