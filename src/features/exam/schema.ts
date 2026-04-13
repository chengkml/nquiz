import { z } from "zod";

const paperStatusEnum = z.enum(["", "DRAFT", "PUBLISHED", "ARCHIVED"]);
const questionTypeEnum = z.enum(["", "SINGLE", "MULTIPLE", "BLANK", "SHORT_ANSWER"]);

export const examPaperFilterSchema = z.object({
  keyword: z.string().trim().max(120, "关键词最多 120 个字符").catch(""),
  subjectId: z.string().trim().max(64, "学科标识过长").catch(""),
  status: paperStatusEnum.catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(30).catch(8),
});

export const examPaperFormSchema = z.object({
  name: z.string().trim().min(1, "请输入试卷名称").max(128, "试卷名称最多 128 个字符"),
  descr: z.string().trim().max(1000, "试卷描述最多 1000 个字符").optional().or(z.literal("")),
  subjectId: z.string().trim().min(1, "请选择学科"),
  totalScore: z.coerce.number().min(1, "总分需大于 0").max(1000, "总分不能超过 1000"),
  durationMinutes: z.coerce.number().int().min(5, "时长至少 5 分钟").max(300, "时长不能超过 300 分钟"),
});

export const examQuickGenerateSchema = z.object({
  name: z.string().trim().min(1, "请输入试卷名称").max(128, "试卷名称最多 128 个字符"),
  subjectId: z.string().trim().min(1, "请选择学科"),
  questionCount: z.coerce.number().int().min(1, "题量至少 1").max(50, "题量不能超过 50"),
  totalScore: z.coerce.number().min(1, "总分需大于 0").max(1000, "总分不能超过 1000"),
  durationMinutes: z.coerce.number().int().min(5, "时长至少 5 分钟").max(300, "时长不能超过 300 分钟"),
  publishNow: z.boolean().default(true),
});

export const examQuestionBankFilterSchema = z.object({
  keyword: z.string().trim().max(120).catch(""),
  type: questionTypeEnum.catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(30).catch(8),
});

export const examResultFilterSchema = z.object({
  keyword: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(30).catch(8),
});

export type ExamPaperFilterInput = z.input<typeof examPaperFilterSchema>;
export type ExamPaperFilterValues = z.output<typeof examPaperFilterSchema>;

export type ExamPaperFormInput = z.input<typeof examPaperFormSchema>;
export type ExamPaperFormValues = z.output<typeof examPaperFormSchema>;

export type ExamQuickGenerateInput = z.input<typeof examQuickGenerateSchema>;
export type ExamQuickGenerateValues = z.output<typeof examQuickGenerateSchema>;

export type ExamQuestionBankFilterInput = z.input<typeof examQuestionBankFilterSchema>;
export type ExamQuestionBankFilterValues = z.output<typeof examQuestionBankFilterSchema>;

export type ExamResultFilterInput = z.input<typeof examResultFilterSchema>;
export type ExamResultFilterValues = z.output<typeof examResultFilterSchema>;
