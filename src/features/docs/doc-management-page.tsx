"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { docFilterSchema, docFormSchema, type DocFilterInput, type DocFilterValues, type DocFormInput, type DocFormValues } from "@/features/docs/schema";
import { createDoc, deleteDoc, fetchDocList, updateDoc } from "@/features/docs/api/client";
import type { DocListFilters, DocListItem, DocMutationInput, DocStatus, DocType } from "@/features/docs/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [8, 12, 24] as const;

const typeOptions: Array<{ label: string; value: "ALL" | DocType }> = [
  { label: "全部类型", value: "ALL" },
  { label: "文档", value: "DOC" },
  { label: "图片", value: "IMAGE" },
  { label: "PDF", value: "PDF" },
  { label: "其他", value: "OTHER" },
];

const statusOptions: Array<{ label: string; value: "ALL" | DocStatus }> = [
  { label: "全部状态", value: "ALL" },
  { label: "草稿", value: "DRAFT" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "已归档", value: "ARCHIVED" },
];

const defaultFilters: DocListFilters = {
  keyword: "",
  type: "ALL",
  status: "ALL",
  page: 1,
  pageSize: 8,
};

type FeedbackState = { type: "success" | "error"; message: string } | null;

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
  const tone =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", tone)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{feedback.message}</div>
      <button type="button" className="text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function statusBadgeClassName(status: DocStatus) {
  if (status === "DRAFT") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "PUBLISHED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function typeBadgeClassName(type: DocType) {
  if (type === "DOC") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (type === "IMAGE") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (type === "PDF") return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function normalizeMutationInput(values: DocFormValues): DocMutationInput {
  return {
    title: values.title.trim(),
    type: values.type,
    status: values.status,
    description: values.description?.trim() || "",
    content: values.content?.trim() || "",
  };
}

