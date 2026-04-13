import { z } from "zod";

export const knowledgeSetFilterSchema = z.object({
  keyword: z
    .string()
    .max(100, "关键字不能超过 100 字")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  status: z.enum(["ALL", "ENABLED", "DISABLED"]).default("ALL"),
  visibility: z.enum(["ALL", "PRIVATE", "PUBLIC"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(30).default(8),
});

export const knowledgeSetFormSchema = z.object({
  name: z.string().trim().min(1, "请输入知识集名称").max(128, "知识集名称不能超过 128 个字符"),
  descr: z
    .string()
    .max(600, "描述不能超过 600 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  tags: z
    .string()
    .max(300, "标签长度不能超过 300")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  status: z.enum(["ENABLED", "DISABLED"]),
});

export const knowledgeSourceFilterSchema = z.object({
  keyword: z
    .string()
    .max(100, "关键字不能超过 100 字")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  status: z.enum(["ALL", "PENDING", "PARSING", "SUCCESS", "FAILED"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const knowledgeSourceFormSchema = z
  .object({
    name: z.string().trim().min(1, "请输入来源名称").max(128, "来源名称不能超过 128 字"),
    type: z.enum(["MARKDOWN", "FILE", "DB"]),
    descr: z
      .string()
      .max(400, "说明不能超过 400 字")
      .optional()
      .or(z.literal(""))
      .transform((value) => value?.trim() || ""),
    content: z
      .string()
      .max(8000, "内容不能超过 8000 字")
      .optional()
      .or(z.literal(""))
      .transform((value) => value?.trim() || ""),
    fileName: z
      .string()
      .max(180, "文件名不能超过 180 字")
      .optional()
      .or(z.literal(""))
      .transform((value) => value?.trim() || ""),
    dbHost: z
      .string()
      .max(128, "数据库主机不能超过 128 字")
      .optional()
      .or(z.literal(""))
      .transform((value) => value?.trim() || ""),
    dbName: z
      .string()
      .max(128, "数据库名称不能超过 128 字")
      .optional()
      .or(z.literal(""))
      .transform((value) => value?.trim() || ""),
  })
  .superRefine((value, ctx) => {
    if (value.type === "MARKDOWN" && !value.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Markdown 来源必须填写正文",
        path: ["content"],
      });
    }

    if (value.type === "FILE" && !value.fileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "文件来源至少需要文件名",
        path: ["fileName"],
      });
    }

    if (value.type === "DB") {
      if (!value.dbHost) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "请输入数据库主机",
          path: ["dbHost"],
        });
      }
      if (!value.dbName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "请输入数据库名称",
          path: ["dbName"],
        });
      }
    }
  });

export const knowledgeSearchSchema = z.object({
  mode: z.enum(["VECTOR", "TEXT"]),
  query: z.string().trim().min(2, "至少输入 2 个字符").max(300, "查询不能超过 300 字"),
  topK: z.coerce.number().int().min(1).max(10).default(5),
});

export const knowledgeChatQuestionSchema = z.object({
  question: z.string().trim().min(2, "至少输入 2 个字符").max(500, "问题不能超过 500 字"),
});

export type KnowledgeSetFilterInput = z.input<typeof knowledgeSetFilterSchema>;
export type KnowledgeSetFilterValues = z.output<typeof knowledgeSetFilterSchema>;

export type KnowledgeSetFormInput = z.input<typeof knowledgeSetFormSchema>;
export type KnowledgeSetFormValues = z.output<typeof knowledgeSetFormSchema>;

export type KnowledgeSourceFilterInput = z.input<typeof knowledgeSourceFilterSchema>;
export type KnowledgeSourceFilterValues = z.output<typeof knowledgeSourceFilterSchema>;

export type KnowledgeSourceFormInput = z.input<typeof knowledgeSourceFormSchema>;
export type KnowledgeSourceFormValues = z.output<typeof knowledgeSourceFormSchema>;

export type KnowledgeSearchValues = z.output<typeof knowledgeSearchSchema>;
export type KnowledgeChatQuestionValues = z.output<typeof knowledgeChatQuestionSchema>;
