import type {
  WrongQuestionCategory,
  WrongQuestionFilters,
  WrongQuestionImageMeta,
  WrongQuestionListResult,
  WrongQuestionMutationInput,
  WrongQuestionOcrModel,
  WrongQuestionRecord,
  WrongQuestionSubject,
} from "@/features/wrong-question/types";

const STORAGE_KEY = "nquiz-wrong-questions";
const UPLOAD_STORAGE_KEY = "nquiz-wrong-question-uploads";
const CURRENT_USER_ID = "mock-current-user";

const subjects: WrongQuestionSubject[] = [
  { id: "subject-math", name: "数学" },
  { id: "subject-english", name: "英语" },
  { id: "subject-programming", name: "编程" },
];

const categories: WrongQuestionCategory[] = [
  { id: "cat-math-algebra", subjectId: "subject-math", name: "代数" },
  { id: "cat-math-geometry", subjectId: "subject-math", name: "几何" },
  { id: "cat-english-reading", subjectId: "subject-english", name: "阅读理解" },
  { id: "cat-english-grammar", subjectId: "subject-english", name: "语法" },
  { id: "cat-code-react", subjectId: "subject-programming", name: "React" },
  { id: "cat-code-sql", subjectId: "subject-programming", name: "SQL" },
];

const defaultRecords: WrongQuestionRecord[] = [
  {
    id: "wq-001",
    subjectId: "subject-math",
    subjectName: "数学",
    categoryId: "cat-math-algebra",
    categoryName: "代数",
    type: "SINGLE",
    content: "已知二次函数 y=ax²+bx+c 在 x=1 与 x=3 处的函数值相等，求其对称轴。",
    answer: "x=2",
    difficulty: "MEDIUM",
    remark: "典型对称性质题，先根据等值点求对称轴。",
    originalImageFileId: undefined,
    originalImageName: undefined,
    originalImageUrl: undefined,
    ocrText: undefined,
    createDate: "2026-04-10T20:20:00.000Z",
    updateDate: "2026-04-10T20:20:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
  {
    id: "wq-002",
    subjectId: "subject-programming",
    subjectName: "编程",
    categoryId: "cat-code-react",
    categoryName: "React",
    type: "SHORT_ANSWER",
    content: "React Query 中 mutation 成功后为什么通常要做 query invalidation？",
    answer: "因为 mutation 会让缓存数据过期，需要触发相关 query 重新拉取或保持一致。",
    difficulty: "EASY",
    remark: "面试常问，结合缓存一致性回答。",
    originalImageFileId: undefined,
    originalImageName: undefined,
    originalImageUrl: undefined,
    ocrText: "React Query mutation success invalidate query",
    createDate: "2026-04-10T21:10:00.000Z",
    updateDate: "2026-04-10T21:30:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
];

const ocrModels: WrongQuestionOcrModel[] = [
  { id: "vision-default", name: "Qwen2.5-VL-72B", provider: "mock-openrouter", isDefault: true },
  { id: "vision-fast", name: "GPT-4.1-mini-vision", provider: "mock-openai" },
  { id: "vision-cn", name: "glm-4v-plus", provider: "mock-zhipu" },
];

function nowIso() {
  return new Date().toISOString();
}

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

function ensureRecords() {
  const existing = readJson<WrongQuestionRecord[] | null>(STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(STORAGE_KEY, defaultRecords);
  return defaultRecords;
}

function ensureUploads() {
  const existing = readJson<Record<string, WrongQuestionImageMeta>>(
    UPLOAD_STORAGE_KEY,
    {},
  );
  if (existing && typeof existing === "object") {
    return existing;
  }

  writeJson(UPLOAD_STORAGE_KEY, {});
  return {};
}

function saveRecords(records: WrongQuestionRecord[]) {
  writeJson(STORAGE_KEY, records);
}

function saveUploads(uploads: Record<string, WrongQuestionImageMeta>) {
  writeJson(UPLOAD_STORAGE_KEY, uploads);
}

function getSubjectName(subjectId: string) {
  return subjects.find((item) => item.id === subjectId)?.name ?? "未命名学科";
}

function getCategoryName(categoryId?: string) {
  if (!categoryId) return undefined;
  return categories.find((item) => item.id === categoryId)?.name;
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listWrongQuestionSubjects() {
  await wait(60);
  return subjects;
}

export async function listWrongQuestionCategories(subjectId?: string) {
  await wait(60);
  if (!subjectId) {
    return [] as WrongQuestionCategory[];
  }
  return categories.filter((item) => item.subjectId === subjectId);
}

export async function listWrongQuestionOcrModels() {
  await wait(80);
  return ocrModels;
}

export async function listWrongQuestions(filters: WrongQuestionFilters): Promise<WrongQuestionListResult> {
  await wait(120);
  const records = ensureRecords()
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .sort((a, b) => (a.createDate < b.createDate ? 1 : -1));

  const keyword = filters.keyword.trim().toLowerCase();
  const filtered = records.filter((item) => {
    if (filters.subjectId && item.subjectId !== filters.subjectId) return false;
    if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.difficulty && item.difficulty !== filters.difficulty) return false;
    if (keyword) {
      const haystack = [item.content, item.answer, item.remark, item.ocrText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(start, start + filters.pageSize);

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      total: records.length,
      withImage: records.filter((item) => Boolean(item.originalImageUrl)).length,
      withOcr: records.filter((item) => Boolean(item.ocrText)).length,
    },
  };
}

export async function createWrongQuestion(input: WrongQuestionMutationInput) {
  await wait(120);
  const records = ensureRecords();
  const timestamp = nowIso();
  const record: WrongQuestionRecord = {
    id: `wq-${Date.now()}`,
    subjectId: input.subjectId,
    subjectName: getSubjectName(input.subjectId),
    categoryId: input.categoryId,
    categoryName: getCategoryName(input.categoryId),
    type: input.type,
    content: input.content,
    answer: normalizeText(input.answer),
    difficulty: input.difficulty,
    remark: normalizeText(input.remark),
    originalImageFileId: input.originalImageFileId,
    originalImageName: input.originalImageName,
    originalImageUrl: input.originalImageUrl,
    ocrText: normalizeText(input.ocrText),
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
  };

  saveRecords([record, ...records]);
  return record;
}

export async function updateWrongQuestion(id: string, input: WrongQuestionMutationInput) {
  await wait(120);
  const records = ensureRecords();
  const index = records.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);

  if (index < 0) {
    throw new Error("错题不存在或无权编辑");
  }

  const current = records[index];
  const next: WrongQuestionRecord = {
    ...current,
    subjectId: input.subjectId,
    subjectName: getSubjectName(input.subjectId),
    categoryId: input.categoryId,
    categoryName: getCategoryName(input.categoryId),
    type: input.type,
    content: input.content,
    answer: normalizeText(input.answer),
    difficulty: input.difficulty,
    remark: normalizeText(input.remark),
    originalImageFileId: input.originalImageFileId,
    originalImageName: input.originalImageName,
    originalImageUrl: input.originalImageUrl,
    ocrText: normalizeText(input.ocrText),
    updateDate: nowIso(),
  };

  records[index] = next;
  saveRecords(records);
  return next;
}

export async function deleteWrongQuestion(id: string) {
  await wait(100);
  const records = ensureRecords();
  const next = records.filter((item) => !(item.id === id && item.createUserId === CURRENT_USER_ID));
  saveRecords(next);
  return { success: true as const };
}

export async function uploadWrongQuestionImage(file: File) {
  const uploads = ensureUploads();
  const id = `upload-${Date.now()}`;
  const url = await toDataUrl(file);
  const meta: WrongQuestionImageMeta = {
    id,
    originalName: file.name,
    url,
    uploadedAt: nowIso(),
    size: file.size,
  };
  uploads[id] = meta;
  saveUploads(uploads);
  return meta;
}

export async function removeUploadedWrongQuestionImage(id?: string) {
  if (!id) return;
  await wait(30);
  const uploads = ensureUploads();
  if (!uploads[id]) return;
  delete uploads[id];
  saveUploads(uploads);
}

export async function recognizeWrongQuestionImage(
  file: File,
  modelName: string,
  onChunk: (chunk: string) => void,
) {
  const base = [
    `【OCR模拟识别 / ${modelName || "默认视觉模型"}】`,
    `图片文件：${file.name}`,
    "题干：请结合截图中的信息，整理出题目主体、关键条件与待求结论。",
    "建议：若题目内容已经手工录入，优先人工核对后再决定是否覆盖。",
  ].join("\n");

  const chunks = base.match(/.{1,18}/g) ?? [base];
  let collected = "";
  for (const chunk of chunks) {
    await wait(90);
    collected += chunk;
    onChunk(chunk);
  }
  return collected;
}
