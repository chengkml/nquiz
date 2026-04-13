import {
  listKnowledgeCollections,
  listKnowledgeSources,
} from "@/features/personal-knowledge/mock-service";
import type {
  KnowledgeSetListItem,
  KnowledgeSourceListItem,
} from "@/features/personal-knowledge/types";
import {
  ALL_CHAT_SCOPE_VALUE,
  type ChatMessageEntity,
  type ChatModelOption,
  type ChatReference,
  type ChatScopeOption,
  type ChatScopeType,
  type ChatSessionEntity,
  type ChatSessionListItem,
  type CreateDraftChatTurnInput,
  type DraftChatTurn,
} from "@/features/chat/types";

const STORAGE_KEYS = {
  sessions: "nquiz-chat-sessions",
  messages: "nquiz-chat-messages",
} as const;

const CURRENT_USER_ID = "mock-current-user";

const defaultModels: ChatModelOption[] = [
  {
    id: "chat-model-deepseek-r1",
    name: "deepseek-r1",
    provider: "DeepSeek",
    type: "TEXT",
    isDefault: true,
    description: "适合知识问答和结构化推理，作为当前聊天域默认模型。",
  },
  {
    id: "chat-model-qwen-max",
    name: "qwen-max",
    provider: "Qwen",
    type: "TEXT",
    isDefault: false,
    description: "适合长文本组织和中文表达，适合作为知识总结备选模型。",
  },
  {
    id: "chat-model-gpt-4o-mini",
    name: "gpt-4o-mini",
    provider: "OpenAI",
    type: "TEXT",
    isDefault: false,
    description: "适合快速对话和流式反馈，用于轻量问答场景。",
  },
];

type MessageStore = Record<string, ChatMessageEntity[]>;

interface ChatSourceContext {
  set: KnowledgeSetListItem;
  source: KnowledgeSourceListItem;
  score: number;
}

function wait(ms = 80) {
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

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function ensureSessions() {
  const existing = readJson<ChatSessionEntity[] | null>(STORAGE_KEYS.sessions, null);
  if (existing && Array.isArray(existing)) {
    return existing;
  }

  writeJson(STORAGE_KEYS.sessions, []);
  return [] as ChatSessionEntity[];
}

function ensureMessages() {
  const existing = readJson<MessageStore | null>(STORAGE_KEYS.messages, null);
  if (existing && typeof existing === "object") {
    return existing;
  }

  writeJson(STORAGE_KEYS.messages, {});
  return {} as MessageStore;
}

function saveSessions(value: ChatSessionEntity[]) {
  writeJson(STORAGE_KEYS.sessions, value);
}

function saveMessages(value: MessageStore) {
  writeJson(STORAGE_KEYS.messages, value);
}

function trimTitle(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 50 ? `${normalized.slice(0, 50)}…` : normalized;
}

function previewText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 96 ? `${normalized.slice(0, 96)}…` : normalized;
}

function sortSessions(value: ChatSessionEntity[]) {
  return [...value].sort((left, right) => {
    if (left.updateDate !== right.updateDate) {
      return left.updateDate < right.updateDate ? 1 : -1;
    }

    return left.id < right.id ? 1 : -1;
  });
}

function requireSession(sessionId: string) {
  const session = ensureSessions().find(
    (item) => item.id === sessionId && item.createUserId === CURRENT_USER_ID,
  );

  if (!session) {
    throw new Error("会话不存在或已被删除");
  }

  return session;
}

async function listAccessibleKnowledgeSets() {
  const collections = await listKnowledgeCollections({ keyword: "" });
  return [...collections.created, ...collections.shared].filter(
    (item) => item.status === "ENABLED" && item.canChat,
  );
}

function scoreSource(question: string, source: KnowledgeSourceListItem) {
  const loweredQuestion = question.toLowerCase();
  const tokens = loweredQuestion.split(/[\s,，。！？；:：/]+/).filter((part) => part.length >= 2);
  const haystack = [source.name, source.descr, source.content, source.previewText]
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (haystack.includes(loweredQuestion)) {
    score += 8;
  }

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }

  return score;
}

async function resolveScopeContext(scopeValue: string) {
  const accessibleSets = await listAccessibleKnowledgeSets();

  if (scopeValue === ALL_CHAT_SCOPE_VALUE) {
    return {
      type: "ALL_ACCESSIBLE" as ChatScopeType,
      knowledgeSetId: null,
      label: "全部可访问知识集",
      sets: accessibleSets,
    };
  }

  const selectedSet = accessibleSets.find((item) => item.id === scopeValue);
  if (!selectedSet) {
    throw new Error("当前知识范围不存在或不可访问");
  }

  return {
    type: "KNOWLEDGE_SET" as ChatScopeType,
    knowledgeSetId: selectedSet.id,
    label: selectedSet.name,
    sets: [selectedSet],
  };
}

