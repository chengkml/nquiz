import { z } from "zod";

function isValidJson(value: string) {
  if (!value.trim()) {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export const agentFilterSchema = z.object({
  keyword: z.string().trim().max(100).catch(""),
  status: z.enum(["ALL", "DRAFT", "ENABLED", "DISABLED"]).catch("ALL"),
  category: z.string().catch(""),
  modelId: z.string().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(4).max(24).catch(6),
  selectedId: z.string().catch(""),
});

export const agentFormSchema = z
  .object({
    name: z.string().trim().min(1, "请输入 Agent 名称").max(128, "名称不能超过 128 个字符"),
    identifier: z
      .string()
      .trim()
      .min(1, "请输入唯一标识符")
      .max(128, "标识符不能超过 128 个字符")
      .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "标识符必须以字母开头，只能包含字母、数字、下划线和中划线"),
    description: z.string().trim().max(512, "描述不能超过 512 个字符").default(""),
    icon: z.string().trim().max(64, "图标不能超过 64 个字符").default("🤖"),
    category: z.string().trim().max(64, "分类不能超过 64 个字符").default(""),
    promptMode: z.enum(["direct", "template"], { message: "请选择 Prompt 模式" }),
    systemPrompt: z.string().default(""),
    promptTemplateId: z.string().default(""),
    modelId: z.string().trim().min(1, "请选择模型"),
    modelConfig: z.string().refine(isValidJson, "模型参数必须是合法 JSON"),
    status: z.enum(["DRAFT", "ENABLED", "DISABLED"], { message: "请选择状态" }),
    agentTags: z.string().trim().max(512, "标签不能超过 512 个字符").default(""),
    toolIds: z.array(z.string()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.promptMode === "direct" && !value.systemPrompt.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "直接 Prompt 模式下必须填写系统提示词",
        path: ["systemPrompt"],
      });
    }

    if (value.promptMode === "template" && !value.promptTemplateId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "模板模式下必须选择 Prompt 模板",
        path: ["promptTemplateId"],
      });
    }
  });

export type AgentFilterInput = z.input<typeof agentFilterSchema>;
export type AgentFilterValues = z.output<typeof agentFilterSchema>;
export type AgentFormInput = z.input<typeof agentFormSchema>;
export type AgentFormValues = z.output<typeof agentFormSchema>;
