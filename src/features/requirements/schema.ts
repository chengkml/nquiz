import { z } from "zod";
import { requirementPriorityOptions, requirementStatusOptions } from "@/features/requirements/types";

export const requirementFilterSchema = z.object({
  title: z
    .string()
    .max(120, "需求标题关键词不能超过 120 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  projectName: z
    .string()
    .max(120, "项目名不能超过 120 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  status: z.enum(["ALL", ...requirementStatusOptions]).default("ALL"),
  priority: z.enum(["ALL", ...requirementPriorityOptions]).default("ALL"),
  pageNum: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const requirementFormSchema = z.object({
  title: z.string().trim().min(1, "请输入需求标题").max(200, "标题不能超过 200 个字符"),
  projectName: z.string().trim().min(1, "请输入项目名").max(120, "项目名不能超过 120 个字符"),
  gitUrl: z
    .string()
    .max(500, "Git 地址不能超过 500 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  branch: z
    .string()
    .max(128, "分支名不能超过 128 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || "main"),
  descr: z
    .string()
    .max(20000, "需求描述不能超过 20000 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
  status: z.enum(requirementStatusOptions, { message: "请选择状态" }),
  priority: z.enum(requirementPriorityOptions, { message: "请选择优先级" }),
  progressPercent: z.coerce.number().int().min(0).max(100),
  resultMsg: z
    .string()
    .max(500, "处理结果不能超过 500 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
});

export const requirementUpdateSchema = requirementFormSchema.extend({
  id: z.string().min(1, "缺少需求 ID"),
});

export const requirementAnalyzeSchema = z.object({
  descr: z.string().trim().min(1, "分析内容不能为空").max(20000, "分析内容不能超过 20000 个字符"),
  note: z
    .string()
    .max(500, "分析备注不能超过 500 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
});

export const requirementReviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"], { message: "请选择评审结论" }),
  comment: z
    .string()
    .max(500, "评审意见不能超过 500 个字符")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || ""),
});

export type RequirementFilterInput = z.input<typeof requirementFilterSchema>;
export type RequirementFilterValues = z.output<typeof requirementFilterSchema>;
export type RequirementFormInput = z.input<typeof requirementFormSchema>;
export type RequirementFormValues = z.output<typeof requirementFormSchema>;
export type RequirementUpdateInputSchema = z.output<typeof requirementUpdateSchema>;
export type RequirementAnalyzeInputSchema = z.output<typeof requirementAnalyzeSchema>;
export type RequirementReviewInputSchema = z.output<typeof requirementReviewSchema>;
