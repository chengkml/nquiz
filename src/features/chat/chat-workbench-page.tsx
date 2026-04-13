"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  LoaderCircle,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { ChatMarkdown } from "@/features/chat/chat-markdown";
import { chatComposerSchema, type ChatComposerInput, type ChatComposerValues } from "@/features/chat/schema";
import {
  commitChatTurn,
  createDraftChatTurn,
  deleteChatSession,
  getChatMessages,
  listChatModels,
  listChatScopeOptions,
  listChatSessions,
  setChatSessionModel,
} from "@/features/chat/mock-service";
import { useChatStream } from "@/features/chat/use-chat-stream";
import {
  ALL_CHAT_SCOPE_VALUE,
  type ChatMessageEntity,
  type ChatReference,
  type ChatSessionListItem,
  type DraftChatTurn,
} from "@/features/chat/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

type FeedbackState = { type: "success" | "error"; message: string } | null;

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function feedbackClassName(feedback: FeedbackState) {
  if (!feedback || feedback.type === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) return null;

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", feedbackClassName(feedback))}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{feedback.message}</div>
      <button type="button" className="cursor-pointer text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function ScopeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
      <BookOpen className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function ChatReferenceList({ references }: { references: ChatReference[] }) {
  if (references.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">参考来源</p>
      <div className="flex flex-wrap gap-2">
        {references.map((reference) => (
          <div
            key={`${reference.knowledgeSourceId}-${reference.chunkIndex}`}
            className="max-w-full rounded-2xl border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/75 dark:border-white/10 dark:bg-white/5 dark:text-white/75"
          >
            <p className="font-medium">
              {reference.knowledgeSetName} / {reference.knowledgeSourceName}
            </p>
            <p className="mt-1 break-all text-[11px] opacity-80">
              片段 #{reference.chunkIndex} · Dist {reference.distance.toFixed(4)}
            </p>
            <p className="mt-1 line-clamp-2 break-all text-[11px] opacity-75">{reference.quote}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessageEntity }) {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}
    >
      {isAssistant ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black text-white shadow-sm dark:bg-white dark:text-black">
          <Bot className="h-5 w-5" />
        </div>
      ) : null}

      <div className={cn("max-w-3xl space-y-2", isAssistant ? "items-start" : "items-end")}>
        <div
          className={cn(
            "rounded-[28px] border px-5 py-4 shadow-sm",
            isAssistant
              ? "border-border bg-card text-card-foreground"
              : "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black",
          )}
        >
          {isAssistant ? (
            <ChatMarkdown content={message.content} />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
          )}
          {isAssistant ? <ChatReferenceList references={message.references} /> : null}
        </div>
        <p className={cn("px-1 text-xs text-muted-foreground", isAssistant ? "text-left" : "text-right")}>
          {formatDateTime(message.createdAt)}
        </p>
      </div>

      {!isAssistant ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm">
          <MessageSquare className="h-5 w-5" />
        </div>
      ) : null}
    </motion.div>
  );
}

