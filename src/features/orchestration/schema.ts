import { z } from "zod";

function isJsonObject(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export const orchestrationWorkflowFilterSchema = z.object({
  keyword: z.string().max(100, "关键词最多 100 个字符").default(""),
  status: z.enum(["ALL", "DRAFT", "PENDING", "PUBLISHED", "DISABLED"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(4).max(12).default(6),
});

export const orchestrationWorkflowFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "请输入工作流编码")
    .max(48, "工作流编码不能超过 48 个字符")
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "编码必须以字母开头，只能包含字母、数字、下划线和中划线"),
  name: z.string().trim().min(1, "请输入工作流名称").max(120, "工作流名称不能超过 120 个字符"),
  description: z
    .string()
    .max(800, "描述不能超过 800 个字符")
    .transform((value) => value.trim())
    .default(""),
});

export const orchestrationVersionFormSchema = z.object({
  remark: z.string().trim().min(1, "请输入版本说明").max(120, "版本说明不能超过 120 个字符"),
});

export const orchestrationRunFormSchema = z.object({
  versionId: z.string().optional(),
  inputText: z.string().trim().min(1, "请输入运行输入").max(2000, "运行输入不能超过 2000 个字符"),
  variablesJson: z
    .string()
    .default("")
    .refine((value) => isJsonObject(value), "变量 JSON 必须是一个对象"),
});

export type OrchestrationWorkflowFilterInput = z.input<typeof orchestrationWorkflowFilterSchema>;
export type OrchestrationWorkflowFilterValues = z.output<typeof orchestrationWorkflowFilterSchema>;
export type OrchestrationWorkflowFormInput = z.input<typeof orchestrationWorkflowFormSchema>;
export type OrchestrationWorkflowFormValues = z.output<typeof orchestrationWorkflowFormSchema>;
export type OrchestrationVersionFormInput = z.input<typeof orchestrationVersionFormSchema>;
export type OrchestrationVersionFormValues = z.output<typeof orchestrationVersionFormSchema>;
export type OrchestrationRunFormInput = z.input<typeof orchestrationRunFormSchema>;
export type OrchestrationRunFormValues = z.output<typeof orchestrationRunFormSchema>;
