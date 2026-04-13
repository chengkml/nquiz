import { mcpServerFilterSchema } from "@/features/mcp-server/schema";
import type {
  McpDiscoveredToolItem,
  McpServerDetail,
  McpServerEntity,
  McpServerListFilters,
  McpServerListItem,
  McpServerListResult,
  McpServerMutationInput,
} from "@/features/mcp-server/types";
import { upsertDiscoveredMcpTools } from "@/features/mcp-tool/mock-service";

const STORAGE_KEY = "nquiz.mcp-server-manager.v1";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";
const LATENCY_MS = 140;

interface McpServerSnapshot {
  servers: McpServerEntity[];
  discoveredToolsByServer: Record<string, McpDiscoveredToolItem[]>;
}

const seedSnapshot: McpServerSnapshot = {
  servers: [
    {
      id: "mcp-server-github",
      name: "GitHub Automation Server",
      identifier: "github-prod",
      env: "prod",
      description: "负责仓库自动化、PR 创建与代码交付动作。",
      address: "https://mcp.github.example.com",
      authConfig: "ghp_prod_demo_token_xxx",
      status: "ACTIVE",
      lastHeartbeatAt: "2026-04-11T16:20:00+08:00",
      lastDiscoveryAt: "2026-04-11T16:25:00+08:00",
      lastDiscoverySummary: "新增 1 个工具，更新 0 个工具，失效 0 个工具",
      createDate: "2026-04-08T10:00:00+08:00",
      updateDate: "2026-04-11T16:25:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "mcp-server-knowledge",
      name: "Knowledge Retrieval Server",
      identifier: "knowledge-stage",
      env: "stage",
      description: "负责知识检索、分片召回与文档上下文注入。",
      address: "https://mcp.knowledge.example.com",
      authConfig: "",
      status: "DEGRADED",
      lastHeartbeatAt: "2026-04-11T15:40:00+08:00",
      lastErrorSummary: "未配置 Bearer Token，健康检查降级通过。",
      createDate: "2026-04-09T13:00:00+08:00",
      updateDate: "2026-04-11T15:40:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "mcp-server-office",
      name: "Office Ops Server",
      identifier: "office-test",
      env: "test",
      description: "历史接入的办公自动化服务，当前保留台账但默认不可用。",
      address: "https://offline.office.example.invalid",
      authConfig: "office_demo_token_xxx",
      status: "INACTIVE",
      lastErrorSummary: "最近一次连接失败：DNS 无法解析。",
      createDate: "2026-04-06T09:00:00+08:00",
      updateDate: "2026-04-10T12:10:00+08:00",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
  ],
  discoveredToolsByServer: {
    "mcp-server-github": [
      {
        name: "create_pull_request",
        description: "创建 Pull Request",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string" },
            branch: { type: "string" },
            title: { type: "string" },
          },
        },
        schemaDigest: "repo, branch, title",
        registered: true,
        registeredToolId: "mcp-tool-001",
        syncAction: "unchanged",
      },
    ],
  },
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

function readSnapshot(): McpServerSnapshot {
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
    const parsed = JSON.parse(raw) as Partial<McpServerSnapshot>;
    if (!Array.isArray(parsed.servers) || typeof parsed.discoveredToolsByServer !== "object" || !parsed.discoveredToolsByServer) {
      throw new Error("invalid snapshot shape");
    }
    return {
      servers: parsed.servers as McpServerEntity[],
      discoveredToolsByServer: parsed.discoveredToolsByServer as Record<string, McpDiscoveredToolItem[]>,
    };
  } catch {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }
}

function writeSnapshot(snapshot: McpServerSnapshot) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function nowIso() {
  return new Date().toISOString();
}

