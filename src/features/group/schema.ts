import { z } from "zod";

export const groupFilterSchema = z.object({
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  type: z.string().max(64, "类型最多 64 个字符").default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(6).max(24).default(6),
});

export const groupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "请输入分组编码")
    .max(64, "分组编码不能超过 64 个字符")
    .regex(/^[a-z][a-z0-9_-]*$/, "分组编码需以小写字母开头，仅支持小写字母、数字、下划线和中划线"),
  label: z.string().trim().min(1, "请输入分组名称").max(128, "分组名称不能超过 128 个字符"),
  type: z
    .string()
    .trim()
    .max(64, "类型不能超过 64 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() ?? ""),
  descr: z
    .string()
    .max(512, "描述不能超过 512 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() ?? ""),
});

export type GroupFilterInput = z.input<typeof groupFilterSchema>;
export type GroupFilterValues = z.output<typeof groupFilterSchema>;
export type GroupFormInput = z.input<typeof groupFormSchema>;
export type GroupFormValues = z.output<typeof groupFormSchema>;
