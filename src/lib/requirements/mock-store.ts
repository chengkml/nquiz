import {
  requirementAnalyzeSchema,
  requirementFilterSchema,
  requirementFormSchema,
  requirementReviewSchema,
  requirementUpdateSchema,
} from "@/features/requirements/schema";
import type {
  RequirementAnalyzeInput,
  RequirementHistoryOptionsResult,
  RequirementLifecycleEventType,
  RequirementLifecycleItem,
  RequirementListFilters,
  RequirementListItem,
  RequirementListSummary,
  RequirementMutationInput,
  RequirementPriority,
  RequirementReviewInput,
  RequirementSearchResult,
  RequirementStatus,
  RequirementUpdateInput,
} from "@/features/requirements/types";

const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

interface RequirementRecord {
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

type RequirementLifecycleRecord = RequirementLifecycleItem;

const requirements: RequirementRecord[] = [
  {
    id: "req-nquiz-001",
    title: "迁移 Requirement 管理页",
    projectName: "nquiz",
    gitUrl: "https://github.com/example/nquiz",
    branch: "main",
    descr: "重构需求管理菜单，首期覆盖列表、CRUD、分析、评审、生命周期。",
    status: "PENDING_ANALYSIS",
    priority: "HIGH",
    progressPercent: 0,
    resultMsg: "",
    createDate: "2026-04-09T03:20:00.000Z",
    updateDate: "2026-04-09T03:20:00.000Z",
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "req-nquiz-002",
    title: "迁移通知异常日志页",
    projectName: "nquiz",
    gitUrl: "https://github.com/example/nquiz",
    branch: "main",
    descr: "补齐通知失败日志查询与单条重试。",
    status: "PENDING_REVIEW",
    priority: "MEDIUM",
    progressPercent: 0,
    resultMsg: "分析完成，等待评审",
    createDate: "2026-04-09T08:00:00.000Z",
    updateDate: "2026-04-10T04:20:00.000Z",
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "req-nquiz-003",
    title: "迁移 FuncDoc 管理页",
    projectName: "nquiz",
    gitUrl: "https://github.com/example/nquiz",
    branch: "feature/func-doc",
    descr: "被评审打回后待修订，需要补充 feature tree 与 process node。",
    status: "PENDING_REVISION",
    priority: "MEDIUM",
    progressPercent: 0,
    resultMsg: "评审未通过：缺少 feature tree 过滤条件",
    createDate: "2026-04-09T09:10:00.000Z",
    updateDate: "2026-04-10T06:50:00.000Z",
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "req-nquiz-004",
    title: "迁移 MCP 服务器页",
    projectName: "nquiz",
    gitUrl: "https://github.com/example/nquiz",
    branch: "feature/mcp-server",
    descr: "进入待开发队列，等待领取。",
    status: "OPEN",
    priority: "MEDIUM",
    progressPercent: 0,
    resultMsg: "",
    createDate: "2026-04-10T03:30:00.000Z",
    updateDate: "2026-04-10T03:30:00.000Z",
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "req-nquiz-005",
    title: "迁移知识集管理页",
    projectName: "nquiz",
    gitUrl: "https://github.com/example/nquiz",
    branch: "feature/knowledge-sets",
    descr: "开发进行中，核心功能已可操作。",
    status: "IN_PROGRESS",
    priority: "HIGH",
    progressPercent: 65,
    resultMsg: "已完成列表、来源管理与问答入口",
    createDate: "2026-04-10T05:20:00.000Z",
    updateDate: "2026-04-10T08:10:00.000Z",
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "req-nquiz-006",
    title: "迁移热搜页",
    projectName: "nquiz",
    gitUrl: "https://github.com/example/nquiz",
    branch: "feature/hot-search",
    descr: "热搜浏览与关注主题管理已交付。",
    status: "COMPLETED",
    priority: "MEDIUM",
    progressPercent: 100,
    resultMsg: "已完成并通过构建验证",
    createDate: "2026-04-08T12:50:00.000Z",
    updateDate: "2026-04-10T11:20:00.000Z",
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "req-nquiz-007",
    title: "迁移旧版实验页",
    projectName: "quiz-legacy",
    gitUrl: "",
    branch: "main",
    descr: "历史实验需求已关闭，不再继续迁移。",
    status: "CLOSED",
    priority: "LOW",
    progressPercent: 100,
    resultMsg: "需求关闭：不纳入 nquiz 范围",
    createDate: "2026-03-28T10:30:00.000Z",
    updateDate: "2026-04-02T10:10:00.000Z",
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "req-other-001",
    title: "其他用户的需求",
    projectName: "nquiz",
    gitUrl: "",
    branch: "main",
    descr: "用于验证用户隔离。",
    status: "OPEN",
    priority: "MEDIUM",
    progressPercent: 0,
    resultMsg: "",
    createDate: "2026-04-11T02:00:00.000Z",
    updateDate: "2026-04-11T02:00:00.000Z",
    createUser: "other-user",
    createUserName: "其他用户",
  },
];

const lifecycleLogs: RequirementLifecycleRecord[] = [];

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function priorityRank(priority: RequirementPriority) {
  if (priority === "HIGH") return 3;
  if (priority === "MEDIUM") return 2;
  return 1;
}

function applyProgressRule(status: RequirementStatus, progressPercent: number) {
  if (status === "IN_PROGRESS") return Math.min(99, Math.max(1, Math.round(progressPercent)));
  if (status === "COMPLETED" || status === "CLOSED") return 100;
  return 0;
}

function toListItem(record: RequirementRecord): RequirementListItem {
  return {
    ...record,
  };
}

function getVisibleRequirements() {
  return requirements.filter((item) => item.createUser === CURRENT_USER_ID);
}

function createLifecycleLog(params: {
  requirementId: string;
  eventType: RequirementLifecycleEventType;
  note: string;
  fromStatus?: RequirementStatus | null;
  toStatus?: RequirementStatus | null;
  fromDescr?: string | null;
  toDescr?: string | null;
  createDate?: string;
}) {
  const createDate = params.createDate ?? nowIso();
  const log: RequirementLifecycleRecord = {
    id: `life-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    requirementId: params.requirementId,
    eventType: params.eventType,
    note: params.note,
    fromStatus: params.fromStatus ?? null,
    toStatus: params.toStatus ?? null,
    fromDescr: params.fromDescr ?? null,
    toDescr: params.toDescr ?? null,
    operatorId: CURRENT_USER_ID,
    operatorName: CURRENT_USER_NAME,
    createDate,
  };
  lifecycleLogs.unshift(log);
}

function ensureLifecycleSeeded() {
  if (lifecycleLogs.length > 0) return;

  for (const item of getVisibleRequirements()) {
    createLifecycleLog({
      requirementId: item.id,
      eventType: "CREATE",
      note: "需求创建",
      toStatus: item.status,
      toDescr: item.descr,
      createDate: item.createDate,
    });

    if (item.status !== "PENDING_ANALYSIS") {
      createLifecycleLog({
        requirementId: item.id,
        eventType: "STATUS_CHANGE",
        note: `状态更新为 ${item.status}`,
        fromStatus: "PENDING_ANALYSIS",
        toStatus: item.status,
        createDate: item.updateDate,
      });
    }
  }
}

function computeSummary(list: RequirementRecord[]): RequirementListSummary {
  return {
    total: list.length,
    pendingAnalysis: list.filter((item) => item.status === "PENDING_ANALYSIS").length,
    pendingReview: list.filter((item) => item.status === "PENDING_REVIEW").length,
    pendingRevision: list.filter((item) => item.status === "PENDING_REVISION").length,
    open: list.filter((item) => item.status === "OPEN").length,
    inProgress: list.filter((item) => item.status === "IN_PROGRESS").length,
    completed: list.filter((item) => item.status === "COMPLETED").length,
    closed: list.filter((item) => item.status === "CLOSED").length,
  };
}

function findRequirementOrThrow(id: string) {
  const index = requirements.findIndex((item) => item.id === id && item.createUser === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("需求不存在或无权操作");
  }

  return { index, record: requirements[index] };
}

export function searchRequirements(rawFilters: RequirementListFilters): RequirementSearchResult {
  ensureLifecycleSeeded();
  const filters = requirementFilterSchema.parse(rawFilters);

  const titleKeyword = normalizeText(filters.title);
  const projectKeyword = normalizeText(filters.projectName);

  const visible = getVisibleRequirements();
  const filtered = visible
    .filter((item) => {
      if (filters.status !== "ALL" && item.status !== filters.status) return false;
      if (filters.priority !== "ALL" && item.priority !== filters.priority) return false;
      if (titleKeyword && ![item.title, item.descr].join(" ").toLowerCase().includes(titleKeyword)) return false;
      if (projectKeyword && !item.projectName.toLowerCase().includes(projectKeyword)) return false;
      return true;
    })
    .sort((left, right) => {
      const priorityCompare = priorityRank(right.priority) - priorityRank(left.priority);
      if (priorityCompare !== 0) return priorityCompare;
      if (left.createDate !== right.createDate) return left.createDate < right.createDate ? 1 : -1;
      return left.id < right.id ? 1 : -1;
    });

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / filters.pageSize));
  const pageNum = Math.min(filters.pageNum, totalPages);
  const start = (pageNum - 1) * filters.pageSize;
  const pageItems = filtered.slice(start, start + filters.pageSize).map(toListItem);

  return {
    content: pageItems,
    totalElements,
    totalPages,
    number: pageNum,
    size: filters.pageSize,
    summary: computeSummary(visible),
  };
}

export function listRequirementHistoryOptions(): RequirementHistoryOptionsResult {
  ensureLifecycleSeeded();
  const visible = getVisibleRequirements();

  const projectNames = new Set<string>();
  const gitUrls = new Set<string>();
  const branches = new Set<string>();

  for (const item of visible) {
    if (item.projectName.trim()) projectNames.add(item.projectName.trim());
    if (item.gitUrl.trim()) gitUrls.add(item.gitUrl.trim());
    if (item.branch.trim()) branches.add(item.branch.trim());
  }

  return {
    projectNames: Array.from(projectNames).sort((a, b) => a.localeCompare(b, "zh-CN")),
    gitUrls: Array.from(gitUrls).sort((a, b) => a.localeCompare(b, "zh-CN")),
    branches: Array.from(branches).sort((a, b) => a.localeCompare(b, "zh-CN")),
  };
}

export function getRequirementById(id: string) {
  ensureLifecycleSeeded();
  const { record } = findRequirementOrThrow(id);
  return toListItem(record);
}

export function createRequirement(rawInput: RequirementMutationInput) {
  ensureLifecycleSeeded();
  const input = requirementFormSchema.parse(rawInput);
  const timestamp = nowIso();
  const nextStatus = input.status;

  const record: RequirementRecord = {
    id: `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    projectName: input.projectName,
    gitUrl: input.gitUrl,
    branch: input.branch || "main",
    descr: input.descr,
    status: nextStatus,
    priority: input.priority,
    progressPercent: applyProgressRule(nextStatus, input.progressPercent),
    resultMsg: input.resultMsg,
    createDate: timestamp,
    updateDate: timestamp,
    createUser: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  requirements.unshift(record);
  createLifecycleLog({
    requirementId: record.id,
    eventType: "CREATE",
    note: "需求创建",
    toStatus: record.status,
    toDescr: record.descr,
  });

  return toListItem(record);
}

export function updateRequirement(rawInput: RequirementUpdateInput) {
  ensureLifecycleSeeded();
  const input = requirementUpdateSchema.parse(rawInput);
  const { index, record } = findRequirementOrThrow(input.id);

  const previousStatus = record.status;
  const previousDescr = record.descr;
  const timestamp = nowIso();

  const next: RequirementRecord = {
    ...record,
    title: input.title,
    projectName: input.projectName,
    gitUrl: input.gitUrl,
    branch: input.branch || "main",
    descr: input.descr,
    status: input.status,
    priority: input.priority,
    progressPercent: applyProgressRule(input.status, input.progressPercent),
    resultMsg: input.resultMsg,
    updateDate: timestamp,
  };

  requirements[index] = next;

  createLifecycleLog({
    requirementId: next.id,
    eventType: "EDIT",
    note: "需求信息编辑",
    fromStatus: previousStatus,
    toStatus: next.status,
    fromDescr: previousDescr,
    toDescr: next.descr,
  });

  if (previousStatus !== next.status) {
    createLifecycleLog({
      requirementId: next.id,
      eventType: "STATUS_CHANGE",
      note: `状态从 ${previousStatus} 变更为 ${next.status}`,
      fromStatus: previousStatus,
      toStatus: next.status,
    });
  }

  return toListItem(next);
}

export function deleteRequirement(id: string) {
  ensureLifecycleSeeded();
  const { index, record } = findRequirementOrThrow(id);

  createLifecycleLog({
    requirementId: record.id,
    eventType: "DELETE",
    note: "需求删除",
    fromStatus: record.status,
    fromDescr: record.descr,
  });

  requirements.splice(index, 1);
  return { success: true as const };
}

export function analyzeRequirement(id: string, rawInput: RequirementAnalyzeInput) {
  ensureLifecycleSeeded();
  const input = requirementAnalyzeSchema.parse(rawInput);
  const { index, record } = findRequirementOrThrow(id);

  if (record.status !== "PENDING_ANALYSIS") {
    throw new Error("只有待分析需求才能执行分析");
  }

  const next: RequirementRecord = {
    ...record,
    descr: input.descr,
    status: "PENDING_REVIEW",
    progressPercent: 0,
    resultMsg: "分析完成，等待评审",
    updateDate: nowIso(),
  };

  requirements[index] = next;
  createLifecycleLog({
    requirementId: next.id,
    eventType: "ANALYZE",
    note: input.note || "需求分析完成，转待评审",
    fromStatus: record.status,
    toStatus: next.status,
    fromDescr: record.descr,
    toDescr: next.descr,
  });

  return toListItem(next);
}

export function reviewRequirement(id: string, rawInput: RequirementReviewInput) {
  ensureLifecycleSeeded();
  const input = requirementReviewSchema.parse(rawInput);
  const { index, record } = findRequirementOrThrow(id);

  if (record.status !== "PENDING_REVIEW") {
    throw new Error("只有待评审需求才能执行评审");
  }

  const nextStatus: RequirementStatus = input.decision === "APPROVE" ? "OPEN" : "PENDING_REVISION";
  const nextResultMsg = input.comment || (input.decision === "APPROVE" ? "评审通过，进入待处理" : "评审打回，等待修订");

  const next: RequirementRecord = {
    ...record,
    status: nextStatus,
    progressPercent: 0,
    resultMsg: nextResultMsg,
    updateDate: nowIso(),
  };

  requirements[index] = next;
  createLifecycleLog({
    requirementId: next.id,
    eventType: "REVIEW",
    note: nextResultMsg,
    fromStatus: record.status,
    toStatus: next.status,
    fromDescr: record.descr,
    toDescr: next.descr,
  });

  return toListItem(next);
}

export function listRequirementLifecycle(id: string): RequirementLifecycleItem[] {
  ensureLifecycleSeeded();
  findRequirementOrThrow(id);

  return lifecycleLogs
    .filter((item) => item.requirementId === id)
    .sort((left, right) => (left.createDate < right.createDate ? 1 : -1));
}
