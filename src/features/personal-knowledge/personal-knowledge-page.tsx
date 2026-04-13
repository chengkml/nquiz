"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CircleEllipsis,
  FileStack,
  FolderPlus,
  Globe2,
  LoaderCircle,
  Lock,
  MessageSquare,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  askKnowledgeQuestion,
  clearKnowledgeChatSession,
  createKnowledgeSet,
  createKnowledgeSource,
  deleteKnowledgeSet,
  deleteKnowledgeSource,
  getKnowledgeChatSession,
  getKnowledgeSetDetail,
  listKnowledgeCollections,
  listKnowledgeSources,
  updateKnowledgeSet,
  updateKnowledgeSource,
} from "@/features/personal-knowledge/mock-service";
import {
  knowledgeQuestionSchema,
  knowledgeSetFormSchema,
  knowledgeSourceFormSchema,
  type KnowledgeQuestionValues,
  type KnowledgeSetFormInput,
  type KnowledgeSetFormValues,
  type KnowledgeSourceFormInput,
  type KnowledgeSourceFormValues,
} from "@/features/personal-knowledge/schema";
import type {
  KnowledgeChatMessage,
  KnowledgeSetListItem,
  KnowledgeSetMutationInput,
  KnowledgeSourceListItem,
  KnowledgeSourceMutationInput,
} from "@/features/personal-knowledge/types";

type FeedbackState = { type: "success" | "error"; message: string } | null;
type WorkbenchTab = "overview" | "sources" | "chat";

const tabs: Array<{ id: WorkbenchTab; label: string; icon: typeof BookOpen }> = [
  { id: "overview", label: "概览", icon: BookOpen },
  { id: "sources", label: "来源", icon: FileStack },
  { id: "chat", label: "问答", icon: MessageSquare },
];

const sourceStatusLabel = {
  PENDING: "等待中",
  PARSING: "解析中",
  SUCCESS: "已成功",
  FAILED: "处理失败",
} as const;

