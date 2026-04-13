"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileStack,
  LoaderCircle,
  MessageSquare,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  askKnowledgeSetQuestion,
  clearKnowledgeSetChat,
  createKnowledgeSet,
  createKnowledgeSource,
  deleteKnowledgeSet,
  deleteKnowledgeSource,
  getKnowledgeChatMessages,
  listKnowledgeSets,
  listKnowledgeSources,
  runKnowledgeSearch,
  runVectorSyncCheck,
  testKnowledgeDbConnection,
  updateKnowledgeSet,
  updateKnowledgeSource,
} from "@/features/knowledge-set/mock-service";
import {
  knowledgeChatQuestionSchema,
  knowledgeSearchSchema,
  knowledgeSetFilterSchema,
  knowledgeSetFormSchema,
  knowledgeSourceFilterSchema,
  knowledgeSourceFormSchema,
  type KnowledgeChatQuestionValues,
  type KnowledgeSearchValues,
  type KnowledgeSetFilterInput,
  type KnowledgeSetFilterValues,
  type KnowledgeSetFormInput,
  type KnowledgeSetFormValues,
  type KnowledgeSourceFilterInput,
  type KnowledgeSourceFilterValues,
  type KnowledgeSourceFormInput,
  type KnowledgeSourceFormValues,
} from "@/features/knowledge-set/schema";
import type {
  KnowledgeChatMessage,
  KnowledgeSearchResult,
  KnowledgeSetListFilters,
  KnowledgeSetListItem,
  KnowledgeSetMutationInput,
  KnowledgeSourceListFilters,
  KnowledgeSourceListItem,
  KnowledgeSourceMutationInput,
  VectorSyncCheckResult,
} from "@/features/knowledge-set/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const setPageSizeOptions = [6, 8, 12] as const;
const sourcePageSizeOptions = [5, 10, 20] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

const defaultSetFilters: KnowledgeSetListFilters = {
  keyword: "",
  status: "ALL",
  visibility: "ALL",
  page: 1,
  pageSize: 8,
};

const defaultSourceFilters: KnowledgeSourceListFilters = {
  keyword: "",
  status: "ALL",
  page: 1,
  pageSize: 10,
};

function formatDateTime(value: string) {
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
  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        feedback.type === "error"
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

function badgeClassName(tone: "neutral" | "green" | "amber" | "red" | "indigo") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "indigo") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
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

