export const MCP_TOOL_ENV_OPTIONS = [
  { value: "", label: "全部环境" },
  { value: "dev", label: "开发" },
  { value: "test", label: "测试" },
  { value: "stage", label: "预发" },
  { value: "prod", label: "生产" },
] as const;

export const MCP_TOOL_STATUS_OPTIONS = [
  { value: "ALL", label: "全部状态" },
  { value: "REGISTERED", label: "已接入" },
  { value: "ENABLED", label: "启用" },
  { value: "DISABLED", label: "禁用" },
  { value: "GRAY_RELEASE", label: "灰度" },
  { value: "SOURCE_REMOVED", label: "来源已删除" },
] as const;

export type McpToolEnv = Exclude<(typeof MCP_TOOL_ENV_OPTIONS)[number]["value"], "">;
export type McpToolStatus = Exclude<(typeof MCP_TOOL_STATUS_OPTIONS)[number]["value"], "ALL">;

export interface McpToolServerOption {
  id: string;
  label: string;
  envs: McpToolEnv[];
}

export interface McpToolEntity {
  id: string;
  serverId: string;
  serverName: string;
  env: McpToolEnv;
  originName: string;
  displayName: string;
  description: string;
  category: string;
  tags: string;
  status: McpToolStatus;
  schemaJson: string;
  strategyJson: string;
  visibilityJson: string;
  sourceDeletedFlag: boolean;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface McpToolListItem extends McpToolEntity {
  tagList: string[];
}

export interface McpToolListFilters {
  keyword: string;
  env: "" | McpToolEnv;
  status: "ALL" | McpToolStatus;
  serverId: string;
  category: string;
  page: number;
  pageSize: number;
  selectedId: string;
}

export interface McpToolListResult {
  items: McpToolListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    sourceRemovedTools: number;
    grayReleaseTools: number;
  };
}

export interface McpToolMetaResult {
  servers: McpToolServerOption[];
  categories: string[];
}

export interface McpToolMutationInput {
  serverId: string;
  env: McpToolEnv;
  originName: string;
  displayName: string;
  description: string;
  category: string;
  tags: string;
  status: McpToolStatus;
  schemaJson: string;
  strategyJson: string;
  visibilityJson: string;
  sourceDeletedFlag: boolean;
}
