import { z } from "zod";

export const funcDocListFilterSchema = z.object({
  keyword: z
    .string()
    .max(100, "关键字不能超过 100 字")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  status: z.enum(["ALL", "UPLOADED", "PARSING", "READY", "FAILED"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(30).default(8),
});

export const funcDocUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, "请先选择 docx 文档")
    .refine((value) => value.toLowerCase().endsWith(".docx"), "仅支持 .docx 文档"),
  remark: z.string().max(120, "备注不能超过 120 字").optional().or(z.literal("")),
});

export const funcDocProcessFilterSchema = z.object({
  keyword: z
    .string()
    .max(100, "关键字不能超过 100 字")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  headingId: z.string().optional().or(z.literal("")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const funcDocFeatureFilterSchema = z.object({
  keyword: z
    .string()
    .max(100, "关键字不能超过 100 字")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  level2Id: z.string().optional().or(z.literal("")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(30).default(8),
});

export type FuncDocListFilterInput = z.input<typeof funcDocListFilterSchema>;
export type FuncDocListFilterValues = z.output<typeof funcDocListFilterSchema>;

export type FuncDocUploadInput = z.input<typeof funcDocUploadSchema>;
export type FuncDocUploadValues = z.output<typeof funcDocUploadSchema>;

export type FuncDocProcessFilterInput = z.input<typeof funcDocProcessFilterSchema>;
export type FuncDocProcessFilterValues = z.output<typeof funcDocProcessFilterSchema>;

export type FuncDocFeatureFilterInput = z.input<typeof funcDocFeatureFilterSchema>;
export type FuncDocFeatureFilterValues = z.output<typeof funcDocFeatureFilterSchema>;