function parseTags(input: string) {
  return input
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function stringifyTags(tags: string[]) {
  return tags.join(", ");
}

function getSetDefaults(record?: KnowledgeSetListItem | null): KnowledgeSetFormValues {
  return {
    name: record?.name ?? "",
    descr: record?.descr ?? "",
    tags: record ? stringifyTags(record.tags) : "",
    visibility: record?.visibility ?? "PRIVATE",
    status: record?.status ?? "ENABLED",
  };
}

function getSourceDefaults(record?: KnowledgeSourceListItem | null): KnowledgeSourceFormValues {
  return {
    name: record?.name ?? "",
    type: record?.type ?? "MARKDOWN",
    descr: record?.descr ?? "",
    content: record?.content ?? "",
    fileName: record?.fileName ?? "",
    dbHost: record?.dbHost ?? "",
    dbName: record?.dbName ?? "",
  };
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
  onSubmit: (payload: KnowledgeSetMutationInput) => Promise<void>;
}) {
  const form = useForm<KnowledgeSetFormInput, undefined, KnowledgeSetFormValues>({
    resolver: zodResolver(knowledgeSetFormSchema),
    defaultValues: getSetDefaults(record),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(getSetDefaults(record));
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑知识集" : "新增知识集"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保留可见性与启停语义。系统内置知识集在列表中只读，不允许进入该弹窗。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              name: values.name,
              descr: values.descr,
              tags: parseTags(values.tags),
              visibility: values.visibility,
              status: values.status,
            });
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">名称</label>
            <input className={inputClassName(Boolean(form.formState.errors.name?.message))} {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea
              rows={3}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              {...form.register("descr")}
            />
            <FieldError message={form.formState.errors.descr?.message as string | undefined} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">标签（逗号分隔）</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.tags?.message))}
              placeholder="migration, nquiz, ops"
              {...form.register("tags")}
            />
            <FieldError message={form.formState.errors.tags?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">可见性</label>
              <select className={inputClassName(Boolean(form.formState.errors.visibility?.message))} {...form.register("visibility")}>
                <option value="PRIVATE">仅自己</option>
                <option value="PUBLIC">公开可见</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">禁用</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              onClick={() => {
                form.reset(getSetDefaults(record));
                onClose();
              }}
            >
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "提交中..." : record ? "保存修改" : "创建知识集"}
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
  dbTestPending,
  dbTestMessage,
  onClose,
  onSubmit,
  onTestDb,
}: {
  open: boolean;
  record: KnowledgeSourceListItem | null;
  pending: boolean;
  dbTestPending: boolean;
  dbTestMessage: string;
  onClose: () => void;
  onSubmit: (payload: KnowledgeSourceMutationInput) => Promise<void>;
  onTestDb: (dbHost: string, dbName: string) => Promise<void>;
}) {
  const form = useForm<KnowledgeSourceFormInput, undefined, KnowledgeSourceFormValues>({
    resolver: zodResolver(knowledgeSourceFormSchema),
    defaultValues: getSourceDefaults(record),
  });

  const type = useWatch({
    control: form.control,
    name: "type",
  });

  useEffect(() => {
    if (!open) return;
    form.reset(getSourceDefaults(record));
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑来源" : "新增来源"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            支持 FILE / MARKDOWN / DB，其中 DB 首版保留连接配置与连通性检测，不做自动切片任务。
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
              dbHost: values.dbHost,
              dbName: values.dbName,
            });
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">来源名称</label>
              <input className={inputClassName(Boolean(form.formState.errors.name?.message))} {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">来源类型</label>
              <select className={inputClassName(Boolean(form.formState.errors.type?.message))} {...form.register("type")}>
                <option value="MARKDOWN">Markdown</option>
                <option value="FILE">文件</option>
                <option value="DB">数据库连接</option>
              </select>
              <FieldError message={form.formState.errors.type?.message} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">说明</label>
            <textarea rows={3} className={inputClassName(Boolean(form.formState.errors.descr?.message))} {...form.register("descr")} />
            <FieldError message={form.formState.errors.descr?.message as string | undefined} />
          </div>

          {type === "MARKDOWN" ? (
            <div>
              <label className="mb-2 block text-sm font-medium">Markdown 正文</label>
              <textarea rows={8} className={inputClassName(Boolean(form.formState.errors.content?.message))} {...form.register("content")} />
              <FieldError message={form.formState.errors.content?.message as string | undefined} />
            </div>
          ) : null}

          {type === "FILE" ? (
            <div>
              <label className="mb-2 block text-sm font-medium">文件名</label>
              <input className={inputClassName(Boolean(form.formState.errors.fileName?.message))} placeholder="例如 requirement-v2.docx" {...form.register("fileName")} />
              <FieldError message={form.formState.errors.fileName?.message as string | undefined} />
            </div>
          ) : null}

          {type === "DB" ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">数据库主机</label>
                  <input className={inputClassName(Boolean(form.formState.errors.dbHost?.message))} placeholder="mysql.quiz.internal" {...form.register("dbHost")} />
                  <FieldError message={form.formState.errors.dbHost?.message as string | undefined} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">数据库名称</label>
                  <input className={inputClassName(Boolean(form.formState.errors.dbName?.message))} placeholder="knowledge_db" {...form.register("dbName")} />
                  <FieldError message={form.formState.errors.dbName?.message as string | undefined} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
                  onClick={async () => {
                    const dbHost = form.getValues("dbHost") || "";
                    const dbName = form.getValues("dbName") || "";
                    await onTestDb(dbHost, dbName);
                  }}
                  disabled={dbTestPending}
                >
                  {dbTestPending ? "连接检测中..." : "测试连接"}
                </button>
                {dbTestMessage ? <span className="text-sm text-muted-foreground">{dbTestMessage}</span> : null}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              onClick={() => {
                form.reset(getSourceDefaults(record));
                onClose();
              }}
            >
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "提交中..." : record ? "保存来源" : "新增来源"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SearchDialog({
  open,
  pending,
  result,
  onClose,
  onRun,
}: {
  open: boolean;
  pending: boolean;
  result: KnowledgeSearchResult | null;
  onClose: () => void;
  onRun: (values: KnowledgeSearchValues) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(knowledgeSearchSchema),
    defaultValues: {
      mode: "VECTOR",
      query: "",
      topK: 5,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      mode: "VECTOR",
      query: "",
      topK: 5,
    });
  }, [form, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">检索测试</h2>
          <p className="mt-1 text-sm text-muted-foreground">支持 VECTOR / TEXT 两种模式，首版结果由本地 mock store 生成。</p>
        </div>

        <form className="grid gap-4 px-6 py-5" onSubmit={form.handleSubmit(async (values) => onRun(values))}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">模式</label>
              <select className={inputClassName(Boolean(form.formState.errors.mode?.message))} {...form.register("mode")}>
                <option value="VECTOR">VECTOR</option>
                <option value="TEXT">TEXT</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">TopK</label>
              <input type="number" className={inputClassName(Boolean(form.formState.errors.topK?.message))} {...form.register("topK", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">查询词</label>
              <input className={inputClassName(Boolean(form.formState.errors.query?.message))} {...form.register("query")} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              关闭
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "检索中..." : "执行检索"}
            </button>
          </div>
        </form>

        <div className="border-t border-border px-6 py-5">
          <p className="mb-3 text-sm text-muted-foreground">结果</p>
          {result ? (
            result.hits.length > 0 ? (
              <div className="space-y-2">
                {result.hits.map((item) => (
                  <div key={item.sourceId} className="rounded-2xl border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{item.sourceName}</p>
                      <span className="text-xs text-muted-foreground">score: {item.score}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.snippet}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无命中来源。</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">尚未执行检索。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SyncDialog({
  open,
  pending,
  result,
  onClose,
  onRun,
}: {
  open: boolean;
  pending: boolean;
  result: VectorSyncCheckResult | null;
  onClose: () => void;
  onRun: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">向量同步检查</h2>
          <p className="mt-1 text-sm text-muted-foreground">用于检查来源、切片和向量之间的同步状态。</p>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-end gap-3">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              关闭
            </button>
            <button type="button" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" onClick={onRun} disabled={pending}>
              {pending ? "检查中..." : "执行检查"}
            </button>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">来源总数：{result.sourceTotal}</div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">成功来源：{result.successSources}</div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">处理中来源：{result.processingSources}</div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">失败来源：{result.failedSources}</div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">切片数：{result.chunkCount}</div>
                <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">向量数：{result.vectorCount}</div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">异常样本</p>
                {result.issues.length > 0 ? (
                  <div className="space-y-2">
                    {result.issues.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">[{item.type}] {item.sourceName}</p>
                        <p className="mt-1 text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未发现异常。</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">尚未执行同步检查。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatDialog({
  open,
  pending,
  messages,
  onClose,
  onAsk,
  onClear,
}: {
  open: boolean;
  pending: boolean;
  messages: KnowledgeChatMessage[];
  onClose: () => void;
  onAsk: (question: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(knowledgeChatQuestionSchema),
    defaultValues: {
      question: "",
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">知识集问答</h2>
          <p className="mt-1 text-sm text-muted-foreground">仅启用且存在成功来源时允许问答。</p>
        </div>

        <div className="space-y-3 border-b border-border px-6 py-5">
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-border bg-muted/20 p-3">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className={cn("rounded-xl border p-3 text-sm", message.role === "assistant" ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white")}>
                  <p className="font-medium">{message.role === "assistant" ? "助手" : "我"}</p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                  {message.citations.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">来源：{message.citations.map((item) => item.sourceName).join("、")}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂无对话消息。</p>
            )}
          </div>

          <form
            className="flex items-start gap-3"
            onSubmit={form.handleSubmit(async (values: KnowledgeChatQuestionValues) => {
              await onAsk(values.question);
              form.reset({ question: "" });
            })}
          >
            <textarea rows={3} className={cn(inputClassName(Boolean(form.formState.errors.question?.message)), "resize-none")} placeholder="输入你的问题" {...form.register("question")} />
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "发送中..." : "发送"}
            </button>
          </form>
          <FieldError message={form.formState.errors.question?.message as string | undefined} />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClear}>
            清空对话
          </button>
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export function KnowledgeSetManagementPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [setFilters, setSetFilters] = useState<KnowledgeSetListFilters>(defaultSetFilters);
  const [sourceFilters, setSourceFilters] = useState<KnowledgeSourceListFilters>(defaultSourceFilters);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [setEditing, setSetEditing] = useState<KnowledgeSetListItem | null>(null);

  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [sourceEditing, setSourceEditing] = useState<KnowledgeSourceListItem | null>(null);

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<KnowledgeSearchResult | null>(null);

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<VectorSyncCheckResult | null>(null);

  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [dbTestMessage, setDbTestMessage] = useState("");

  const setFilterForm = useForm<KnowledgeSetFilterInput, undefined, KnowledgeSetFilterValues>({
    resolver: zodResolver(knowledgeSetFilterSchema),
    defaultValues: defaultSetFilters,
  });

  const sourceFilterForm = useForm<KnowledgeSourceFilterInput, undefined, KnowledgeSourceFilterValues>({
    resolver: zodResolver(knowledgeSourceFilterSchema),
    defaultValues: defaultSourceFilters,
  });

  const setListQuery = useQuery({
    queryKey: queryKeys.knowledgeSets.list(setFilters),
    queryFn: () => listKnowledgeSets(setFilters),
  });

  const activeSetId = useMemo(() => {
    const items = setListQuery.data?.items ?? [];
    if (items.length === 0) {
      return null;
    }

    if (selectedSetId && items.some((item) => item.id === selectedSetId)) {
      return selectedSetId;
    }

    return items[0].id;
  }, [selectedSetId, setListQuery.data?.items]);

  const selectedSet = useMemo(
    () => setListQuery.data?.items.find((item) => item.id === activeSetId) ?? null,
    [activeSetId, setListQuery.data?.items],
  );

  const sourceListQuery = useQuery({
    queryKey: queryKeys.knowledgeSets.sources(activeSetId, sourceFilters),
    queryFn: () => listKnowledgeSources(activeSetId as string, sourceFilters),
    enabled: Boolean(activeSetId),
  });

  const chatQuery = useQuery({
    queryKey: queryKeys.knowledgeSets.chat(activeSetId),
    queryFn: () => getKnowledgeChatMessages(activeSetId as string),
    enabled: Boolean(activeSetId) && chatDialogOpen,
  });

  const setCreateMutation = useMutation({
    mutationFn: createKnowledgeSet,
    onSuccess: () => {
      setFeedback({ type: "success", message: "知识集创建成功" });
      setSetDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "知识集创建失败" });
    },
  });

  const setUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: KnowledgeSetMutationInput }) => updateKnowledgeSet(id, payload),
    onSuccess: () => {
      setFeedback({ type: "success", message: "知识集更新成功" });
      setSetDialogOpen(false);
      setSetEditing(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "知识集更新失败" });
    },
  });

  const setDeleteMutation = useMutation({
    mutationFn: deleteKnowledgeSet,
    onSuccess: () => {
      setFeedback({ type: "success", message: "知识集删除成功" });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.sourcesAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.chatAll });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "知识集删除失败" });
    },
  });

  const sourceCreateMutation = useMutation({
    mutationFn: ({ setId, payload }: { setId: string; payload: KnowledgeSourceMutationInput }) =>
      createKnowledgeSource(setId, payload),
    onSuccess: () => {
      setFeedback({ type: "success", message: "来源新增成功" });
      setSourceDialogOpen(false);
      setSourceEditing(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.sourcesAll });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "来源新增失败" });
    },
  });

  const sourceUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: KnowledgeSourceMutationInput }) => updateKnowledgeSource(id, payload),
    onSuccess: () => {
      setFeedback({ type: "success", message: "来源更新成功" });
      setSourceDialogOpen(false);
      setSourceEditing(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.sourcesAll });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "来源更新失败" });
    },
  });

  const sourceDeleteMutation = useMutation({
    mutationFn: deleteKnowledgeSource,
    onSuccess: () => {
      setFeedback({ type: "success", message: "来源删除成功" });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.sourcesAll });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "来源删除失败" });
    },
  });

  const dbTestMutation = useMutation({
    mutationFn: testKnowledgeDbConnection,
    onSuccess: (result) => {
      setDbTestMessage(result.message);
    },
    onError: (error) => {
      setDbTestMessage(error instanceof Error ? error.message : "连接检测失败");
    },
  });

  const searchMutation = useMutation({
    mutationFn: (values: KnowledgeSearchValues) =>
      runKnowledgeSearch({
        knowledgeSetId: activeSetId as string,
        mode: values.mode,
        query: values.query,
        topK: values.topK,
      }),
    onSuccess: (result) => {
      setSearchResult(result);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "检索失败" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => runVectorSyncCheck(activeSetId as string),
    onSuccess: (result) => {
      setSyncResult(result);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "同步检查失败" });
    },
  });

  const askMutation = useMutation({
    mutationFn: (question: string) => askKnowledgeSetQuestion(activeSetId as string, question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.chat(activeSetId) });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "问答失败" });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: () => clearKnowledgeSetChat(activeSetId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeSets.chat(activeSetId) });
      setFeedback({ type: "success", message: "对话已清空" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "清空失败" });
    },
  });

  const setRows = setListQuery.data?.items ?? [];
  const sourceRows = sourceListQuery.data?.items ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">知识集管理页</h1>
          <p className="text-sm text-muted-foreground">覆盖知识集 CRUD、来源治理、检索测试、同步检查和基于知识集的问答入口。</p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
          onClick={() => {
            setSetEditing(null);
            setSetDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          新增知识集
        </button>
      </div>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="知识集总数" value={String(setListQuery.data?.summary.total ?? 0)} hint="当前用户可访问的知识集" />
        <StatCard label="启用中" value={String(setListQuery.data?.summary.enabled ?? 0)} hint="可参与问答与检索" />
        <StatCard label="已禁用" value={String(setListQuery.data?.summary.disabled ?? 0)} hint="仅做归档或待整理" />
        <StatCard label="系统内置" value={String(setListQuery.data?.summary.system ?? 0)} hint="只读知识集，不可编辑删除" />
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
        <form
          className="grid gap-3 lg:grid-cols-5"
          onSubmit={setFilterForm.handleSubmit((values) => {
            setSetFilters({ ...values, page: 1 });
          })}
        >
          <div className="lg:col-span-2">
            <label className="mb-2 block text-xs font-medium text-muted-foreground">关键字</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={cn(inputClassName(), "pl-9")} placeholder="名称 / 描述 / 标签" {...setFilterForm.register("keyword")} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">状态</label>
            <select className={inputClassName()} {...setFilterForm.register("status")}>
              <option value="ALL">全部</option>
              <option value="ENABLED">启用</option>
              <option value="DISABLED">禁用</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">可见性</label>
            <select className={inputClassName()} {...setFilterForm.register("visibility")}>
              <option value="ALL">全部</option>
              <option value="PRIVATE">仅自己</option>
              <option value="PUBLIC">公开</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background">
              筛选
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
              onClick={() => {
                setFilterForm.reset(defaultSetFilters);
                setSetFilters(defaultSetFilters);
              }}
            >
              重置
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">知识集列表</h2>
            {setListQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>

          {setRows.length > 0 ? (
            <div className="space-y-3">
              {setRows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    activeSetId === item.id ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted/50",
                  )}
                  onClick={() => setSelectedSetId(item.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.isSystem ? <span className={cn("rounded-full border px-2 py-0.5 text-xs", badgeClassName("indigo"))}>系统内置</span> : null}
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs", badgeClassName(item.status === "ENABLED" ? "green" : "amber"))}>
                      {item.status === "ENABLED" ? "启用" : "禁用"}
                    </span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs", badgeClassName("neutral"))}>
                      {item.visibility === "PUBLIC" ? "公开" : "私有"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.descr || "暂无描述"}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>来源 {item.sourceCount}</span>
                    <span>成功来源 {item.successSourceCount}</span>
                    <span>创建人 {item.createUserName}</span>
                    <span>更新于 {formatDateTime(item.updateDate)}</span>
                  </div>
                </button>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  共 {setListQuery.data?.total ?? 0} 条 · 第 {setFilters.page} / {Math.max(1, Math.ceil((setListQuery.data?.total ?? 0) / setFilters.pageSize))} 页
                </span>

                <div className="flex items-center gap-2">
                  <select
                    className="rounded-xl border border-border bg-background px-2 py-1 text-sm"
                    value={setFilters.pageSize}
                    onChange={(event) => {
                      setSetFilters((prev) => ({
                        ...prev,
                        page: 1,
                        pageSize: Number(event.target.value),
                      }));
                    }}
                  >
                    {setPageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        每页 {option}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="rounded-xl border border-border p-1.5 text-muted-foreground disabled:opacity-40"
                    disabled={setFilters.page <= 1}
                    onClick={() => setSetFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-border p-1.5 text-muted-foreground disabled:opacity-40"
                    disabled={setFilters.page >= Math.max(1, Math.ceil((setListQuery.data?.total ?? 0) / setFilters.pageSize))}
                    onClick={() =>
                      setSetFilters((prev) => ({
                        ...prev,
                        page: Math.min(
                          Math.max(1, Math.ceil((setListQuery.data?.total ?? 0) / prev.pageSize)),
                          prev.page + 1,
                        ),
                      }))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              当前筛选条件下没有知识集。
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">详情与动作</h2>

          {selectedSet ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-base font-medium">{selectedSet.name}</p>
                <p className="text-sm text-muted-foreground">{selectedSet.descr || "暂无描述"}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSet.tags.length > 0 ? (
                    selectedSet.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">无标签</span>
                  )}
                </div>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>创建人：{selectedSet.createUserName}</p>
                <p>创建时间：{formatDateTime(selectedSet.createDate)}</p>
                <p>更新时间：{formatDateTime(selectedSet.updateDate)}</p>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium"
                  disabled={!selectedSet.canManageSources}
                  onClick={() => {
                    setSourceEditing(null);
                    setSourceDialogOpen(true);
                    setDbTestMessage("");
                  }}
                >
                  <FileStack className="h-4 w-4" />
                  新增来源
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium"
                  onClick={() => {
                    setSearchResult(null);
                    setSearchDialogOpen(true);
                  }}
                >
                  <Search className="h-4 w-4" />
                  检索测试
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium"
                  onClick={() => {
                    setSyncResult(null);
                    setSyncDialogOpen(true);
                  }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  同步检查
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium"
                  disabled={!selectedSet.canChat}
                  onClick={() => setChatDialogOpen(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                  知识集问答
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium"
                  disabled={!selectedSet.canEdit}
                  onClick={() => {
                    setSetEditing(selectedSet);
                    setSetDialogOpen(true);
                  }}
                >
                  <PencilLine className="h-4 w-4" />
                  编辑知识集
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
                  disabled={!selectedSet.canDelete || setDeleteMutation.isPending}
                  onClick={() => {
                    const confirmed = window.confirm(`确认删除知识集「${selectedSet.name}」？将同步删除来源与问答记录。`);
                    if (!confirmed) return;
                    setDeleteMutation.mutate(selectedSet.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  删除知识集
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              请先在左侧选择知识集。
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">来源管理</h2>
          {sourceListQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        <form
          className="mb-4 grid gap-3 lg:grid-cols-4"
          onSubmit={sourceFilterForm.handleSubmit((values) => {
            setSourceFilters({ ...values, page: 1 });
          })}
        >
          <div className="lg:col-span-2">
            <input className={inputClassName()} placeholder="来源名称 / 内容关键字" {...sourceFilterForm.register("keyword")} />
          </div>
          <div>
            <select className={inputClassName()} {...sourceFilterForm.register("status")}>
              <option value="ALL">全部状态</option>
              <option value="PENDING">PENDING</option>
              <option value="PARSING">PARSING</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background">
              筛选
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
              onClick={() => {
                sourceFilterForm.reset(defaultSourceFilters);
                setSourceFilters(defaultSourceFilters);
              }}
            >
              重置
            </button>
          </div>
        </form>

        {activeSetId ? (
          sourceRows.length > 0 ? (
            <div className="space-y-2">
              {sourceRows.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", badgeClassName("neutral"))}>{item.type}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs",
                          badgeClassName(item.status === "SUCCESS" ? "green" : item.status === "FAILED" ? "red" : "amber"),
                        )}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-xl border border-border px-2 py-1 text-xs"
                        disabled={!item.canEdit}
                        onClick={() => {
                          setSourceEditing(item);
                          setSourceDialogOpen(true);
                          setDbTestMessage("");
                        }}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-red-200 px-2 py-1 text-xs text-red-600"
                        disabled={!item.canDelete || sourceDeleteMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm(`确认删除来源「${item.name}」？`);
                          if (!confirmed) return;
                          sourceDeleteMutation.mutate(item.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">{item.descr || "暂无说明"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">更新于 {formatDateTime(item.updateDate)} · 创建人 {item.createUserName}</p>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  共 {sourceListQuery.data?.total ?? 0} 条 · 第 {sourceFilters.page} / {Math.max(1, Math.ceil((sourceListQuery.data?.total ?? 0) / sourceFilters.pageSize))} 页
                </span>

                <div className="flex items-center gap-2">
                  <select
                    className="rounded-xl border border-border bg-background px-2 py-1 text-sm"
                    value={sourceFilters.pageSize}
                    onChange={(event) => {
                      setSourceFilters((prev) => ({
                        ...prev,
                        page: 1,
                        pageSize: Number(event.target.value),
                      }));
                    }}
                  >
                    {sourcePageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        每页 {option}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="rounded-xl border border-border p-1.5 text-muted-foreground disabled:opacity-40"
                    disabled={sourceFilters.page <= 1}
                    onClick={() => setSourceFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-border p-1.5 text-muted-foreground disabled:opacity-40"
                    disabled={
                      sourceFilters.page >=
                      Math.max(1, Math.ceil((sourceListQuery.data?.total ?? 0) / sourceFilters.pageSize))
                    }
                    onClick={() =>
                      setSourceFilters((prev) => ({
                        ...prev,
                        page: Math.min(
                          Math.max(1, Math.ceil((sourceListQuery.data?.total ?? 0) / prev.pageSize)),
                          prev.page + 1,
                        ),
                      }))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              当前知识集下暂无来源。
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            请先选择知识集。
          </div>
        )}
      </section>

      <SetDialog
        open={setDialogOpen}
        record={setEditing}
        pending={setCreateMutation.isPending || setUpdateMutation.isPending}
        onClose={() => {
          setSetDialogOpen(false);
          setSetEditing(null);
        }}
        onSubmit={async (payload) => {
          if (setEditing) {
            await setUpdateMutation.mutateAsync({ id: setEditing.id, payload });
            return;
          }
          await setCreateMutation.mutateAsync(payload);
        }}
      />

      <SourceDialog
        open={sourceDialogOpen}
        record={sourceEditing}
        pending={sourceCreateMutation.isPending || sourceUpdateMutation.isPending}
        dbTestPending={dbTestMutation.isPending}
        dbTestMessage={dbTestMessage}
        onClose={() => {
          setSourceDialogOpen(false);
          setSourceEditing(null);
          setDbTestMessage("");
        }}
        onSubmit={async (payload) => {
          if (!activeSetId) {
            throw new Error("请先选择知识集");
          }
          if (sourceEditing) {
            await sourceUpdateMutation.mutateAsync({ id: sourceEditing.id, payload });
            return;
          }
          await sourceCreateMutation.mutateAsync({ setId: activeSetId, payload });
        }}
        onTestDb={async (dbHost, dbName) => {
          const result = await dbTestMutation.mutateAsync({ dbHost, dbName });
          setDbTestMessage(result.message);
        }}
      />

      <SearchDialog
        open={searchDialogOpen}
        pending={searchMutation.isPending}
        result={searchResult}
        onClose={() => setSearchDialogOpen(false)}
        onRun={async (values) => {
          if (!activeSetId) {
            throw new Error("请先选择知识集");
          }
          await searchMutation.mutateAsync(values);
        }}
      />

      <SyncDialog
        open={syncDialogOpen}
        pending={syncMutation.isPending}
        result={syncResult}
        onClose={() => setSyncDialogOpen(false)}
        onRun={async () => {
          if (!activeSetId) {
            throw new Error("请先选择知识集");
          }
          await syncMutation.mutateAsync();
        }}
      />

      <ChatDialog
        open={chatDialogOpen}
        pending={askMutation.isPending}
        messages={chatQuery.data ?? []}
        onClose={() => setChatDialogOpen(false)}
        onAsk={async (question) => {
          await askMutation.mutateAsync(question);
        }}
        onClear={async () => {
          await clearChatMutation.mutateAsync();
        }}
      />

      <section className="rounded-[28px] border border-dashed border-border bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">本页能力边界</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>已覆盖：知识集 CRUD、系统内置只读、来源管理、DB 连接测试、检索测试、同步检查、知识集问答。</li>
          <li>未覆盖：DB 自动切片与向量化任务、跨知识集全局问答聚合、真实向量引擎回写。</li>
        </ul>
      </section>
    </main>
  );
}
