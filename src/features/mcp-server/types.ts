export type McpServerStatus = "CREATED" | "ACTIVE" | "DEGRADED" | "INACTIVE";
export type McpServerEnv = "dev" | "test" | "stage" | "prod";

export const MCP_SERVER_ENV_OPTIONS = [
  { value: "", label: "全部环境" },
  { value: "dev", label: "开发" },
  { value: "test", label: "测试" },
  { value: "stage", label: "预发" },
  { value: "prod", label: "生产" },
] as const;

export const MCP_SERVER_STATUS_OPTIONS = [
  { value: "ALL", label: "全部状态" },
  { value: "CREATED", label: "已创建" },
  { value: "ACTIVE", label: "可用" },
  { value: "DEGRADED", label: "降级" },
  { value: "INACTIVE", label: "禁用" },
] as const;

export interface McpServerEntity {
  id: string;
  name: string;
  identifier: string;
  env: McpServerEnv;
  description: string;
  address: string;
  authConfig: string;
  status: McpServerStatus;
  lastHeartbeatAt?: string;
  lastDiscoveryAt?: string;
  lastDiscoverySummary?: string;
  lastErrorSummary?: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface McpServerListItem extends Omit<McpServerEntity, "authConfig"> {
  hasAuthConfig: boolean;
  maskedAuthConfig: string;
}

export interface McpDiscoveredToolItem {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  schemaDigest: string;
  registered: boolean;
  registeredToolId?: string;
  syncAction: "new" | "updated" | "removed" | "unchanged";
}

export interface McpServerDetail extends McpServerListItem {
  authConfig: string;
  discoveredTools: McpDiscoveredToolItem[];
  discoverySummary?: {
    created: number;
    updated: number;
    removed: number;
  };
}

export interface McpServerListFilters {
  keyword: string;
  env: "" | McpServerEnv;
  status: "ALL" | McpServerStatus;
  page: number;
  pageSize: number;
  selectedId: string;
}

export interface McpServerListResult {
  items: McpServerListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalServers: number;
    activeServers: number;
    degradedServers: number;
    inactiveServers: number;
  };
}

export interface McpServerMutationInput {
  name: string;
  identifier: string;
  env: McpServerEnv;
  description: string;
  address: string;
  authConfig: string;
}