async function collectRelevantSources(
  scope: Awaited<ReturnType<typeof resolveScopeContext>>,
  question: string,
) {
  const buckets = await Promise.all(
    scope.sets.map(async (set) => ({
      set,
      sources: await listKnowledgeSources(set.id),
    })),
  );

  const candidates: ChatSourceContext[] = [];
  for (const bucket of buckets) {
    for (const source of bucket.sources) {
      if (source.status !== "SUCCESS") {
        continue;
      }

      candidates.push({
        set: bucket.set,
        source,
        score: scoreSource(question, source),
      });
    }
  }

  return candidates
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.source.updateDate < right.source.updateDate ? 1 : -1;
    })
    .slice(0, 3);
}

function buildReferences(candidates: ChatSourceContext[]): ChatReference[] {
  return candidates.map((item, index) => ({
    knowledgeSetId: item.set.id,
    knowledgeSetName: item.set.name,
    knowledgeSourceId: item.source.id,
    knowledgeSourceName: item.source.name,
    chunkIndex: index + 1,
    distance: Math.max(0.05, Number((0.42 - item.score * 0.02 - index * 0.03).toFixed(4))),
    quote: item.source.previewText,
  }));
}

function buildAssistantContent(params: {
  question: string;
  modelName: string;
  scopeLabel: string;
  scopeType: ChatScopeType;
  setCount: number;
  references: ChatReference[];
}) {
  const { modelName, question, references, scopeLabel, scopeType, setCount } = params;

  if (setCount === 0) {
    return [
      "### 当前无法完成知识问答",
      "",
      `- 当前范围：${scopeLabel}`,
      "- 原因：你还没有可问答的启用知识集，旧 quiz 在这种场景下也不会回退成无限制自由聊天。",
      "- 建议：先进入个人知识页补充可访问且启用中的知识来源，再回到对话页继续提问。",
    ].join("\n");
  }

  if (references.length === 0) {
    return [
      "### 当前范围内未命中可引用资料",
      "",
      `- 当前模型：\`${modelName}\``,
      `- 当前范围：${scopeLabel}`,
      `- 语义模式：${scopeType === "ALL_ACCESSIBLE" ? "跨知识集问答" : "单知识集定向问答"}`,
      "",
      "我没有找到足够相关的成功来源，因此不会假装给出基于知识库的确定性答案。",
      "",
      "建议下一步：",
      "- 换一个更明确的问题，补上对象、时间或模块关键词",
      "- 切换到更聚焦的知识集范围，减少无关资料干扰",
      "- 先在个人知识页补充成功解析的 Markdown 或文件来源",
      "",
      `> 原问题：${question.trim()}`,
    ].join("\n");
  }

  return [
    "### 已基于当前知识范围生成回答",
    "",
    `- 当前模型：\`${modelName}\``,
    `- 当前范围：${scopeLabel}`,
    `- 命中来源：${references.length} 条`,
    "",
    "建议先按下面三个角度继续推进：",
    "- 明确这次问题真正要拿到的结论，而不是泛泛追问",
    "- 先核对参考来源里最贴近目标的片段，再决定是否继续扩问",
    "- 如果答案要落到实现，请继续追问“边界、数据流、失败场景”",
    "",
    "本轮参考重点：",
    ...references.map(
      (reference) =>
        `- ${reference.knowledgeSetName} / ${reference.knowledgeSourceName}：${reference.quote}`,
    ),
    "",
    `> 原问题：${question.trim()}`,
  ].join("\n");
}

export async function listChatModels() {
  await wait(40);
  return defaultModels;
}

export async function listChatScopeOptions(): Promise<ChatScopeOption[]> {
  await wait(40);
  const sets = await listAccessibleKnowledgeSets();

  return [
    {
      value: ALL_CHAT_SCOPE_VALUE,
      label: "全部可访问知识集",
      type: "ALL_ACCESSIBLE",
      knowledgeSetId: null,
      description: "把当前用户可访问且启用中的知识集作为统一问答范围。",
    },
    ...sets.map((set) => ({
      value: set.id,
      label: set.name,
      type: "KNOWLEDGE_SET" as const,
      knowledgeSetId: set.id,
      description: set.descr || "定向限定到单个知识集进行问答。",
    })),
  ];
}

