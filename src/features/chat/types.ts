export const ALL_CHAT_SCOPE_VALUE = "__all_accessible__";

export type ChatRole = "user" | "assistant";
export type ChatScopeType = "ALL_ACCESSIBLE" | "KNOWLEDGE_SET";

export interface ChatModelOption {
  id: string;
  name: string;
  provider: string;
  type: "TEXT";
  isDefault: boolean;
  description: string;
}

export interface ChatScopeOption {
  value: string;
  label: string;
  type: ChatScopeType;
  knowledgeSetId: string | null;
  description: string;
}

export interface ChatReference {
  knowledgeSetId: string;
  knowledgeSetName: string;
  knowledgeSourceId: string;
  knowledgeSourceName: string;
  chunkIndex: number;
  distance: number;
  quote: string;
}

export interface ChatMessageEntity {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  references: ChatReference[];
}

export interface ChatSessionEntity {
  id: string;
  title: string;
  modelName: string;
  knowledgeScopeType: ChatScopeType;
  knowledgeSetId: string | null;
  knowledgeScopeLabel: string;
  createUserId: string;
  createDate: string;
  updateDate: string;
}

export interface ChatSessionListItem extends ChatSessionEntity {
  messageCount: number;
  lastMessagePreview: string;
}

export interface CreateDraftChatTurnInput {
  sessionId?: string | null;
  message: string;
  modelName: string;
  scopeValue: string;
}

export interface DraftChatTurn {
  session: ChatSessionEntity;
  userMessage: ChatMessageEntity;
  assistantMessage: ChatMessageEntity;
}
