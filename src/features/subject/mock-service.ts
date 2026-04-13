import type {
  SubjectEntity,
  SubjectListFilters,
  SubjectListItem,
  SubjectListResult,
  SubjectMutationInput,
  SubjectOption,
} from "@/features/subject/types";

const STORAGE_KEY = "nquiz-subjects";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

const defaultSubjects: SubjectEntity[] = [
  {
    id: "subject-math",
    name: "math",
    label: "数学",
    descr: "承接代数、几何、函数等题目与知识点，是题库、错题本、考试编排的高频基础学科。",
    knowledgeNum: 128,
    questionNum: 842,
    createDate: "2026-04-08T08:20:00.000Z",
    updateDate: "2026-04-10T15:00:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "subject-english",
    name: "english",
    label: "英语",
    descr: "面向阅读、语法、写作等知识组织，支撑错题、知识点与考试历史模块。",
    knowledgeNum: 86,
    questionNum: 504,
    createDate: "2026-04-07T09:30:00.000Z",
    updateDate: "2026-04-09T13:40:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "subject-programming",
    name: "programming",
    label: "编程",
    descr: "用于承接 React、SQL、算法等技术主题，方便知识点与练习题归档。",
    knowledgeNum: 64,
    questionNum: 271,
    createDate: "2026-04-06T11:10:00.000Z",
    updateDate: "2026-04-10T09:15:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "subject-empty-template",
    name: "history",
    label: "历史",
    descr: "示例空学科，用于演示新增后的维护与安全删除路径。",
    knowledgeNum: 0,
    questionNum: 0,
    createDate: "2026-04-05T10:00:00.000Z",
    updateDate: "2026-04-05T10:00:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
];

function wait(ms = 100) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function ensureSubjects() {
  const existing = readJson<SubjectEntity[] | null>(STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(STORAGE_KEY, defaultSubjects);
  return defaultSubjects;
}

function saveSubjects(subjects: SubjectEntity[]) {
  writeJson(STORAGE_KEY, subjects);
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function normalizeMutationInput(input: SubjectMutationInput) {
  return {
    name: input.name.trim(),
    label: input.label.trim(),
    descr: input.descr?.trim() ?? "",
  };
}

function normalizeSubjectName(value: string) {
  return value.trim();
}

function toListItem(item: SubjectEntity): SubjectListItem {
  return {
    ...item,
    totalAssets: item.knowledgeNum + item.questionNum,
  };
}

function getVisibleSubjects() {
  return ensureSubjects()
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .sort((a, b) => (a.createDate < b.createDate ? 1 : -1));
}

export async function listSubjects(filters: SubjectListFilters): Promise<SubjectListResult> {
  await wait(120);

  const subjects = getVisibleSubjects();
  const keyword = normalizeKeyword(filters.keyword);
  const filtered = subjects.filter((item) => {
    if (!keyword) return true;
    const haystack = [item.name, item.label, item.descr].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(start, start + filters.pageSize).map(toListItem);

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalSubjects: subjects.length,
      totalKnowledge: subjects.reduce((sum, item) => sum + item.knowledgeNum, 0),
      totalQuestions: subjects.reduce((sum, item) => sum + item.questionNum, 0),
    },
  };
}

export async function listSubjectOptions(): Promise<SubjectOption[]> {
  await wait(60);
  return getVisibleSubjects().map((item) => ({
    id: item.id,
    name: item.name,
    label: item.label,
  }));
}

export async function checkSubjectNameUnique(name: string, excludeId?: string) {
  await wait(80);
  const normalized = normalizeSubjectName(name);
  if (!normalized) {
    return true;
  }

  return !getVisibleSubjects().some((item) => item.name === normalized && item.id !== excludeId);
}

export async function createSubject(input: SubjectMutationInput) {
  await wait(120);
  const subjects = ensureSubjects();
  const payload = normalizeMutationInput(input);

  const isUnique = await checkSubjectNameUnique(payload.name);
  if (!isUnique) {
    throw new Error("该英文名称已存在");
  }

  const timestamp = nowIso();
  const record: SubjectEntity = {
    id: `subject-${Date.now()}`,
    name: payload.name,
    label: payload.label,
    descr: payload.descr,
    knowledgeNum: 0,
    questionNum: 0,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  saveSubjects([record, ...subjects]);
  return record;
}

export async function updateSubject(id: string, input: SubjectMutationInput) {
  await wait(120);
  const subjects = ensureSubjects();
  const index = subjects.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("学科不存在或无权编辑");
  }

  const current = subjects[index];
  const payload = normalizeMutationInput(input);
  if (payload.name !== current.name) {
    const isUnique = await checkSubjectNameUnique(payload.name, id);
    if (!isUnique) {
      throw new Error("该英文名称已存在");
    }
  }

  const next: SubjectEntity = {
    ...current,
    name: payload.name,
    label: payload.label,
    descr: payload.descr,
    updateDate: nowIso(),
  };

  subjects[index] = next;
  saveSubjects(subjects);
  return next;
}

export async function deleteSubject(id: string) {
  await wait(100);
  const subjects = ensureSubjects();
  const next = subjects.filter((item) => !(item.id === id && item.createUserId === CURRENT_USER_ID));
  saveSubjects(next);
  return { success: true as const };
}
