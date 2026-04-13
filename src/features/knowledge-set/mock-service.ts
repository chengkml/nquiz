import { knowledgeSetFilterSchema, knowledgeSourceFilterSchema } from "@/features/knowledge-set/schema";
import type {
  DbConnectionTestInput,
  DbConnectionTestResult,
  KnowledgeChatMessage,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  KnowledgeSetListFilters,
  KnowledgeSetListItem,
  KnowledgeSetListResult,
  KnowledgeSetMutationInput,
  KnowledgeSetStatus,
  KnowledgeSetVisibility,
  KnowledgeSourceListFilters,
  KnowledgeSourceListItem,
  KnowledgeSourceListResult,
  KnowledgeSourceMutationInput,
  KnowledgeSourceStatus,
  KnowledgeSourceType,
  VectorSyncCheckResult,
  VectorSyncIssue,
} from "@/features/knowledge-set/types";

const STORAGE_KEYS = {
  sets: "nquiz-knowledge-set-manager-sets",
  sources: "nquiz-knowledge-set-manager-sources",
  chats: "nquiz-knowledge-set-manager-chats",
} as const;

const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

type KnowledgeSetRecord = {
  id: string;
  name: string;
  descr: string;
  tags: string[];
  visibility: KnowledgeSetVisibility;
  status: KnowledgeSetStatus;
  isSystem: boolean;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
};

type KnowledgeSourceRecord = {
  id: string;
  knowledgeSetId: string;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  descr: string;
  content: string;
  fileName: string;
  dbHost: string;
  dbName: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
};

type ChatStore = Record<string, KnowledgeChatMessage[]>;

const defaultSets: KnowledgeSetRecord[] = [
  {
    id: "knowledge-set-system-ops",
    name: "系统运维知识库",
    descr: "系统内置知识集，用于提供默认运维应答语料。该知识集只读。",
    tags: ["system", "ops"],
    visibility: "PUBLIC",
    status: "ENABLED",
    isSystem: true,
    createDate: "2026-04-01T02:00:00.000Z",
    updateDate: "2026-04-10T10:00:00.000Z",
    createUserId: "system",
    createUserName: "系统内置",
  },
  {
    id: "knowledge-set-nquiz-migration",
    name: "nquiz 迁移手册",
    descr: "沉淀菜单迁移边界、验收口径与风险登记。",
    tags: ["migration", "nquiz"],
    visibility: "PRIVATE",
    status: "ENABLED",
    isSystem: false,
    createDate: "2026-04-06T06:00:00.000Z",
    updateDate: "2026-04-11T08:00:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-set-ai-prompt",
    name: "Prompt 设计稿",
    descr: "用于沉淀 Prompt 模板与评测记录。",
    tags: ["prompt", "ai"],
    visibility: "PUBLIC",
    status: "DISABLED",
    isSystem: false,
    createDate: "2026-04-07T08:00:00.000Z",
    updateDate: "2026-04-10T12:00:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-set-shared-team",
    name: "前端共享规范",
    descr: "共享可见知识集，当前用户只读。",
    tags: ["shared", "frontend"],
    visibility: "PUBLIC",
    status: "ENABLED",
    isSystem: false,
    createDate: "2026-04-05T03:00:00.000Z",
    updateDate: "2026-04-11T03:00:00.000Z",
    createUserId: "team-owner",
    createUserName: "前端协作组",
  },
];

