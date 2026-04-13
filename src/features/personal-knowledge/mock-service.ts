import type {
  KnowledgeChatMessage,
  KnowledgeChatSession,
  KnowledgeCollectionsFilters,
  KnowledgeCollectionsResult,
  KnowledgeSetEntity,
  KnowledgeSetListItem,
  KnowledgeSetMutationInput,
  KnowledgeSourceEntity,
  KnowledgeSourceListItem,
  KnowledgeSourceMutationInput,
} from "@/features/personal-knowledge/types";

const STORAGE_KEYS = {
  sets: "nquiz-personal-knowledge-sets",
  sources: "nquiz-personal-knowledge-sources",
  chats: "nquiz-personal-knowledge-chats",
} as const;

const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";
const SHARED_OWNER_ID = "shared-knowledge-owner";
const SHARED_OWNER_NAME = "知识协作组";

const defaultSets: KnowledgeSetEntity[] = [
  {
    id: "knowledge-set-product-playbook",
    name: "产品需求沉淀库",
    descr: "沉淀 quiz 到 nquiz 的需求分析、验收口径和跨模块约束，作为重构过程中的个人知识主工作台。",
    visibility: "PRIVATE",
    status: "ENABLED",
    createDate: "2026-04-08T09:30:00.000Z",
    updateDate: "2026-04-11T02:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-set-next-migration",
    name: "Next.js 重构手册",
    descr: "记录 Next.js App Router、BFF 路由、模块拆分与页面迁移经验，适合承接个人技术沉淀。",
    visibility: "PUBLIC",
    status: "ENABLED",
    createDate: "2026-04-07T10:00:00.000Z",
    updateDate: "2026-04-10T15:35:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-set-draft-archive",
    name: "历史草稿归档",
    descr: "用于临时存放尚未整理完成的 Markdown 草稿，首版保留但默认禁用问答。",
    visibility: "PRIVATE",
    status: "DISABLED",
    createDate: "2026-04-06T08:15:00.000Z",
    updateDate: "2026-04-09T14:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-set-frontend-shared",
    name: "前端协作共享库",
    descr: "团队共享的 UI 规范、交互约束与组件约定。当前用户可访问，但首版保持只读。",
    visibility: "PUBLIC",
    status: "ENABLED",
    createDate: "2026-04-05T06:00:00.000Z",
    updateDate: "2026-04-10T11:40:00.000Z",
    createUserId: SHARED_OWNER_ID,
    createUserName: SHARED_OWNER_NAME,
  },
];

