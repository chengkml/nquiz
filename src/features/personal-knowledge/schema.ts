import { z } from "zod";

export const knowledgeSetFormSchema = z.object({
  name: z.string().trim().min(1, "请输入知识集名称").max(128, "知识集名称不能超过 128 个字符"),
  descr: z
    .string()
    .max(600, "描述不能超过 600 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  status: z.enum(["ENABLED", "DISABLED"]),
});

export const knowledgeSourceFormSchema = z
  .object({
    name: z.string().trim().min(1, "请输入来源名称").max(128, "来源名称不能超过 128 个字符"),
    type: z.enum(["MARKDOWN", "FILE"]),
    descr: z
      .string()
      .max(400, "说明不能超过 400 个字符")
      .optional()
      .or(z.literal(""))
      .transform((value) => value?.trim() || ""),
    content: z
      .string()
      .max(6000, "内容不能超过 6000 个字符")
      .optional()
      .or(z.literal(""))
      .transform((value) => value?.trim() || ""),
    fileName: z
      .string()
      .max(128, "文件名称不能超过 128 个字符")
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
        message: "文件来源至少需要文件名称",
        path: ["fileName"],
      });
    }
  });

export const knowledgeQuestionSchema = z.object({
  question: z.string().trim().min(2, "至少输入 2 个字符").max(500, "问题不能超过 500 个字符"),
});

export type KnowledgeSetFormInput = z.input<typeof knowledgeSetFormSchema>;
export type KnowledgeSetFormValues = z.output<typeof knowledgeSetFormSchema>;
export type KnowledgeSourceFormInput = z.input<typeof knowledgeSourceFormSchema>;
export type KnowledgeSourceFormValues = z.output<typeof knowledgeSourceFormSchema>;
export type KnowledgeQuestionValues = z.output<typeof knowledgeQuestionSchema>;
