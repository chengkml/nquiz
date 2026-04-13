import { z } from "zod";

const questionTypes = ["SINGLE", "MULTIPLE", "BLANK", "SHORT_ANSWER"] as const;
const difficultyLevels = ["EASY", "MEDIUM", "HARD"] as const;

export const wrongQuestionFilterSchema = z.object({
  subjectId: z.string().default(""),
  categoryId: z.string().default(""),
  type: z.enum(questionTypes).or(z.literal("")).default(""),
  difficulty: z.enum(difficultyLevels).or(z.literal("")).default(""),
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(20).default(10),
});

const optionalTextField = (max: number) =>
  z
    .string()
    .max(max, `最多 ${max} 个字符`)
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    });

export const wrongQuestionFormSchema = z.object({
  subjectId: z.string().min(1, "请选择学科"),
  categoryId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
  type: z.enum(questionTypes, { message: "请选择题型" }),
  difficulty: z
    .enum(difficultyLevels)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  content: z
    .string()
    .trim()
    .min(1, "请输入题目内容")
    .max(5000, "题目内容最多 5000 个字符"),
  answer: optionalTextField(2000),
  remark: optionalTextField(4000),
});

export type WrongQuestionFilterInput = z.input<typeof wrongQuestionFilterSchema>;
export type WrongQuestionFilterValues = z.output<typeof wrongQuestionFilterSchema>;
export type WrongQuestionFormInput = z.input<typeof wrongQuestionFormSchema>;
export type WrongQuestionFormValues = z.output<typeof wrongQuestionFormSchema>;
