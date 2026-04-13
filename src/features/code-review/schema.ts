import { z } from "zod";

export const codeReviewTaskFilterSchema = z.object({
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  projectName: z.string().max(80, "项目名最多 80 个字符").default(""),
  status: z.enum(["ALL", "OPEN", "IN_PROGRESS", "COMPLETED", "CLOSED"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(6).max(20).default(8),
});

export const codeReviewTaskFormSchema = z.object({
  title: z.string().trim().min(1, "请输入任务标题").max(160, "任务标题最多 160 个字符"),
  projectName: z.string().trim().min(1, "请输入项目名").max(80, "项目名最多 80 个字符"),
  gitUrl: z.string().trim().min(1, "请输入仓库地址").max(255, "仓库地址最多 255 个字符"),
  branch: z.string().trim().min(1, "请输入目标分支").max(80, "目标分支最多 80 个字符"),
  targetPage: z.string().trim().min(1, "请输入目标页面").max(160, "目标页面最多 160 个字符"),
  reviewStandard: z.string().trim().max(1000, "评审标准最多 1000 个字符").default(""),
  descr: z.string().trim().max(2000, "任务描述最多 2000 个字符").default(""),
});

export const codeReviewIssueFilterSchema = z.object({
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  status: z.enum(["ALL", "OPEN", "TRIAGED", "CONVERTED", "RESOLVED", "IGNORED"]).default("ALL"),
  severity: z.enum(["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(6).max(20).default(8),
});

const lineNoSchema = z
  .union([z.number().int().min(1, "行号必须大于 0"), z.nan(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return null;
    if (Number.isNaN(value)) return null;
    return value;
  });

export const codeReviewIssueFormSchema = z.object({
  title: z.string().trim().min(1, "请输入问题标题").max(160, "问题标题最多 160 个字符"),
  moduleName: z.string().trim().max(120, "模块名最多 120 个字符").default(""),
  filePath: z.string().trim().max(240, "文件路径最多 240 个字符").default(""),
  lineNo: lineNoSchema,
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["OPEN", "TRIAGED", "CONVERTED", "RESOLVED", "IGNORED"]),
  source: z.enum(["OPENCLAW", "MANUAL", "CI_BOT"]),
  issueDetail: z.string().trim().max(2000, "问题描述最多 2000 个字符").default(""),
  suggestion: z.string().trim().max(2000, "修复建议最多 2000 个字符").default(""),
});

export type CodeReviewTaskFilterInput = z.input<typeof codeReviewTaskFilterSchema>;
export type CodeReviewTaskFilterValues = z.output<typeof codeReviewTaskFilterSchema>;

export type CodeReviewTaskFormInput = z.input<typeof codeReviewTaskFormSchema>;
export type CodeReviewTaskFormValues = z.output<typeof codeReviewTaskFormSchema>;

export type CodeReviewIssueFilterInput = z.input<typeof codeReviewIssueFilterSchema>;
export type CodeReviewIssueFilterValues = z.output<typeof codeReviewIssueFilterSchema>;

export type CodeReviewIssueFormInput = z.input<typeof codeReviewIssueFormSchema>;
export type CodeReviewIssueFormValues = z.output<typeof codeReviewIssueFormSchema>;
