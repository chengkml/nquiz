import { z } from "zod";

const channelSchema = z.enum(["BROWSER", "EMAIL", "SMS"]);
const sendScopeSchema = z.enum(["SPECIFIC_USERS", "ALL_USERS"]);
const messageTypeSchema = z.enum(["INFO", "WARNING", "ERROR", "SUCCESS"]);

export const notificationSendFormSchema = z
  .object({
    channel: channelSchema.default("BROWSER"),
    sendScope: sendScopeSchema.default("SPECIFIC_USERS"),
    userIds: z.array(z.string().min(1)).default([]),
    title: z
      .string()
      .min(1, "请输入通知标题")
      .max(120, "通知标题不能超过 120 字"),
    content: z
      .string()
      .min(1, "请输入通知内容")
      .max(2000, "通知内容不能超过 2000 字"),
    type: messageTypeSchema.default("INFO"),
    confirmSendAll: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (values.sendScope === "SPECIFIC_USERS" && values.userIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userIds"],
        message: "指定用户发送时至少选择 1 位接收人",
      });
    }

    if (values.sendScope === "ALL_USERS" && !values.confirmSendAll) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmSendAll"],
        message: "全员发送前请先确认风险提示",
      });
    }
  });

export const notificationSendRequestSchema = z
  .object({
    channel: channelSchema,
    sendScope: sendScopeSchema,
    userIds: z.array(z.string().min(1)).default([]),
    title: z
      .string()
      .trim()
      .min(1, "请输入通知标题")
      .max(120, "通知标题不能超过 120 字"),
    content: z
      .string()
      .trim()
      .min(1, "请输入通知内容")
      .max(2000, "通知内容不能超过 2000 字"),
    type: messageTypeSchema,
  })
  .superRefine((values, ctx) => {
    if (values.sendScope === "SPECIFIC_USERS" && values.userIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userIds"],
        message: "指定用户发送时至少选择 1 位接收人",
      });
    }
  });

export type NotificationSendFormInput = z.input<typeof notificationSendFormSchema>;
export type NotificationSendFormValues = z.output<typeof notificationSendFormSchema>;
export type NotificationSendRequestValues = z.output<typeof notificationSendRequestSchema>;
