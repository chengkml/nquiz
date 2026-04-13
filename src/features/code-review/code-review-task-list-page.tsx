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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  PencilLine,
  PlayCircle,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  codeReviewTaskFilterSchema,
  codeReviewTaskFormSchema,
  type CodeReviewTaskFilterInput,
  type CodeReviewTaskFilterValues,
  type CodeReviewTaskFormInput,
  type CodeReviewTaskFormValues,
} from "@/features/code-review/schema";
import {
  completeCodeReviewTask,
  createCodeReviewTask,
  deleteCodeReviewTask,
  formatTaskStatus,
  listCodeReviewTaskHistoryOptions,
  listCodeReviewTasks,
  startCodeReviewTask,
  updateCodeReviewTask,
} from "@/features/code-review/mock-service";
import type {
  CodeReviewTaskHistoryOptions,
  CodeReviewTaskListItem,
  CodeReviewTaskMutationInput,
  CodeReviewTaskStatus,
} from "@/features/code-review/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 8, 12, 16] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
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

function badgeClass(status: CodeReviewTaskStatus) {
  if (status === "OPEN") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (status === "IN_PROGRESS") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) {
    return null;
  }

  const toneClass =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={cn("mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", toneClass)}>
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="rounded-3xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function taskDefaults(record?: CodeReviewTaskListItem | null): CodeReviewTaskFormValues {
  return {
    title: record?.title ?? "",
    projectName: record?.projectName ?? "",
    gitUrl: record?.gitUrl ?? "",
    branch: record?.branch ?? "main",
    targetPage: record?.targetPage ?? "",
    reviewStandard: record?.reviewStandard ?? "",
    descr: record?.descr ?? "",
  };
}

function normalizeTaskInput(values: CodeReviewTaskFormValues): CodeReviewTaskMutationInput {
  return {
    title: values.title.trim(),
    projectName: values.projectName.trim(),
    gitUrl: values.gitUrl.trim(),
    branch: values.branch.trim(),
    targetPage: values.targetPage.trim(),
    reviewStandard: values.reviewStandard.trim(),
    descr: values.descr.trim(),
  };
}

