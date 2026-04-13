import { mcpToolFilterSchema } from "@/features/mcp-tool/schema";
import type {
  McpToolEntity,
  McpToolListFilters,
  McpToolListItem,
  McpToolListResult,
  McpToolMetaResult,
  McpToolMutationInput,
  McpToolServerOption,
} from "@/features/mcp-tool/types";

const STORAGE_KEY = "nquiz.mcp-tool-manager.v1";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";
const LATENCY_MS = 120;

interface McpToolStoreSnapshot {
  servers: McpToolServerOption[];
  tools: McpToolEntity[];
}

const seedSnapshot: McpToolStoreSnapshot = {
  servers: [
    {
      id: "mcp-server-github",
      label: "GitHub Automation Server",
      envs: ["dev", "test", "prod"],
    },
    {
      id: "mcp-server-knowledge",
      label: "Knowledge Retrieval Server",
      envs: ["dev", "stage", "prod"],
    },
    {
      id: "mcp-server-office",
      label: "Office Ops Server",
      envs: ["test", "stage"],
    },
  ],
  tools: [
    {
      id: "mcp-tool-001",
      serverId: "mcp-server-github",
      serverName: "GitHub Automation Server",
      env: "prod",
      originName: "create_pull_request",
      displayName: "创建 Pull Request",
      description: "供 Agent 在代码生成后发起 PR，用于仓库交付闭环。",
      category: "code-delivery",
      tags: "github, pr, codegen",
      status: "ENABLED",
      schemaJson: JSON.stringify(
        {
          type: "object",
          properties: {
            repo: { type: "string" },
            branch: { type: "string" },
            title: { type: "string" },
          },
          required: ["repo", "branch", "title"],
        },
        null,
        2,
      ),
      strategyJson: JSON.stringify(
        {
          timeoutMs: 30000,
          retry: 1,
          idempotent: false,
        },
        null,
        2,
      ),
      visibilityJson: JSON.stringify(
        {
          apps: ["nquiz-web"],
          roles: ["developer", "maintainer"],
          scenes: ["delivery", "review"],
        },
        null,
        2,
      ),
      sourceDeletedFlag: false,
      createDate: "2026-04-08T10:00:00+08:00",
      updateDate: "2026-04-11T09:30:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "mcp-tool-002",
      serverId: "mcp-server-knowledge",
      serverName: "Knowledge Retrieval Server",
      env: "stage",
      originName: "search_knowledge_chunks",
      displayName: "检索知识分片",
      description: "为编排、Agent 与问答页提供知识库检索能力。",
      category: "knowledge",
      tags: "rag, knowledge, retrieval",
      status: "REGISTERED",
      schemaJson: JSON.stringify(
        {
          type: "object",
          properties: {
            query: { type: "string" },
            topK: { type: "number" },
          },
          required: ["query"],
        },
        null,
        2,
      ),
      strategyJson: JSON.stringify(
        {
          timeoutMs: 12000,
          retry: 0,
          cacheSeconds: 30,
        },
        null,
        2,
      ),
      visibilityJson: JSON.stringify(
        {
          apps: ["nquiz-web", "nquiz-agent"],
          roles: ["developer", "ops"],
          scenes: ["orchestration", "knowledge"],
        },
        null,
        2,
      ),
      sourceDeletedFlag: false,
      createDate: "2026-04-09T14:20:00+08:00",
      updateDate: "2026-04-10T20:10:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "mcp-tool-003",
      serverId: "mcp-server-office",
      serverName: "Office Ops Server",
      env: "test",
      originName: "sync_notion_task",
      displayName: "同步 Notion 任务",
      description: "历史导入工具，来源服务端已删除，仅保留治理台账。",
      category: "office",
      tags: "notion, office",
      status: "SOURCE_REMOVED",
      schemaJson: JSON.stringify(
        {
          type: "object",
          properties: {
            pageId: { type: "string" },
            content: { type: "string" },
          },
        },
        null,
        2,
      ),
      strategyJson: JSON.stringify(
        {
          timeoutMs: 10000,
          retry: 0,
        },
        null,
        2,
      ),
      visibilityJson: JSON.stringify(
        {
          apps: ["nquiz-web"],
          roles: ["ops"],
          scenes: ["ops"],
        },
        null,
        2,
      ),
      sourceDeletedFlag: true,
      createDate: "2026-04-06T09:15:00+08:00",
      updateDate: "2026-04-09T08:00:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
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

function readSnapshot(): McpToolStoreSnapshot {
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
    const parsed = JSON.parse(raw) as Partial<McpToolStoreSnapshot>;
    if (!Array.isArray(parsed.servers) || !Array.isArray(parsed.tools)) {
      throw new Error("invalid snapshot shape");
    }
    return {
      servers: parsed.servers as McpToolServerOption[],
      tools: parsed.tools as McpToolEntity[],
    };
  } catch {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }
}

function writeSnapshot(snapshot: McpToolStoreSnapshot) {
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

function toListItem(item: McpToolEntity): McpToolListItem {
  return {
    ...item,
    tagList: splitTags(item.tags),
  };
}

function updateServerName(snapshot: McpToolStoreSnapshot, input: McpToolMutationInput) {
  const server = snapshot.servers.find((item) => item.id === input.serverId);
  return server?.label || input.serverId;
}

export async function listMcpToolMeta(): Promise<McpToolMetaResult> {
  const snapshot = readSnapshot();
  const categories = Array.from(new Set(snapshot.tools.map((item) => item.category).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );

  return wait({
    servers: snapshot.servers,
    categories,
  });
}

export async function listMcpTools(rawFilters: McpToolListFilters): Promise<McpToolListResult> {
  const snapshot = readSnapshot();
  const filters = mcpToolFilterSchema.parse(rawFilters);
  const keyword = filters.keyword.trim().toLowerCase();

  const filtered = snapshot.tools
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .filter((item) => {
      if (filters.env && item.env !== filters.env) return false;
      if (filters.status !== "ALL" && item.status !== filters.status) return false;
      if (filters.serverId && item.serverId !== filters.serverId) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (keyword) {
        const haystack = [item.displayName, item.originName, item.description].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    })
    .sort((left, right) => right.updateDate.localeCompare(left.updateDate));

  const items = filtered.map(toListItem);
  const start = (filters.page - 1) * filters.pageSize;
  const paged = items.slice(start, start + filters.pageSize);

  return wait({
    items: paged,
    total: items.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalTools: snapshot.tools.length,
      enabledTools: snapshot.tools.filter((item) => item.status === "ENABLED").length,
      disabledTools: snapshot.tools.filter((item) => item.status === "DISABLED").length,
      sourceRemovedTools: snapshot.tools.filter((item) => item.sourceDeletedFlag).length,
      grayReleaseTools: snapshot.tools.filter((item) => item.status === "GRAY_RELEASE").length,
    },
  });
}

export async function getMcpToolDetail(id: string) {
  const snapshot = readSnapshot();
  const item = snapshot.tools.find((tool) => tool.id === id && tool.createUserId === CURRENT_USER_ID) || null;
  return wait(item ? toListItem(item) : null);
}

export async function listSelectableMcpTools(): Promise<McpToolListItem[]> {
  const snapshot = readSnapshot();
  const items = snapshot.tools
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .filter((item) => item.status === "ENABLED" && !item.sourceDeletedFlag)
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "zh-CN"))
    .map(toListItem);
  return wait(items);
}

export async function upsertDiscoveredMcpTools(params: {
  serverId: string;
  serverName: string;
  env: McpToolEntity["env"];
  tools: Array<{
    originName: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}) {
  const snapshot = readSnapshot();
  const now = nowIso();
  const discoveredOriginNames = new Set(params.tools.map((item) => item.originName));

  let created = 0;
  let updated = 0;
  let removed = 0;
  const registeredByOriginName: Record<string, { toolId: string; existedBefore: boolean }> = {};

  params.tools.forEach((item) => {
    const existing = snapshot.tools.find((tool) => tool.serverId === params.serverId && tool.originName === item.originName);
    const schemaJson = JSON.stringify(item.inputSchema, null, 2);

    if (existing) {
      existing.serverName = params.serverName;
      existing.env = params.env;
      existing.description = item.description;
      existing.schemaJson = schemaJson;
      existing.sourceDeletedFlag = false;
      if (existing.status === "SOURCE_REMOVED") {
        existing.status = "REGISTERED";
      }
      existing.updateDate = now;
      updated += 1;
      registeredByOriginName[item.originName] = {
        toolId: existing.id,
        existedBefore: true,
      };
      return;
    }

    const createdTool: McpToolEntity = {
      id: crypto.randomUUID(),
      serverId: params.serverId,
      serverName: params.serverName,
      env: params.env,
      originName: item.originName,
      displayName: item.originName,
      description: item.description,
      category: "discovered",
      tags: "mcp, discovered",
      status: "REGISTERED",
      schemaJson,
      strategyJson: JSON.stringify({ timeoutMs: 30000, retry: 0 }, null, 2),
      visibilityJson: JSON.stringify({ apps: ["nquiz-web"], roles: ["developer"], scenes: ["agent", "mcp"] }, null, 2),
      sourceDeletedFlag: false,
      createDate: now,
      updateDate: now,
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    };
    snapshot.tools.unshift(createdTool);
    created += 1;
    registeredByOriginName[item.originName] = {
      toolId: createdTool.id,
      existedBefore: false,
    };
  });

  snapshot.tools
    .filter((tool) => tool.serverId === params.serverId)
    .filter((tool) => !discoveredOriginNames.has(tool.originName))
    .forEach((tool) => {
      if (!tool.sourceDeletedFlag) {
        tool.sourceDeletedFlag = true;
        tool.status = "SOURCE_REMOVED";
        tool.updateDate = now;
        removed += 1;
      }
    });

  writeSnapshot(snapshot);
  return wait({ created, updated, removed, registeredByOriginName });
}

export async function createMcpTool(input: McpToolMutationInput): Promise<McpToolEntity> {
  const snapshot = readSnapshot();
  const duplicated = snapshot.tools.some(
    (item) =>
      item.createUserId === CURRENT_USER_ID &&
      item.serverId === input.serverId &&
      item.env === input.env &&
      item.originName.toLowerCase() === input.originName.trim().toLowerCase(),
  );

  if (duplicated) {
    throw new Error(`该 Server + 环境下已存在 originName=${input.originName}`);
  }

  const timestamp = nowIso();
  const entity: McpToolEntity = {
    id: crypto.randomUUID(),
    serverId: input.serverId,
    serverName: updateServerName(snapshot, input),
    env: input.env,
    originName: input.originName.trim(),
    displayName: input.displayName.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    tags: input.tags.trim(),
    status: input.status,
    schemaJson: input.schemaJson,
    strategyJson: input.strategyJson,
    visibilityJson: input.visibilityJson,
    sourceDeletedFlag: input.sourceDeletedFlag,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  snapshot.tools.unshift(entity);
  writeSnapshot(snapshot);
  return wait(entity);
}

export async function updateMcpTool(id: string, input: McpToolMutationInput): Promise<McpToolEntity> {
  const snapshot = readSnapshot();
  const entity = snapshot.tools.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!entity) {
    throw new Error("目标工具不存在或无权编辑");
  }

  const duplicated = snapshot.tools.some(
    (item) =>
      item.id !== id &&
      item.createUserId === CURRENT_USER_ID &&
      item.serverId === input.serverId &&
      item.env === input.env &&
      item.originName.toLowerCase() === input.originName.trim().toLowerCase(),
  );

  if (duplicated) {
    throw new Error(`该 Server + 环境下已存在 originName=${input.originName}`);
  }

  entity.serverId = input.serverId;
  entity.serverName = updateServerName(snapshot, input);
  entity.env = input.env;
  entity.originName = input.originName.trim();
  entity.displayName = input.displayName.trim();
  entity.description = input.description.trim();
  entity.category = input.category.trim();
  entity.tags = input.tags.trim();
  entity.status = input.status;
  entity.schemaJson = input.schemaJson;
  entity.strategyJson = input.strategyJson;
  entity.visibilityJson = input.visibilityJson;
  entity.sourceDeletedFlag = input.sourceDeletedFlag;
  entity.updateDate = nowIso();

  writeSnapshot(snapshot);
  return wait(clone(entity));
}

export async function deleteMcpTool(id: string) {
  const snapshot = readSnapshot();
  const entity = snapshot.tools.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!entity) {
    throw new Error("目标工具不存在或无权删除");
  }

  snapshot.tools = snapshot.tools.filter((item) => item.id !== id);
  writeSnapshot(snapshot);
  return wait(undefined);
}
