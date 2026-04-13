import type { McpToolListItem } from "@/features/mcp-tool/types";

export type AgentStatus = "DRAFT" | "ENABLED" | "DISABLED";
export type AgentPromptMode = "direct" | "template";

export interface PromptTemplateOption {
  id: string;
  name: string;
  summary: string;
}

export interface LlmModelOption {
  id: string;
  name: string;
  provider: string;
  summary: string;
}

export interface AgentEntity {
  id: string;
  name: string;
  identifier: string;
  description: string;
  icon: string;
  category: string;
  systemPrompt: string;
  promptTemplateId: string;
  modelId: string;
  modelConfig: string;
  status: AgentStatus;
  tags: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface AgentToolRelationEntity {
  id: string;
  agentId: string;
  mcpToolId: string;
  priority: number;
  config: string;
}

export interface AgentToolBinding {
  id: string;
  mcpToolId: string;
  mcpToolName: string;
  mcpToolDescription: string;
  category: string;
  priority: number;
  config: string;
}

export interface AgentListItem extends AgentEntity {
  promptMode: AgentPromptMode;
  promptTemplateName?: string;
  modelName?: string;
  toolCount: number;
  tagList: string[];
}

export interface AgentDetail extends AgentListItem {
  tools: AgentToolBinding[];
  readinessWarnings: string[];
}

export interface AgentListFilters {
  keyword: string;
  status: "ALL" | AgentStatus;
  category: string;
  modelId: string;
  page: number;
  pageSize: number;
  selectedId: string;
}

export interface AgentListResult {
  items: AgentListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalAgents: number;
    enabledAgents: number;
    draftAgents: number;
    disabledAgents: number;
  };
}

export interface AgentMetaResult {
  promptTemplates: PromptTemplateOption[];
  models: LlmModelOption[];
  categories: string[];
}

export interface AgentMutationInput {
  name: string;
  identifier: string;
  description: string;
  icon: string;
  category: string;
  promptMode: AgentPromptMode;
  systemPrompt: string;
  promptTemplateId: string;
  modelId: string;
  modelConfig: string;
  status: AgentStatus;
  agentTags: string;
  toolIds: string[];
}

export interface AgentMetaReferences {
  promptTemplates: PromptTemplateOption[];
  models: LlmModelOption[];
  tools: McpToolListItem[];
}