const defaultSources: KnowledgeSourceRecord[] = [
  {
    id: "knowledge-source-system-faq",
    knowledgeSetId: "knowledge-set-system-ops",
    name: "系统常见问题.md",
    type: "MARKDOWN",
    status: "SUCCESS",
    descr: "系统只读内置来源",
    content: "常见告警排障步骤、服务重启顺序与值班交接模板。",
    fileName: "",
    dbHost: "",
    dbName: "",
    createDate: "2026-04-01T02:00:00.000Z",
    updateDate: "2026-04-10T10:00:00.000Z",
    createUserId: "system",
    createUserName: "系统内置",
  },
  {
    id: "knowledge-source-migration-checklist",
    knowledgeSetId: "knowledge-set-nquiz-migration",
    name: "迁移验收清单.md",
    type: "MARKDOWN",
    status: "SUCCESS",
    descr: "菜单迁移通用验收项",
    content: "每个菜单必须输出覆盖能力、差异、风险、验证命令。",
    fileName: "",
    dbHost: "",
    dbName: "",
    createDate: "2026-04-06T06:20:00.000Z",
    updateDate: "2026-04-11T08:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-source-migration-db",
    knowledgeSetId: "knowledge-set-nquiz-migration",
    name: "需求库连接",
    type: "DB",
    status: "SUCCESS",
    descr: "保留 DB 来源连接配置，不做自动切片。",
    content: "",
    fileName: "",
    dbHost: "mysql.quiz.internal",
    dbName: "requirement_db",
    createDate: "2026-04-09T02:00:00.000Z",
    updateDate: "2026-04-11T07:30:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-source-shared-ui",
    knowledgeSetId: "knowledge-set-shared-team",
    name: "交互规范.md",
    type: "MARKDOWN",
    status: "SUCCESS",
    descr: "共享只读来源",
    content: "交互动作需有可逆路径，危险操作必须二次确认。",
    fileName: "",
    dbHost: "",
    dbName: "",
    createDate: "2026-04-05T03:10:00.000Z",
    updateDate: "2026-04-11T03:00:00.000Z",
    createUserId: "team-owner",
    createUserName: "前端协作组",
  },
];

function wait(ms = 120) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(undefined);
      return;
    }

    window.setTimeout(resolve, ms);
  });
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

function ensureSets() {
  const stored = readJson<KnowledgeSetRecord[] | null>(STORAGE_KEYS.sets, null);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  writeJson(STORAGE_KEYS.sets, defaultSets);
  return defaultSets;
}

function ensureSources() {
  const stored = readJson<KnowledgeSourceRecord[] | null>(STORAGE_KEYS.sources, null);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  writeJson(STORAGE_KEYS.sources, defaultSources);
  return defaultSources;
}

function ensureChats() {
  const stored = readJson<ChatStore | null>(STORAGE_KEYS.chats, null);
  if (stored && typeof stored === "object") {
    return stored;
  }

  const initial: ChatStore = {};
  writeJson(STORAGE_KEYS.chats, initial);
  return initial;
}

function saveSets(value: KnowledgeSetRecord[]) {
  writeJson(STORAGE_KEYS.sets, value);
}

function saveSources(value: KnowledgeSourceRecord[]) {
  writeJson(STORAGE_KEYS.sources, value);
}

