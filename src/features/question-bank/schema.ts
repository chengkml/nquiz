import { z } from "zod";

const questionTypeEnum = z.enum(["SINGLE", "MULTIPLE", "BLANK", "SHORT_ANSWER"]);

export function parseTextList(value?: string) {
  if (!value?.trim()) {
    return [] as string[];
  }

  const items = value
    .split(/\r?\n|,|，|;|；/)
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(items));
}

export const questionFilterSchema = z.object({
  keyword: z.string().trim().max(100, "关键词不能超过 100 个字符").default(""),
  type: z.enum(["", "SINGLE", "MULTIPLE", "BLANK", "SHORT_ANSWER"]).default(""),
  subjectId: z.string().default(""),
  categoryId: z.string().default(""),
  knowledgeKeyword: z.string().trim().max(100, "知识点关键词不能超过 100 个字符").default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(8),
  selectedId: z.string().default(""),
});

export const questionFormSchema = z
  .object({
    type: questionTypeEnum,
    content: z.string().trim().min(1, "请输入题干").max(6000, "题干不能超过 6000 个字符"),
    subjectId: z.string().trim().min(1, "请选择学科"),
    categoryId: z.string().trim().min(1, "请选择分类"),
    knowledgePointsText: z.string().trim().max(1000, "知识点内容过长").default(""),
    optionsText: z.string().trim().max(4000, "选项内容过长").default(""),
    answersText: z.string().trim().max(2000, "答案内容过长").default(""),
    explanation: z.string().trim().max(3000, "解析不能超过 3000 个字符").default(""),
  })
  .superRefine((value, ctx) => {
    const options = parseTextList(value.optionsText);
    const answers = parseTextList(value.answersText);

    if (value.type === "SINGLE" || value.type === "MULTIPLE") {
      if (options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["optionsText"],
          message: "选择题至少需要 2 个选项",
        });
      }

      if (answers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answersText"],
          message: "请选择答案（填写与选项完全一致的文本）",
        });
      }

      if (value.type === "SINGLE" && answers.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answersText"],
          message: "单选题只能填写 1 个答案",
        });
      }

      if (answers.some((answer) => !options.includes(answer))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answersText"],
          message: "答案需与选项文本一致",
        });
      }
      return;
    }

    if (answers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answersText"],
        message: "请填写答案",
      });
    }
  });

export const questionGenerateSchema = z.object({
  subjectId: z.string().trim().min(1, "请选择学科"),
  categoryId: z.string().trim().min(1, "请选择分类"),
  knowledgeTitle: z.string().trim().min(1, "请输入知识点标题").max(120, "知识点标题不能超过 120 个字符"),
  knowledgeContent: z.string().trim().min(10, "知识点内容至少 10 个字符").max(6000, "知识点内容不能超过 6000 个字符"),
  questionCount: z.coerce.number().int().min(1, "最少生成 1 题").max(10, "最多生成 10 题").default(3),
  model: z.string().trim().min(1, "请输入模型名称").max(120, "模型名称不能超过 120 个字符").default("mock-qwen-plus"),
  types: z.array(questionTypeEnum).min(1, "至少选择一种题型"),
});

export type QuestionFilterInput = z.input<typeof questionFilterSchema>;
export type QuestionFilterValues = z.output<typeof questionFilterSchema>;

export type QuestionFormInput = z.input<typeof questionFormSchema>;
export type QuestionFormValues = z.output<typeof questionFormSchema>;

export type QuestionGenerateInput = z.input<typeof questionGenerateSchema>;
export type QuestionGenerateValues = z.output<typeof questionGenerateSchema>;
