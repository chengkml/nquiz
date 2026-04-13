import { z } from "zod";

export const notificationExceptionLogFilterSchema = z.object({
  keyword: z
    .string()
    .max(100, "关键字不能超过 100 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  channelType: z.enum(["ALL", "BROWSER", "EMAIL", "SMS", "WECHAT", "PUSH"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export type NotificationExceptionLogFilterInput = z.input<typeof notificationExceptionLogFilterSchema>;
export type NotificationExceptionLogFilterValues = z.output<typeof notificationExceptionLogFilterSchema>;