function getDocFormDefaults(record?: DocListItem | null): DocFormValues {
  return {
    title: record?.title ?? "",
    type: record?.type ?? "DOC",
    status: record?.status ?? "DRAFT",
    description: record?.description ?? "",
    content: record?.content ?? "",
  };
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="rounded-3xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function DocDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: DocListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: DocMutationInput) => Promise<void>;
}) {
  const form = useForm<DocFormInput, undefined, DocFormValues>({
    resolver: zodResolver(docFormSchema),
    defaultValues: getDocFormDefaults(record),
  });

  const isEdit = Boolean(record);

  useEffect(() => {
    if (!open) return;
    form.reset(getDocFormDefaults(record));
  }, [open, record, form]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? "编辑文档" : "新增文档"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            本页只处理轻量文档台账，不承载 FuncDoc 解析流水线或文件系统级能力。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(normalizeMutationInput(values));
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">文档名称</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.title?.message))}
              placeholder="例如：API 设计规范（v2）"
              {...form.register("title")}
            />
            <FieldError message={form.formState.errors.title?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">文档类型</label>
              <select className={inputClassName(Boolean(form.formState.errors.type?.message))} {...form.register("type")}>
                {typeOptions
                  .filter((item) => item.value !== "ALL")
                  .map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
              </select>
              <FieldError message={form.formState.errors.type?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">文档状态</label>
              <select
                className={inputClassName(Boolean(form.formState.errors.status?.message))}
                {...form.register("status")}
              >
                {statusOptions
                  .filter((item) => item.value !== "ALL")
                  .map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
              </select>
              <FieldError message={form.formState.errors.status?.message} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea
              rows={3}
              className={inputClassName(Boolean(form.formState.errors.description?.message))}
              placeholder="简要说明文档用途和适用边界"
              {...form.register("description")}
            />
            <FieldError message={form.formState.errors.description?.message as string | undefined} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">正文内容</label>
            <textarea
              rows={8}
              className={inputClassName(Boolean(form.formState.errors.content?.message))}
              placeholder="输入文档主体内容，首版为纯文本记录。"
              {...form.register("content")}
            />
            <FieldError message={form.formState.errors.content?.message as string | undefined} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              onClick={() => {
                form.reset(getDocFormDefaults(record));
                onClose();
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isEdit ? "保存修改" : "创建文档"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  open,
  record,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  record: DocListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除文档</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            删除仅影响当前用户文档记录，不会删除 FuncDoc 模块或文件管理模块的资产。
          </p>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm text-muted-foreground">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="font-medium text-foreground">{record.title}</p>
            <p className="mt-1">类型：{record.type}</p>
            <p className="mt-1">状态：{record.status}</p>
            <p className="mt-1">最后更新：{formatDateTime(record.updatedAt)}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            删除后不可恢复，请确认该记录已不再需要。
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onConfirm}
          >
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocManagementPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DocListFilters>(defaultFilters);
  const [editingDoc, setEditingDoc] = useState<DocListItem | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const filterForm = useForm<DocFilterInput, undefined, DocFilterValues>({
    resolver: zodResolver(docFilterSchema),
    defaultValues: defaultFilters,
  });

  useEffect(() => {
    filterForm.reset(filters);
  }, [filters, filterForm]);

  const listQuery = useQuery({
    queryKey: queryKeys.docs.list(filters),
    queryFn: () => fetchDocList(filters),
  });

  const createMutation = useMutation({
    mutationFn: createDoc,
    onSuccess: async () => {
      setDialogOpen(false);
      setEditingDoc(null);
      setFeedback({ type: "success", message: "文档已创建" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.docs.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败，请稍后重试" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DocMutationInput }) => updateDoc(id, payload),
    onSuccess: async () => {
      setDialogOpen(false);
      setEditingDoc(null);
      setFeedback({ type: "success", message: "文档已更新" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.docs.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败，请稍后重试" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDoc,
    onSuccess: async () => {
      setDeletingDoc(null);
      setFeedback({ type: "success", message: "文档已删除" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.docs.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败，请稍后重试" });
    },
  });

  const summary = listQuery.data?.summary;
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const mutationPending = createMutation.isPending || updateMutation.isPending;

  const filterStatus = useMemo(
    () => ({
      hasKeyword: Boolean(filters.keyword),
      hasType: filters.type !== "ALL",
      hasState: filters.status !== "ALL",
    }),
    [filters],
  );

  async function handleDocSubmit(payload: DocMutationInput) {
    if (editingDoc) {
      await updateMutation.mutateAsync({ id: editingDoc.id, payload });
      return;
    }
    await createMutation.mutateAsync(payload);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>

      <section className="rounded-[32px] border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Doc Management
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">个人文档台账</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              保留旧版文档列表与筛选语义，重构为真实 Route Handler + TanStack Query 的可维护闭环。该页不承担 FuncDoc 解析流程和文件管理职责。
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
            onClick={() => {
              setEditingDoc(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            新增文档
          </button>
        </div>

        <div className="mt-6">
          <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SummaryCard label="总文档数" value={String(summary?.total ?? 0)} hint="当前登录用户可访问文档" />
          <SummaryCard
            label="草稿 / 已发布"
            value={`${summary?.draft ?? 0} / ${summary?.published ?? 0}`}
            hint="草稿用于迭代，发布用于共享查阅"
          />
          <SummaryCard
            label="已归档"
            value={String(summary?.archived ?? 0)}
            hint="保留历史记录，不参与当前维护"
          />
        </div>

        <form
          className="mt-8 grid gap-4 rounded-[28px] border border-border bg-card p-5 lg:grid-cols-[1.8fr_1fr_1fr_auto]"
          onSubmit={filterForm.handleSubmit((values) => {
            const parsed = docFilterSchema.parse(values);
            setFilters({
              keyword: parsed.keyword,
              type: parsed.type,
              status: parsed.status,
              page: 1,
              pageSize: filters.pageSize,
            });
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">关键词</label>
            <input
              className={inputClassName(Boolean(filterForm.formState.errors.keyword?.message))}
              placeholder="搜索文档名称、描述或正文"
              {...filterForm.register("keyword")}
            />
            <FieldError message={filterForm.formState.errors.keyword?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">文档类型</label>
            <select className={inputClassName(Boolean(filterForm.formState.errors.type?.message))} {...filterForm.register("type")}>
              {typeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">文档状态</label>
            <select
              className={inputClassName(Boolean(filterForm.formState.errors.status?.message))}
              {...filterForm.register("status")}
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
            >
              <Search className="h-4 w-4" />
              查询
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium transition hover:bg-muted"
              onClick={() => {
                filterForm.reset(defaultFilters);
                setFilters(defaultFilters);
              }}
            >
              重置
            </button>
          </div>
        </form>

        <div className="mt-3 text-xs text-muted-foreground">
          当前筛选：{filterStatus.hasKeyword || filterStatus.hasType || filterStatus.hasState ? "已设置筛选条件" : "全部文档"}
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">描述/正文摘要</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                  <th className="px-4 py-3 font-medium">创建者</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        正在加载文档列表...
                      </span>
                    </td>
                  </tr>
                ) : listQuery.isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-red-600">
                      {listQuery.error instanceof Error ? listQuery.error.message : "查询失败，请稍后重试"}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                      当前筛选条件下暂无文档记录。
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/70 align-top"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">创建于 {formatDateTime(item.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", typeBadgeClassName(item.type))}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                            statusBadgeClassName(item.status),
                          )}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="line-clamp-2 text-foreground">{item.description || "未填写描述"}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.contentPreview}</p>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{formatDateTime(item.updatedAt)}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.createdByName}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                            onClick={() => {
                              setEditingDoc(item);
                              setDialogOpen(true);
                            }}
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            编辑
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            onClick={() => {
                              setDeletingDoc(item);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              共 {total} 条，第 {filters.page} / {totalPages} 页
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-border bg-background px-2.5 py-2 text-sm"
                value={filters.pageSize}
                onChange={(event) => {
                  const nextPageSize = Number(event.target.value);
                  setFilters((prev) => ({
                    ...prev,
                    page: 1,
                    pageSize: nextPageSize,
                  }));
                }}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    每页 {size} 条
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={filters.page <= 1 || listQuery.isLoading}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </button>
              <button
                type="button"
                disabled={filters.page >= totalPages || listQuery.isLoading}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <DocDialog
        open={dialogOpen}
        record={editingDoc}
        pending={mutationPending}
        onClose={() => {
          if (mutationPending) return;
          setDialogOpen(false);
          setEditingDoc(null);
        }}
        onSubmit={handleDocSubmit}
      />

      <DeleteDialog
        open={Boolean(deletingDoc)}
        record={deletingDoc}
        pending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setDeletingDoc(null);
        }}
        onConfirm={async () => {
          if (!deletingDoc) return;
          await deleteMutation.mutateAsync(deletingDoc.id);
        }}
      />
    </main>
  );
}

