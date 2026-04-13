import { questionFilterSchema } from "@/features/question-bank/schema";
import type {
  BatchCreateFromCandidatesInput,
  GeneratedQuestionCandidate,
  QuestionCategoryOption,
  QuestionGenerateInput,
  QuestionGenerateResult,
  QuestionListFilters,
  QuestionListItem,
  QuestionListResult,
  QuestionMutationInput,
  QuestionRecord,
  QuestionSubjectOption,
  QuestionType,
} from "@/features/question-bank/types";

const STORAGE_KEY = "nquiz-question-bank-records";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

const subjectOptions: QuestionSubjectOption[] = [
  { id: "subject-math", name: "math", label: "数学" },
  { id: "subject-english", name: "english", label: "英语" },
  { id: "subject-programming", name: "programming", label: "编程" },
  { id: "subject-history", name: "history", label: "历史" },
];

const categoryOptions: QuestionCategoryOption[] = [
  { id: "category-math-algebra", subjectId: "subject-math", name: "代数" },
  { id: "category-math-geometry", subjectId: "subject-math", name: "几何" },
  { id: "category-english-reading", subjectId: "subject-english", name: "阅读理解" },
  { id: "category-english-grammar", subjectId: "subject-english", name: "语法" },
  { id: "category-programming-react", subjectId: "subject-programming", name: "React" },
  { id: "category-programming-sql", subjectId: "subject-programming", name: "SQL" },
  { id: "category-history-modern", subjectId: "subject-history", name: "近代史" },
];

const defaultQuestions: QuestionRecord[] = [
  {
    id: "question-001",
    type: "SINGLE",
    content: "在 React Query 中，更新成功后用于触发相关缓存重新获取的常用方法是？",
    options: ["invalidateQueries", "setTimeout", "clearInterval", "resetServerContext"],
    answers: ["invalidateQueries"],
    explanation: "mutation 成功后通常调用 invalidateQueries 保证列表和详情缓存一致。",
    subjectId: "subject-programming",
    subjectName: "编程",
    categoryId: "category-programming-react",
    categoryName: "React",
    knowledgePoints: ["TanStack Query", "缓存一致性"],
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-11T10:10:00.000Z",
    updateDate: "2026-04-11T10:10:00.000Z",
  },
  {
    id: "question-002",
    type: "MULTIPLE",
    content: "以下哪些属于 SQL 优化的常见手段？",
    options: ["建立合适索引", "减少 SELECT *", "避免无条件全表更新", "在循环中频繁建连接"],
    answers: ["建立合适索引", "减少 SELECT *", "避免无条件全表更新"],
    explanation: "索引、列裁剪、限制全表操作都属于常见优化；频繁建连接会导致额外开销。",
    subjectId: "subject-programming",
    subjectName: "编程",
    categoryId: "category-programming-sql",
    categoryName: "SQL",
    knowledgePoints: ["SQL 优化", "索引"],
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-10T16:20:00.000Z",
    updateDate: "2026-04-10T16:20:00.000Z",
  },
  {
    id: "question-003",
    type: "BLANK",
    content: "二次函数 y=ax²+bx+c 的对称轴公式是 x = ____。",
    options: [],
    answers: ["-b/(2a)"],
    explanation: "由配方法可得对称轴横坐标为 -b/(2a)。",
    subjectId: "subject-math",
    subjectName: "数学",
    categoryId: "category-math-algebra",
    categoryName: "代数",
    knowledgePoints: ["二次函数", "对称轴"],
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-09T09:30:00.000Z",
    updateDate: "2026-04-09T09:30:00.000Z",
  },
  {
    id: "question-004",
    type: "SHORT_ANSWER",
    content: "简述为什么在 Next.js App Router 下建议把筛选状态 URL 化。",
    options: [],
    answers: ["便于刷新恢复", "便于分享定位", "有利于回退前进导航一致性"],
    explanation: "URL 状态可提升可恢复性与可协作性，也更容易和服务端渲染边界对齐。",
    subjectId: "subject-programming",
    subjectName: "编程",
    categoryId: "category-programming-react",
    categoryName: "React",
    knowledgePoints: ["App Router", "URL 状态"],
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-08T14:45:00.000Z",
    updateDate: "2026-04-08T14:45:00.000Z",
  },
  {
    id: "question-005",
    type: "SINGLE",
    content: "阅读题中定位主旨句最稳妥的步骤是？",
    options: ["先看标题和首尾段", "直接看选项", "跳过全文", "先猜答案"],
    answers: ["先看标题和首尾段"],
    explanation: "标题与首尾段通常承载主旨信息，先建立主线再看细节更稳。",
    subjectId: "subject-english",
    subjectName: "英语",
    categoryId: "category-english-reading",
    categoryName: "阅读理解",
    knowledgePoints: ["主旨定位", "阅读策略"],
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-07T11:12:00.000Z",
    updateDate: "2026-04-07T11:12:00.000Z",
  },
  {
    id: "question-006",
    type: "SHORT_ANSWER",
    content: "说明近代史中“洋务运动”的主要目标。",
    options: [],
    answers: ["自强", "求富"],
    explanation: "核心口号为“自强”“求富”，推动近代工业与军事技术建设。",
    subjectId: "subject-history",
    subjectName: "历史",
    categoryId: "category-history-modern",
    categoryName: "近代史",
    knowledgePoints: ["洋务运动", "近代化"],
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: "2026-04-06T13:00:00.000Z",
    updateDate: "2026-04-06T13:00:00.000Z",
  },
];

