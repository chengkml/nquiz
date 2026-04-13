import {
  codeReviewIssueFilterSchema,
  codeReviewTaskFilterSchema,
} from "@/features/code-review/schema";
import type {
  CodeReviewIssueConvertResult,
  CodeReviewIssueEntity,
  CodeReviewIssueListFilters,
  CodeReviewIssueListResult,
  CodeReviewIssueMutationInput,
  CodeReviewIssueSeverity,
  CodeReviewIssueStatus,
  CodeReviewTaskDetail,
  CodeReviewTaskEntity,
  CodeReviewTaskHistoryOptions,
  CodeReviewTaskListFilters,
  CodeReviewTaskListItem,
  CodeReviewTaskListResult,
  CodeReviewTaskMutationInput,
} from "@/features/code-review/types";

const STORAGE_KEY = "nquiz-code-review-workbench-v1";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";
const LATENCY_MS = 120;

interface CodeReviewSnapshot {
  tasks: CodeReviewTaskEntity[];
  issues: CodeReviewIssueEntity[];
}

const seedSnapshot: CodeReviewSnapshot = {
  tasks: [
    {
      id: "code-review-task-auth",
      title: "登录链路稳定性审查",
      projectName: "nquiz",
      gitUrl: "https://git.example.com/quiz/nquiz.git",
      branch: "main",
      targetPage: "/login",
      reviewStandard: "鉴权链路、错误处理、审计日志完整性",
      descr: "重点检查登录失败分支、JWT 刷新时机和异常码一致性。",
      status: "IN_PROGRESS",
      createDate: "2026-04-11T08:20:00.000Z",
      updateDate: "2026-04-11T09:00:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "code-review-task-knowledge",
      title: "知识集管理页交互审查",
      projectName: "nquiz",
      gitUrl: "https://git.example.com/quiz/nquiz.git",
      branch: "feat/knowledge-set-v2",
      targetPage: "/knowledge/sets",
      reviewStandard: "筛选语义、删除保护、表单校验完整性",
      descr: "验证筛选 URL 化行为、禁用态提示与删除确认文案是否一致。",
      status: "OPEN",
      createDate: "2026-04-10T15:15:00.000Z",
      updateDate: "2026-04-10T15:15:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "code-review-task-notification",
      title: "通知发送页问题复盘",
      projectName: "quiz",
      gitUrl: "https://git.example.com/quiz/quiz.git",
      branch: "release/2026.04",
      targetPage: "/notification/send",
      reviewStandard: "任务日志可观测性、失败补偿链路",
      descr: "该任务已完成，仅保留历史问题记录与转需求轨迹。",
      status: "COMPLETED",
      createDate: "2026-04-09T11:35:00.000Z",
      updateDate: "2026-04-10T10:10:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
  ],
  issues: [
    {
      id: "code-review-issue-1",
      taskId: "code-review-task-auth",
      title: "登录失败文案未区分凭证错误与网络异常",
      projectName: "nquiz",
      moduleName: "auth",
      filePath: "src/features/auth/login-form.tsx",
      lineNo: 88,
      severity: "MEDIUM",
      status: "OPEN",
      source: "OPENCLAW",
      issueDetail: "当前统一提示“登录失败”，无法让用户判断是否需要重试。",
      suggestion: "区分 401 与网络异常，补充可操作提示。",
      requirementId: "",
      createDate: "2026-04-11T08:45:00.000Z",
      updateDate: "2026-04-11T08:45:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "code-review-issue-2",
      taskId: "code-review-task-auth",
      title: "刷新 token 失败后未立即清理本地会话",
      projectName: "nquiz",
      moduleName: "auth",
      filePath: "src/lib/auth/session.ts",
      lineNo: 132,
      severity: "HIGH",
      status: "TRIAGED",
      source: "MANUAL",
      issueDetail: "401 分支仅 toast 提示，没有清理缓存，可能造成脏会话。",
      suggestion: "刷新失败后主动清理 token 并跳转登录页。",
      requirementId: "",
      createDate: "2026-04-11T08:50:00.000Z",
      updateDate: "2026-04-11T08:52:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "code-review-issue-3",
      taskId: "code-review-task-notification",
      title: "异常日志重试成功后列表未刷新",
      projectName: "quiz",
      moduleName: "notification",
      filePath: "frontend/src/pages/NotificationExceptionLogs/index.tsx",
      lineNo: 214,
      severity: "LOW",
      status: "CONVERTED",
      source: "OPENCLAW",
      issueDetail: "重试成功后仍显示在异常列表，用户需要手动刷新。",
      suggestion: "重试成功后触发列表失效刷新。",
      requirementId: "294962874827149255",
      createDate: "2026-04-09T11:42:00.000Z",
      updateDate: "2026-04-09T12:10:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
  ],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function wait<T>(value: T, latencyMs = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), latencyMs);
  });
}

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createRequirementId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

