import { z } from "zod";

export const mcpServerFilterSchema = z.object({
  keyword: z.string().trim().max(100).catch(""),
  env: z.enum(["", "dev", "test", "stage", "prod"]).catch(""),
  status: z.enum(["ALL", "CREATED", "ACTIVE", "DEGRADED", "INACTIVE"]).catch("ALL"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(4).max(24).catch(6),
  selectedId: z.string().catch(""),
});

export const mcpServerFormSchema = z.object({
  name: z.string().trim().min(1, "请输入服务器名称").max(128, "名称不能超过 128 个字符"),
  identifier: z
    .string()
    .trim()
    .min(1, "请输入服务器标识")
    .max(128, "标识不能超过 128 个字符")
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "标识必须以字母开头，只能包含字母、数字、下划线和中划线"),
  env: z.enum(["dev", "test", "stage", "prod"], { message: "请选择环境" }),
  description: z.string().trim().max(512, "描述不能超过 512 个字符").default(""),
  address: z.string().trim().url("请输入合法的服务器地址"),
  authConfig: z.string().trim().max(4000, "认证配置不能超过 4000 个字符").default(""),
});

export type McpServerFilterInput = z.input<typeof mcpServerFilterSchema>;
export type McpServerFilterValues = z.output<typeof mcpServerFilterSchema>;
export type McpServerFormInput = z.input<typeof mcpServerFormSchema>;
export type McpServerFormValues = z.output<typeof mcpServerFormSchema>;
