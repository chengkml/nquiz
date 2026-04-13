import { z } from "zod";

function isValidJson(value: string) {
  if (!value.trim()) {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export const mcpToolFilterSchema = z.object({
  keyword: z.string().trim().max(100).catch(""),
  env: z.enum(["", "dev", "test", "stage", "prod"]).catch(""),
  status: z.enum(["ALL", "REGISTERED", "ENABLED", "DISABLED", "GRAY_RELEASE", "SOURCE_REMOVED"]).catch("ALL"),
  serverId: z.string().catch(""),
  category: z.string().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(4).max(24).catch(6),
  selectedId: z.string().catch(""),
});

export const mcpToolFormSchema = z.object({
  serverId: z.string().trim().min(1, "请选择所属 MCP Server").max(64, "Server ID 不能超过 64 个字符"),
  env: z.enum(["dev", "test", "stage", "prod"], { message: "请选择环境" }),
  originName: z.string().trim().min(1, "请输入原始名称").max(128, "原始名称不能超过 128 个字符"),
  displayName: z.string().trim().min(1, "请输入显示名称").max(256, "显示名称不能超过 256 个字符"),
  description: z.string().trim().max(512, "描述不能超过 512 个字符").default(""),
  category: z.string().trim().max(64, "分类不能超过 64 个字符").default(""),
  tags: z.string().trim().max(512, "标签不能超过 512 个字符").default(""),
  status: z.enum(["REGISTERED", "ENABLED", "DISABLED", "GRAY_RELEASE", "SOURCE_REMOVED"], { message: "请选择状态" }),
  schemaJson: z.string().refine(isValidJson, "Schema JSON 必须是合法 JSON"),
  strategyJson: z.string().refine(isValidJson, "策略 JSON 必须是合法 JSON"),
  visibilityJson: z.string().refine(isValidJson, "可见范围 JSON 必须是合法 JSON"),
  sourceDeletedFlag: z.boolean().default(false),
});

export type McpToolFilterInput = z.input<typeof mcpToolFilterSchema>;
export type McpToolFilterValues = z.output<typeof mcpToolFilterSchema>;
export type McpToolFormInput = z.input<typeof mcpToolFormSchema>;
export type McpToolFormValues = z.output<typeof mcpToolFormSchema>;
