import { z } from "zod";

export const roleStateOptions = ["ENABLED", "DISABLED"] as const;

export const roleFilterSchema = z.object({
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  state: z.enum(["ALL", ...roleStateOptions]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(20).default(10),
});

export const roleFormSchema = z.object({
  roleCode: z
    .string()
    .trim()
    .min(1, "请输入角色编码")
    .max(48, "角色编码不能超过 48 个字符")
    .regex(/^[a-z][a-z0-9:_-]*$/, "角色编码需以小写字母开头，仅支持小写字母、数字、冒号、下划线和中划线"),
  roleName: z.string().trim().min(1, "请输入角色名称").max(64, "角色名称不能超过 64 个字符"),
  roleDescr: z
    .string()
    .max(240, "角色描述不能超过 240 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
  state: z.enum(roleStateOptions, { message: "请选择角色状态" }),
});

export type RoleFilterInput = z.input<typeof roleFilterSchema>;
export type RoleFilterValues = z.output<typeof roleFilterSchema>;
export type RoleFormInput = z.input<typeof roleFormSchema>;
export type RoleFormValues = z.output<typeof roleFormSchema>;