function Sidebar({
  sessions,
  currentSessionId,
  searchValue,
  disabled,
  onSearchChange,
  onSelect,
  onNewSession,
  onDelete,
}: {
  sessions: ChatSessionListItem[];
  currentSessionId: string | null;
  searchValue: string;
  disabled: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDelete: (sessionId: string) => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col gap-4 rounded-[32px] border border-border bg-card p-5 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Chat Sessions</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">会话管理</h2>
          </div>
          <button
            type="button"
            onClick={onNewSession}
            disabled={disabled}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          保留 quiz 的“用户私有会话”语义，同时把范围切换、模型切换和会话深链拆清楚。
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索会话标题或范围"
          className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
        />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="还没有任何会话"
            description="首次提问后会自动创建会话，并把模型、知识范围和历史消息一起沉淀下来。"
          />
        ) : (
          sessions.map((session) => {
            const selected = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className={cn(
                  "group rounded-[28px] border px-4 py-4 transition",
                  selected
                    ? "border-black bg-black text-white shadow-lg dark:border-white dark:bg-white dark:text-black"
                    : "border-border bg-background hover:border-black/15 hover:bg-muted/35 dark:hover:border-white/15",
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    disabled={disabled}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{session.title}</p>
                        <p
                          className={cn(
                            "mt-1 truncate text-xs",
                            selected ? "text-white/70 dark:text-black/70" : "text-muted-foreground",
                          )}
                        >
                          {session.knowledgeScopeLabel}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "mt-3 line-clamp-2 text-xs leading-5",
                        selected ? "text-white/75 dark:text-black/75" : "text-muted-foreground",
                      )}
                    >
                      {session.lastMessagePreview}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onDelete(session.id)}
                    className={cn(
                      "rounded-full p-2 transition",
                      selected
                        ? "text-white/70 hover:bg-white/10 hover:text-white dark:text-black/70 dark:hover:bg-black/10 dark:hover:text-black"
                        : "text-muted-foreground hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                    aria-label="删除会话"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className={cn(
                    "mt-4 flex items-center justify-between text-[11px]",
                    selected ? "text-white/65 dark:text-black/65" : "text-muted-foreground",
                  )}
                >
                  <span>{session.modelName}</span>
                  <span>{formatDateTime(session.updateDate)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export function ChatWorkbenchPage({
  sessionId,
}: {
  sessionId?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRoutePending, startRouteTransition] = useTransition();
  const { isStreaming, startStream, stopStream } = useChatStream();

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const deferredSessionSearch = useDeferredValue(sessionSearch);
  const [newSessionModelName, setNewSessionModelName] = useState("");
  const [newSessionScopeValue, setNewSessionScopeValue] = useState(ALL_CHAT_SCOPE_VALUE);
  const [sessionModelOverride, setSessionModelOverride] = useState<string | null>(null);
  const [pendingTurn, setPendingTurn] = useState<DraftChatTurn | null>(null);
  const [streamedAssistantContent, setStreamedAssistantContent] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<ChatComposerInput, undefined, ChatComposerValues>({
    resolver: zodResolver(chatComposerSchema),
    defaultValues: {
      message: "",
    },
  });

  const draftMessage = useWatch({
    control: form.control,
    name: "message",
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.chat.list,
    queryFn: listChatSessions,
  });

  const modelsQuery = useQuery({
    queryKey: queryKeys.chat.models,
    queryFn: listChatModels,
  });

  const scopesQuery = useQuery({
    queryKey: queryKeys.chat.scopes,
    queryFn: listChatScopeOptions,
  });

  const activeSessionId = pendingTurn?.session.id ?? sessionId ?? null;

  const messagesQuery = useQuery({
    queryKey: queryKeys.chat.messages(activeSessionId),
    queryFn: () => getChatMessages(activeSessionId!),
    enabled: activeSessionId != null,
  });

  const selectedSession = useMemo(
    () => sessionsQuery.data?.find((item) => item.id === (sessionId ?? null)) ?? null,
    [sessionId, sessionsQuery.data],
  );

  const defaultModelName = useMemo(() => {
    const models = modelsQuery.data ?? [];
    if (models.length === 0) {
      return "";
    }

    return (models.find((item) => item.isDefault) ?? models[0]).name;
  }, [modelsQuery.data]);

  const currentModelName =
    sessionId && selectedSession
      ? sessionModelOverride ?? selectedSession.modelName
      : newSessionModelName || defaultModelName;

  const currentScopeValue =
    sessionId && selectedSession
      ? selectedSession.knowledgeScopeType === "KNOWLEDGE_SET" && selectedSession.knowledgeSetId
        ? selectedSession.knowledgeSetId
        : ALL_CHAT_SCOPE_VALUE
      : newSessionScopeValue;

  const filteredSessions = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    const keyword = deferredSessionSearch.trim().toLowerCase();
    if (!keyword) {
      return sessions;
    }

    return sessions.filter((session) =>
      [session.title, session.lastMessagePreview, session.knowledgeScopeLabel]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [deferredSessionSearch, sessionsQuery.data]);

  const displayedMessages = useMemo(() => {
    const persisted = messagesQuery.data ?? [];
    if (!pendingTurn || pendingTurn.session.id !== activeSessionId) {
      return persisted;
    }

    return [
      ...persisted,
      pendingTurn.userMessage,
      {
        ...pendingTurn.assistantMessage,
        content: streamedAssistantContent || "",
      },
    ];
  }, [activeSessionId, messagesQuery.data, pendingTurn, streamedAssistantContent]);

  const selectedScopeLabel = useMemo(() => {
    const option = scopesQuery.data?.find((item) => item.value === currentScopeValue);
    return option?.label ?? "全部可访问知识集";
  }, [currentScopeValue, scopesQuery.data]);

  const invalidSession = Boolean(sessionId && !selectedSession && !sessionsQuery.isLoading && !pendingTurn);

  const deleteSessionMutation = useMutation({
    mutationFn: deleteChatSession,
    onSuccess: async (_, deletedSessionId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
      if (sessionId === deletedSessionId || activeSessionId === deletedSessionId) {
        startRouteTransition(() => {
          router.push("/chat");
        });
      }
      setFeedback({ type: "success", message: "会话已删除。" });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "删除会话失败，请稍后重试。",
      });
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: ({ nextSessionId, nextModelName }: { nextSessionId: string; nextModelName: string }) =>
      setChatSessionModel(nextSessionId, nextModelName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.chat.list });
    },
    onError: (error) => {
      setSessionModelOverride(null);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "更新模型失败，请稍后重试。",
      });
    },
  });

  useEffect(() => {
    if (invalidSession) {
      startRouteTransition(() => {
        router.replace("/chat");
      });
    }
  }, [invalidSession, router]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages]);

  function invalidateChatQueries(nextSessionId?: string | null) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list });
    if (nextSessionId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(nextSessionId) });
    }
  }

  function handleOpenSession(nextSessionId: string) {
    if (isStreaming) {
      return;
    }

    setSessionModelOverride(null);
    setMobileSidebarOpen(false);
    setFeedback(null);
    startRouteTransition(() => {
      router.push(`/chat/${nextSessionId}`);
    });
  }

  function handleStartNewSession() {
    if (isStreaming) {
      return;
    }

    form.reset({ message: "" });
    setPendingTurn(null);
    setStreamedAssistantContent("");
    setNewSessionModelName(currentModelName);
    setMobileSidebarOpen(false);
    setFeedback(null);
    setSessionModelOverride(null);

    if (sessionId) {
      startRouteTransition(() => {
        router.push("/chat");
      });
    }
  }

  async function finalizeTurn(
    draft: DraftChatTurn,
    finalAssistantContent: string,
    successMessage?: string,
  ) {
    const committed = {
      ...draft,
      assistantMessage: {
        ...draft.assistantMessage,
        content: finalAssistantContent,
      },
    };

    await commitChatTurn(committed);
    invalidateChatQueries(draft.session.id);
    setPendingTurn(null);
    setStreamedAssistantContent("");
    if (successMessage) {
      setFeedback({ type: "success", message: successMessage });
    }
  }

  async function handleSend(values: ChatComposerValues) {
    if (!currentModelName) {
      setFeedback({ type: "error", message: "当前没有可用模型，请稍后重试。" });
      return;
    }

    if (!scopesQuery.data?.some((item) => item.value === currentScopeValue)) {
      setFeedback({ type: "error", message: "当前知识范围不可用，请重新选择范围。" });
      return;
    }

    try {
      setFeedback(null);
      const draft = await createDraftChatTurn({
        sessionId,
        message: values.message,
        modelName: currentModelName,
        scopeValue: currentScopeValue,
      });

      setPendingTurn(draft);
      setStreamedAssistantContent("");
      form.reset({ message: "" });
      invalidateChatQueries(draft.session.id);

      if (!sessionId) {
        startRouteTransition(() => {
          router.push(`/chat/${draft.session.id}`);
        });
      }

      let streamedContent = "";
      await startStream({
        content: draft.assistantMessage.content,
        onChunk: (chunk) => {
          streamedContent += chunk;
          setStreamedAssistantContent(streamedContent);
        },
        onComplete: async () => {
          await finalizeTurn(draft, streamedContent || draft.assistantMessage.content);
        },
        onAbort: async () => {
          const partial = streamedContent.trim();
          const content =
            partial.length > 0
              ? `${partial}\n\n> 已停止生成，以上为当前已返回的部分内容。`
              : "已停止生成，本轮暂未返回有效内容。";
          await finalizeTurn(draft, content, "已停止本轮生成，保留当前已返回内容。");
        },
      });
    } catch (error) {
      setPendingTurn(null);
      setStreamedAssistantContent("");
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "发送失败，请稍后重试。",
      });
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_36%),linear-gradient(180deg,_rgba(2,6,23,0.03),_transparent_18%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-medium shadow-sm transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background shadow-sm transition hover:border-black/15 hover:bg-muted/40 lg:hidden dark:hover:border-white/15"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BrainCircuit className="h-4 w-4" />
            独立 AI 对话工作台
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <Sidebar
              sessions={filteredSessions}
              currentSessionId={sessionId ?? null}
              searchValue={sessionSearch}
              disabled={isStreaming || deleteSessionMutation.isPending}
              onSearchChange={setSessionSearch}
              onSelect={handleOpenSession}
              onNewSession={handleStartNewSession}
              onDelete={(nextSessionId) => deleteSessionMutation.mutate(nextSessionId)}
            />
          </div>

          <section className="flex min-h-[80vh] flex-col rounded-[32px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                      Knowledge-first Chat
                    </span>
                    <ScopeBadge label={selectedScopeLabel} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                      {selectedSession?.title ?? "新会话"}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      这不是无边界自由聊天页。当前默认语义是“在知识范围内发起问答”，会保留会话管理、模型切换、流式回复和参考来源展示。
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">当前模型</span>
                    <select
                      value={currentModelName}
                      onChange={(event) => {
                        const nextModelName = event.target.value;
                        if (sessionId) {
                          setSessionModelOverride(nextModelName);
                          updateModelMutation.mutate({
                            nextSessionId: sessionId,
                            nextModelName,
                          });
                          return;
                        }
                        setNewSessionModelName(nextModelName);
                      }}
                      disabled={isStreaming || modelsQuery.isLoading}
                      className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                    >
                      {(modelsQuery.data ?? []).map((model) => (
                        <option key={model.id} value={model.name}>
                          {model.name} · {model.provider}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">知识范围</span>
                    <select
                      value={currentScopeValue}
                      onChange={(event) => {
                        const nextScopeValue = event.target.value;
                        setNewSessionModelName(currentModelName);
                        setNewSessionScopeValue(nextScopeValue);
                        setSessionModelOverride(null);
                        setFeedback({
                          type: "success",
                          message: `已切换到「${
                            scopesQuery.data?.find((item) => item.value === nextScopeValue)?.label ?? "新的知识范围"
                          }」，当前会从新会话开始。`,
                        });
                        if (sessionId) {
                          startRouteTransition(() => {
                            router.push("/chat");
                          });
                        }
                      }}
                      disabled={isStreaming || scopesQuery.isLoading}
                      className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                    >
                      {(scopesQuery.data ?? []).map((scope) => (
                        <option key={scope.value} value={scope.value}>
                          {scope.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-5 py-5 sm:px-6">
              <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

              <div className="flex-1 space-y-4 overflow-y-auto">
                {messagesQuery.isLoading && activeSessionId ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-border bg-muted/25">
                    <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      正在加载会话消息
                    </div>
                  </div>
                ) : displayedMessages.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="开始一轮新的知识问答"
                    description="你可以先选择模型和知识范围，再直接提问。首条消息发送后会自动创建一个可深链的私有会话。"
                    action={
                      <button
                        type="button"
                        onClick={() => form.setFocus("message")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      >
                        聚焦输入框
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    }
                  />
                ) : (
                  displayedMessages.map((message) => <MessageBubble key={message.id} message={message} />)
                )}
                <div ref={messageEndRef} />
              </div>

              <form
                className="rounded-[28px] border border-border bg-background p-4 shadow-sm"
                onSubmit={form.handleSubmit(handleSend)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">输入问题</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter 发送，Shift + Enter 换行。发送中会禁用重复提交，并以流式方式展示回答。
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">{(draftMessage ?? "").length}/4000</div>
                </div>

                <div className="mt-4">
                  <textarea
                    rows={4}
                    placeholder="例如：请基于当前知识范围，总结这个模块的核心边界、风险点和下一步实现建议。"
                    className={inputClassName(Boolean(form.formState.errors.message?.message))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void form.handleSubmit(handleSend)();
                      }
                    }}
                    {...form.register("message")}
                  />
                  <FieldError message={form.formState.errors.message?.message} />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-3 py-1">模型：{currentModelName || "-"}</span>
                    <span className="rounded-full border border-border px-3 py-1">范围：{selectedScopeLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={stopStream}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
                      >
                        <Square className="h-4 w-4" />
                        停止生成
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={
                        isStreaming ||
                        isRoutePending ||
                        deleteSessionMutation.isPending ||
                        updateModelMutation.isPending
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      {isStreaming ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      发送
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-4 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex h-full max-w-md flex-col rounded-[32px] bg-background">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Mobile Drawer</p>
                <h2 className="mt-1 text-xl font-semibold">会话列表</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background shadow-sm"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 px-4 pb-4">
              <Sidebar
                sessions={filteredSessions}
                currentSessionId={sessionId ?? null}
                searchValue={sessionSearch}
                disabled={isStreaming || deleteSessionMutation.isPending}
                onSearchChange={setSessionSearch}
                onSelect={handleOpenSession}
                onNewSession={handleStartNewSession}
                onDelete={(nextSessionId) => deleteSessionMutation.mutate(nextSessionId)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
