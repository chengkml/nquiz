"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Link2,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  checkGroupNameUnique,
  createGroup,
  deleteGroup,
  listGroupOptions,
  listGroups,
  updateGroup,
} from "@/features/group/mock-service";
import {
  groupFilterSchema,
  groupFormSchema,
  type GroupFilterInput,
  type GroupFilterValues,
  type GroupFormInput,
  type GroupFormValues,
} from "@/features/group/schema";
import type { GroupListItem, GroupMutationInput } from "@/features/group/types";

const pageSizeOptions = [6, 12, 24] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

function formatDateTime(value?: string) {
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

function typeBadgeClass(type: string) {
  const normalized = type.trim().toLowerCase();
  if (normalized === "mindmap") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (normalized === "mermaid") return "border-violet-200 bg-violet-50 text-violet-700";
  if (normalized === "tag") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "homework") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized) return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-border bg-muted text-muted-foreground";
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

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-3xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function normalizeMutationInput(values: GroupFormValues): GroupMutationInput {
  return {
    name: values.name.trim().toLowerCase(),
    label: values.label.trim(),
    type: values.type?.trim().toLowerCase() ?? "",
    descr: values.descr?.trim() ?? "",
  };
}

function getFormDefaults(record?: GroupListItem | null): GroupFormValues {
  return {
    name: record?.name ?? "",
    label: record?.label ?? "",
    type: record?.type ?? "",
    descr: record?.descr ?? "",
  };
}

function GroupDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: GroupListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: GroupMutationInput) => Promise<void>;
}) {
  const form = useForm<GroupFormInput, undefined, GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: getFormDefaults(record),
  });
  const [nameChecking, setNameChecking] = useState(false);
  const isEdit = Boolean(record);

  useEffect(() => {
    if (!open) return;
    form.reset(getFormDefaults(record));
  }, [open, record, form]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? "编辑分组" : "新增分组"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保留 quiz 的用户级分组语义，同时修正旧系统唯一性校验缺陷，统一按“同一用户 + 同类型 + 同编码”判重。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            const payload = normalizeMutationInput(values);
            setNameChecking(true);
            try {
              if (!isEdit || payload.name !== record?.name || payload.type !== (record.type || "")) {
                const unique = await checkGroupNameUnique(payload.name, payload.type, record?.id);
                if (!unique) {
                  form.setError("name", { message: "同类型下该分组编码已存在" });
                  return;
                }
              }
            } finally {
              setNameChecking(false);
            }
            await onSubmit(payload);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">分组编码</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.name?.message))}
              placeholder="例如 mindmap_product"
              disabled={isEdit}
              {...form.register("name")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              作为稳定标识参与下游对象关联。创建后默认不可修改，避免打断历史挂组关系。
            </p>
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">分组名称</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.label?.message))}
              placeholder="例如 产品思维导图"
              {...form.register("label")}
            />
            <FieldError message={form.formState.errors.label?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">类型</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.type?.message))}
              placeholder="例如 mindmap / mermaid / tag，可留空"
              {...form.register("type")}
            />
            <p className="mt-1 text-xs text-muted-foreground">类型由业务模块约定，不强行限制枚举，后续页面可按 type 拉取分组选项。</p>
            <FieldError message={form.formState.errors.type?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea
              rows={5}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              placeholder="补充分组用途、下游业务对象和迁移约束说明"
              {...form.register("descr")}
            />
            <FieldError message={form.formState.errors.descr?.message as string | undefined} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                form.reset(getFormDefaults(record));
                onClose();
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending || nameChecking}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(pending || nameChecking) && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isEdit ? "保存修改" : "创建分组"}
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
  record: GroupListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除分组</h2>
          <p className="mt-1 text-sm text-muted-foreground">删除将同步清理该分组下的对象关联，避免遗留孤儿关系数据。</p>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-muted-foreground">
          <div className="rounded-3xl border border-border bg-muted/40 p-4">
            <p className="font-medium text-foreground">{record.label}</p>
            <p className="mt-1 font-mono text-xs">{record.name}</p>
            <p className="mt-2">类型：{record.type || "未分类"}</p>
            <p className="mt-1">关联对象：{record.relationCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
            请确认当前对象是否可脱离该分组。首版采用“允许删除并同步清理关联”策略。
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

function GroupCard({
  item,
  onEdit,
  onDelete,
}: {
  item: GroupListItem;
  onEdit: (record: GroupListItem) => void;
  onDelete: (record: GroupListItem) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="flex h-full flex-col rounded-[28px] border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", typeBadgeClass(item.type))}>
            {item.type || "未分类"}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground">
              {item.name}
            </span>
            <span>更新于 {formatDateTime(item.updateDate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-2xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => onEdit(item)}
            aria-label={`编辑 ${item.label}`}
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-2xl border border-border p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
            onClick={() => onDelete(item)}
            aria-label={`删除 ${item.label}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h3 className="mt-4 text-lg font-semibold">{item.label}</h3>
      <p className="mt-2 line-clamp-4 text-sm leading-7 text-muted-foreground">
        {item.descr || "暂无描述。建议说明该分组服务的业务对象与边界，便于后续菜单迁移复用。"}
      </p>

      <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
        <p className="text-xs text-muted-foreground">关联对象数</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{item.relationCount}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>创建人：{item.createUserName}</span>
        <span>创建时间：{formatDateTime(item.createDate)}</span>
      </div>
    </motion.article>
  );
}

export function GroupManagementPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [filters, setFilters] = useState<GroupFilterValues>({
    keyword: "",
    type: "",
    page: 1,
    pageSize: 6,
  });
  const [editingRecord, setEditingRecord] = useState<GroupListItem | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<GroupListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filterForm = useForm<GroupFilterInput, undefined, GroupFilterValues>({
    resolver: zodResolver(groupFilterSchema),
    defaultValues: filters,
  });

  const groupListQuery = useQuery({
    queryKey: queryKeys.groups.list(filters),
    queryFn: () => listGroups(filters),
  });

  const groupOptionsQuery = useQuery({
    queryKey: queryKeys.groups.options(""),
    queryFn: () => listGroupOptions(),
  });

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setFeedback({ type: "success", message: "分组创建成功。" });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建分组失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GroupMutationInput }) => updateGroup(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setFeedback({ type: "success", message: "分组更新成功。" });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新分组失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setFeedback({
        type: "success",
        message:
          result.removedRelations > 0
            ? `分组删除成功，已同步清理 ${result.removedRelations} 条关联。`
            : "分组删除成功。",
      });
      setDeletingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除分组失败" });
    },
  });

  const typeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const option of groupOptionsQuery.data ?? []) {
      const type = option.type.trim();
      if (type) values.add(type);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [groupOptionsQuery.data]);

  const totalPages = useMemo(() => {
    const total = groupListQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / filters.pageSize));
  }, [groupListQuery.data?.total, filters.pageSize]);

  const summary = groupListQuery.data?.summary;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-border bg-background p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Link>
              <div className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                GroupManagement · nquiz 迁移首版
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">分组管理</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  作为通用基础设施迁移：保留“当前用户自己的分组字典”语义，补齐 type 维度和对象关联统计，并提供可复用的分组选项查询能力。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                onClick={() => groupListQuery.refetch()}
              >
                <Search className="h-4 w-4" />
                刷新列表
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
                onClick={() => {
                  setEditingRecord(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新增分组
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="当前用户分组数"
            value={String(summary?.totalGroups ?? 0)}
            hint="保持旧系统用户隔离语义，不提升为跨用户共享分组。"
          />
          <StatCard
            label="分组类型数"
            value={String(summary?.totalTypes ?? 0)}
            hint="支持自由 type，供 MindMap / Mermaid / Tag 等业务按类型复用。"
          />
          <StatCard
            label="对象关联总量"
            value={String(summary?.totalRelations ?? 0)}
            hint="删除分组时同步清理关联，避免孤儿关系残留。"
          />
        </section>

        <section className="rounded-[32px] border border-border bg-background p-6 shadow-sm">
          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]"
            onSubmit={filterForm.handleSubmit((values) => {
              setFilters({ ...values, page: 1 });
            })}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-10")}
                  placeholder="匹配编码 / 名称 / 类型 / 描述"
                  {...filterForm.register("keyword")}
                />
              </div>
              <FieldError message={filterForm.formState.errors.keyword?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">类型</label>
              <select className={inputClassName(false)} {...filterForm.register("type")}>
                <option value="">全部类型</option>
                {typeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">每页条数</label>
              <select
                className={inputClassName(false)}
                {...filterForm.register("pageSize", {
                  setValueAs: (value) => Number(value),
                })}
              >
                {pageSizeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item} 条 / 页
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="button"
                className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                onClick={() => {
                  const next = { keyword: "", type: "", page: 1, pageSize: filters.pageSize };
                  filterForm.reset(next);
                  setFilters(next);
                }}
              >
                重置
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                查询
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[32px] border border-border bg-background p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">分组列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                当前共 {groupListQuery.data?.total ?? 0} 条匹配记录，首版采用卡片化信息结构，优先强调类型语义和下游复用边界。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                <FolderTree className="h-3.5 w-3.5" /> 分组基础设施
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                <Link2 className="h-3.5 w-3.5" /> 对象关联可清理
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                <Workflow className="h-3.5 w-3.5" /> 当前为 mock 闭环
              </span>
            </div>
          </div>

          {groupListQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              正在加载分组列表...
            </div>
          ) : groupListQuery.data && groupListQuery.data.items.length > 0 ? (
            <>
              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {groupListQuery.data.items.map((item) => (
                  <GroupCard
                    key={item.id}
                    item={item}
                    onEdit={(record) => {
                      setEditingRecord(record);
                      setDialogOpen(true);
                    }}
                    onDelete={(record) => setDeletingRecord(record)}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  第 {filters.page} / {totalPages} 页 · 共 {groupListQuery.data.total} 条
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={filters.page <= 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" /> 上一页
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={filters.page >= totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    下一页 <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border px-6 py-18 text-center text-sm text-muted-foreground">
              当前没有匹配的分组。你可以直接新增分组，或清空筛选条件后重试。
            </div>
          )}
        </section>
      </div>

      <GroupDialog
        open={dialogOpen}
        record={editingRecord}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setDialogOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={async (payload) => {
          if (editingRecord) {
            await updateMutation.mutateAsync({ id: editingRecord.id, payload });
            return;
          }
          await createMutation.mutateAsync(payload);
        }}
      />

      <DeleteDialog
        open={Boolean(deletingRecord)}
        record={deletingRecord}
        pending={deleteMutation.isPending}
        onClose={() => setDeletingRecord(null)}
        onConfirm={async () => {
          if (!deletingRecord) return;
          await deleteMutation.mutateAsync(deletingRecord.id);
        }}
      />
    </div>
  );
}
