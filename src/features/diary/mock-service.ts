import { diaryFilterSchema } from "@/features/diary/schema";
import type { DiaryEntity, DiaryListFilters, DiaryListItem, DiaryListResult, DiaryMood, DiaryMoodSummaryItem, DiaryMutationInput } from "@/features/diary/types";

const STORAGE_KEY = "nquiz-diary-records";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

const seededRecords: DiaryEntity[] = [
  {
    id: "diary-001",
    title: "把编排页的节点配置补齐了",
    content:
      "今天把编排管理页的节点配置表单边界补齐了，之前 start/llm/skill 的 config 字段没有统一校验，导致页面保存后回显不稳定。\n\n这次顺便把默认值和错误提示一起收口，后续接真实后端时会更稳。",
    diaryDate: "2026-04-11",
    mood: "CALM",
    weather: "多云",
    archived: false,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-11T12:08:00.000Z",
    updateDate: "2026-04-11T12:08:00.000Z",
  },
  {
    id: "diary-002",
    title: "晚上把通知异常日志页回归了一遍",
    content:
      "重试逻辑和详情抽屉都走了一遍，结构化字段展示正常。\n\n还补了一个不可重试文案，避免用户误以为按钮失效。",
    diaryDate: "2026-04-10",
    mood: "HAPPY",
    weather: "晴",
    archived: false,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-10T14:15:00.000Z",
    updateDate: "2026-04-10T14:15:00.000Z",
  },
  {
    id: "diary-003",
    title: "白天排查了一个日期跨天问题",
    content:
      "本地以 ISO 时间串存储时，日期控件回填会偶发跨天。\n\n后续统一只传 YYYY-MM-DD，避免时区偏移影响日记日期和筛选区间。",
    diaryDate: "2026-04-09",
    mood: "TIRED",
    weather: "小雨",
    archived: false,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-09T10:03:00.000Z",
    updateDate: "2026-04-09T10:03:00.000Z",
  },
  {
    id: "diary-004",
    title: "迁移节奏有点赶",
    content:
      "今天队列里的需求数量明显增加，先把优先级和验收边界重新对齐。\n\n只要每个菜单形成最小闭环，后续接真实后端就不会返工太多。",
    diaryDate: "2026-04-08",
    mood: "SAD",
    weather: "阴",
    archived: true,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-08T09:41:00.000Z",
    updateDate: "2026-04-08T09:41:00.000Z",
  },
  {
    id: "diary-005",
    title: "修复了一个越权校验遗漏",
    content:
      "旧代码详情接口没有按 createUser 过滤，理论上存在越权读取风险。\n\n先在 nquiz 的需求分析里把这个风险写死，避免迁移时被遗漏。",
    diaryDate: "2026-04-07",
    mood: "ANGRY",
    weather: "晴",
    archived: true,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-07T15:50:00.000Z",
    updateDate: "2026-04-07T15:50:00.000Z",
  },
  {
    id: "diary-006",
    title: "把错题本页迁移的风险清单写完了",
    content:
      "OCR 流式识别和文件上传补偿是两个高风险点，先在需求里定了验收底线。\n\n后面做实现时至少有清晰边界，不会边做边改目标。",
    diaryDate: "2026-04-06",
    mood: "EXCITED",
    weather: "阵雨",
    archived: false,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-06T11:30:00.000Z",
    updateDate: "2026-04-06T11:30:00.000Z",
  },
];

function wait(ms = 120) {
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

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function toTimestamp(value?: string) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 88) {
    return normalized;
  }
  return `${normalized.slice(0, 88)}...`;
}

function compareByDiaryDateDesc(a: DiaryEntity, b: DiaryEntity) {
  const diaryDateCompare = b.diaryDate.localeCompare(a.diaryDate);
  if (diaryDateCompare !== 0) return diaryDateCompare;
  return toTimestamp(b.createDate) - toTimestamp(a.createDate);
}

