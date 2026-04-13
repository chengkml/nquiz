import { z } from "zod";

export const hotSearchFilterSchema = z.object({
  source: z.enum(["", "TOUTIAO"]).catch(""),
  keyword: z.string().trim().max(100).catch(""),
  followedOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .catch(false),
  fromTime: z.string().catch(""),
  toTime: z.string().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(50).catch(10),
  selectedId: z.string().catch(""),
});

export const hotSearchTopicFormSchema = z.object({
  topicName: z.string().trim().min(1, "请输入主题名称").max(128, "主题名称最多 128 个字符"),
  keywords: z.string().trim().max(4000, "关键词最多 4000 个字符").optional().or(z.literal("")),
  enabled: z.boolean().default(true),
  seq: z.coerce.number().int("排序必须是整数").min(0, "排序不能小于 0").max(9999, "排序不能大于 9999"),
});

export type HotSearchFilterInput = z.input<typeof hotSearchFilterSchema>;
export type HotSearchFilterValues = z.output<typeof hotSearchFilterSchema>;
export type HotSearchTopicFormInput = z.input<typeof hotSearchTopicFormSchema>;
export type HotSearchTopicFormValues = z.output<typeof hotSearchTopicFormSchema>;
