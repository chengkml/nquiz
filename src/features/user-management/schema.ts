import { z } from "zod";

const phoneRegex = /^[0-9+\-()\s]{6,20}$/;

const optionalTrimmedText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label}最多 ${max} 个字符`)
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    });

export const userManagementFilterSchema = z.object({
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  status: z.enum(["ALL", "ENABLED", "DISABLED"]).default("ALL"),
  roleId: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(20).default(10),
});

export const createUserSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, "请输入用户 ID")
    .max(32, "用户 ID 最多 32 个字符")
    .regex(/^[a-zA-Z0-9_-]+$/, "用户 ID 只能包含字母、数字、下划线和中划线"),
  userName: z.string().trim().min(1, "请输入用户姓名").max(128, "用户姓名最多 128 个字符"),
  password: z.string().min(6, "密码至少 6 位").max(20, "密码最多 20 位"),
  email: z
    .string()
    .email("请输入正确的邮箱格式")
    .max(64, "邮箱最多 64 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
  phone: optionalTrimmedText(20, "手机号").refine((value) => !value || phoneRegex.test(value), {
    message: "请输入正确的手机号格式",
  }),
  logo: optionalTrimmedText(256, "头像 URL").refine((value) => !value || /^https?:\/\//.test(value), {
    message: "头像 URL 需以 http:// 或 https:// 开头",
  }),
});

export const updateUserSchema = z.object({
  userId: z.string(),
  userName: z.string().trim().min(1, "请输入用户姓名").max(128, "用户姓名最多 128 个字符"),
  email: z
    .string()
    .email("请输入正确的邮箱格式")
    .max(64, "邮箱最多 64 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
  phone: optionalTrimmedText(20, "手机号").refine((value) => !value || phoneRegex.test(value), {
    message: "请输入正确的手机号格式",
  }),
  logo: optionalTrimmedText(256, "头像 URL").refine((value) => !value || /^https?:\/\//.test(value), {
    message: "头像 URL 需以 http:// 或 https:// 开头",
  }),
});

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(6, "密码至少 6 位").max(20, "密码最多 20 位"),
});

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).min(1, "请至少选择一个角色"),
});

export type UserManagementFilterInput = z.input<typeof userManagementFilterSchema>;
export type UserManagementFilterValues = z.output<typeof userManagementFilterSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserValues = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type UpdateUserValues = z.output<typeof updateUserSchema>;
export type ResetUserPasswordValues = z.output<typeof resetUserPasswordSchema>;
export type AssignRolesValues = z.output<typeof assignRolesSchema>;
