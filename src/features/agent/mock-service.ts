import { agentFilterSchema } from "@/features/agent/schema";
import type {
  AgentDetail,
  AgentEntity,
  AgentListFilters,
  AgentListItem,
  AgentListResult,
  AgentMetaResult,
  AgentMutationInput,
  AgentToolBinding,
  AgentToolRelationEntity,
  LlmModelOption,
  PromptTemplateOption,
} from "@/features/agent/types";
import { getMcpToolDetail, listSelectableMcpTools } from "@/features/mcp-tool/mock-service";

const STORAGE_KEY = "nquiz.agent-manager.v1";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";
const LATENCY_MS = 120;

interface AgentSnapshot {
  agents: AgentEntity[];
  agentTools: AgentToolRelationEntity[];
  promptTemplates: PromptTemplateOption[];
  models: LlmModelOption[];
}

const seedSnapshot: AgentSnapshot = {
  agents: [
    {
      id: "agent-001",
      name: "代码评审助手",
      identifier: "code-review-assistant",
      description: "用于复核变更、总结风险点，并输出可操作的 review 结论。",
      icon: "🧪",
      category: "engineering",
      systemPrompt: "你是一名资深代码评审工程师，优先识别真实风险和行为回归。",
      promptTemplateId: "",
      modelId: "model-gpt54",
      modelConfig: JSON.stringify({ temperature: 0.2, maxTokens: 2400 }, null, 2),
      status: "ENABLED",
      tags: "code-review, engineering",
      createDate: "2026-04-08T11:00:00+08:00",
      updateDate: "2026-04-11T15:30:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "agent-002",
      name: "知识问答助理",
      identifier: "knowledge-answer-agent",
      description: "复用知识库检索与总结模板，用于回答项目与学习类问题。",
      icon: "📚",
      category: "knowledge",
      systemPrompt: "",
      promptTemplateId: "prompt-knowledge-qa",
      modelId: "model-gpt54-mini",
      modelConfig: JSON.stringify({ temperature: 0.4, maxTokens: 1800 }, null, 2),
      status: "DRAFT",
      tags: "rag, knowledge",
      createDate: "2026-04-09T13:20:00+08:00",
      updateDate: "2026-04-10T18:10:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "agent-003",
      name: "运营摘要助手",
      identifier: "ops-briefing-agent",
      description: "用于把热搜、通知和日报素材整理成运营摘要。",
      icon: "🗂️",
      category: "ops",
      systemPrompt: "请先提炼结论，再输出 3 条行动建议。",
      promptTemplateId: "",
      modelId: "model-gpt54-mini",
      modelConfig: JSON.stringify({ temperature: 0.6, maxTokens: 1200 }, null, 2),
      status: "DISABLED",
      tags: "ops, summary",
      createDate: "2026-04-06T09:30:00+08:00",
      updateDate: "2026-04-10T09:00:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
  ],
  agentTools: [
    {
      id: "agent-tool-001",
      agentId: "agent-001",
      mcpToolId: "mcp-tool-001",
      priority: 2,
      config: "{}",
    },
    {
      id: "agent-tool-002",
      agentId: "agent-002",
      mcpToolId: "mcp-tool-001",
      priority: 1,
      config: "{}",
    },
  ],
  promptTemplates: [
    {
      id: "prompt-knowledge-qa",
      name: "知识问答模板",
      summary: "围绕上下文引用、结论优先和引用来源说明的问答模板。",
    },
    {
      id: "prompt-ops-briefing",
      name: "运营摘要模板",
      summary: "适合日报、周报、热搜简报等需要结构化输出的摘要模板。",
    },
  ],
  models: [
    {
      id: "model-gpt54",
      name: "GPT-5.4",
      provider: "OpenAI",
      summary: "适合复杂推理、评审与长文本分析。",
    },
    {
      id: "model-gpt54-mini",
      name: "GPT-5.4 Mini",
      provider: "OpenAI",
      summary: "适合轻量摘要、问答与低成本草稿生成。",
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

function readSnapshot(): AgentSnapshot {
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
    const parsed = JSON.parse(raw) as Partial<AgentSnapshot>;
    if (!Array.isArray(parsed.agents) || !Array.isArray(parsed.agentTools) || !Array.isArray(parsed.promptTemplates) || !Array.isArray(parsed.models)) {
      throw new Error("invalid snapshot shape");
    }
    return {
      agents: parsed.agents as AgentEntity[],
      agentTools: parsed.agentTools as AgentToolRelationEntity[],
      promptTemplates: parsed.promptTemplates as PromptTemplateOption[],
      models: parsed.models as LlmModelOption[],
    };
  } catch {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }
}

function writeSnapshot(snapshot: AgentSnapshot) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function nowIso() {
  return new Date().toISOString();
}

function splitTags(tags: string) {
  return tags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findPromptTemplateName(snapshot: AgentSnapshot, promptTemplateId: string) {
  return snapshot.promptTemplates.find((item) => item.id === promptTemplateId)?.name;
}

function findModelName(snapshot: AgentSnapshot, modelId: string) {
  return snapshot.models.find((item) => item.id === modelId)?.name;
}

function getPromptMode(agent: AgentEntity) {
  return agent.promptTemplateId ? "template" : "direct";
}

function toListItem(snapshot: AgentSnapshot, agent: AgentEntity): AgentListItem {
  return {
    ...agent,
    promptMode: getPromptMode(agent),
    promptTemplateName: agent.promptTemplateId ? findPromptTemplateName(snapshot, agent.promptTemplateId) : undefined,
    modelName: findModelName(snapshot, agent.modelId),
    toolCount: snapshot.agentTools.filter((item) => item.agentId === agent.id).length,
    tagList: splitTags(agent.tags),
  };
}

async function buildToolBindings(snapshot: AgentSnapshot, agentId: string): Promise<AgentToolBinding[]> {
  const relations = snapshot.agentTools
    .filter((item) => item.agentId === agentId)
    .sort((left, right) => right.priority - left.priority);

  const bindings = await Promise.all(
    relations.map(async (relation) => {
      const tool = await getMcpToolDetail(relation.mcpToolId);
      return {
        id: relation.id,
        mcpToolId: relation.mcpToolId,
        mcpToolName: tool?.displayName || relation.mcpToolId,
        mcpToolDescription: tool?.description || "",
        category: tool?.category || "",
        priority: relation.priority,
        config: relation.config,
      };
    }),
  );

  return bindings;
}

async function buildReadinessWarnings(snapshot: AgentSnapshot, agent: AgentEntity) {
  const warnings: string[] = [];
  if (!agent.systemPrompt.trim() && !agent.promptTemplateId.trim()) {
    warnings.push("未配置系统 Prompt 或 Prompt 模板。");
  }

  if (agent.promptTemplateId && !snapshot.promptTemplates.some((item) => item.id === agent.promptTemplateId)) {
    warnings.push("引用的 Prompt 模板已不存在。");
  }

  if (!snapshot.models.some((item) => item.id === agent.modelId)) {
    warnings.push("引用的模型不存在。");
  }

  const selectableTools = await listSelectableMcpTools();
  const selectableIds = new Set(selectableTools.map((item) => item.id));
  const relations = snapshot.agentTools.filter((item) => item.agentId === agent.id);
  const invalidTools = relations.filter((item) => !selectableIds.has(item.mcpToolId));
  if (invalidTools.length > 0) {
    warnings.push("部分工具当前不可被 Agent 消费，请检查工具状态或来源是否失效。");
  }

  try {
    JSON.parse(agent.modelConfig);
  } catch {
    warnings.push("模型参数 JSON 不合法。");
  }

  return warnings;
}

export async function listAgentMeta(): Promise<AgentMetaResult> {
  const snapshot = readSnapshot();
  const categories = Array.from(new Set(snapshot.agents.map((item) => item.category).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );

  return wait({
    promptTemplates: snapshot.promptTemplates,
    models: snapshot.models,
    categories,
  });
}

export async function listAgents(rawFilters: AgentListFilters): Promise<AgentListResult> {
  const snapshot = readSnapshot();
  const filters = agentFilterSchema.parse(rawFilters);
  const keyword = filters.keyword.trim().toLowerCase();

  const filtered = snapshot.agents
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .filter((item) => {
      if (filters.status !== "ALL" && item.status !== filters.status) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.modelId && item.modelId !== filters.modelId) return false;
      if (keyword) {
        const haystack = [item.name, item.identifier, item.description].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    })
    .sort((left, right) => right.updateDate.localeCompare(left.updateDate));

  const items = filtered.map((item) => toListItem(snapshot, item));
  const start = (filters.page - 1) * filters.pageSize;
  const paged = items.slice(start, start + filters.pageSize);

  return wait({
    items: paged,
    total: items.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalAgents: snapshot.agents.length,
      enabledAgents: snapshot.agents.filter((item) => item.status === "ENABLED").length,
      draftAgents: snapshot.agents.filter((item) => item.status === "DRAFT").length,
      disabledAgents: snapshot.agents.filter((item) => item.status === "DISABLED").length,
    },
  });
}

export async function getAgentDetail(id: string): Promise<AgentDetail | null> {
  const snapshot = readSnapshot();
  const agent = snapshot.agents.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID) || null;
  if (!agent) {
    return wait(null);
  }

  const tools = await buildToolBindings(snapshot, agent.id);
  const readinessWarnings = await buildReadinessWarnings(snapshot, agent);

  return wait({
    ...toListItem(snapshot, agent),
    tools,
    readinessWarnings,
  });
}

function normalizeAgentInput(input: AgentMutationInput) {
  return {
    ...input,
    name: input.name.trim(),
    identifier: input.identifier.trim(),
    description: input.description.trim(),
    icon: input.icon.trim() || "🤖",
    category: input.category.trim(),
    systemPrompt: input.promptMode === "direct" ? input.systemPrompt.trim() : "",
    promptTemplateId: input.promptMode === "template" ? input.promptTemplateId.trim() : "",
    modelConfig: input.modelConfig,
    agentTags: input.agentTags.trim(),
  };
}

function replaceAgentTools(snapshot: AgentSnapshot, agentId: string, toolIds: string[]) {
  snapshot.agentTools = snapshot.agentTools.filter((item) => item.agentId !== agentId);
  const total = toolIds.length;
  toolIds.forEach((toolId, index) => {
    snapshot.agentTools.push({
      id: crypto.randomUUID(),
      agentId,
      mcpToolId: toolId,
      priority: total - index,
      config: "{}",
    });
  });
}

export async function createAgent(input: AgentMutationInput): Promise<AgentEntity> {
  const snapshot = readSnapshot();
  const payload = normalizeAgentInput(input);
  const duplicated = snapshot.agents.some((item) => item.createUserId === CURRENT_USER_ID && item.identifier.toLowerCase() === payload.identifier.toLowerCase());
  if (duplicated) {
    throw new Error(`Agent 标识符已存在：${payload.identifier}`);
  }

  const timestamp = nowIso();
  const entity: AgentEntity = {
    id: crypto.randomUUID(),
    name: payload.name,
    identifier: payload.identifier,
    description: payload.description,
    icon: payload.icon,
    category: payload.category,
    systemPrompt: payload.systemPrompt,
    promptTemplateId: payload.promptTemplateId,
    modelId: payload.modelId,
    modelConfig: payload.modelConfig,
    status: payload.status || "DRAFT",
    tags: payload.agentTags,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  snapshot.agents.unshift(entity);
  replaceAgentTools(snapshot, entity.id, payload.toolIds);
  writeSnapshot(snapshot);
  return wait(entity);
}

export async function updateAgent(id: string, input: AgentMutationInput): Promise<AgentEntity> {
  const snapshot = readSnapshot();
  const agent = snapshot.agents.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!agent) {
    throw new Error("目标 Agent 不存在或无权编辑");
  }

  const payload = normalizeAgentInput(input);
  const duplicated = snapshot.agents.some(
    (item) => item.id !== id && item.createUserId === CURRENT_USER_ID && item.identifier.toLowerCase() === payload.identifier.toLowerCase(),
  );
  if (duplicated) {
    throw new Error(`Agent 标识符已存在：${payload.identifier}`);
  }

  agent.name = payload.name;
  agent.identifier = payload.identifier;
  agent.description = payload.description;
  agent.icon = payload.icon;
  agent.category = payload.category;
  agent.systemPrompt = payload.systemPrompt;
  agent.promptTemplateId = payload.promptTemplateId;
  agent.modelId = payload.modelId;
  agent.modelConfig = payload.modelConfig;
  agent.status = payload.status;
  agent.tags = payload.agentTags;
  agent.updateDate = nowIso();

  replaceAgentTools(snapshot, id, payload.toolIds);
  writeSnapshot(snapshot);
  return wait(clone(agent));
}

export async function deleteAgent(id: string) {
  const snapshot = readSnapshot();
  const agent = snapshot.agents.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!agent) {
    throw new Error("目标 Agent 不存在或无权删除");
  }

  snapshot.agents = snapshot.agents.filter((item) => item.id !== id);
  snapshot.agentTools = snapshot.agentTools.filter((item) => item.agentId !== id);
  writeSnapshot(snapshot);
  return wait(undefined);
}

export async function setAgentStatus(id: string, status: AgentEntity["status"]) {
  const snapshot = readSnapshot();
  const agent = snapshot.agents.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!agent) {
    throw new Error("目标 Agent 不存在或无权修改状态");
  }

  agent.status = status;
  agent.updateDate = nowIso();
  writeSnapshot(snapshot);
  return wait(clone(agent));
}

export async function duplicateAgent(id: string): Promise<AgentEntity> {
  const snapshot = readSnapshot();
  const agent = snapshot.agents.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!agent) {
    throw new Error("目标 Agent 不存在或无权复制");
  }

  const timestamp = Date.now();
  const duplicate: AgentEntity = {
    ...clone(agent),
    id: crypto.randomUUID(),
    name: `${agent.name}（副本）`,
    identifier: `${agent.identifier}_copy_${timestamp}`,
    status: "DRAFT",
    createDate: nowIso(),
    updateDate: nowIso(),
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  snapshot.agents.unshift(duplicate);
  const sourceTools = snapshot.agentTools.filter((item) => item.agentId === id);
  sourceTools.forEach((item) => {
    snapshot.agentTools.push({
      ...clone(item),
      id: crypto.randomUUID(),
      agentId: duplicate.id,
    });
  });
  writeSnapshot(snapshot);
  return wait(duplicate);
}
