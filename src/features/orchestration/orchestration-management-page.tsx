"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  LoaderCircle,
  PencilLine,
  Play,
  Plus,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";
import { orchestrationStatusMeta } from "@/features/orchestration/constants";
import {
  orchestrationRunFormSchema,
  orchestrationWorkflowFormSchema,
  type OrchestrationRunFormInput,
  type OrchestrationRunFormValues,
  type OrchestrationWorkflowFormInput,
  type OrchestrationWorkflowFormValues,
} from "@/features/orchestration/schema";
import {
  createOrchestrationWorkflow,
  deleteOrchestrationWorkflow,
  getOrchestrationWorkflowDetail,
  listOrchestrationWorkflowRuns,
  listOrchestrationWorkflowVersions,
  listOrchestrationWorkflows,
  runOrchestrationWorkflow,
  updateOrchestrationWorkflow,
} from "@/features/orchestration/mock-service";
import type {
  OrchestrationWorkflowFilters,
  OrchestrationWorkflowListItem,
  OrchestrationWorkflowRunEntity,
  OrchestrationWorkflowVersionEntity,
} from "@/features/orchestration/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [4, 6, 8] as const;

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

function formatDuration(ms?: number) {
  if (!ms) return "-";
  return `${(ms / 1000).toFixed(1)}s`;
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function textareaClassName(hasError = false) {
  return cn(inputClassName(hasError), "min-h-28 resize-y");
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
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-[28px] border border-border bg-background/95 p-5 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function WorkflowStatusBadge({ status }: { status: OrchestrationWorkflowListItem["status"] }) {
  const meta = orchestrationStatusMeta[status];
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>;
}

function RunStatusBadge({ status }: { status?: OrchestrationWorkflowRunEntity["status"] }) {
  if (!status) {
    return <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">未运行</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "SUCCESS" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {status === "SUCCESS" ? "运行成功" : "运行失败"}
    </span>
  );
}

function WorkflowDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: OrchestrationWorkflowListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: OrchestrationWorkflowFormValues) => Promise<void>;
}) {
  const form = useForm<OrchestrationWorkflowFormInput, undefined, OrchestrationWorkflowFormValues>({
    resolver: zodResolver(orchestrationWorkflowFormSchema),
    defaultValues: {
      code: record?.code ?? "",
      name: record?.name ?? "",
      description: record?.description ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      code: record?.code ?? "",
      name: record?.name ?? "",
      description: record?.description ?? "",
    });
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑工作流" : "新建工作流"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            工作流台账只维护基础信息；画布、版本和运行反馈都放到独立编辑器里处理。
          </p>
        </div>

        <form className="grid gap-4 px-6 py-5 md:grid-cols-2" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div>
            <label className="mb-2 block text-sm font-medium">编码</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.code?.message))}
              disabled={Boolean(record)}
              placeholder="例如 study-coach"
              {...form.register("code")}
            />
            <p className="mt-1 text-xs text-muted-foreground">编码用于沉淀可追踪的工作流身份，编辑态保持只读。</p>
            <FieldError message={form.formState.errors.code?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">名称</label>
            <input className={inputClassName(Boolean(form.formState.errors.name?.message))} {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea
              className={textareaClassName(Boolean(form.formState.errors.description?.message))}
              placeholder="说明这个工作流的目标、使用场景与边界。"
              {...form.register("description")}
            />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "提交中..." : record ? "保存修改" : "创建工作流"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RunDialog({
  open,
  workflow,
  versions,
  versionsLoading,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  workflow?: OrchestrationWorkflowListItem | null;
  versions: OrchestrationWorkflowVersionEntity[];
  versionsLoading: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: OrchestrationRunFormValues) => Promise<void>;
}) {
  const form = useForm<OrchestrationRunFormInput, undefined, OrchestrationRunFormValues>({
    resolver: zodResolver(orchestrationRunFormSchema),
    defaultValues: {
      versionId: workflow?.currentVersionId,
      inputText: "",
      variablesJson: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      versionId: workflow?.currentVersionId || versions[0]?.id,
      inputText: "",
      variablesJson: "",
    });
  }, [form, open, versions, workflow]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">手动运行工作流</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {workflow ? `当前目标：${workflow.name}` : "请在列表中先选择一个工作流。"}
          </p>
        </div>

        <form className="grid gap-4 px-6 py-5" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div>
            <label className="mb-2 block text-sm font-medium">运行版本</label>
            <select className={inputClassName(Boolean(form.formState.errors.versionId?.message))} disabled={versionsLoading} {...form.register("versionId")}>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} · {version.remark}
                </option>
              ))}
            </select>
            {versionsLoading ? <p className="mt-1 text-xs text-muted-foreground">版本列表加载中...</p> : null}
            <FieldError message={form.formState.errors.versionId?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">运行输入</label>
            <textarea
              className={textareaClassName(Boolean(form.formState.errors.inputText?.message))}
              placeholder="例如：帮我整理今天的 AI Agent 趋势简报"
              {...form.register("inputText")}
            />
            <FieldError message={form.formState.errors.inputText?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">额外变量 JSON</label>
            <textarea
              className={textareaClassName(Boolean(form.formState.errors.variablesJson?.message))}
              placeholder='例如：{"scene":"teacher"}'
              {...form.register("variablesJson")}
            />
            <FieldError message={form.formState.errors.variablesJson?.message} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending || versionsLoading || versions.length === 0}>
              {pending ? "运行中..." : "开始运行"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  open,
  workflow,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  workflow?: OrchestrationWorkflowListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !workflow) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">删除工作流</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          删除后会一并移除该工作流下的版本与运行记录。当前目标：<span className="font-medium text-foreground">{workflow.name}</span>
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
            取消
          </button>
          <button type="button" className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50" disabled={pending} onClick={() => onConfirm()}>
            {pending ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrchestrationManagementPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OrchestrationWorkflowFilters>({
    keyword: "",
    status: "ALL",
    page: 1,
    pageSize: 6,
  });
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<OrchestrationWorkflowListItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [runWorkflowId, setRunWorkflowId] = useState<string | null>(null);
  const [deleteWorkflowItem, setDeleteWorkflowItem] = useState<OrchestrationWorkflowListItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.orchestration.list(filters),
    queryFn: () => listOrchestrationWorkflows(filters),
  });

  const activeWorkflowId =
    selectedWorkflowId && listQuery.data?.items.some((item) => item.id === selectedWorkflowId)
      ? selectedWorkflowId
      : listQuery.data?.items[0]?.id ?? null;

  const detailQuery = useQuery({
    queryKey: queryKeys.orchestration.detail(activeWorkflowId),
    queryFn: () => getOrchestrationWorkflowDetail(activeWorkflowId!),
    enabled: Boolean(activeWorkflowId),
  });

  const runVersionsQuery = useQuery({
    queryKey: queryKeys.orchestration.versions(runWorkflowId),
    queryFn: () => listOrchestrationWorkflowVersions(runWorkflowId!),
    enabled: Boolean(runWorkflowId),
  });

  const runRecordsQuery = useQuery({
    queryKey: queryKeys.orchestration.runs(activeWorkflowId),
    queryFn: () => listOrchestrationWorkflowRuns(activeWorkflowId!, 8),
    enabled: Boolean(activeWorkflowId),
  });

  const createMutation = useMutation({
    mutationFn: createOrchestrationWorkflow,
    onSuccess: async (workflow) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.all });
      setCreateDialogOpen(false);
      setSelectedWorkflowId(workflow.id);
      setFeedback({ type: "success", message: "工作流已创建。下一步建议直接进入编辑器补版本与节点。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "工作流创建失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: OrchestrationWorkflowFormValues) => updateOrchestrationWorkflow(editingWorkflow!.id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.all });
      setEditingWorkflow(null);
      setFeedback({ type: "success", message: "工作流基础信息已更新。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "工作流更新失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteOrchestrationWorkflow(deleteWorkflowItem!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.all });
      setFeedback({ type: "success", message: "工作流及其版本、运行记录已删除。" });
      setDeleteWorkflowItem(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "工作流删除失败" });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (values: OrchestrationRunFormValues) => runOrchestrationWorkflow(runWorkflowId!, values),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.all });
      if (runWorkflowId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.detail(runWorkflowId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.runs(runWorkflowId) });
      }
      setRunWorkflowId(null);
      setFeedback({
        type: run.status === "SUCCESS" ? "success" : "error",
        message: run.status === "SUCCESS" ? "工作流运行成功，结果已写入最近运行记录。" : run.errorSummary || "工作流运行失败。",
      });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "工作流运行失败" });
    },
  });

  const selectedWorkflow = activeWorkflowId && detailQuery.data?.workflow.id === activeWorkflowId ? detailQuery.data.workflow : null;
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / filters.pageSize)) : 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f3f9ff_0%,#fff7ed_38%,#f8fafc_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-[36px] border border-white/70 bg-white/80 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-700">
                <Workflow className="h-4 w-4" />
                AI Orchestration Workbench
              </span>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  编排管理不再只是“列表 + 空画布入口”，而是一个能看版本、能跑手动执行、能追运行结果的工作台。
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600">
                  首版保留工作流台账、版本化画布、发布、手动运行四条主线；同时把图结构统一成标准 schema，避免旧 quiz 那种前端能画、运行却不稳的断层。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  setEditingWorkflow(null);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新建工作流
              </button>
              {selectedWorkflow ? (
                <Link
                  href={`/orchestration/${selectedWorkflow.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  进入编辑器
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </motion.section>

        <div className="mt-6">
          <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="工作流总数" value={String(listQuery.data?.summary.totalWorkflows ?? 0)} hint="当前登录用户可维护的全部编排台账。" />
          <StatCard label="待发布版本" value={String(listQuery.data?.summary.pendingWorkflows ?? 0)} hint="已形成新版本，但还没发布成线上版本的工作流。" />
          <StatCard label="已发布工作流" value={String(listQuery.data?.summary.publishedWorkflows ?? 0)} hint="可以直接手动运行并观察结果的工作流数量。" />
          <StatCard label="运行记录" value={String(listQuery.data?.summary.totalRuns ?? 0)} hint="用于调试回看，避免只剩 toast 没有执行上下文。" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-5">
            <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={filters.keyword}
                    onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value, page: 1 }))}
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                    placeholder="按编码、名称或描述检索工作流"
                  />
                </label>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: event.target.value as OrchestrationWorkflowFilters["status"],
                      page: 1,
                    }))
                  }
                  className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5 lg:w-44"
                >
                  <option value="ALL">全部状态</option>
                  {Object.entries(orchestrationStatusMeta).map(([status, meta]) => (
                    <option key={status} value={status}>
                      {meta.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.pageSize}
                  onChange={(event) => setFilters((prev) => ({ ...prev, pageSize: Number(event.target.value), page: 1 }))}
                  className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5 lg:w-36"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      每页 {size} 条
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4">
              {listQuery.isLoading ? (
                <div className="rounded-[32px] border border-white/70 bg-white/85 p-10 text-center shadow-sm backdrop-blur">
                  <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-slate-500" />
                  <p className="mt-3 text-sm text-muted-foreground">编排工作流加载中...</p>
                </div>
              ) : null}

              {!listQuery.isLoading && listQuery.data?.items.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/75 p-10 text-center">
                  <p className="text-lg font-medium text-slate-900">当前筛选下没有工作流</p>
                  <p className="mt-2 text-sm text-slate-500">可以先创建一个工作流，再进入编辑器搭节点与版本。</p>
                </div>
              ) : null}

              {listQuery.data?.items.map((item) => (
                <motion.article
                  key={item.id}
                  layout
                  className={cn(
                    "rounded-[32px] border p-5 shadow-sm transition",
                    selectedWorkflowId === item.id
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.75)]"
                      : "border-white/70 bg-white/90 text-slate-900 backdrop-blur",
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <WorkflowStatusBadge status={item.status} />
                        <RunStatusBadge status={item.lastRunStatus} />
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs",
                            selectedWorkflowId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600",
                          )}
                        >
                          {item.code}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">{item.name}</h2>
                        <p className={cn("mt-2 text-sm leading-7", selectedWorkflowId === item.id ? "text-white/75" : "text-slate-600")}>{item.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={cn(
                        "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                        selectedWorkflowId === item.id
                          ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                      onClick={() => setSelectedWorkflowId(item.id)}
                    >
                      查看详情
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className={cn("rounded-2xl border px-4 py-3", selectedWorkflowId === item.id ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50")}>
                      <p className="text-xs uppercase tracking-[0.18em] opacity-60">当前版本</p>
                      <p className="mt-2 text-xl font-semibold">{item.currentVersionNumber ? `v${item.currentVersionNumber}` : "未发布"}</p>
                    </div>
                    <div className={cn("rounded-2xl border px-4 py-3", selectedWorkflowId === item.id ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50")}>
                      <p className="text-xs uppercase tracking-[0.18em] opacity-60">版本数</p>
                      <p className="mt-2 text-xl font-semibold">{item.versionCount}</p>
                    </div>
                    <div className={cn("rounded-2xl border px-4 py-3", selectedWorkflowId === item.id ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50")}>
                      <p className="text-xs uppercase tracking-[0.18em] opacity-60">最近运行</p>
                      <p className="mt-2 text-sm font-medium">{formatDateTime(item.lastRunEndedAt)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/orchestration/${item.id}`}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition",
                        selectedWorkflowId === item.id ? "bg-white text-slate-950 hover:bg-white/90" : "bg-slate-950 text-white hover:bg-slate-800",
                      )}
                    >
                      进入编辑器
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition",
                        selectedWorkflowId === item.id
                          ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        setSelectedWorkflowId(item.id);
                        setRunWorkflowId(item.id);
                      }}
                    >
                      <Play className="h-4 w-4" />
                      手动运行
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition",
                        selectedWorkflowId === item.id
                          ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                      onClick={() => setEditingWorkflow(item)}
                    >
                      <PencilLine className="h-4 w-4" />
                      编辑信息
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition",
                        selectedWorkflowId === item.id
                          ? "border-red-200/40 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                          : "border-red-200 bg-white text-red-600 hover:bg-red-50",
                      )}
                      onClick={() => setDeleteWorkflowItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/85 px-5 py-4 shadow-sm backdrop-blur">
              <p className="text-sm text-muted-foreground">
                第 {filters.page} / {totalPages} 页，共 {listQuery.data?.total ?? 0} 条工作流
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-[34px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
            {selectedWorkflow ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <WorkflowStatusBadge status={selectedWorkflow.status} />
                    <RunStatusBadge status={selectedWorkflow.lastRunStatus} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{selectedWorkflow.name}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{selectedWorkflow.description}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">线上版本</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {detailQuery.data?.currentVersion ? `v${detailQuery.data.currentVersion.versionNumber}` : "未发布"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {detailQuery.data?.currentVersion ? detailQuery.data.currentVersion.remark : "需要先在编辑器中保存并发布版本"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">更新时间</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{formatDateTime(selectedWorkflow.updateDate)}</p>
                    <p className="mt-1 text-xs text-slate-500">{orchestrationStatusMeta[selectedWorkflow.status].description}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">最近版本</h3>
                    <Link href={`/orchestration/${selectedWorkflow.id}`} className="text-xs font-medium text-slate-600 transition hover:text-slate-950">
                      去编辑器
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {detailQuery.data?.recentVersions.length ? (
                      detailQuery.data.recentVersions.map((version) => (
                        <div key={version.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-950">v{version.versionNumber}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(version.createDate)}</p>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{version.remark}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">还没有任何版本，建议先进入编辑器保存首版图结构。</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">最近运行</h3>
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 transition hover:text-slate-950"
                      onClick={() => setRunWorkflowId(selectedWorkflow.id)}
                    >
                      立即运行
                    </button>
                  </div>
                  <div className="space-y-2">
                    {runRecordsQuery.data?.length ? (
                      runRecordsQuery.data.map((run) => (
                        <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <RunStatusBadge status={run.status} />
                            <span className="text-xs text-slate-500">{formatDuration(run.durationMs)}</span>
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-950">v{run.workflowVersionNumber}</p>
                          <p className="mt-1 text-sm text-slate-600">{run.outputSummary || run.errorSummary || "暂无摘要"}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateTime(run.endTime)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">还没有运行记录。建议先发布一个版本，再通过手动运行验证输出。</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 px-5 py-10 text-center">
                <p className="text-lg font-medium text-slate-900">还没有选中的工作流</p>
                <p className="mt-2 text-sm text-slate-500">从左侧选择一个工作流，查看它的版本与运行反馈。</p>
              </div>
            )}
          </aside>
        </section>
      </div>

      <WorkflowDialog
        open={createDialogOpen || Boolean(editingWorkflow)}
        record={editingWorkflow}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingWorkflow(null);
        }}
        onSubmit={async (values) => {
          if (editingWorkflow) {
            await updateMutation.mutateAsync(values);
            return;
          }
          await createMutation.mutateAsync(values);
        }}
      />

      <RunDialog
        open={Boolean(runWorkflowId)}
        workflow={runWorkflowId && detailQuery.data?.workflow.id === runWorkflowId ? detailQuery.data.workflow : listQuery.data?.items.find((item) => item.id === runWorkflowId) || null}
        versions={runVersionsQuery.data ?? []}
        versionsLoading={runVersionsQuery.isLoading}
        pending={runMutation.isPending}
        onClose={() => setRunWorkflowId(null)}
        onSubmit={async (values) => {
          await runMutation.mutateAsync(values);
        }}
      />

      <DeleteDialog
        open={Boolean(deleteWorkflowItem)}
        workflow={deleteWorkflowItem}
        pending={deleteMutation.isPending}
        onClose={() => setDeleteWorkflowItem(null)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}