function readSnapshot(): CodeReviewSnapshot {
  if (!isBrowser()) {
    return clone(seedSnapshot);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CodeReviewSnapshot>;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.issues)) {
      throw new Error("invalid shape");
    }

    return {
      tasks: parsed.tasks as CodeReviewTaskEntity[],
      issues: parsed.issues as CodeReviewIssueEntity[],
    };
  } catch {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }
}

function writeSnapshot(snapshot: CodeReviewSnapshot) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTaskInput(input: CodeReviewTaskMutationInput): CodeReviewTaskMutationInput {
  return {
    title: input.title.trim(),
    projectName: input.projectName.trim(),
    gitUrl: input.gitUrl.trim(),
    branch: input.branch.trim(),
    targetPage: input.targetPage.trim(),
    reviewStandard: input.reviewStandard.trim(),
    descr: input.descr.trim(),
  };
}

function normalizeIssueInput(input: CodeReviewIssueMutationInput): CodeReviewIssueMutationInput {
  return {
    title: input.title.trim(),
    moduleName: input.moduleName.trim(),
    filePath: input.filePath.trim(),
    lineNo: input.lineNo ?? null,
    severity: input.severity,
    status: input.status,
    source: input.source,
    issueDetail: input.issueDetail.trim(),
    suggestion: input.suggestion.trim(),
  };
}

function statusSummary(issues: CodeReviewIssueEntity[]) {
  return {
    OPEN: issues.filter((item) => item.status === "OPEN").length,
    TRIAGED: issues.filter((item) => item.status === "TRIAGED").length,
    CONVERTED: issues.filter((item) => item.status === "CONVERTED").length,
    RESOLVED: issues.filter((item) => item.status === "RESOLVED").length,
    IGNORED: issues.filter((item) => item.status === "IGNORED").length,
  };
}

function toTaskListItem(task: CodeReviewTaskEntity, issues: CodeReviewIssueEntity[]): CodeReviewTaskListItem {
  const taskIssues = issues.filter((item) => item.taskId === task.id);
  return {
    ...task,
    issueCount: taskIssues.length,
    openIssueCount: taskIssues.filter((item) => item.status === "OPEN" || item.status === "TRIAGED").length,
    convertedIssueCount: taskIssues.filter((item) => item.status === "CONVERTED").length,
  };
}

function visibleTasks(tasks: CodeReviewTaskEntity[]) {
  return tasks
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .sort((left, right) => right.createDate.localeCompare(left.createDate));
}

export async function listCodeReviewTasks(rawFilters: CodeReviewTaskListFilters): Promise<CodeReviewTaskListResult> {
  const filters = codeReviewTaskFilterSchema.parse(rawFilters);
  const snapshot = readSnapshot();
  const keyword = normalizeKeyword(filters.keyword);
  const projectNameKeyword = normalizeKeyword(filters.projectName);

  const filtered = visibleTasks(snapshot.tasks).filter((item) => {
    if (filters.status !== "ALL" && item.status !== filters.status) {
      return false;
    }

    if (projectNameKeyword && !item.projectName.toLowerCase().includes(projectNameKeyword)) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = [
      item.title,
      item.projectName,
      item.targetPage,
      item.reviewStandard,
      item.gitUrl,
      item.branch,
      item.descr,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });

  const items = filtered.map((item) => toTaskListItem(item, snapshot.issues));
  const start = (filters.page - 1) * filters.pageSize;

  return wait({
    items: items.slice(start, start + filters.pageSize),
    total: items.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      total: snapshot.tasks.length,
      open: snapshot.tasks.filter((item) => item.status === "OPEN").length,
      inProgress: snapshot.tasks.filter((item) => item.status === "IN_PROGRESS").length,
      completed: snapshot.tasks.filter((item) => item.status === "COMPLETED").length,
      blocked: snapshot.tasks.filter((item) => item.status === "CLOSED").length,
    },
  });
}