function saveChats(value: ChatStore) {
  writeJson(STORAGE_KEYS.chats, value);
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function isOwner(set: KnowledgeSetRecord) {
  return set.createUserId === CURRENT_USER_ID;
}

function canAccessSet(set: KnowledgeSetRecord) {
  return isOwner(set) || set.visibility === "PUBLIC" || set.isSystem;
}

function canEditSet(set: KnowledgeSetRecord) {
  return isOwner(set) && !set.isSystem;
}

function touchSet(setId: string) {
  const sets = ensureSets();
  const index = sets.findIndex((item) => item.id === setId);
  if (index < 0) return;

  sets[index] = {
    ...sets[index],
    updateDate: nowIso(),
  };
  saveSets(sets);
}

function findAccessibleSet(setId: string) {
  const set = ensureSets().find((item) => item.id === setId);
  if (!set || !canAccessSet(set)) {
    throw new Error("知识集不存在或无访问权限");
  }
  return set;
}

function syncSourceStatusByElapsed(source: KnowledgeSourceRecord, nowMs: number) {
  if (source.type === "DB") return source;
  if (source.status === "SUCCESS" || source.status === "FAILED") return source;

  const baseMs = new Date(source.updateDate).getTime();
  if (Number.isNaN(baseMs)) return source;
  const elapsed = nowMs - baseMs;

  if (elapsed >= 2500) {
    return {
      ...source,
      status: "SUCCESS" as const,
      updateDate: source.updateDate,
    };
  }

  if (elapsed >= 1000) {
    return {
      ...source,
      status: "PARSING" as const,
      updateDate: source.updateDate,
    };
  }

  return source;
}

function syncSourceStatuses() {
  const nowMs = Date.now();
  const current = ensureSources();
  let changed = false;

  const next = current.map((item) => {
    const updated = syncSourceStatusByElapsed(item, nowMs);
    if (updated.status !== item.status) {
      changed = true;
      return updated;
    }
    return item;
  });

  if (changed) {
    saveSources(next);
  }

  return next;
}

function buildSetListItem(set: KnowledgeSetRecord, allSources: KnowledgeSourceRecord[]): KnowledgeSetListItem {
  const related = allSources.filter((item) => item.knowledgeSetId === set.id);
  const successSourceCount = related.filter((item) => item.status === "SUCCESS").length;

  return {
    id: set.id,
    name: set.name,
    descr: set.descr,
    tags: set.tags,
    visibility: set.visibility,
    status: set.status,
    isSystem: set.isSystem,
    sourceCount: related.length,
    successSourceCount,
    createUserName: set.createUserName,
    createDate: set.createDate,
    updateDate: set.updateDate,
    canEdit: canEditSet(set),
    canDelete: canEditSet(set),
    canManageSources: canEditSet(set),
    canChat: set.status === "ENABLED" && successSourceCount > 0,
  };
}

function sourceToListItem(source: KnowledgeSourceRecord, set: KnowledgeSetRecord): KnowledgeSourceListItem {
  const canManage = canEditSet(set);
  return {
    id: source.id,
    knowledgeSetId: source.knowledgeSetId,
    name: source.name,
    type: source.type,
    status: source.status,
    descr: source.descr,
    content: source.content,
    fileName: source.fileName,
    dbHost: source.dbHost,
    dbName: source.dbName,
    updateDate: source.updateDate,
    createUserName: source.createUserName,
    canEdit: canManage,
    canDelete: canManage,
  };
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function normalizeTags(tags: string[]) {
  const unique = new Set<string>();
  for (const raw of tags) {
    const normalized = raw.trim();
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique).slice(0, 12);
}

export async function listKnowledgeSets(rawFilters: KnowledgeSetListFilters): Promise<KnowledgeSetListResult> {
  await wait(100);
  const filters = knowledgeSetFilterSchema.parse(rawFilters);
  const keyword = normalizeKeyword(filters.keyword);
  const allSources = syncSourceStatuses();

  const visibleSets = ensureSets()
    .filter(canAccessSet)
    .filter((item) => (filters.status === "ALL" ? true : item.status === filters.status))
    .filter((item) => (filters.visibility === "ALL" ? true : item.visibility === filters.visibility))
    .filter((item) => {
      if (!keyword) return true;
      const haystack = [item.name, item.descr, item.createUserName, item.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((left, right) => (left.updateDate < right.updateDate ? 1 : -1));

  const pageItems = paginate(visibleSets, filters.page, filters.pageSize).map((item) =>
    buildSetListItem(item, allSources),
  );

  const allVisibleListItems = visibleSets.map((item) => buildSetListItem(item, allSources));
  return {
    items: pageItems,
    total: visibleSets.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      total: allVisibleListItems.length,
      enabled: allVisibleListItems.filter((item) => item.status === "ENABLED").length,
      disabled: allVisibleListItems.filter((item) => item.status === "DISABLED").length,
      system: allVisibleListItems.filter((item) => item.isSystem).length,
    },
  };
}

export async function createKnowledgeSet(input: KnowledgeSetMutationInput) {
  await wait(140);
  const sets = ensureSets();
  const normalizedName = input.name.trim();

  if (
    sets.some(
      (item) =>
        item.createUserId === CURRENT_USER_ID && item.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    )
  ) {
    throw new Error("当前用户下已存在同名知识集");
  }

  const timestamp = nowIso();
  const record: KnowledgeSetRecord = {
    id: `knowledge-set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: normalizedName,
    descr: input.descr.trim(),
    tags: normalizeTags(input.tags),
    visibility: input.visibility,
    status: input.status,
    isSystem: false,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  saveSets([record, ...sets]);
  return record;
}

export async function updateKnowledgeSet(id: string, input: KnowledgeSetMutationInput) {
  await wait(140);
  const sets = ensureSets();
  const index = sets.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error("知识集不存在");
  }

  const current = sets[index];
  if (!canEditSet(current)) {
    throw new Error(current.isSystem ? "系统内置知识集只读" : "当前知识集无编辑权限");
  }

  const normalizedName = input.name.trim();
  if (
    sets.some(
      (item) =>
        item.id !== id &&
        item.createUserId === CURRENT_USER_ID &&
        item.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    )
  ) {
    throw new Error("当前用户下已存在同名知识集");
  }

  const next: KnowledgeSetRecord = {
    ...current,
    name: normalizedName,
    descr: input.descr.trim(),
    tags: normalizeTags(input.tags),
    visibility: input.visibility,
    status: input.status,
    updateDate: nowIso(),
  };

  sets[index] = next;
  saveSets(sets);
  return next;
}

export async function deleteKnowledgeSet(id: string) {
  await wait(120);
  const set = findAccessibleSet(id);
  if (!canEditSet(set)) {
    throw new Error(set.isSystem ? "系统内置知识集只读，不能删除" : "当前知识集无删除权限");
  }

  const nextSets = ensureSets().filter((item) => item.id !== id);
  const nextSources = ensureSources().filter((item) => item.knowledgeSetId !== id);
  const nextChats = ensureChats();
  delete nextChats[id];

  saveSets(nextSets);
  saveSources(nextSources);
  saveChats(nextChats);

  return { success: true as const };
}

export async function listKnowledgeSources(
  knowledgeSetId: string,
  rawFilters: KnowledgeSourceListFilters,
): Promise<KnowledgeSourceListResult> {
  await wait(100);
  const set = findAccessibleSet(knowledgeSetId);
  const filters = knowledgeSourceFilterSchema.parse(rawFilters);
  const keyword = normalizeKeyword(filters.keyword);

  const sources = syncSourceStatuses()
    .filter((item) => item.knowledgeSetId === knowledgeSetId)
    .filter((item) => (filters.status === "ALL" ? true : item.status === filters.status))
    .filter((item) => {
      if (!keyword) return true;
      const haystack = [item.name, item.descr, item.content, item.fileName, item.dbHost, item.dbName]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((left, right) => (left.updateDate < right.updateDate ? 1 : -1));

  return {
    items: paginate(sources, filters.page, filters.pageSize).map((item) => sourceToListItem(item, set)),
    total: sources.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createKnowledgeSource(knowledgeSetId: string, input: KnowledgeSourceMutationInput) {
  await wait(140);
  const set = findAccessibleSet(knowledgeSetId);
  if (!canEditSet(set)) {
    throw new Error("当前知识集来源只读");
  }

  const timestamp = nowIso();
  const record: KnowledgeSourceRecord = {
    id: `knowledge-source-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    knowledgeSetId,
    name: input.name.trim(),
    type: input.type,
    status: input.type === "DB" ? "SUCCESS" : "PENDING",
    descr: input.descr.trim(),
    content: input.content.trim(),
    fileName: input.fileName.trim(),
    dbHost: input.dbHost.trim(),
    dbName: input.dbName.trim(),
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  const sources = ensureSources();
  saveSources([record, ...sources]);
  touchSet(knowledgeSetId);
  return record;
}

export async function updateKnowledgeSource(id: string, input: KnowledgeSourceMutationInput) {
  await wait(140);
  const sources = ensureSources();
  const index = sources.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error("知识来源不存在");
  }

  const current = sources[index];
  const set = findAccessibleSet(current.knowledgeSetId);
  if (!canEditSet(set)) {
    throw new Error("当前知识集来源只读");
  }

  const next: KnowledgeSourceRecord = {
    ...current,
    name: input.name.trim(),
    type: input.type,
    status: input.type === "DB" ? "SUCCESS" : "PENDING",
    descr: input.descr.trim(),
    content: input.content.trim(),
    fileName: input.fileName.trim(),
    dbHost: input.dbHost.trim(),
    dbName: input.dbName.trim(),
    updateDate: nowIso(),
  };

  sources[index] = next;
  saveSources(sources);
  touchSet(current.knowledgeSetId);
  return next;
}

export async function deleteKnowledgeSource(id: string) {
  await wait(120);
  const sources = ensureSources();
  const current = sources.find((item) => item.id === id);
  if (!current) {
    throw new Error("知识来源不存在");
  }

  const set = findAccessibleSet(current.knowledgeSetId);
  if (!canEditSet(set)) {
    throw new Error("当前知识集来源只读");
  }

  saveSources(sources.filter((item) => item.id !== id));
  touchSet(current.knowledgeSetId);
  return { success: true as const };
}

export async function testKnowledgeDbConnection(input: DbConnectionTestInput): Promise<DbConnectionTestResult> {
  await wait(200);
  const host = input.dbHost.trim().toLowerCase();
  const dbName = input.dbName.trim();

  if (!host || !dbName) {
    return {
      success: false,
      message: "请输入数据库主机和数据库名称",
    };
  }

  if (host.includes("invalid") || host.includes("error")) {
    return {
      success: false,
      message: "连接失败：数据库主机不可达",
    };
  }

  return {
    success: true,
    message: "连接成功：可用于 DB 来源配置（首版不自动切片）",
  };
}

function buildSnippet(source: KnowledgeSourceRecord, query: string) {
  const text = [source.name, source.descr, source.content, source.fileName, source.dbHost, source.dbName]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const lowered = text.toLowerCase();
  const q = query.toLowerCase();
  const index = lowered.indexOf(q);
  if (index < 0) {
    return text.slice(0, 140) || "-";
  }

  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + q.length + 80);
  return text.slice(start, end);
}

export async function runKnowledgeSearch(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult> {
  await wait(220);
  const set = findAccessibleSet(input.knowledgeSetId);
  const query = input.query.trim();
  if (!query) {
    return {
      mode: input.mode,
      query: "",
      topK: input.topK,
      hits: [],
    };
  }

  const sources = syncSourceStatuses().filter(
    (item) => item.knowledgeSetId === set.id && item.status === "SUCCESS",
  );

  const tokens = query.toLowerCase().split(/\s+/).filter((token) => token.length >= 1);
  const scored = sources
    .map((source) => {
      const haystack = [source.name, source.descr, source.content, source.fileName, source.dbHost, source.dbName]
        .join(" ")
        .toLowerCase();

      let score = haystack.includes(query.toLowerCase()) ? 20 : 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += 3;
      }
      if (input.mode === "VECTOR") {
        score += source.type === "MARKDOWN" ? 2 : 1;
      }

      return {
        source,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return left.source.updateDate < right.source.updateDate ? 1 : -1;
    })
    .slice(0, input.topK)
    .map((item) => ({
      sourceId: item.source.id,
      sourceName: item.source.name,
      score: item.score,
      snippet: buildSnippet(item.source, query),
    }));

  return {
    mode: input.mode,
    query,
    topK: input.topK,
    hits: scored,
  };
}

export async function runVectorSyncCheck(knowledgeSetId: string): Promise<VectorSyncCheckResult> {
  await wait(180);
  const set = findAccessibleSet(knowledgeSetId);
  const sources = syncSourceStatuses().filter((item) => item.knowledgeSetId === set.id);

  const successSources = sources.filter((item) => item.status === "SUCCESS");
  const processingSources = sources.filter((item) => item.status === "PENDING" || item.status === "PARSING");
  const failedSources = sources.filter((item) => item.status === "FAILED");

  const issues: VectorSyncIssue[] = [];
  for (const source of failedSources) {
    issues.push({
      id: `issue-failed-${source.id}`,
      type: "FAILED_SOURCE",
      sourceName: source.name,
      detail: "来源处理失败，尚未生成切片与向量。",
    });
  }

  for (const source of processingSources) {
    issues.push({
      id: `issue-vector-${source.id}`,
      type: "MISSING_VECTOR",
      sourceName: source.name,
      detail: "来源处理中，切片已创建但向量尚未全部写入。",
    });
  }

  if (successSources.length > 0 && issues.length === 0) {
    issues.push({
      id: `issue-chunk-sample-${knowledgeSetId}`,
      type: "MISSING_CHUNK",
      sourceName: successSources[0].name,
      detail: "抽样发现 1 条空白段落被过滤，属于可接受的轻微差异。",
    });
  }

  const chunkCount = successSources.length * 12 + processingSources.length * 4;
  const vectorCount = Math.max(0, chunkCount - processingSources.length * 3 - failedSources.length * 2);

  return {
    knowledgeSetId: set.id,
    sourceTotal: sources.length,
    successSources: successSources.length,
    processingSources: processingSources.length,
    failedSources: failedSources.length,
    chunkCount,
    vectorCount,
    issues,
    checkedAt: nowIso(),
  };
}

export async function getKnowledgeChatMessages(knowledgeSetId: string) {
  await wait(60);
  findAccessibleSet(knowledgeSetId);
  const chats = ensureChats();
  return chats[knowledgeSetId] ?? [];
}

export async function askKnowledgeSetQuestion(knowledgeSetId: string, question: string) {
  await wait(320);
  const set = findAccessibleSet(knowledgeSetId);
  if (set.status !== "ENABLED") {
    throw new Error("知识集已禁用，不能发起问答");
  }

  const search = await runKnowledgeSearch({
    knowledgeSetId,
    mode: "VECTOR",
    query: question,
    topK: 2,
  });

  const userMessage: KnowledgeChatMessage = {
    id: `chat-user-${Date.now().toString(36)}`,
    role: "user",
    content: question.trim(),
    createdAt: nowIso(),
    citations: [],
  };

  const assistantMessage: KnowledgeChatMessage = {
    id: `chat-assistant-${Date.now().toString(36)}`,
    role: "assistant",
    createdAt: nowIso(),
    citations: search.hits.map((hit) => ({
      sourceId: hit.sourceId,
      sourceName: hit.sourceName,
      quote: hit.snippet,
    })),
    content:
      search.hits.length > 0
        ? `已在「${set.name}」中检索到 ${search.hits.length} 条高相关来源，建议先按“目标-约束-验证”三段继续追问。`
        : `「${set.name}」当前没有命中来源。建议先补充可检索的 Markdown 或文件来源后再提问。`,
  };

  const chats = ensureChats();
  const next = [...(chats[knowledgeSetId] ?? []), userMessage, assistantMessage];
  chats[knowledgeSetId] = next;
  saveChats(chats);
  return next;
}

export async function clearKnowledgeSetChat(knowledgeSetId: string) {
  await wait(80);
  findAccessibleSet(knowledgeSetId);
  const chats = ensureChats();
  chats[knowledgeSetId] = [];
  saveChats(chats);
  return { success: true as const };
}