const sourceTypeLabel = {
  MARKDOWN: "Markdown",
  FILE: "文件",
} as const;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  return (
    <div
      className={cn(
        "mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{feedback.message}</div>
      <button type="button" className="text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "neutral" | "green" | "amber" | "red" | "sky";
  children: React.ReactNode;
}) {
  const toneClassName =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "sky"
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-border bg-muted text-muted-foreground";

  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", toneClassName)}>{children}</span>;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-[28px] border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm">
        <FolderPlus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function SetDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: KnowledgeSetListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: KnowledgeSetMutationInput) => Promise<void>;
}) {
  const form = useForm<KnowledgeSetFormInput, undefined, KnowledgeSetFormValues>({
    resolver: zodResolver(knowledgeSetFormSchema),
    defaultValues: {
      name: record?.name ?? "",
      descr: record?.descr ?? "",
      visibility: record?.visibility ?? "PRIVATE",
      status: record?.status ?? "ENABLED",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: record?.name ?? "",
      descr: record?.descr ?? "",
      visibility: record?.visibility ?? "PRIVATE",
      status: record?.status ?? "ENABLED",
    });
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑知识集" : "新增知识集"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            首版把个人知识页收敛成工作台入口，知识集表单只保留真正影响访问和问答语义的字段。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              name: values.name,
              descr: values.descr,
              visibility: values.visibility,
              status: values.status,
            });
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">知识集名称</label>
            <input className={inputClassName(Boolean(form.formState.errors.name?.message))} placeholder="例如 个人重构沉淀 / 前端协作规范" {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">说明</label>
            <textarea
              rows={4}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              placeholder="说明这个知识集沉淀什么内容、面向什么场景，以及为什么适合长期保留。"
              {...form.register("descr")}
            />
            <FieldError message={form.formState.errors.descr?.message as string | undefined} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">可见性</label>
              <select className={inputClassName(Boolean(form.formState.errors.visibility?.message))} {...form.register("visibility")}>
                <option value="PRIVATE">私有，仅自己可见</option>
                <option value="PUBLIC">公开，可被共享访问</option>
              </select>
              <FieldError message={form.formState.errors.visibility?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}>
                <option value="ENABLED">启用，可继续问答</option>
                <option value="DISABLED">禁用，仅保留资料</option>
              </select>
              <FieldError message={form.formState.errors.status?.message} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                onClose();
                form.reset();
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {record ? "保存知识集" : "创建知识集"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SourceDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: KnowledgeSourceListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: KnowledgeSourceMutationInput) => Promise<void>;
}) {
  const form = useForm<KnowledgeSourceFormInput, undefined, KnowledgeSourceFormValues>({
    resolver: zodResolver(knowledgeSourceFormSchema),
    defaultValues: {
      name: record?.name ?? "",
      type: record?.type ?? "MARKDOWN",
      descr: record?.descr ?? "",
      content: record?.content ?? "",
      fileName: record?.fileName ?? "",
    },
  });

  const selectedType = useWatch({
    control: form.control,
    name: "type",
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: record?.name ?? "",
      type: record?.type ?? "MARKDOWN",
      descr: record?.descr ?? "",
      content: record?.content ?? "",
      fileName: record?.fileName ?? "",
    });
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑知识来源" : "新增知识来源"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            首版优先支持 Markdown 与文件来源。文件来源先用元数据和摘要模拟上传闭环，避免继续把空壳上传控件伪装成已接通能力。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              name: values.name,
              type: values.type,
              descr: values.descr,
              content: values.content,
              fileName: values.fileName,
            });
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">来源名称</label>
            <input className={inputClassName(Boolean(form.formState.errors.name?.message))} placeholder="例如 需求边界梳理.md / next16-notes.pdf" {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">来源类型</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={cn("rounded-2xl border px-4 py-3 text-sm transition", selectedType === "MARKDOWN" ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground")}>
                <input type="radio" value="MARKDOWN" className="sr-only" {...form.register("type")} />
                <div className="font-medium">Markdown</div>
                <div className={cn("mt-1 text-xs", selectedType === "MARKDOWN" ? "text-background/70" : "text-muted-foreground")}>
                  直接录入正文，适合沉淀总结、清单和结构化说明。
                </div>
              </label>
              <label className={cn("rounded-2xl border px-4 py-3 text-sm transition", selectedType === "FILE" ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground")}>
                <input type="radio" value="FILE" className="sr-only" {...form.register("type")} />
                <div className="font-medium">文件</div>
                <div className={cn("mt-1 text-xs", selectedType === "FILE" ? "text-background/70" : "text-muted-foreground")}>
                  首版先登记文件名和摘要，模拟上传后进入处理状态。
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">来源说明</label>
            <textarea
              rows={3}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              placeholder="说明它为什么值得纳入知识集，以及希望后续问答时优先覆盖什么内容。"
              {...form.register("descr")}
            />
            <FieldError message={form.formState.errors.descr?.message as string | undefined} />
          </div>

          {selectedType === "FILE" ? (
            <div>
              <label className="mb-2 block text-sm font-medium">文件名称</label>
              <input className={inputClassName(Boolean(form.formState.errors.fileName?.message))} placeholder="例如 migration-checklist.pdf" {...form.register("fileName")} />
              <p className="mt-1 text-xs text-muted-foreground">文件上传链路二期再接，首版先用文件名称和内容摘要承接来源处理闭环。</p>
              <FieldError message={form.formState.errors.fileName?.message as string | undefined} />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium">{selectedType === "MARKDOWN" ? "Markdown 正文" : "文件内容摘要"}</label>
            <textarea
              rows={selectedType === "MARKDOWN" ? 10 : 5}
              className={inputClassName(Boolean(form.formState.errors.content?.message))}
              placeholder={selectedType === "MARKDOWN" ? "输入可被切片和问答引用的 Markdown 内容。" : "输入该文件的关键摘要，模拟处理后的可检索内容。"}
              {...form.register("content")}
            />
            <FieldError message={form.formState.errors.content?.message as string | undefined} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {record ? "保存来源" : "新增来源"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  pending,
  danger = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  pending: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60",
              danger ? "bg-red-600 hover:bg-red-500" : "bg-foreground hover:opacity-90",
            )}
            onClick={() => {
              void onConfirm();
            }}
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessageCard({ message }: { message: KnowledgeChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-[24px] px-4 py-3 text-sm shadow-sm",
          isAssistant ? "border border-border bg-card text-foreground" : "bg-foreground text-background",
        )}
      >
        <div className="whitespace-pre-wrap leading-6">{message.content}</div>
        {isAssistant && message.citations.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {message.citations.map((citation) => (
              <div key={citation.sourceId} className="rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{citation.sourceName}</div>
                <div className="mt-1 leading-5">{citation.quote}</div>
              </div>
            ))}
          </div>
        ) : null}
        <div className={cn("mt-3 text-[11px]", isAssistant ? "text-muted-foreground" : "text-background/70")}>
          {formatDateTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

export function PersonalKnowledgePage() {
  const queryClient = useQueryClient();
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [, startSelectionTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("overview");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<KnowledgeSetListItem | null>(null);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSourceListItem | null>(null);
  const [setDeleteOpen, setSetDeleteOpen] = useState(false);
  const [sourceDeleteOpen, setSourceDeleteOpen] = useState(false);

  const askForm = useForm<KnowledgeQuestionValues>({
    resolver: zodResolver(knowledgeQuestionSchema),
    defaultValues: {
      question: "",
    },
  });

  const collectionsQuery = useQuery({
    queryKey: queryKeys.personalKnowledge.collections({ keyword: deferredKeyword }),
    queryFn: () => listKnowledgeCollections({ keyword: deferredKeyword }),
  });

  const accessibleSets = collectionsQuery.data ? [...collectionsQuery.data.created, ...collectionsQuery.data.shared] : [];
  const effectiveSelectedSetId =
    selectedSetId && accessibleSets.some((item) => item.id === selectedSetId)
      ? selectedSetId
      : accessibleSets[0]?.id ?? null;

  const selectedSetQuery = useQuery({
    queryKey: queryKeys.personalKnowledge.detail(effectiveSelectedSetId),
    queryFn: () => getKnowledgeSetDetail(effectiveSelectedSetId!),
    enabled: Boolean(effectiveSelectedSetId),
  });

  const selectedSet = selectedSetQuery.data ?? accessibleSets.find((item) => item.id === effectiveSelectedSetId) ?? null;

  const sourcesQuery = useQuery({
    queryKey: queryKeys.personalKnowledge.sources(effectiveSelectedSetId),
    queryFn: () => listKnowledgeSources(effectiveSelectedSetId!),
    enabled: Boolean(effectiveSelectedSetId),
    refetchInterval: effectiveSelectedSetId ? 2000 : false,
  });

  const chatQuery = useQuery({
    queryKey: queryKeys.personalKnowledge.chat(effectiveSelectedSetId),
    queryFn: () => getKnowledgeChatSession(effectiveSelectedSetId!),
    enabled: Boolean(effectiveSelectedSetId),
  });

  const saveSetMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: KnowledgeSetMutationInput;
    }) => {
      return id ? updateKnowledgeSet(id, values) : createKnowledgeSet(values);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalKnowledge.all });
      startSelectionTransition(() => {
        setSelectedSetId(result.id);
        setActiveTab("overview");
      });
      setSetDialogOpen(false);
      setEditingSet(null);
      setFeedback({
        type: "success",
        message: editingSet ? "知识集已更新，个人工作台会自动切到最新状态。" : "知识集已创建，可以继续补充来源或直接发起问答。",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "知识集保存失败",
      });
    },
  });

  const deleteSetMutation = useMutation({
    mutationFn: async (id: string) => deleteKnowledgeSet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalKnowledge.all });
      setSetDeleteOpen(false);
      setEditingSet(null);
      setFeedback({
        type: "success",
        message: "知识集及其来源已删除，个人工作台已回退到下一个可访问知识集。",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "知识集删除失败",
      });
    },
  });

  const saveSourceMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: KnowledgeSourceMutationInput;
    }) => {
      if (!effectiveSelectedSetId) {
        throw new Error("请先选择一个知识集");
      }
      return id ? updateKnowledgeSource(id, values) : createKnowledgeSource(effectiveSelectedSetId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalKnowledge.all });
      setSourceDialogOpen(false);
      setEditingSource(null);
      setActiveTab("sources");
      setFeedback({
        type: "success",
        message: "来源已进入处理队列。首版会通过轮询把状态从等待中推进到解析中/成功。",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "来源保存失败",
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => deleteKnowledgeSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalKnowledge.all });
      setSourceDeleteOpen(false);
      setEditingSource(null);
      setFeedback({
        type: "success",
        message: "来源已删除，知识集统计会自动同步。",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "来源删除失败",
      });
    },
  });

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!effectiveSelectedSetId) {
        throw new Error("请先选择一个知识集");
      }
      return askKnowledgeQuestion(effectiveSelectedSetId, question);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalKnowledge.chat(effectiveSelectedSetId) });
      askForm.reset({
        question: "",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "问答失败",
      });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveSelectedSetId) {
        throw new Error("请先选择一个知识集");
      }
      return clearKnowledgeChatSession(effectiveSelectedSetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalKnowledge.chat(effectiveSelectedSetId) });
      setFeedback({
        type: "success",
        message: "当前知识集的聊天上下文已清空。",
      });
    },
  });

  useEffect(() => {
    if (!chatViewportRef.current) return;
    chatViewportRef.current.scrollTop = chatViewportRef.current.scrollHeight;
  }, [chatQuery.data]);

  const sources = sourcesQuery.data ?? [];
  const messages = chatQuery.data ?? [];
  const canAsk = selectedSet?.status === "ENABLED";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">个人知识工作台</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              不继续复制 quiz 里那个未完成的 `PersonalKnowledge` 壳页，而是把“我创建的 / 我可访问的共享知识集、来源处理状态、知识问答”重组进同一个工作台。
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          onClick={() => {
            setEditingSet(null);
            setSetDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          新建知识集
        </button>
      </div>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="可访问知识集" value={String(collectionsQuery.data?.summary.totalSets ?? 0)} hint="包含我创建的与共享可访问的公开知识集。" />
        <StatCard label="我创建的" value={String(collectionsQuery.data?.summary.ownedSets ?? 0)} hint="这些知识集可以继续增删改来源，并作为个人沉淀主工作台。" />
        <StatCard label="共享可访问" value={String(collectionsQuery.data?.summary.sharedSets ?? 0)} hint="保留旧 quiz 的 PUBLIC 语义，但明确标记为共享只读，不再伪装成真实 join 关系。" />
        <StatCard label="处理中来源" value={String(collectionsQuery.data?.summary.processingSources ?? 0)} hint="首版通过轻量轮询让来源状态从等待中推进到解析中或成功。" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[30px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">知识集导航</p>
                <h2 className="mt-1 text-lg font-semibold">我创建的 / 共享可访问</h2>
              </div>
              <StatusBadge tone="neutral">{accessibleSets.length} 个</StatusBadge>
            </div>

            <div className="mt-4">
              <label className="sr-only" htmlFor="knowledge-set-search">
                搜索知识集
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="knowledge-set-search"
                  className="w-full rounded-2xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5"
                  placeholder="搜索名称、说明或创建人"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between text-sm font-medium">
                  <span>我创建的</span>
                  <StatusBadge tone="sky">{collectionsQuery.data?.created.length ?? 0}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {(collectionsQuery.data?.created ?? []).map((item) => {
                    const active = item.id === effectiveSelectedSetId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "w-full rounded-[24px] border px-4 py-3 text-left transition",
                          active
                            ? "border-foreground bg-foreground text-background shadow-lg"
                            : "border-border bg-background hover:border-foreground/15 hover:bg-muted/60",
                        )}
                        onClick={() => {
                          startSelectionTransition(() => {
                            setSelectedSetId(item.id);
                            setActiveTab("overview");
                          });
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className={cn("mt-1 text-xs leading-5", active ? "text-background/75" : "text-muted-foreground")}>
                              {item.descr || "暂无描述"}
                            </div>
                          </div>
                          <StatusBadge tone={item.visibility === "PUBLIC" ? "sky" : "neutral"}>
                            {item.visibility === "PUBLIC" ? "共享" : "私有"}
                          </StatusBadge>
                        </div>
                        <div className={cn("mt-3 flex flex-wrap gap-2 text-[11px]", active ? "text-background/75" : "text-muted-foreground")}>
                          <span>{item.sourceCount} 个来源</span>
                          <span>{item.successSourceCount} 个可问答</span>
                          <span>{item.processingSourceCount} 个处理中</span>
                        </div>
                      </button>
                    );
                  })}
                  {(collectionsQuery.data?.created ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      当前搜索条件下没有我创建的知识集。
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between text-sm font-medium">
                  <span>共享可访问</span>
                  <StatusBadge tone="amber">{collectionsQuery.data?.shared.length ?? 0}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {(collectionsQuery.data?.shared ?? []).map((item) => {
                    const active = item.id === effectiveSelectedSetId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "w-full rounded-[24px] border px-4 py-3 text-left transition",
                          active
                            ? "border-foreground bg-foreground text-background shadow-lg"
                            : "border-border bg-background hover:border-foreground/15 hover:bg-muted/60",
                        )}
                        onClick={() => {
                          startSelectionTransition(() => {
                            setSelectedSetId(item.id);
                            setActiveTab("overview");
                          });
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className={cn("mt-1 text-xs leading-5", active ? "text-background/75" : "text-muted-foreground")}>
                              {item.createUserName} 创建
                            </div>
                          </div>
                          <StatusBadge tone="amber">只读</StatusBadge>
                        </div>
                        <div className={cn("mt-3 flex flex-wrap gap-2 text-[11px]", active ? "text-background/75" : "text-muted-foreground")}>
                          <span>{item.sourceCount} 个来源</span>
                          <span>{item.successSourceCount} 个可问答</span>
                        </div>
                      </button>
                    );
                  })}
                  {(collectionsQuery.data?.shared ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      当前没有共享可访问的知识集。
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">高级工具分层</h3>
                <p className="text-sm text-muted-foreground">检索测试、向量同步检查等诊断能力不再挤占首页主路径，首版先明确沉淀与问答主链路。</p>
              </div>
            </div>
          </section>
        </aside>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          {!selectedSet ? (
            <EmptyPanel
              title="还没有可展示的知识集"
              description="先创建一个知识集，再往里面补 Markdown 或文件来源，个人知识页才会形成可问答的工作台闭环。"
              action={
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background"
                  onClick={() => {
                    setEditingSet(null);
                    setSetDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  新建知识集
                </button>
              }
            />
          ) : (
            <div className="space-y-6">
              <div className="rounded-[30px] border border-border bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={selectedSet.scope === "OWNED" ? "sky" : "amber"}>
                        {selectedSet.scope === "OWNED" ? "我创建的" : "共享可访问"}
                      </StatusBadge>
                      <StatusBadge tone={selectedSet.status === "ENABLED" ? "green" : "red"}>
                        {selectedSet.status === "ENABLED" ? "启用中" : "已禁用"}
                      </StatusBadge>
                      <StatusBadge tone={selectedSet.visibility === "PUBLIC" ? "sky" : "neutral"}>
                        {selectedSet.visibility === "PUBLIC" ? (
                          <span className="inline-flex items-center gap-1">
                            <Globe2 className="h-3.5 w-3.5" />
                            公开
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3.5 w-3.5" />
                            私有
                          </span>
                        )}
                      </StatusBadge>
                    </div>
                    <div>
                      <h2 className="text-3xl font-semibold tracking-tight">{selectedSet.name}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{selectedSet.descr || "当前知识集还没有补充说明。"}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>创建人：{selectedSet.createUserName}</span>
                      <span>来源数：{selectedSet.sourceCount}</span>
                      <span>最近更新：{formatDateTime(selectedSet.updateDate)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {selectedSet.canManage ? (
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
                          onClick={() => {
                            setEditingSet(selectedSet);
                            setSetDialogOpen(true);
                          }}
                        >
                          <PencilLine className="h-4 w-4" />
                          编辑知识集
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          onClick={() => {
                            setEditingSet(selectedSet);
                            setSetDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          删除知识集
                        </button>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        共享知识集当前只读。首版先保证“可访问 + 可问答”语义，避免把编辑权限偷偷放大。
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
                  {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                        activeTab === id ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setActiveTab(id)}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === "sources" && selectedSet.canManage ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                    onClick={() => {
                      setEditingSource(null);
                      setSourceDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    新增来源
                  </button>
                ) : null}
              </div>

              {activeTab === "overview" ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="来源总数" value={String(selectedSet.sourceCount)} hint="围绕当前知识集沉淀的 Markdown / 文件来源。" />
                    <StatCard label="可问答来源" value={String(selectedSet.successSourceCount)} hint="已处理成功，能够在知识问答中被引用。" />
                    <StatCard label="处理中" value={String(selectedSet.processingSourceCount)} hint="新建或更新后的来源会先进入等待中，再推进到解析中。" />
                    <StatCard label="失败来源" value={String(selectedSet.failedSourceCount)} hint="失败项保留在当前工作台中，便于用户重新编辑或替换来源内容。" />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
                    <div className="rounded-[28px] border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">工作台概览</h3>
                          <p className="mt-1 text-sm text-muted-foreground">保留“个人知识资产管理 + 基于知识集问答”的业务语义，同时把旧页未接通的空输入框收敛为真正的知识问答区。</p>
                        </div>
                        <StatusBadge tone={selectedSet.canChat ? "green" : "amber"}>
                          {selectedSet.canChat ? "可直接问答" : canAsk ? "先补充可用来源" : "知识集已禁用"}
                        </StatusBadge>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">权限边界</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">
                            {selectedSet.scope === "OWNED"
                              ? "当前知识集由本人创建，可继续增删改来源与设置。"
                              : "当前知识集来自共享可访问列表，首版只开放浏览与问答，不放大编辑权限。"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">迁移取舍</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">
                            检索测试、向量同步检查等高级工具已从首页主路径移出，避免继续让旧版“功能很多但主闭环不清”的结构带进 nquiz。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-border bg-background p-5">
                      <h3 className="text-lg font-semibold">最近来源</h3>
                      <div className="mt-4 space-y-3">
                        {sources.slice(0, 3).map((source) => (
                          <div key={source.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone="neutral">{sourceTypeLabel[source.type]}</StatusBadge>
                              <StatusBadge tone={source.status === "SUCCESS" ? "green" : source.status === "FAILED" ? "red" : "amber"}>
                                {sourceStatusLabel[source.status]}
                              </StatusBadge>
                            </div>
                            <p className="mt-3 text-sm font-medium">{source.name}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{source.previewText}</p>
                            <p className="mt-2 text-xs text-muted-foreground">更新于 {formatDateTime(source.updateDate)}</p>
                          </div>
                        ))}
                        {sources.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            当前知识集还没有来源。
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "sources" ? (
                <div className="space-y-4">
                  {selectedSet.canManage ? null : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      这是共享知识集。首版来源区保持只读，确保个人知识页不会误改他人公开知识资产。
                    </div>
                  )}

                  {sources.length === 0 ? (
                    <EmptyPanel
                      title="当前知识集还没有来源"
                      description="个人知识页的主价值不是空壳侧栏，而是把来源沉淀、处理状态和问答都围绕当前知识集做成闭环。"
                      action={
                        selectedSet.canManage ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background"
                            onClick={() => {
                              setEditingSource(null);
                              setSourceDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            新增来源
                          </button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {sources.map((source) => (
                        <motion.article
                          key={source.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className="flex h-full flex-col rounded-[28px] border border-border bg-background p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge tone="neutral">{sourceTypeLabel[source.type]}</StatusBadge>
                                <StatusBadge tone={source.status === "SUCCESS" ? "green" : source.status === "FAILED" ? "red" : "amber"}>
                                  {sourceStatusLabel[source.status]}
                                </StatusBadge>
                              </div>
                              <h3 className="text-lg font-semibold">{source.name}</h3>
                            </div>

                            {source.canManage ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-full border border-border p-2 text-muted-foreground transition hover:text-foreground"
                                  onClick={() => {
                                    setEditingSource(source);
                                    setSourceDialogOpen(true);
                                  }}
                                >
                                  <PencilLine className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                                  onClick={() => {
                                    setEditingSource(source);
                                    setSourceDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                            {source.descr ? (
                              <div className="rounded-2xl border border-border bg-card px-4 py-3 leading-6">{source.descr}</div>
                            ) : null}
                            {source.type === "FILE" ? (
                              <div className="rounded-2xl border border-border bg-card px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">文件名称</p>
                                <p className="mt-2 font-medium text-foreground">{source.fileName || "-"}</p>
                              </div>
                            ) : null}
                            <div className="rounded-2xl border border-border bg-card px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">内容预览</p>
                              <p className="mt-2 leading-6 text-foreground">{source.previewText}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>更新于 {formatDateTime(source.updateDate)}</span>
                            {source.status === "PENDING" || source.status === "PARSING" ? (
                              <span className="inline-flex items-center gap-1">
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                自动推进处理中状态
                              </span>
                            ) : null}
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === "chat" ? (
                <div className="space-y-4">
                  {!canAsk ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      当前知识集已禁用，问答入口保持关闭，避免在状态失效时继续输出看似可用的答案。
                    </div>
                  ) : !selectedSet.canChat ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      当前知识集已启用，但还没有成功处理的来源。你仍然可以提问，不过回答会明确提示“先补来源再问”。
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">基于当前知识集问答</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        这里替代旧页底部那个未接通的输入框，所有对话都绑定到当前知识集，并返回引用来源。
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                      onClick={() => {
                        void clearChatMutation.mutateAsync();
                      }}
                    >
                      {clearChatMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      清空上下文
                    </button>
                  </div>

                  <div ref={chatViewportRef} className="max-h-[460px] min-h-[320px] space-y-4 overflow-y-auto rounded-[28px] border border-border bg-background p-4">
                    {messages.length === 0 ? (
                      <EmptyPanel
                        title="还没有开始提问"
                        description="问答结果会和当前知识集强绑定，并在回答中带出引用来源，避免继续沿用旧页里脱离上下文的静态聊天输入框。"
                      />
                    ) : (
                      messages.map((message) => <ChatMessageCard key={message.id} message={message} />)
                    )}
                  </div>

                  <form
                    className="rounded-[28px] border border-border bg-background p-4"
                    onSubmit={askForm.handleSubmit(async (values) => {
                      await askMutation.mutateAsync(values.question);
                    })}
                  >
                    <label className="mb-2 block text-sm font-medium">输入问题</label>
                    <textarea
                      rows={4}
                      className={inputClassName(Boolean(askForm.formState.errors.question?.message))}
                      placeholder="例如：这个知识集目前最适合沉淀哪些迁移约束？来源里有哪些内容还没补齐？"
                      disabled={!canAsk}
                      {...askForm.register("question")}
                    />
                    <FieldError message={askForm.formState.errors.question?.message} />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CircleEllipsis className="h-4 w-4" />
                        首版保留知识集维度的会话隔离与引用展示，不把多模型选择和高级检索测试强塞进主路径。
                      </div>
                      <button
                        type="submit"
                        disabled={!canAsk || askMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {askMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        发送问题
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <SetDialog
        open={setDialogOpen}
        record={editingSet}
        pending={saveSetMutation.isPending}
        onClose={() => {
          setSetDialogOpen(false);
          setEditingSet(null);
        }}
        onSubmit={async (input) => {
          await saveSetMutation.mutateAsync({
            id: editingSet?.id,
            values: input,
          });
        }}
      />

      <SourceDialog
        open={sourceDialogOpen}
        record={editingSource}
        pending={saveSourceMutation.isPending}
        onClose={() => {
          setSourceDialogOpen(false);
          setEditingSource(null);
        }}
      onSubmit={async (input) => {
        await saveSourceMutation.mutateAsync({
          id: editingSource?.id,
          values: input,
        });
        }}
      />

      <ConfirmDialog
        open={setDeleteOpen}
        title="确认删除当前知识集"
        description={
          editingSet
            ? `删除「${editingSet.name}」后，该知识集下的来源和聊天上下文都会一起清理。首版不做软删除，避免假装保留了完整恢复能力。`
            : ""
        }
        confirmText="确认删除知识集"
        pending={deleteSetMutation.isPending}
        danger
        onCancel={() => {
          setSetDeleteOpen(false);
          setEditingSet(null);
        }}
        onConfirm={async () => {
          if (!editingSet) return;
          await deleteSetMutation.mutateAsync(editingSet.id);
        }}
      />

      <ConfirmDialog
        open={sourceDeleteOpen}
        title="确认删除当前来源"
        description={
          editingSource
            ? `删除来源「${editingSource.name}」后，它将不再参与当前知识集的问答引用。`
            : ""
        }
        confirmText="确认删除来源"
        pending={deleteSourceMutation.isPending}
        danger
        onCancel={() => {
          setSourceDeleteOpen(false);
          setEditingSource(null);
        }}
        onConfirm={async () => {
          if (!editingSource) return;
          await deleteSourceMutation.mutateAsync(editingSource.id);
        }}
      />
    </main>
  );
}