function ensureStore() {
  const existing = readJson<DiaryEntity[] | null>(STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(STORAGE_KEY, seededRecords);
  return seededRecords;
}

function saveStore(records: DiaryEntity[]) {
  writeJson(STORAGE_KEY, records);
}

function getVisibleRecords() {
  return ensureStore().filter((item) => item.createUserId === CURRENT_USER_ID).sort(compareByDiaryDateDesc);
}

function toListItem(item: DiaryEntity): DiaryListItem {
  return {
    ...item,
    contentPreview: formatPreview(item.content),
  };
}

function buildMoodBreakdown(items: DiaryEntity[]): DiaryMoodSummaryItem[] {
  const moods: DiaryMood[] = ["HAPPY", "CALM", "SAD", "ANGRY", "TIRED", "EXCITED"];
  return moods.map((mood) => ({
    mood,
    count: items.filter((item) => item.mood === mood).length,
  }));
}

export async function listDiaryRecords(rawFilters: DiaryListFilters): Promise<DiaryListResult> {
  await wait();
  const filters = diaryFilterSchema.parse(rawFilters);
  const records = getVisibleRecords();
  const keyword = normalizeText(filters.keyword).toLowerCase();

  const filtered = records.filter((item) => {
    if (filters.mood && item.mood !== filters.mood) {
      return false;
    }

    if (filters.archiveState === "ACTIVE" && item.archived) {
      return false;
    }

    if (filters.archiveState === "ARCHIVED" && !item.archived) {
      return false;
    }

    if (filters.startDate && item.diaryDate < filters.startDate) {
      return false;
    }

    if (filters.endDate && item.diaryDate > filters.endDate) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = [item.title, item.content, item.weather].join(" ").toLowerCase();
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
      totalDiaries: records.length,
      archivedDiaries: records.filter((item) => item.archived).length,
      activeDiaries: records.filter((item) => !item.archived).length,
      todayDiaryCount: records.filter((item) => item.diaryDate === todayDate()).length,
      moodBreakdown: buildMoodBreakdown(records),
    },
  };
}

export async function getDiaryDetail(id: string) {
  await wait(80);
  return getVisibleRecords().find((item) => item.id === id) ?? null;
}

export async function createDiary(input: DiaryMutationInput) {
  await wait();
  const records = ensureStore();
  const now = new Date().toISOString();

  const created: DiaryEntity = {
    id: `diary-${Math.random().toString(36).slice(2, 10)}`,
    title: normalizeText(input.title),
    content: normalizeText(input.content),
    diaryDate: normalizeText(input.diaryDate) || todayDate(),
    mood: input.mood,
    weather: normalizeText(input.weather),
    archived: false,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: now,
    updateDate: now,
  };

  records.unshift(created);
  saveStore(records);
  return created;
}

export async function updateDiary(id: string, input: DiaryMutationInput) {
  await wait();
  const records = ensureStore();
  const index = records.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("日记不存在或无权限修改");
  }

  const current = records[index];
  const updated: DiaryEntity = {
    ...current,
    title: normalizeText(input.title),
    content: normalizeText(input.content),
    diaryDate: normalizeText(input.diaryDate) || current.diaryDate,
    mood: input.mood,
    weather: normalizeText(input.weather),
    updateDate: new Date().toISOString(),
  };

  records[index] = updated;
  saveStore(records);
  return updated;
}

export async function removeDiary(id: string) {
  await wait();
  const records = ensureStore();
  const index = records.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("日记不存在或无权限删除");
  }

  records.splice(index, 1);
  saveStore(records);
}

export async function setDiaryArchiveState(id: string, archived: boolean) {
  await wait();
  const records = ensureStore();
  const index = records.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("日记不存在或无权限归档");
  }

  const current = records[index];
  records[index] = {
    ...current,
    archived,
    updateDate: new Date().toISOString(),
  };

  saveStore(records);
  return records[index];
}