function maskAuthConfig(value: string) {
  if (!value.trim()) return "未配置";
  if (value.length <= 8) return "已配置";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function toListItem(server: McpServerEntity): McpServerListItem {
  return {
    ...server,
    hasAuthConfig: Boolean(server.authConfig.trim()),
    maskedAuthConfig: maskAuthConfig(server.authConfig),
  };
}

function buildDiscoveredSeed(server: McpServerEntity): McpDiscoveredToolItem[] {
  if (server.identifier.includes("github")) {
    return [
      {
        name: "create_pull_request",
        description: "创建 Pull Request",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string" },
            branch: { type: "string" },
            title: { type: "string" },
          },
        },
        schemaDigest: "repo, branch, title",
        registered: false,
        syncAction: "new",
      },
      {
        name: "comment_pull_request",
        description: "对 PR 发表评论",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string" },
            prNumber: { type: "number" },
            body: { type: "string" },
          },
        },
        schemaDigest: "repo, prNumber, body",
        registered: false,
        syncAction: "new",
      },
    ];
  }

  if (server.identifier.includes("knowledge")) {
    return [
      {
        name: "search_knowledge_chunks",
        description: "检索知识分片",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            topK: { type: "number" },
          },
        },
        schemaDigest: "query, topK",
        registered: false,
        syncAction: "new",
      },
    ];
  }

  return [
    {
      name: "sync_notion_task",
      description: "同步 Notion 任务",
      inputSchema: {
        type: "object",
        properties: {
          pageId: { type: "string" },
          content: { type: "string" },
        },
      },
      schemaDigest: "pageId, content",
      registered: false,
      syncAction: "new",
    },
  ];
}

function evaluateHealth(server: McpServerEntity) {
  if (server.address.includes(".invalid")) {
    return {
      status: "INACTIVE" as const,
      error: "DNS 无法解析或服务端未响应。",
    };
  }

  if (!server.authConfig.trim()) {
    return {
      status: "DEGRADED" as const,
      error: "未配置 Bearer Token，健康检查降级通过。",
    };
  }

  return {
    status: "ACTIVE" as const,
    error: "",
  };
}

export async function listMcpServers(rawFilters: McpServerListFilters): Promise<McpServerListResult> {
  const snapshot = readSnapshot();
  const filters = mcpServerFilterSchema.parse(rawFilters);
  const keyword = filters.keyword.trim().toLowerCase();

  const filtered = snapshot.servers
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .filter((item) => {
      if (filters.env && item.env !== filters.env) return false;
      if (filters.status !== "ALL" && item.status !== filters.status) return false;
      if (keyword) {
        const haystack = [item.name, item.identifier, item.address].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    })
    .sort((left, right) => right.createDate.localeCompare(left.createDate));

  const items = filtered.map(toListItem);
  const start = (filters.page - 1) * filters.pageSize;
  const paged = items.slice(start, start + filters.pageSize);

  return wait({
    items: paged,
    total: items.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalServers: snapshot.servers.length,
      activeServers: snapshot.servers.filter((item) => item.status === "ACTIVE").length,
      degradedServers: snapshot.servers.filter((item) => item.status === "DEGRADED").length,
      inactiveServers: snapshot.servers.filter((item) => item.status === "INACTIVE").length,
    },
  });
}

export async function getMcpServerDetail(id: string): Promise<McpServerDetail | null> {
  const snapshot = readSnapshot();
  const server = snapshot.servers.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID) || null;
  if (!server) {
    return wait(null);
  }

  return wait({
    ...toListItem(server),
    authConfig: server.authConfig,
    discoveredTools: snapshot.discoveredToolsByServer[id] ?? [],
  });
}

export async function createMcpServer(input: McpServerMutationInput): Promise<McpServerEntity> {
  const snapshot = readSnapshot();
  const duplicated = snapshot.servers.some((item) => item.createUserId === CURRENT_USER_ID && item.identifier.toLowerCase() === input.identifier.trim().toLowerCase());
  if (duplicated) {
    throw new Error(`服务器标识已存在：${input.identifier}`);
  }

  const timestamp = nowIso();
  const entity: McpServerEntity = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    identifier: input.identifier.trim(),
    env: input.env,
    description: input.description.trim(),
    address: input.address.trim(),
    authConfig: input.authConfig.trim(),
    status: "CREATED",
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  snapshot.servers.unshift(entity);
  writeSnapshot(snapshot);
  return wait(entity);
}