function TaskDialog({
  open,
  record,
  history,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: CodeReviewTaskListItem | null;
  history: CodeReviewTaskHistoryOptions | undefined;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: CodeReviewTaskMutationInput) => Promise<void>;
}) {
  const form = useForm<CodeReviewTaskFormInput, undefined, CodeReviewTaskFormValues>({
    resolver: zodResolver(codeReviewTaskFormSchema),
    defaultValues: taskDefaults(record),
  });

  const isEdit = Boolean(record);

  useEffect(() => {
    if (!open) return;
    form.reset(taskDefaults(record));
  }, [form, open, record]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? "编辑审核任务" : "新建审核任务"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            首版按任务台账语义保留项目、仓库、分支和目标页面，避免旧版单页弹窗状态互相污染。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(normalizeTaskInput(values));
          })}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">任务标题</label>
              <input
                className={inputClassName(Boolean(form.formState.errors.title?.message))}
                placeholder="例如：代码审核问题回归检查"
                {...form.register("title")}
              />
              <FieldError message={form.formState.errors.title?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">项目名</label>
              <input
                className={inputClassName(Boolean(form.formState.errors.projectName?.message))}
                list="code-review-project-options"
                placeholder="nquiz"
                {...form.register("projectName")}
              />
              <FieldError message={form.formState.errors.projectName?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">仓库地址</label>
              <input
                className={inputClassName(Boolean(form.formState.errors.gitUrl?.message))}
                list="code-review-git-options"
                placeholder="https://git.example.com/quiz/nquiz.git"
                {...form.register("gitUrl")}
              />
              <FieldError message={form.formState.errors.gitUrl?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">目标分支</label>
              <input
                className={inputClassName(Boolean(form.formState.errors.branch?.message))}
                list="code-review-branch-options"
                placeholder="main"
                {...form.register("branch")}
              />
              <FieldError message={form.formState.errors.branch?.message} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">目标页面</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.targetPage?.message))}
              placeholder="例如 /code-review/tasks"
              {...form.register("targetPage")}
            />
            <FieldError message={form.formState.errors.targetPage?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">评审标准</label>
            <textarea
              rows={3}
              className={inputClassName(Boolean(form.formState.errors.reviewStandard?.message))}
              placeholder="例如：命名、鉴权、错误处理、可观测性"
              {...form.register("reviewStandard")}
            />
            <FieldError message={form.formState.errors.reviewStandard?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">任务描述</label>
            <textarea
              rows={4}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              placeholder="记录审核背景、风险说明和预期输出"
              {...form.register("descr")}
            />
            <FieldError message={form.formState.errors.descr?.message} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              onClick={() => {
                form.reset(taskDefaults(record));
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
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "保存修改" : "创建任务"}
            </button>
          </div>
        </form>
      </div>

      <datalist id="code-review-project-options">
        {(history?.projectNames ?? []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="code-review-git-options">
        {(history?.gitUrls ?? []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="code-review-branch-options">
        {(history?.branches ?? []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
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
  record: CodeReviewTaskListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除审核任务</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            与 quiz 旧语义一致：当任务下仍有审核问题时，首版直接阻断删除，避免孤儿问题。
          </p>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-muted-foreground">
          <div className="rounded-3xl border border-border bg-muted/40 p-4">
            <p className="font-medium text-foreground">{record.title}</p>
            <p className="mt-1 text-xs">项目：{record.projectName}</p>
            <p className="mt-1 text-xs">目标页面：{record.targetPage}</p>
            <p className="mt-2 text-xs">关联问题：{record.issueCount}</p>
          </div>

          {record.issueCount > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
              当前任务仍有审核问题，无法直接删除。请先在详情页处理问题。
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              删除后不可恢复，请确认该任务已经不再需要。
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            disabled={pending || record.issueCount > 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

export function CodeReviewTaskListPage() {
  const queryClient = useQueryClient();

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CodeReviewTaskListItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<CodeReviewTaskListItem | null>(null);

  const filterForm = useForm<CodeReviewTaskFilterInput, undefined, CodeReviewTaskFilterValues>({
    resolver: zodResolver(codeReviewTaskFilterSchema),
    defaultValues: {
      keyword: "",
      projectName: "",
      status: "ALL",
      page: 1,
      pageSize: 8,
    },
  });

  const watchedFilters = useWatch({ control: filterForm.control });
  const filters: CodeReviewTaskFilterValues = codeReviewTaskFilterSchema.parse({
    keyword: watchedFilters?.keyword ?? "",
    projectName: watchedFilters?.projectName ?? "",
    status: watchedFilters?.status ?? "ALL",
    page: watchedFilters?.page ?? 1,
    pageSize: watchedFilters?.pageSize ?? 8,
  });

  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.pageSize) || 8;

  const taskListQuery = useQuery({
    queryKey: queryKeys.codeReview.tasks(filters),
    queryFn: () => listCodeReviewTasks(filters),
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.codeReview.taskHistory,
    queryFn: listCodeReviewTaskHistoryOptions,
  });

  const totalPages = useMemo(() => {
    const total = taskListQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [pageSize, taskListQuery.data?.total]);

  const createMutation = useMutation({
    mutationFn: createCodeReviewTask,
    onSuccess: async () => {
      setTaskDialogOpen(false);
      setEditingTask(null);
      setFeedback({ type: "success", message: "审核任务已创建" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.codeReview.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CodeReviewTaskMutationInput }) =>
      updateCodeReviewTask(id, payload),
    onSuccess: async () => {
      setTaskDialogOpen(false);
      setEditingTask(null);
      setFeedback({ type: "success", message: "审核任务已更新" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.codeReview.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCodeReviewTask,
    onSuccess: async () => {
      setDeletingTask(null);
      setFeedback({ type: "success", message: "审核任务已删除" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.codeReview.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败" });
    },
  });

  const startMutation = useMutation({
    mutationFn: startCodeReviewTask,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "任务状态已更新为处理中" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.codeReview.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "状态更新失败" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeCodeReviewTask,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "任务状态已更新为已完成" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.codeReview.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "状态更新失败" });
    },
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40 px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[30px] border border-border bg-background/90 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Code Review Tasks</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">代码审核任务工作台</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                首版交付任务台账 + 状态流转 + 独立详情跳转，保留“审核问题转需求”主链路，不再沿用旧版单页大 Modal 堆状态。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                onClick={() => {
                  setEditingTask(null);
                  setTaskDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新建任务
              </button>
            </div>
          </div>
        </header>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="任务总数"
            value={String(taskListQuery.data?.summary.total ?? 0)}
            hint="我的代码审核任务台账"
          />
          <StatCard
            label="待处理"
            value={String(taskListQuery.data?.summary.open ?? 0)}
            hint="可立即开始的任务"
          />
          <StatCard
            label="处理中"
            value={String(taskListQuery.data?.summary.inProgress ?? 0)}
            hint="执行中的审核任务"
          />
          <StatCard
            label="已完成"
            value={String(taskListQuery.data?.summary.completed ?? 0)}
            hint="已完成并归档的任务"
          />
        </section>

        <section className="rounded-[28px] border border-border bg-background p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[2fr_1.2fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={cn(inputClassName(false), "pl-9")}
                placeholder="按任务标题 / 页面 / 评审标准检索"
                {...filterForm.register("keyword")}
              />
            </div>

            <input
              className={inputClassName(false)}
              placeholder="项目名过滤（例如 nquiz）"
              {...filterForm.register("projectName")}
            />

            <select className={inputClassName(false)} {...filterForm.register("status") as never}>
              <option value="ALL">全部状态</option>
              <option value="OPEN">待处理</option>
              <option value="IN_PROGRESS">处理中</option>
              <option value="COMPLETED">已完成</option>
              <option value="CLOSED">已关闭</option>
            </select>

            <select
              className={inputClassName(false)}
              value={String(pageSize)}
              onChange={(event) => {
                filterForm.setValue("pageSize", Number(event.target.value), { shouldValidate: true });
                filterForm.setValue("page", 1, { shouldValidate: true });
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  每页 {option} 条
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-[28px] border border-border bg-background p-5 shadow-sm">
          {taskListQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              正在加载审核任务...
            </div>
          ) : taskListQuery.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {taskListQuery.error instanceof Error ? taskListQuery.error.message : "任务加载失败"}
            </div>
          ) : (taskListQuery.data?.items.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              当前筛选条件下没有审核任务，可点击“新建任务”开始沉淀代码审核台账。
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-2 py-3">任务</th>
                      <th className="px-2 py-3">项目 / 页面</th>
                      <th className="px-2 py-3">状态</th>
                      <th className="px-2 py-3">问题</th>
                      <th className="px-2 py-3">更新时间</th>
                      <th className="px-2 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskListQuery.data?.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/70 align-top last:border-none">
                        <td className="px-2 py-4">
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">分支：{item.branch}</p>
                        </td>
                        <td className="px-2 py-4">
                          <p>{item.projectName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.targetPage}</p>
                        </td>
                        <td className="px-2 py-4">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", badgeClass(item.status))}>
                            {formatTaskStatus(item.status)}
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <p>{item.issueCount} 条</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            待处理 {item.openIssueCount} · 已转需求 {item.convertedIssueCount}
                          </p>
                        </td>
                        <td className="px-2 py-4 text-xs text-muted-foreground">{formatDateTime(item.updateDate)}</td>
                        <td className="px-2 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/code-review/tasks/${item.id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
                            >
                              详情
                            </Link>

                            {item.status === "OPEN" ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
                                disabled={startMutation.isPending}
                                onClick={() => startMutation.mutate(item.id)}
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                开始
                              </button>
                            ) : null}

                            {item.status === "IN_PROGRESS" ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                disabled={completeMutation.isPending}
                                onClick={() => completeMutation.mutate(item.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                完成
                              </button>
                            ) : null}

                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => {
                                setEditingTask(item);
                                setTaskDialogOpen(true);
                              }}
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              编辑
                            </button>

                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                              onClick={() => setDeletingTask(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
                <p>
                  共 {taskListQuery.data?.total ?? 0} 条任务，当前第 {page} / {totalPages} 页
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => filterForm.setValue("page", Math.max(1, page - 1), { shouldValidate: true })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page >= totalPages}
                    onClick={() => filterForm.setValue("page", Math.min(totalPages, page + 1), { shouldValidate: true })}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              首版先交付单条问题转需求。批量转需求与批量回退能力已在旧后端存在，但本页暂未开放批量操作。
            </p>
          </div>
        </section>
      </div>

      <TaskDialog
        open={taskDialogOpen}
        record={editingTask}
        history={historyQuery.data}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
        onSubmit={async (payload) => {
          if (editingTask) {
            await updateMutation.mutateAsync({ id: editingTask.id, payload });
            return;
          }
          await createMutation.mutateAsync(payload);
        }}
      />

      <DeleteDialog
        open={Boolean(deletingTask)}
        record={deletingTask}
        pending={deleteMutation.isPending}
        onClose={() => setDeletingTask(null)}
        onConfirm={async () => {
          if (!deletingTask) {
            return;
          }
          await deleteMutation.mutateAsync(deletingTask.id);
        }}
      />
    </main>
  );
}
