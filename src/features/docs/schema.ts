import { z } from "zod";

export const docFilterSchema = z.object({
  keyword: z
    .string()
    .max(120, "关键词不能超过 120 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  type: z.enum(["ALL", "DOC", "IMAGE", "PDF", "OTHER"]).default("ALL"),
  status: z.enum(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(6).max(30).default(8),
});

export const docFormSchema = z.object({
  title: z.string().trim().min(1, "请输入文档名称").max(128, "文档名称不能超过 128 个字符"),
  type: z.enum(["DOC", "IMAGE", "PDF", "OTHER"], { message: "请选择文档类型" }),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"], { message: "请选择文档状态" }),
  description: z
    .string()
    .max(300, "描述不能超过 300 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  content: z
    .string()
    .max(10000, "正文内容不能超过 10000 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
});

export type DocFilterInput = z.input<typeof docFilterSchema>;
export type DocFilterValues = z.output<typeof docFilterSchema>;
export type DocFormInput = z.input<typeof docFormSchema>;
export type DocFormValues = z.output<typeof docFormSchema>;

