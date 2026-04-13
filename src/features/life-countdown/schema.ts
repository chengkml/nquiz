import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const lifeCountdownSaveSchema = z.object({
  deathDate: z
    .string()
    .trim()
    .regex(datePattern, "请选择合法的死亡日期"),
});

export const lifeCountdownGenerateSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
  modelName: z.string().trim().max(100, "模型名称不能超过 100 个字符").optional(),
});

export type LifeCountdownSaveValues = z.infer<typeof lifeCountdownSaveSchema>;
export type LifeCountdownGenerateValues = z.infer<typeof lifeCountdownGenerateSchema>;