function wait(ms = 120) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
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

function normalizeTextList(values: string[]) {
  return Array.from(new Set(values.map((item) => normalizeText(item)).filter(Boolean)));
}

function ensureStore() {
  const existing = readJson<QuestionRecord[] | null>(STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(STORAGE_KEY, defaultQuestions);
  return defaultQuestions;
}

function saveStore(records: QuestionRecord[]) {
  writeJson(STORAGE_KEY, records);
}

function formatPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 96) {
    return normalized;
  }
  return `${normalized.slice(0, 96)}...`;
}

function compareByCreateDateDesc(a: QuestionRecord, b: QuestionRecord) {
  return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
}

function findSubject(subjectId: string) {
  return subjectOptions.find((item) => item.id === subjectId) ?? null;
}

function findCategory(categoryId: string) {
  return categoryOptions.find((item) => item.id === categoryId) ?? null;
}

function validateTaxonomy(subjectId: string, categoryId: string) {
  const subject = findSubject(subjectId);
  if (!subject) {
    throw new Error("学科不存在，请刷新后重试");
  }

  const category = findCategory(categoryId);
  if (!category) {
    throw new Error("分类不存在，请刷新后重试");
  }

  if (category.subjectId !== subjectId) {
    throw new Error("分类与学科不匹配");
  }

  return { subject, category };
}

function normalizeMutationInput(input: QuestionMutationInput) {
  const normalizedOptions = normalizeTextList(input.options);
  const normalizedAnswers = normalizeTextList(input.answers);
  const normalizedKnowledge = normalizeTextList(input.knowledgePoints);

  if (input.type === "SINGLE" || input.type === "MULTIPLE") {
    if (normalizedOptions.length < 2) {
      throw new Error("选择题至少需要 2 个选项");
    }
    if (normalizedAnswers.length === 0) {
      throw new Error("请填写答案");
    }
    if (input.type === "SINGLE" && normalizedAnswers.length > 1) {
      throw new Error("单选题只能有 1 个答案");
    }
    if (normalizedAnswers.some((answer) => !normalizedOptions.includes(answer))) {
      throw new Error("答案必须在选项列表中");
    }
  } else if (normalizedAnswers.length === 0) {
    throw new Error("非选择题至少需要 1 条答案");
  }

  return {
    type: input.type,
    content: normalizeText(input.content),
    options: input.type === "SINGLE" || input.type === "MULTIPLE" ? normalizedOptions : [],
    answers: normalizedAnswers,
    explanation: normalizeText(input.explanation),
    subjectId: input.subjectId,
    categoryId: input.categoryId,
    knowledgePoints: normalizedKnowledge,
  };
}

function toListItem(record: QuestionRecord): QuestionListItem {
  return {
    ...record,
    contentPreview: formatPreview(record.content),
  };
}