export async function listCodeReviewTaskHistoryOptions(): Promise<CodeReviewTaskHistoryOptions> {
  const tasks = visibleTasks(readSnapshot().tasks);

  return wait({
    projectNames: Array.from(new Set(tasks.map((item) => item.projectName))).sort((left, right) => left.localeCompare(right)),
    gitUrls: Array.from(new Set(tasks.map((item) => item.gitUrl))).sort((left, right) => left.localeCompare(right)),
    branches: Array.from(new Set(tasks.map((item) => item.branch))).sort((left, right) => left.localeCompare(right)),
  });
}

export async function getCodeReviewTaskDetail(taskId: string): Promise<CodeReviewTaskDetail | null> {
  const snapshot = readSnapshot();
  const task = snapshot.tasks.find((item) => item.id === taskId && item.createUserId === CURRENT_USER_ID) || null;

  if (!task) {
    return wait(null);
  }

  const taskIssues = snapshot.issues.filter((item) => item.taskId === task.id && item.createUserId === CURRENT_USER_ID);
  return wait({
    ...toTaskListItem(task, snapshot.issues),
    issueStatusSummary: statusSummary(taskIssues),
  });
}

export async function createCodeReviewTask(input: CodeReviewTaskMutationInput): Promise<CodeReviewTaskEntity> {
  const snapshot = readSnapshot();
  const payload = normalizeTaskInput(input);
  const timestamp = nowIso();

  const task: CodeReviewTaskEntity = {
    id: createId("code-review-task"),
    status: "OPEN",
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    ...payload,
  };

  snapshot.tasks.unshift(task);
  writeSnapshot(snapshot);
  return wait(task);
}

export async function updateCodeReviewTask(id: string, input: CodeReviewTaskMutationInput): Promise<CodeReviewTaskEntity> {
  const snapshot = readSnapshot();
  const index = snapshot.tasks.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("审核任务不存在或无权编辑");
  }

  const next: CodeReviewTaskEntity = {
    ...snapshot.tasks[index],
    ...normalizeTaskInput(input),
    updateDate: nowIso(),
  };

  snapshot.tasks[index] = next;
  writeSnapshot(snapshot);
  return wait(next);
}

export async function deleteCodeReviewTask(id: string): Promise<{ success: true }> {
  const snapshot = readSnapshot();
  const target = snapshot.tasks.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);

  if (!target) {
    throw new Error("审核任务不存在或无权删除");
  }

  const issueCount = snapshot.issues.filter((item) => item.taskId === id && item.createUserId === CURRENT_USER_ID).length;
  if (issueCount > 0) {
    throw new Error("当前任务仍有关联审核问题，请先清理问题后再删除任务");
  }

  snapshot.tasks = snapshot.tasks.filter((item) => item.id !== id);
  writeSnapshot(snapshot);
  return wait({ success: true });
}

export async function startCodeReviewTask(id: string): Promise<CodeReviewTaskEntity> {
  const snapshot = readSnapshot();
  const index = snapshot.tasks.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("审核任务不存在或无权操作");
  }

  if (snapshot.tasks[index].status !== "OPEN") {
    throw new Error("只有 OPEN 状态任务可以开始处理");
  }

  const next = {
    ...snapshot.tasks[index],
    status: "IN_PROGRESS" as const,
    updateDate: nowIso(),
  };

  snapshot.tasks[index] = next;
  writeSnapshot(snapshot);
  return wait(next);
}

export async function completeCodeReviewTask(id: string): Promise<CodeReviewTaskEntity> {
  const snapshot = readSnapshot();
  const index = snapshot.tasks.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("审核任务不存在或无权操作");
  }

  if (snapshot.tasks[index].status !== "IN_PROGRESS") {
    throw new Error("只有 IN_PROGRESS 状态任务可以标记完成");
  }

  const next = {
    ...snapshot.tasks[index],
    status: "COMPLETED" as const,
    updateDate: nowIso(),
  };

  snapshot.tasks[index] = next;
  writeSnapshot(snapshot);
  return wait(next);
}