const defaultSources: KnowledgeSourceEntity[] = [
  {
    id: "knowledge-source-product-roadmap",
    knowledgeSetId: "knowledge-set-product-playbook",
    name: "需求拆解准则.md",
    type: "MARKDOWN",
    status: "SUCCESS",
    descr: "总结 nquiz 迁移需求拆解、验收范围和差异汇报格式。",
    content: "迁移以菜单粒度形成闭环。每个功能完成后都要说明已覆盖能力、未覆盖能力、差异原因与风险。",
    fileName: "",
    createDate: "2026-04-08T09:45:00.000Z",
    updateDate: "2026-04-10T16:30:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-source-product-risk",
    knowledgeSetId: "knowledge-set-product-playbook",
    name: "风险登记表.md",
    type: "MARKDOWN",
    status: "SUCCESS",
    descr: "记录重构时常见的权限、状态和伪完成风险。",
    content: "重点关注权限语义丢失、前后端字段不一致、原页面只有壳没有闭环、把 mock 误当真实能力的问题。",
    fileName: "",
    createDate: "2026-04-08T10:10:00.000Z",
    updateDate: "2026-04-11T01:45:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-source-next-routing",
    knowledgeSetId: "knowledge-set-next-migration",
    name: "app-router-migration-notes.md",
    type: "MARKDOWN",
    status: "SUCCESS",
    descr: "总结 App Router 路由、Server/Client Components 边界和 query key 组织方式。",
    content: "页面入口保留在 src/app。交互式工作台放在 use client 的 feature 组件里，通过 TanStack Query 管理数据状态。",
    fileName: "",
    createDate: "2026-04-07T10:30:00.000Z",
    updateDate: "2026-04-10T13:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-source-next-reference",
    knowledgeSetId: "knowledge-set-next-migration",
    name: "next16-notes.pdf",
    type: "FILE",
    status: "PENDING",
    descr: "模拟刚上传的官方文档整理件，用于演示来源处理中状态。",
    content: "文件内容已进入处理队列，稍后会自动转为可问答状态。",
    fileName: "next16-notes.pdf",
    createDate: "2026-04-11T03:20:00.000Z",
    updateDate: new Date().toISOString(),
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "knowledge-source-shared-guideline",
    knowledgeSetId: "knowledge-set-frontend-shared",
    name: "设计一致性指南.md",
    type: "MARKDOWN",
    status: "SUCCESS",
    descr: "共享设计 token 和交互约束。",
    content: "共享库要求页面在视觉上有明确层级，避免默认白底紫色风格。重要交互必须有清晰的禁用态与反馈。",
    fileName: "",
    createDate: "2026-04-05T06:20:00.000Z",
    updateDate: "2026-04-10T09:20:00.000Z",
    createUserId: SHARED_OWNER_ID,
    createUserName: SHARED_OWNER_NAME,
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
  const existing = readJson<KnowledgeSetEntity[] | null>(STORAGE_KEYS.sets, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(STORAGE_KEYS.sets, defaultSets);
  return defaultSets;
}

function ensureSources() {
  const existing = readJson<KnowledgeSourceEntity[] | null>(STORAGE_KEYS.sources, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(STORAGE_KEYS.sources, defaultSources);
  return defaultSources;
}

function ensureChats() {
  const existing = readJson<Record<string, KnowledgeChatSession> | null>(STORAGE_KEYS.chats, null);
  if (existing && typeof existing === "object") {
    return existing;
  }

  const initial: Record<string, KnowledgeChatSession> = {};
  writeJson(STORAGE_KEYS.chats, initial);
  return initial;
}

function saveSets(value: KnowledgeSetEntity[]) {
  writeJson(STORAGE_KEYS.sets, value);
}

function saveSources(value: KnowledgeSourceEntity[]) {
  writeJson(STORAGE_KEYS.sources, value);
}

function saveChats(value: Record<string, KnowledgeChatSession>) {
  writeJson(STORAGE_KEYS.chats, value);
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function isOwnedSet(set: KnowledgeSetEntity) {
  return set.createUserId === CURRENT_USER_ID;
}

function isAccessibleSet(set: KnowledgeSetEntity) {
  return isOwnedSet(set) || set.visibility === "PUBLIC";
}

function advanceSourceStatus(source: KnowledgeSourceEntity, nowMs: number): KnowledgeSourceEntity {
  if (source.status === "SUCCESS" || source.status === "FAILED") {
    return source;
  }

  const baseMs = new Date(source.updateDate).getTime();
  if (Number.isNaN(baseMs)) {
    return source;
  }

  const elapsed = nowMs - baseMs;
  if (elapsed >= 3200) {
    return {
      ...source,
      status: source.simulateFailure ? "FAILED" : "SUCCESS",
    };
  }

  if (elapsed >= 1200) {
    return {
      ...source,
      status: "PARSING",
    };
  }

  return source;
}

function syncSourceStatuses(): KnowledgeSourceEntity[] {
  const nowMs = Date.now();
  const current = ensureSources();
  let changed = false;

  const next: KnowledgeSourceEntity[] = current.map((item) => {
    const updated = advanceSourceStatus(item, nowMs);
    if (updated.status !== item.status) {
      changed = true;
      return {
        ...updated,
        updateDate: item.updateDate,
      };
    }
    return item;
  });

  if (changed) {
    saveSources(next);
  }

  return next;
}

function previewTextOfSource(source: KnowledgeSourceEntity) {
  const baseText = source.type === "FILE" ? `${source.fileName} ${source.content}` : source.content;
  return baseText.replace(/\s+/g, " ").trim().slice(0, 140) || "暂无可预览内容";
}

function toKnowledgeSetListItem(set: KnowledgeSetEntity, sources: KnowledgeSourceEntity[]): KnowledgeSetListItem {
  const related = sources.filter((item) => item.knowledgeSetId === set.id);
  const latestSourceDate = related
    .map((item) => item.updateDate)
    .sort((left, right) => (left > right ? -1 : 1))[0] ?? null;

  const successSourceCount = related.filter((item) => item.status === "SUCCESS").length;
  const processingSourceCount = related.filter((item) => item.status === "PENDING" || item.status === "PARSING").length;
  const failedSourceCount = related.filter((item) => item.status === "FAILED").length;
  const canManage = isOwnedSet(set);

  return {
    ...set,
    scope: canManage ? "OWNED" : "SHARED",
    sourceCount: related.length,
    successSourceCount,
    processingSourceCount,
    failedSourceCount,
    latestSourceDate,
    canManage,
    canChat: set.status === "ENABLED" && successSourceCount > 0,
  };
}

function toKnowledgeSourceListItem(source: KnowledgeSourceEntity, set: KnowledgeSetEntity): KnowledgeSourceListItem {
  return {
    ...source,
    previewText: previewTextOfSource(source),
    canManage: isOwnedSet(set),
  };
}

function getAccessibleSets() {
  return ensureSets()
    .filter(isAccessibleSet)
    .sort((left, right) => (left.updateDate < right.updateDate ? 1 : -1));
}

function findAccessibleSet(id: string) {
  const set = ensureSets().find((item) => item.id === id);
  if (!set || !isAccessibleSet(set)) {
    throw new Error("知识集不存在或当前用户无权访问");
  }

  return set;
}

function touchSet(id: string) {
  const sets = ensureSets();
  const index = sets.findIndex((item) => item.id === id);
  if (index < 0) {
    return;
  }

  sets[index] = {
    ...sets[index],
    updateDate: nowIso(),
  };
  saveSets(sets);
}

function normalizeSetInput(input: KnowledgeSetMutationInput) {
  return {
    name: input.name.trim(),
    descr: input.descr?.trim() || "",
    visibility: input.visibility,
    status: input.status,
  };
}

function normalizeSourceInput(input: KnowledgeSourceMutationInput) {
  return {
    name: input.name.trim(),
    type: input.type,
    descr: input.descr?.trim() || "",
    content: input.content?.trim() || "",
    fileName: input.fileName?.trim() || "",
  };
}

export async function listKnowledgeCollections(filters: KnowledgeCollectionsFilters): Promise<KnowledgeCollectionsResult> {
  await wait(120);
  const sources = syncSourceStatuses();
  const keyword = normalizeKeyword(filters.keyword);
  const matched = getAccessibleSets().filter((item) => {
    if (!keyword) {
      return true;
    }

    const haystack = [item.name, item.descr, item.createUserName].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  const items = matched.map((item) => toKnowledgeSetListItem(item, sources));
  const created = items.filter((item) => item.scope === "OWNED");
  const shared = items.filter((item) => item.scope === "SHARED");

  return {
    created,
    shared,
    summary: {
      totalSets: items.length,
      ownedSets: created.length,
      sharedSets: shared.length,
      totalSources: items.reduce((sum, item) => sum + item.sourceCount, 0),
      processingSources: items.reduce((sum, item) => sum + item.processingSourceCount, 0),
    },
  };
}

export async function getKnowledgeSetDetail(id: string) {
  await wait(80);
  const set = findAccessibleSet(id);
  const sources = syncSourceStatuses();
  return toKnowledgeSetListItem(set, sources);
}

export async function createKnowledgeSet(input: KnowledgeSetMutationInput) {
  await wait(140);
  const sets = ensureSets();
  const payload = normalizeSetInput(input);
  const timestamp = nowIso();

  const record: KnowledgeSetEntity = {
    id: `knowledge-set-${Date.now()}`,
    name: payload.name,
    descr: payload.descr,
    visibility: payload.visibility,
    status: payload.status,
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
  const index = sets.findIndex((item) => item.id === id && isOwnedSet(item));
  if (index < 0) {
    throw new Error("知识集不存在或当前用户无权编辑");
  }

  const payload = normalizeSetInput(input);
  const current = sets[index];
  const next: KnowledgeSetEntity = {
    ...current,
    ...payload,
    updateDate: nowIso(),
  };

  sets[index] = next;
  saveSets(sets);
  return next;
}

export async function deleteKnowledgeSet(id: string) {
  await wait(120);
  const set = findAccessibleSet(id);
  if (!isOwnedSet(set)) {
    throw new Error("共享知识集当前只读，不能删除");
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

export async function listKnowledgeSources(knowledgeSetId: string) {
  await wait(100);
  const set = findAccessibleSet(knowledgeSetId);
  const sources = syncSourceStatuses()
    .filter((item) => item.knowledgeSetId === knowledgeSetId)
    .sort((left, right) => (left.updateDate < right.updateDate ? 1 : -1));

  return sources.map((item) => toKnowledgeSourceListItem(item, set));
}

export async function createKnowledgeSource(knowledgeSetId: string, input: KnowledgeSourceMutationInput) {
  await wait(140);
  const set = findAccessibleSet(knowledgeSetId);
  if (!isOwnedSet(set)) {
    throw new Error("共享知识集当前只读，不能新增来源");
  }

  const sources = ensureSources();
  const payload = normalizeSourceInput(input);
  const timestamp = nowIso();

  const record: KnowledgeSourceEntity = {
    id: `knowledge-source-${Date.now()}`,
    knowledgeSetId,
    name: payload.name,
    type: payload.type,
    status: "PENDING",
    descr: payload.descr,
    content: payload.content,
    fileName: payload.fileName,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

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
  if (!isOwnedSet(set)) {
    throw new Error("共享知识集当前只读，不能编辑来源");
  }

  const payload = normalizeSourceInput(input);
  const next: KnowledgeSourceEntity = {
    ...current,
    ...payload,
    status: "PENDING",
    updateDate: nowIso(),
    simulateFailure: false,
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
  if (!isOwnedSet(set)) {
    throw new Error("共享知识集当前只读，不能删除来源");
  }

  saveSources(sources.filter((item) => item.id !== id));
  touchSet(current.knowledgeSetId);
  return { success: true as const };
}

export async function getKnowledgeChatSession(knowledgeSetId: string) {
  await wait(60);
  findAccessibleSet(knowledgeSetId);
  const chats = ensureChats();
  return chats[knowledgeSetId]?.messages ?? [];
}

function pickRelevantSources(sources: KnowledgeSourceEntity[], question: string) {
  if (sources.length <= 2) {
    return sources;
  }

  const lowered = question.toLowerCase();
  const scored = sources
    .map((item) => {
      const haystack = [item.name, item.descr, item.content].join(" ").toLowerCase();
      let score = 0;

      if (haystack.includes(lowered)) {
        score += 5;
      }

      for (const token of lowered.split(/\s+/).filter((part) => part.length >= 2)) {
        if (haystack.includes(token)) {
          score += 1;
        }
      }

      return { item, score };
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.item.updateDate < right.item.updateDate ? 1 : -1;
    });

  return scored.slice(0, 2).map((entry) => entry.item);
}

export async function askKnowledgeQuestion(knowledgeSetId: string, question: string) {
  await wait(420);
  const set = findAccessibleSet(knowledgeSetId);
  if (set.status !== "ENABLED") {
    throw new Error("当前知识集已禁用，不能发起问答");
  }

  const allSources = syncSourceStatuses().filter(
    (item) => item.knowledgeSetId === knowledgeSetId && item.status === "SUCCESS",
  );
  const selectedSources = pickRelevantSources(allSources, question);

  const citations = selectedSources.map((item) => ({
    sourceId: item.id,
    sourceName: item.name,
    quote: previewTextOfSource(item),
  }));

  const assistantMessage: KnowledgeChatMessage = {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    createdAt: nowIso(),
    citations,
    content:
      citations.length > 0
        ? [
            `已切换到「${set.name}」进行定向问答。`,
            `这次优先参考了 ${citations.map((item) => `《${item.sourceName}》`).join("、")}。`,
            `基于当前资料，我建议先把问题拆成“目标、约束、待验证点”三部分，再结合来源中的关键信息继续追问。`,
          ].join("\n\n")
        : [
            `「${set.name}」当前还没有可问答的成功来源。`,
            "我暂时只能基于知识集描述做占位回答。建议先补充 Markdown 或文件来源，并等待处理状态变为成功后再提问。",
          ].join("\n\n"),
  };

  const userMessage: KnowledgeChatMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    createdAt: nowIso(),
    citations: [],
    content: question.trim(),
  };

  const chats = ensureChats();
  const current = chats[knowledgeSetId] ?? {
    knowledgeSetId,
    messages: [],
  };

  chats[knowledgeSetId] = {
    knowledgeSetId,
    messages: [...current.messages, userMessage, assistantMessage],
  };

  saveChats(chats);
  return chats[knowledgeSetId].messages;
}

export async function clearKnowledgeChatSession(knowledgeSetId: string) {
  await wait(80);
  findAccessibleSet(knowledgeSetId);
  const chats = ensureChats();
  chats[knowledgeSetId] = {
    knowledgeSetId,
    messages: [],
  };
  saveChats(chats);
  return { success: true as const };
}