export async function listChatSessions(): Promise<ChatSessionListItem[]> {
  await wait(70);
  const sessions = sortSessions(
    ensureSessions().filter((item) => item.createUserId === CURRENT_USER_ID),
  );
  const messages = ensureMessages();

  return sessions.map((session) => {
    const records = messages[session.id] ?? [];
    const lastMessage = records[records.length - 1];

    return {
      ...session,
      messageCount: records.length,
      lastMessagePreview: lastMessage ? previewText(lastMessage.content) : "等待首条消息",
    };
  });
}

export async function getChatMessages(sessionId: string) {
  await wait(60);
  requireSession(sessionId);
  return [...(ensureMessages()[sessionId] ?? [])].sort((left, right) =>
    left.createdAt > right.createdAt ? 1 : -1,
  );
}

export async function deleteChatSession(sessionId: string) {
  await wait(80);
  requireSession(sessionId);
  const sessions = ensureSessions().filter((item) => item.id !== sessionId);
  const messages = ensureMessages();
  delete messages[sessionId];

  saveSessions(sessions);
  saveMessages(messages);
  return { success: true as const };
}

export async function setChatSessionModel(sessionId: string, modelName: string) {
  await wait(60);
  const sessions = ensureSessions();
  const index = sessions.findIndex(
    (item) => item.id === sessionId && item.createUserId === CURRENT_USER_ID,
  );

  if (index < 0) {
    throw new Error("会话不存在，无法更新模型");
  }

  const next = {
    ...sessions[index],
    modelName,
    updateDate: nowIso(),
  };
  sessions[index] = next;
  saveSessions(sessions);
  return next;
}

export async function createDraftChatTurn(
  input: CreateDraftChatTurnInput,
): Promise<DraftChatTurn> {
  await wait(120);
  const scope = await resolveScopeContext(input.scopeValue);
  const references = buildReferences(await collectRelevantSources(scope, input.message));
  const timestamp = nowIso();
  const sessions = ensureSessions();

  let session =
    input.sessionId != null
      ? sessions.find(
          (item) => item.id === input.sessionId && item.createUserId === CURRENT_USER_ID,
        ) ?? null
      : null;

  if (!session) {
    session = {
      id: createId("chat-session"),
      title: trimTitle(input.message),
      modelName: input.modelName,
      knowledgeScopeType: scope.type,
      knowledgeSetId: scope.knowledgeSetId,
      knowledgeScopeLabel: scope.label,
      createUserId: CURRENT_USER_ID,
      createDate: timestamp,
      updateDate: timestamp,
    };
    saveSessions([session, ...sessions]);
  } else {
    const index = sessions.findIndex((item) => item.id === session!.id);
    session = {
      ...session,
      modelName: input.modelName,
      knowledgeScopeType: scope.type,
      knowledgeSetId: scope.knowledgeSetId,
      knowledgeScopeLabel: scope.label,
      updateDate: timestamp,
    };
    sessions[index] = session;
    saveSessions(sessions);
  }

  const userMessage: ChatMessageEntity = {
    id: createId("chat-user"),
    sessionId: session.id,
    role: "user",
    content: input.message.trim(),
    createdAt: timestamp,
    references: [],
  };

  const assistantMessage: ChatMessageEntity = {
    id: createId("chat-assistant"),
    sessionId: session.id,
    role: "assistant",
    content: buildAssistantContent({
      question: input.message,
      modelName: input.modelName,
      scopeLabel: scope.label,
      scopeType: scope.type,
      setCount: scope.sets.length,
      references,
    }),
    createdAt: nowIso(),
    references,
  };

  return {
    session,
    userMessage,
    assistantMessage,
  };
}

export async function commitChatTurn({
  session,
  userMessage,
  assistantMessage,
}: DraftChatTurn) {
  await wait(60);
  const messages = ensureMessages();
  const sessions = ensureSessions();
  const sessionIndex = sessions.findIndex(
    (item) => item.id === session.id && item.createUserId === CURRENT_USER_ID,
  );

  if (sessionIndex < 0) {
    throw new Error("会话不存在，无法保存消息");
  }

  const currentMessages = messages[session.id] ?? [];
  messages[session.id] = [...currentMessages, userMessage, assistantMessage];
  saveMessages(messages);

  const persistedSession = {
    ...sessions[sessionIndex],
    title: currentMessages.length === 0 ? trimTitle(userMessage.content) : sessions[sessionIndex].title,
    modelName: session.modelName,
    knowledgeScopeType: session.knowledgeScopeType,
    knowledgeSetId: session.knowledgeSetId,
    knowledgeScopeLabel: session.knowledgeScopeLabel,
    updateDate: assistantMessage.createdAt,
  };
  sessions[sessionIndex] = persistedSession;
  saveSessions(sortSessions(sessions));

  return messages[session.id];
}