export async function listCodeReviewIssues(rawFilters: CodeReviewIssueListFilters): Promise<CodeReviewIssueListResult> {
  const filters = codeReviewIssueFilterSchema.parse(rawFilters);
  const snapshot = readSnapshot();
  const task = snapshot.tasks.find((item) => item.id === rawFilters.taskId && item.createUserId === CURRENT_USER_ID);

  if (!task) {
    throw new Error("审核任务不存在或无权查看");
  }

  const keyword = normalizeKeyword(filters.keyword);
  const filtered = snapshot.issues
    .filter((item) => item.taskId === rawFilters.taskId && item.createUserId === CURRENT_USER_ID)
    .filter((item) => {
      if (filters.status !== "ALL" && item.status !== filters.status) {
        return false;
      }

      if (filters.severity !== "ALL" && item.severity !== filters.severity) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        item.title,
        item.moduleName,
        item.filePath,
        item.issueDetail,
        item.suggestion,
        item.requirementId,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    })
    .sort((left, right) => right.createDate.localeCompare(left.createDate));

  const start = (filters.page - 1) * filters.pageSize;
  return wait({
    items: filtered.slice(start, start + filters.pageSize),
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
  });
}

export async function createCodeReviewIssue(
  taskId: string,
  input: CodeReviewIssueMutationInput,
): Promise<CodeReviewIssueEntity> {
  const snapshot = readSnapshot();
  const task = snapshot.tasks.find((item) => item.id === taskId && item.createUserId === CURRENT_USER_ID);
  if (!task) {
    throw new Error("审核任务不存在或无权新增问题");
  }

  const payload = normalizeIssueInput(input);
  const timestamp = nowIso();

  const issue: CodeReviewIssueEntity = {
    id: createId("code-review-issue"),
    taskId,
    projectName: task.projectName,
    requirementId: "",
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    ...payload,
  };

  snapshot.issues.unshift(issue);
  writeSnapshot(snapshot);
  return wait(issue);
}

export async function updateCodeReviewIssue(
  issueId: string,
  input: CodeReviewIssueMutationInput,
): Promise<CodeReviewIssueEntity> {
  const snapshot = readSnapshot();
  const index = snapshot.issues.findIndex((item) => item.id === issueId && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("审核问题不存在或无权编辑");
  }

  const current = snapshot.issues[index];
  const next: CodeReviewIssueEntity = {
    ...current,
    ...normalizeIssueInput(input),
    requirementId: current.requirementId,
    updateDate: nowIso(),
  };

  snapshot.issues[index] = next;
  writeSnapshot(snapshot);
  return wait(next);
}

export async function deleteCodeReviewIssue(issueId: string): Promise<{ success: true }> {
  const snapshot = readSnapshot();
  const target = snapshot.issues.find((item) => item.id === issueId && item.createUserId === CURRENT_USER_ID);
  if (!target) {
    throw new Error("审核问题不存在或无权删除");
  }

  snapshot.issues = snapshot.issues.filter((item) => item.id !== issueId);
  writeSnapshot(snapshot);
  return wait({ success: true });
}

function mapSeverityToPriority(severity: CodeReviewIssueSeverity): "LOW" | "MEDIUM" | "HIGH" {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "HIGH";
  }
  if (severity === "MEDIUM") {
    return "MEDIUM";
  }
  return "LOW";
}

export async function convertCodeReviewIssueToRequirement(issueId: string): Promise<CodeReviewIssueConvertResult> {
  const snapshot = readSnapshot();
  const index = snapshot.issues.findIndex((item) => item.id === issueId && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("审核问题不存在或无权转需求");
  }

  const issue = snapshot.issues[index];
  if (issue.requirementId) {
    return wait({
      issueId: issue.id,
      requirementId: issue.requirementId,
      title: issue.title,
      severity: issue.severity,
      mappedPriority: mapSeverityToPriority(issue.severity),
    });
  }

  const requirementId = createRequirementId();
  const next: CodeReviewIssueEntity = {
    ...issue,
    requirementId,
    status: "CONVERTED",
    updateDate: nowIso(),
  };

  snapshot.issues[index] = next;
  writeSnapshot(snapshot);

  return wait({
    issueId: next.id,
    requirementId: next.requirementId,
    title: next.title,
    severity: next.severity,
    mappedPriority: mapSeverityToPriority(next.severity),
  });
}

export function formatTaskStatus(status: CodeReviewTaskEntity["status"]) {
  if (status === "OPEN") return "待处理";
  if (status === "IN_PROGRESS") return "处理中";
  if (status === "COMPLETED") return "已完成";
  return "已关闭";
}

export function formatIssueStatus(status: CodeReviewIssueStatus) {
  if (status === "OPEN") return "待处理";
  if (status === "TRIAGED") return "已分诊";
  if (status === "CONVERTED") return "已转需求";
  if (status === "RESOLVED") return "已解决";
  return "已忽略";
}
