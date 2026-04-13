import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const diaryFilterSchema = z
  .object({
    keyword: z.string().trim().max(100, "关键词不能超过 100 个字符").default(""),
    mood: z.enum(["", "HAPPY", "CALM", "SAD", "ANGRY", "TIRED", "EXCITED"]).default(""),
    archiveState: z.enum(["ALL", "ACTIVE", "ARCHIVED"]).default("ALL"),
    startDate: z.string().default(""),
    endDate: z.string().default(""),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(6),
    selectedId: z.string().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && !datePattern.test(value.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "开始日期格式不正确",
      });
    }

    if (value.endDate && !datePattern.test(value.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "结束日期格式不正确",
      });
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "结束日期不能早于开始日期",
      });
    }
  });

export const diaryFormSchema = z.object({
  title: z.string().trim().min(1, "请输入日记标题").max(120, "标题不能超过 120 个字符"),
  content: z.string().trim().min(1, "请输入日记正文").max(6000, "正文不能超过 6000 个字符"),
  diaryDate: z
    .string()
    .trim()
    .regex(datePattern, "日记日期格式应为 YYYY-MM-DD"),
  mood: z.enum(["HAPPY", "CALM", "SAD", "ANGRY", "TIRED", "EXCITED"]).default("CALM"),
  weather: z.string().trim().max(64, "天气描述不能超过 64 个字符").optional().default(""),
});

export type DiaryFilterInput = z.input<typeof diaryFilterSchema>;
export type DiaryFilterValues = z.output<typeof diaryFilterSchema>;
export type DiaryFormInput = z.input<typeof diaryFormSchema>;
export type DiaryFormValues = z.output<typeof diaryFormSchema>;
