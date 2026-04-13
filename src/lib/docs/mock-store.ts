import { docFilterSchema, docFormSchema } from "@/features/docs/schema";
import type {
  DocListFilters,
  DocListItem,
  DocListResult,
  DocMutationInput,
  DocStatus,
  DocType,
} from "@/features/docs/types";

const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

interface DocRecord {
  id: string;
  title: string;
  type: DocType;
  status: DocStatus;
  description: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
}

const docs: DocRecord[] = [
  {
    id: "doc-api-style-guide",
    title: "API 设计规范（v2）",
    type: "DOC",
    status: "PUBLISHED",
    description: "约束接口命名、错误码与分页结构，供前后端协同对齐。",
    content:
      "本规范用于统一 nquiz 各菜单模块的 API 契约，包括命名、分页、状态码、错误处理与鉴权边界。首版重点覆盖 BFF 与业务接口。",
    createdAt: "2026-04-08T09:10:00.000Z",
    updatedAt: "2026-04-11T06:20:00.000Z",
    createdBy: CURRENT_USER_ID,
    createdByName: CURRENT_USER_NAME,
  },
  {
    id: "doc-sprint-plan",
    title: "重构冲刺计划（第 3 周）",
    type: "PDF",
    status: "DRAFT",
    description: "记录本周菜单迁移优先级、风险和回归策略。",
    content:
      "本周优先迁移文档、文件与 OCR 菜单。验收要求：菜单级闭环、可运行验证、差异说明完整。风险点：模块边界重叠与接口口径漂移。",
    createdAt: "2026-04-09T03:30:00.000Z",
    updatedAt: "2026-04-11T03:15:00.000Z",
    createdBy: CURRENT_USER_ID,
    createdByName: CURRENT_USER_NAME,
  },
  {
    id: "doc-ui-moodboard",
    title: "UI 情绪板",
    type: "IMAGE",
    status: "ARCHIVED",
    description: "历史视觉方向稿，已归档，仅用于追溯设计决策。",
    content: "旧版视觉稿偏装饰，信息层级不够清晰。当前方案改为工作台信息密度优先。",
    createdAt: "2026-04-05T11:00:00.000Z",
    updatedAt: "2026-04-10T02:40:00.000Z",
    createdBy: CURRENT_USER_ID,
    createdByName: CURRENT_USER_NAME,
  },
  {
    id: "doc-shared-template",
    title: "共享模板（非本人）",
    type: "OTHER",
    status: "PUBLISHED",
    description: "用于验证本人数据隔离，当前用户不应看到这条。",
    content: "这是一条由其他用户创建的文档记录。",
    createdAt: "2026-04-06T08:00:00.000Z",
    updatedAt: "2026-04-10T08:00:00.000Z",
    createdBy: "other-user",
    createdByName: "其他用户",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function truncate(text: string, length: number) {
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1))}…`;
}

function toListItem(record: DocRecord): DocListItem {
  return {
    ...record,
    contentPreview: truncate(record.content || record.description || "-", 80),
  };
}

function getVisibleDocs() {
  return docs
    .filter((item) => item.createdBy === CURRENT_USER_ID)
    .sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1));
}

export function listDocs(rawFilters: DocListFilters): DocListResult {
  const filters = docFilterSchema.parse(rawFilters);
  const keyword = normalizeKeyword(filters.keyword);
  const visible = getVisibleDocs();

  const filtered = visible.filter((item) => {
    if (filters.type !== "ALL" && item.type !== filters.type) return false;
    if (filters.status !== "ALL" && item.status !== filters.status) return false;
    if (!keyword) return true;

    const haystack = [item.title, item.description, item.content, item.createdByName].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  const start = (filters.page - 1) * filters.pageSize;
  const pageItems = filtered.slice(start, start + filters.pageSize).map(toListItem);

  return {
    items: pageItems,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      total: visible.length,
      draft: visible.filter((item) => item.status === "DRAFT").length,
      published: visible.filter((item) => item.status === "PUBLISHED").length,
      archived: visible.filter((item) => item.status === "ARCHIVED").length,
    },
  };
}

export function getDocById(id: string): DocListItem {
  const record = docs.find((item) => item.id === id && item.createdBy === CURRENT_USER_ID);
  if (!record) {
    throw new Error("文档不存在或无权查看");
  }
  return toListItem(record);
}

export function createDoc(rawInput: DocMutationInput): DocListItem {
  const input = docFormSchema.parse(rawInput);
  const timestamp = nowIso();
  const record: DocRecord = {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title.trim(),
    type: input.type,
    status: input.status,
    description: input.description || "",
    content: input.content || "",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: CURRENT_USER_ID,
    createdByName: CURRENT_USER_NAME,
  };

  docs.unshift(record);
  return toListItem(record);
}

export function updateDoc(id: string, rawInput: DocMutationInput): DocListItem {
  const input = docFormSchema.parse(rawInput);
  const index = docs.findIndex((item) => item.id === id && item.createdBy === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("文档不存在或无权编辑");
  }

  const current = docs[index];
  const next: DocRecord = {
    ...current,
    title: input.title.trim(),
    type: input.type,
    status: input.status,
    description: input.description || "",
    content: input.content || "",
    updatedAt: nowIso(),
  };

  docs[index] = next;
  return toListItem(next);
}

export function deleteDoc(id: string) {
  const index = docs.findIndex((item) => item.id === id && item.createdBy === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("文档不存在或无权删除");
  }
  docs.splice(index, 1);
}
