import {
  Bot,
  BookOpenText,
  PlayCircle,
  Sparkles,
  SquareTerminal,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OrchestrationNodeConfig, OrchestrationNodeType, OrchestrationWorkflowStatus } from "@/features/orchestration/types";

export const orchestrationStatusMeta: Record<
  OrchestrationWorkflowStatus,
  { label: string; className: string; description: string }
> = {
  DRAFT: {
    label: "草稿",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
    description: "已创建但还没有形成可发布版本。",
  },
  PENDING: {
    label: "待发布",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    description: "已有新版本，但尚未发布到当前线上版本。",
  },
  PUBLISHED: {
    label: "已发布",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    description: "存在当前线上版本，可以直接手动运行。",
  },
  DISABLED: {
    label: "已停用",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    description: "保留历史版本与运行记录，但当前默认不继续投产。",
  },
};

export interface OrchestrationNodeCatalogItem {
  type: OrchestrationNodeType;
  label: string;
  description: string;
  accentClassName: string;
  icon: LucideIcon;
  defaults: OrchestrationNodeConfig;
}

export const orchestrationNodeCatalog: Record<OrchestrationNodeType, OrchestrationNodeCatalogItem> = {
  start: {
    type: "start",
    label: "开始",
    description: "定义运行输入与上下文入口。",
    accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: PlayCircle,
    defaults: {
      inputSchema: "userMessage:string",
    },
  },
  knowledge: {
    type: "knowledge",
    label: "知识检索",
    description: "从知识库中提取上下文片段。",
    accentClassName: "border-sky-200 bg-sky-50 text-sky-700",
    icon: BookOpenText,
    defaults: {
      knowledgeBase: "个人知识集",
      retrievalQuery: "{{inputText}}",
      topK: "3",
      outputKey: "knowledgeContext",
    },
  },
  llm: {
    type: "llm",
    label: "大模型",
    description: "使用提示词对上下文做推理或生成。",
    accentClassName: "border-violet-200 bg-violet-50 text-violet-700",
    icon: Bot,
    defaults: {
      modelName: "gpt-5.4-mini",
      prompt: "请根据输入 {{inputText}} 生成回复",
      outputKey: "modelOutput",
    },
  },
  skill: {
    type: "skill",
    label: "技能",
    description: "调用外部技能或工具动作。",
    accentClassName: "border-amber-200 bg-amber-50 text-amber-700",
    icon: SquareTerminal,
    defaults: {
      skillName: "custom-skill",
      action: "run",
      payloadTemplate: "{\"input\":\"{{inputText}}\"}",
      outputKey: "skillResult",
    },
  },
  end: {
    type: "end",
    label: "结束",
    description: "汇总前序节点产物并输出结果。",
    accentClassName: "border-rose-200 bg-rose-50 text-rose-700",
    icon: Sparkles,
    defaults: {
      responseTemplate: "{{modelOutput}}",
    },
  },
};

export const orchestrationNodeGroups = [
  {
    key: "control",
    title: "流程骨架",
    icon: Workflow,
    items: [orchestrationNodeCatalog.start, orchestrationNodeCatalog.end],
  },
  {
    key: "ai",
    title: "AI 节点",
    icon: Sparkles,
    items: [orchestrationNodeCatalog.knowledge, orchestrationNodeCatalog.llm, orchestrationNodeCatalog.skill],
  },
];