function getVisibleRecords() {
  return ensureStore().filter((item) => item.createUserId === CURRENT_USER_ID).sort(compareByCreateDateDesc);
}

function buildTypeSummary(records: QuestionRecord[]): Record<QuestionType, number> {
  const base: Record<QuestionType, number> = {
    SINGLE: 0,
    MULTIPLE: 0,
    BLANK: 0,
    SHORT_ANSWER: 0,
  };

  for (const record of records) {
    base[record.type] += 1;
  }

  return base;
}

export async function listQuestionSubjects() {
  await wait(80);
  return subjectOptions;
}

export async function listQuestionCategories(subjectId?: string) {
  await wait(80);
  if (!subjectId) {
    return categoryOptions;
  }
  return categoryOptions.filter((item) => item.subjectId === subjectId);
}

export async function listQuestions(rawFilters: QuestionListFilters): Promise<QuestionListResult> {
  await wait(140);

  const filters = questionFilterSchema.parse(rawFilters);
  const keyword = normalizeText(filters.keyword).toLowerCase();
  const knowledgeKeyword = normalizeText(filters.knowledgeKeyword).toLowerCase();
  const records = getVisibleRecords();

  const filtered = records.filter((item) => {
    if (filters.type && item.type !== filters.type) {
      return false;
    }

    if (filters.subjectId && item.subjectId !== filters.subjectId) {
      return false;
    }

    if (filters.categoryId && item.categoryId !== filters.categoryId) {
      return false;
    }

    if (knowledgeKeyword) {
      const joinedKnowledge = item.knowledgePoints.join(" ").toLowerCase();
      if (!joinedKnowledge.includes(knowledgeKeyword)) {
        return false;
      }
    }

    if (!keyword) {
      return true;
    }

    const haystack = [
      item.content,
      item.options.join(" "),
      item.answers.join(" "),
      item.explanation,
      item.subjectName,
      item.categoryName,
      item.knowledgePoints.join(" "),
    ]
      .join(" ")
      .toLowerCase();

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
      totalQuestions: records.length,
      byType: buildTypeSummary(records),
      linkedKnowledgePoints: records.reduce((sum, item) => sum + item.knowledgePoints.length, 0),
    },
  };
}

export async function getQuestionDetail(id: string) {
  await wait(80);
  return getVisibleRecords().find((item) => item.id === id) ?? null;
}

export async function createQuestion(input: QuestionMutationInput) {
  await wait(120);
  const payload = normalizeMutationInput(input);
  const taxonomy = validateTaxonomy(payload.subjectId, payload.categoryId);
  const records = ensureStore();
  const timestamp = nowIso();

  const record: QuestionRecord = {
    id: `question-${Date.now()}`,
    type: payload.type,
    content: payload.content,
    options: payload.options,
    answers: payload.answers,
    explanation: payload.explanation,
    subjectId: payload.subjectId,
    subjectName: taxonomy.subject.label,
    categoryId: payload.categoryId,
    categoryName: taxonomy.category.name,
    knowledgePoints: payload.knowledgePoints,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
    createDate: timestamp,
    updateDate: timestamp,
  };

  records.unshift(record);
  saveStore(records);
  return record;
}

export async function updateQuestion(id: string, input: QuestionMutationInput) {
  await wait(120);
  const payload = normalizeMutationInput(input);
  const taxonomy = validateTaxonomy(payload.subjectId, payload.categoryId);
  const records = ensureStore();
  const index = records.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);

  if (index < 0) {
    throw new Error("题目不存在或无权限修改");
  }

  const current = records[index];
  const next: QuestionRecord = {
    ...current,
    type: payload.type,
    content: payload.content,
    options: payload.options,
    answers: payload.answers,
    explanation: payload.explanation,
    subjectId: payload.subjectId,
    subjectName: taxonomy.subject.label,
    categoryId: payload.categoryId,
    categoryName: taxonomy.category.name,
    knowledgePoints: payload.knowledgePoints,
    updateDate: nowIso(),
  };

  records[index] = next;
  saveStore(records);
  return next;
}

