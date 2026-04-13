import { z } from "zod";

export const chatComposerSchema = z.object({
  message: z.string().trim().min(2, "至少输入 2 个字符").max(4000, "问题不能超过 4000 个字符"),
});

export type ChatComposerInput = z.input<typeof chatComposerSchema>;
export type ChatComposerValues = z.output<typeof chatComposerSchema>;