export async function updateMcpServer(id: string, input: McpServerMutationInput): Promise<McpServerEntity> {
  const snapshot = readSnapshot();
  const server = snapshot.servers.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!server) {
    throw new Error("目标服务器不存在或无权编辑");
  }

  const duplicated = snapshot.servers.some(
    (item) => item.id !== id && item.createUserId === CURRENT_USER_ID && item.identifier.toLowerCase() === input.identifier.trim().toLowerCase(),
  );
  if (duplicated) {
    throw new Error(`服务器标识已存在：${input.identifier}`);
  }

  server.name = input.name.trim();
  server.identifier = input.identifier.trim();
  server.env = input.env;
  server.description = input.description.trim();
  server.address = input.address.trim();
  server.authConfig = input.authConfig.trim();
  server.updateDate = nowIso();
  writeSnapshot(snapshot);
  return wait(clone(server));
}

export async function deleteMcpServer(id: string) {
  const snapshot = readSnapshot();
  const server = snapshot.servers.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!server) {
    throw new Error("目标服务器不存在或无权删除");
  }

  snapshot.servers = snapshot.servers.filter((item) => item.id !== id);
  delete snapshot.discoveredToolsByServer[id];
  writeSnapshot(snapshot);
  return wait(undefined);
}

export async function healthCheckMcpServer(id: string): Promise<McpServerEntity> {
  const snapshot = readSnapshot();
  const server = snapshot.servers.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!server) {
    throw new Error("目标服务器不存在或无权检查");
  }

  const result = evaluateHealth(server);
  server.status = result.status;
  server.lastHeartbeatAt = nowIso();
  server.lastErrorSummary = result.error || "";
  server.updateDate = nowIso();
  writeSnapshot(snapshot);
  return wait(clone(server));
}

export async function discoverServerTools(id: string): Promise<McpServerDetail> {
  const snapshot = readSnapshot();
  const server = snapshot.servers.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!server) {
    throw new Error("目标服务器不存在或无权发现工具");
  }

  const health = evaluateHealth(server);
  if (health.status === "INACTIVE") {
    server.status = "INACTIVE";
    server.lastErrorSummary = health.error;
    server.updateDate = nowIso();
    writeSnapshot(snapshot);
    throw new Error(`工具发现失败：${health.error}`);
  }

  const seed = buildDiscoveredSeed(server);
  const syncSummary = await upsertDiscoveredMcpTools({
    serverId: server.id,
    serverName: server.name,
    env: server.env,
    tools: seed.map((item) => ({
      originName: item.name,
      description: item.description,
      inputSchema: item.inputSchema,
    })),
  });

  const hydratedTools: McpDiscoveredToolItem[] = [];
  for (const item of seed) {
    const matched = syncSummary.registeredByOriginName[item.name];
    hydratedTools.push({
      ...item,
      registered: Boolean(matched),
      registeredToolId: matched?.toolId,
      syncAction: matched ? (matched.existedBefore ? "updated" : "new") : "unchanged",
    });
  }

  server.status = health.status === "DEGRADED" ? "DEGRADED" : "ACTIVE";
  server.lastHeartbeatAt = nowIso();
  server.lastDiscoveryAt = nowIso();
  server.lastDiscoverySummary = `新增 ${syncSummary.created} 个工具，更新 ${syncSummary.updated} 个工具，失效 ${syncSummary.removed} 个工具`;
  server.lastErrorSummary = health.error || "";
  server.updateDate = nowIso();
  snapshot.discoveredToolsByServer[id] = hydratedTools;
  writeSnapshot(snapshot);

  return wait({
    ...toListItem(server),
    authConfig: server.authConfig,
    discoveredTools: hydratedTools,
    discoverySummary: syncSummary,
  });
}