export async function deleteQuestion(id: string) {
  await wait(100);
  const records = ensureStore();
  const index = records.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("题目不存在或无权限删除");
  }

  records.splice(index, 1);
  saveStore(records);
}

function candidateContent(type: QuestionType, title: string, index: number) {
  const serial = index + 1;
  if (type === "SINGLE") {
    return `【${title}】第 ${serial} 题：以下哪项最符合该知识点的关键定义？`;
  }
  if (type === "MULTIPLE") {
    return `【${title}】第 ${serial} 题：以下哪些说法正确？`;
  }
  if (type === "BLANK") {
    return `【${title}】第 ${serial} 题：请补全下列结论中的关键术语：____。`;
  }
  return `【${title}】第 ${serial} 题：请简述该知识点的核心思路与应用场景。`;
}

function candidateOptions(type: QuestionType) {
  if (type === "SINGLE") {
    return ["概念边界清晰且可验证", "只看表面定义即可", "与上下文无关", "不需要案例支持"];
  }
  if (type === "MULTIPLE") {
    return ["先明确输入输出", "结合反例验证边界", "忽略约束条件", "记录可复用模式"];
  }
  return [] as string[];
}

function candidateAnswers(type: QuestionType, options: string[]) {
  if (type === "SINGLE") {
    return [options[0] || "概念边界清晰且可验证"];
  }
  if (type === "MULTIPLE") {
    return [options[0], options[1], options[3]].filter(Boolean);
  }
  if (type === "BLANK") {
    return ["关键术语"];
  }
  return ["围绕定义、边界、步骤和适用场景组织答案"];
}

export async function generateQuestionCandidates(input: QuestionGenerateInput): Promise<QuestionGenerateResult> {
  await wait(600);
  const taxonomy = validateTaxonomy(input.subjectId, input.categoryId);
  const count = Math.max(1, Math.min(10, input.questionCount));
  const types = input.types.length > 0 ? input.types : ["SINGLE"];

  const logs = [
    `[1/4] 已加载模型：${input.model}`,
    `[2/4] 学科=${taxonomy.subject.label}，分类=${taxonomy.category.name}`,
    `[3/4] 已解析知识点上下文，长度 ${input.knowledgeContent.length} 字符`,
  ];

  const candidates: GeneratedQuestionCandidate[] = [];
  for (let index = 0; index < count; index += 1) {
    const type = types[index % types.length];
    const options = candidateOptions(type);

    candidates.push({
      id: `candidate-${Date.now()}-${index}`,
      type,
      content: candidateContent(type, input.knowledgeTitle, index),
      options,
      answers: candidateAnswers(type, options),
      explanation: `由模型结合“${input.knowledgeTitle}”与输入知识点上下文生成，可在入库前按业务语义微调。`,
      knowledgePoints: normalizeTextList([input.knowledgeTitle]),
    });
  }

  logs.push(`[4/4] 生成完成：候选题目 ${candidates.length} 条`);

  return {
    generatedAt: nowIso(),
    model: input.model,
    logs,
    candidates,
  };
}

export async function batchCreateQuestionsFromCandidates(input: BatchCreateFromCandidatesInput) {
  await wait(160);
  if (input.candidates.length === 0) {
    throw new Error("请先选择至少一条候选题目");
  }

  const taxonomy = validateTaxonomy(input.subjectId, input.categoryId);
  const records = ensureStore();
  const timestamp = nowIso();

  const created = input.candidates.map((candidate, index) => {
    const record: QuestionRecord = {
      id: `question-${Date.now()}-${index}`,
      type: candidate.type,
      content: normalizeText(candidate.content),
      options: normalizeTextList(candidate.options),
      answers: normalizeTextList(candidate.answers),
      explanation: normalizeText(candidate.explanation),
      subjectId: input.subjectId,
      subjectName: taxonomy.subject.label,
      categoryId: input.categoryId,
      categoryName: taxonomy.category.name,
      knowledgePoints: normalizeTextList(candidate.knowledgePoints),
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
      createDate: timestamp,
      updateDate: timestamp,
    };
    return record;
  });

  saveStore([...created, ...records]);
  return {
    createdCount: created.length,
    createdIds: created.map((item) => item.id),
  };
}
