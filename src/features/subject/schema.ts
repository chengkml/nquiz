import { z } from "zod";

export const subjectFilterSchema = z.object({
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(6).max(24).default(6),
});

export const subjectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "请输入英文名称")
    .max(64, "英文名称不能超过 64 个字符")
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "英文名称必须以字母开头，只能包含字母、数字和下划线"),
  label: z.string().trim().min(1, "请输入中文名称").max(128, "中文名称不能超过 128 个字符"),
  descr: z
    .string()
    .max(512, "描述不能超过 512 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : "";
    }),
});

export type SubjectFilterInput = z.input<typeof subjectFilterSchema>;
export type SubjectFilterValues = z.output<typeof subjectFilterSchema>;
export type SubjectFormInput = z.input<typeof subjectFormSchema>;
export type SubjectFormValues = z.output<typeof subjectFormSchema>;
