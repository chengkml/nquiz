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
  ClipboardCheck,
  FileCode2,
  FileText,
  GitBranch,
  History,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  analyzeRequirement,
  createRequirement,
  deleteRequirement,
  fetchRequirementHistoryOptions,
  fetchRequirementLifecycle,
  reviewRequirement,
  searchRequirements,
  updateRequirement,
} from "@/features/requirements/api/client";
import {
  requirementAnalyzeSchema,
  requirementFilterSchema,
  requirementFormSchema,
  requirementReviewSchema,
  type RequirementAnalyzeInputSchema,
  type RequirementFilterInput,
  type RequirementFilterValues,
  type RequirementFormInput,
  type RequirementFormValues,
  type RequirementReviewInputSchema,
} from "@/features/requirements/schema";
import {
  requirementPriorityOptions,
  requirementStatusOptions,
  type RequirementAnalyzeInput,
  type RequirementHistoryOptionsResult,
  type RequirementLifecycleEventType,
  type RequirementLifecycleItem,
  type RequirementListItem,
  type RequirementMutationInput,
  type RequirementReviewInput,
  type RequirementStatus,
  type RequirementUpdateInput,
} from "@/features/requirements/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [5, 10, 20] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

function statusLabel(status: RequirementStatus) {
  const mapping: Record<RequirementStatus, string> = {
    PENDING_ANALYSIS: "待分析",
    PENDING_REVIEW: "待评审",
    PENDING_REVISION: "待修订",
    OPEN: "待处理",
    IN_PROGRESS: "处理中",
    COMPLETED: "已完成",
    CLOSED: "已关闭",
  };
  return mapping[status];
}

function statusBadgeClassName(status: RequirementStatus) {
  if (status === "PENDING_ANALYSIS") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "PENDING_REVIEW") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (status === "PENDING_REVISION") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "OPEN") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "IN_PROGRESS") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function priorityBadgeClassName(priority: "HIGH" | "MEDIUM" | "LOW") {
  if (priority === "HIGH") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function priorityLabel(priority: "HIGH" | "MEDIUM" | "LOW") {
  if (priority === "HIGH") return "高";
  if (priority === "MEDIUM") return "中";
  return "低";
}

function lifecycleEventLabel(eventType: RequirementLifecycleEventType) {
  const mapping: Record<RequirementLifecycleEventType, string> = {
    CREATE: "创建",
    EDIT: "编辑",
    STATUS_CHANGE: "状态变更",
    ANALYZE: "需求分析",
    REVIEW: "需求评审",
    DELETE: "删除",
  };

  return mapping[eventType];
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeProgress(status: RequirementStatus, progressPercent: number) {
  if (status === "IN_PROGRESS") return Math.min(99, Math.max(1, Math.round(progressPercent || 1)));
  if (status === "COMPLETED" || status === "CLOSED") return 100;
  return 0;
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

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
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

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
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

function getFormDefaults(record?: RequirementListItem | null): RequirementFormValues {
  return {
    title: record?.title ?? "",
    projectName: record?.projectName ?? "nquiz",
    gitUrl: record?.gitUrl ?? "",
    branch: record?.branch ?? "main",
    descr: record?.descr ?? "",
    status: record?.status ?? "PENDING_ANALYSIS",
    priority: record?.priority ?? "MEDIUM",
    progressPercent: record?.progressPercent ?? 0,
    resultMsg: record?.resultMsg ?? "",
  };
}

function RequirementFormDialog({
  open,
  record,
  historyOptions,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: RequirementListItem | null;
  historyOptions: RequirementHistoryOptionsResult | undefined;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: RequirementMutationInput | RequirementUpdateInput) => Promise<void>;
}) {
  const isEdit = Boolean(record);

  const form = useForm<RequirementFormInput, undefined, RequirementFormValues>({
    resolver: zodResolver(requirementFormSchema),
    defaultValues: getFormDefaults(record),
  });

  const watchStatus = useWatch({
    control: form.control,
    name: "status",
  });
  const activeStatus = watchStatus ?? form.getValues("status");

  useEffect(() => {
    if (!open) return;
    form.reset(getFormDefaults(record));
  }, [form, open, record]);

  useEffect(() => {
    if (!open) return;
    const currentProgress = Number(form.getValues("progressPercent")) || 0;
    const nextProgress = normalizeProgress(activeStatus, currentProgress);
    if (nextProgress !== currentProgress) {
      form.setValue("progressPercent", nextProgress, { shouldValidate: true });
    }
  }, [activeStatus, form, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? "编辑需求" : "新增需求"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保留 quiz 的字段语义与状态机约束，首版收敛为结构化表单，避免旧页多弹窗堆叠。
          </p>
        </div>

        <form
          className="space-y-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            const payload: RequirementMutationInput = {
              ...values,
              branch: values.branch || "main",
              progressPercent: normalizeProgress(values.status, values.progressPercent),
            };

            if (isEdit && record) {
              await onSubmit({ id: record.id, ...payload });
              return;
            }

            await onSubmit(payload);
          })}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">需求标题</label>
              <input
                className={inputClassName(Boolean(form.formState.errors.title?.message))}
                placeholder="例如：[nquiz迁移] 需求管理页"
                {...form.register("title")}
              />
              <FieldError message={form.formState.errors.title?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">项目名</label>
              <input
                list="requirement-project-options"
                className={inputClassName(Boolean(form.formState.errors.projectName?.message))}
                placeholder="nquiz"
                {...form.register("projectName")}
              />
              <datalist id="requirement-project-options">
                {(historyOptions?.projectNames ?? []).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <FieldError message={form.formState.errors.projectName?.message} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Git 地址</label>
              <input
                list="requirement-git-options"
                className={inputClassName(Boolean(form.formState.errors.gitUrl?.message))}
                placeholder="https://github.com/org/repo"
                {...form.register("gitUrl")}
              />
              <datalist id="requirement-git-options">
                {(historyOptions?.gitUrls ?? []).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <FieldError message={form.formState.errors.gitUrl?.message as string | undefined} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">分支</label>
              <input
                list="requirement-branch-options"
                className={inputClassName(Boolean(form.formState.errors.branch?.message))}
                placeholder="main"
                {...form.register("branch")}
              />
              <datalist id="requirement-branch-options">
                {(historyOptions?.branches ?? []).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <FieldError message={form.formState.errors.branch?.message as string | undefined} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}>
                {requirementStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.status?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">优先级</label>
              <select className={inputClassName(Boolean(form.formState.errors.priority?.message))} {...form.register("priority")}>
                {requirementPriorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.priority?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">进度（%）</label>
              <input
                type="number"
                min={0}
                max={100}
                disabled={activeStatus !== "IN_PROGRESS"}
                className={inputClassName(Boolean(form.formState.errors.progressPercent?.message))}
                {...form.register("progressPercent", { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {activeStatus === "IN_PROGRESS"
                  ? "处理中可手动填写 1-99。"
                  : activeStatus === "COMPLETED" || activeStatus === "CLOSED"
                    ? "已完成/已关闭固定为 100。"
                    : "待分析/待评审/待修订/待处理自动归零。"}
              </p>
              <FieldError message={form.formState.errors.progressPercent?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">处理结果</label>
              <input
                className={inputClassName(Boolean(form.formState.errors.resultMsg?.message))}
                placeholder="可选"
                {...form.register("resultMsg")}
              />
              <FieldError message={form.formState.errors.resultMsg?.message as string | undefined} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">需求描述（Markdown 文本）</label>
            <textarea
              rows={10}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              placeholder="描述功能目标、范围、风险、验收标准"
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
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isEdit ? "保存修改" : "创建需求"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnalyzeDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: RequirementListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: RequirementAnalyzeInput) => Promise<void>;
}) {
  const form = useForm<RequirementAnalyzeInputSchema>({
    resolver: zodResolver(requirementAnalyzeSchema),
    defaultValues: {
      descr: record?.descr ?? "",
      note: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      descr: record?.descr ?? "",
      note: "",
    });
  }, [form, open, record]);

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">需求分析</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            分析只允许从“待分析”流转到“待评审”，提交后会写入生命周期日志。
          </p>
        </div>

        <form
          className="space-y-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">分析输出（覆盖需求描述）</label>
            <textarea
              rows={12}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              placeholder="输出结构化分析内容：目标、范围、风险、验收"
              {...form.register("descr")}
            />
            <FieldError message={form.formState.errors.descr?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">分析备注</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.note?.message))}
              placeholder="可选：记录本次分析结论"
              {...form.register("note")}
            />
            <FieldError message={form.formState.errors.note?.message} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              提交分析
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: RequirementListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: RequirementReviewInput) => Promise<void>;
}) {
  const form = useForm<RequirementReviewInputSchema>({
    resolver: zodResolver(requirementReviewSchema),
    defaultValues: {
      decision: "APPROVE",
      comment: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      decision: "APPROVE",
      comment: "",
    });
  }, [form, open, record]);

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">需求评审</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            评审通过流转到“待处理”，打回流转到“待修订”。
          </p>
        </div>

        <form
          className="space-y-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">评审结论</label>
            <select className={inputClassName(Boolean(form.formState.errors.decision?.message))} {...form.register("decision")}>
              <option value="APPROVE">通过（转待处理）</option>
              <option value="REJECT">打回（转待修订）</option>
            </select>
            <FieldError message={form.formState.errors.decision?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">评审意见</label>
            <textarea
              rows={4}
              className={inputClassName(Boolean(form.formState.errors.comment?.message))}
              placeholder="可选：补充评审意见"
              {...form.register("comment")}
            />
            <FieldError message={form.formState.errors.comment?.message} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              提交评审
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LifecycleSheet({
  open,
  title,
  loading,
  error,
  items,
  onClose,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  error: string | null;
  items: RequirementLifecycleItem[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 px-4 py-6 backdrop-blur-sm">
      <div className="ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-[32px] border border-border bg-background shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-background/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Lifecycle Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">展示 CREATE / EDIT / ANALYZE / REVIEW 等生命周期事件。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              正在加载生命周期...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">{error}</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              当前没有生命周期记录。
            </div>
          ) : (
            <ol className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
                      <History className="h-3.5 w-3.5" />
                      {lifecycleEventLabel(item.eventType)}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(item.createDate)}</span>
                  </div>

                  {(item.fromStatus || item.toStatus) && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {item.fromStatus ? statusLabel(item.fromStatus) : "-"} → {item.toStatus ? statusLabel(item.toStatus) : "-"}
                    </p>
                  )}

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{item.note || "-"}</p>

                  {item.fromDescr || item.toDescr ? (
                    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                      <p>描述变化：{item.fromDescr ? "有" : "无"} → {item.toDescr ? "有" : "无"}</p>
                    </div>
                  ) : null}

                  <p className="mt-3 text-xs text-muted-foreground">操作人：{item.operatorName}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export function RequirementManagementPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [filters, setFilters] = useState<RequirementFilterValues>({
    title: "",
    projectName: "",
    status: "ALL",
    priority: "ALL",
    pageNum: 1,
    pageSize: 10,
  });
  const [editingRecord, setEditingRecord] = useState<RequirementListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RequirementListItem | null>(null);
  const [analyzeTarget, setAnalyzeTarget] = useState<RequirementListItem | null>(null);
  const [reviewTarget, setReviewTarget] = useState<RequirementListItem | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<RequirementListItem | null>(null);

  const filterForm = useForm<RequirementFilterInput, undefined, RequirementFilterValues>({
    resolver: zodResolver(requirementFilterSchema),
    defaultValues: filters,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.requirements.list(filters),
    queryFn: () => searchRequirements(filters),
  });

  const historyOptionsQuery = useQuery({
    queryKey: queryKeys.requirements.historyOptions,
    queryFn: fetchRequirementHistoryOptions,
  });

  const lifecycleQuery = useQuery({
    queryKey: queryKeys.requirements.lifecycle(lifecycleTarget?.id ?? null),
    queryFn: () => fetchRequirementLifecycle(lifecycleTarget?.id ?? ""),
    enabled: Boolean(lifecycleTarget?.id),
  });

  const createMutation = useMutation({
    mutationFn: createRequirement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all });
      setFeedback({ type: "success", message: "需求创建成功。" });
      setFormOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "需求创建失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateRequirement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all });
      setFeedback({ type: "success", message: "需求更新成功。" });
      setFormOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "需求更新失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRequirement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all });
      setFeedback({ type: "success", message: "需求删除成功。" });
      setDeleteTarget(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "需求删除失败" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RequirementAnalyzeInput }) => analyzeRequirement(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all });
      setFeedback({ type: "success", message: "分析已提交，需求转为待评审。" });
      setAnalyzeTarget(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "需求分析失败" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RequirementReviewInput }) => reviewRequirement(id, payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all });
      setFeedback({
        type: "success",
        message: variables.payload.decision === "APPROVE" ? "评审通过，需求转为待处理。" : "评审打回，需求转为待修订。",
      });
      setReviewTarget(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "需求评审失败" });
    },
  });

  const summary = listQuery.data?.summary;
  const totalPages = useMemo(() => {
    const total = listQuery.data?.totalElements ?? 0;
    return Math.max(1, Math.ceil(total / filters.pageSize));
  }, [filters.pageSize, listQuery.data?.totalElements]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-8 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-border bg-background p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Link>
              <div className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                RequirementManagement · nquiz 迁移首版
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">需求管理页</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  承接旧 quiz 的“需求列表 + 状态流转 + 生命周期”语义。首版保留创建、编辑、分析、评审、删除和时间线查看，并按状态门禁动作。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-medium shadow-sm transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
                onClick={() => listQuery.refetch()}
              >
                <RefreshCcw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
                刷新
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
                onClick={() => {
                  setEditingRecord(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新增需求
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="总需求" value={String(summary?.total ?? 0)} hint="仅统计当前登录用户创建的需求。" />
          <StatCard
            label="待分析/待评审"
            value={`${summary?.pendingAnalysis ?? 0} / ${summary?.pendingReview ?? 0}`}
            hint="分析后转待评审，评审通过后进入待处理。"
          />
          <StatCard
            label="待修订/处理中"
            value={`${summary?.pendingRevision ?? 0} / ${summary?.inProgress ?? 0}`}
            hint="被打回需求进入待修订，处理中支持 1-99 进度。"
          />
          <StatCard
            label="已完成/关闭"
            value={`${summary?.completed ?? 0} / ${summary?.closed ?? 0}`}
            hint="已完成与关闭自动归并为 100% 进度。"
          />
        </section>

        <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px_200px_160px_auto]"
            onSubmit={filterForm.handleSubmit((values) => {
              setFilters({ ...values, pageNum: 1 });
            })}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">标题关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={cn(inputClassName(Boolean(filterForm.formState.errors.title?.message)), "pl-10")}
                  placeholder="匹配标题/描述"
                  {...filterForm.register("title")}
                />
              </div>
              <FieldError message={filterForm.formState.errors.title?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">项目名</label>
              <input
                className={inputClassName(Boolean(filterForm.formState.errors.projectName?.message))}
                placeholder="nquiz"
                {...filterForm.register("projectName")}
              />
              <FieldError message={filterForm.formState.errors.projectName?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.status?.message))} {...filterForm.register("status")}>
                <option value="ALL">全部状态</option>
                {requirementStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <FieldError message={filterForm.formState.errors.status?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">优先级</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.priority?.message))} {...filterForm.register("priority")}>
                <option value="ALL">全部优先级</option>
                {requirementPriorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
              <FieldError message={filterForm.formState.errors.priority?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">每页条数</label>
              <select
                className={inputClassName(Boolean(filterForm.formState.errors.pageSize?.message))}
                {...filterForm.register("pageSize", { valueAsNumber: true })}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} 条
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-border text-sm font-medium transition hover:bg-muted"
                onClick={() => {
                  const next = {
                    title: "",
                    projectName: "",
                    status: "ALL",
                    priority: "ALL",
                    pageNum: 1,
                    pageSize: filters.pageSize,
                  } as const;
                  filterForm.reset(next);
                  setFilters(next);
                }}
              >
                重置
              </button>
              <button
                type="submit"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-foreground text-sm font-medium text-background transition hover:opacity-90"
              >
                查询
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
          {listQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              正在加载需求列表...
            </div>
          ) : listQuery.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
              {listQuery.error instanceof Error ? listQuery.error.message : "需求列表加载失败"}
            </div>
          ) : (listQuery.data?.content.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
              <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">当前筛选条件下没有需求。</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3 text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-1 font-medium">需求</th>
                      <th className="px-3 py-1 font-medium">状态</th>
                      <th className="px-3 py-1 font-medium">优先级</th>
                      <th className="px-3 py-1 font-medium">进度</th>
                      <th className="px-3 py-1 font-medium">更新时间</th>
                      <th className="px-3 py-1 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listQuery.data?.content.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-2xl border border-border bg-background"
                      >
                        <td className="rounded-l-2xl border-y border-l border-border px-3 py-3 align-top">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">ID: {item.id}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1">
                              <FileCode2 className="h-3.5 w-3.5" />
                              {item.projectName}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1">
                              <GitBranch className="h-3.5 w-3.5" />
                              {item.branch || "main"}
                            </span>
                          </div>
                          {item.resultMsg ? <p className="mt-2 text-xs text-muted-foreground">结果：{item.resultMsg}</p> : null}
                        </td>
                        <td className="border-y border-border px-3 py-3 align-top">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusBadgeClassName(item.status))}>
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td className="border-y border-border px-3 py-3 align-top">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                              priorityBadgeClassName(item.priority),
                            )}
                          >
                            {priorityLabel(item.priority)}
                          </span>
                        </td>
                        <td className="border-y border-border px-3 py-3 align-top">
                          <div className="space-y-1">
                            <p className="font-medium">{item.progressPercent}%</p>
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-foreground" style={{ width: `${item.progressPercent}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="border-y border-border px-3 py-3 align-top text-muted-foreground">
                          <p>{formatDateTime(item.updateDate)}</p>
                          <p className="mt-1 text-xs">创建：{formatDateTime(item.createDate)}</p>
                        </td>
                        <td className="rounded-r-2xl border-y border-r border-border px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => {
                                setEditingRecord(item);
                                setFormOpen(true);
                              }}
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              编辑
                            </button>
                            {item.status === "PENDING_ANALYSIS" ? (
                              <button
                                type="button"
                                className="inline-flex h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium transition hover:bg-sky-50"
                                onClick={() => setAnalyzeTarget(item)}
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                分析
                              </button>
                            ) : null}
                            {item.status === "PENDING_REVIEW" ? (
                              <button
                                type="button"
                                className="inline-flex h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium transition hover:bg-indigo-50"
                                onClick={() => setReviewTarget(item)}
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                评审
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => setLifecycleTarget(item)}
                            >
                              <History className="h-3.5 w-3.5" />
                              生命周期
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
                <p>
                  共 {listQuery.data?.totalElements ?? 0} 条，第 {filters.pageNum} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={filters.pageNum <= 1}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setFilters((prev) => ({ ...prev, pageNum: Math.max(1, prev.pageNum - 1) }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={filters.pageNum >= totalPages}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setFilters((prev) => ({ ...prev, pageNum: Math.min(totalPages, prev.pageNum + 1) }))}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <RequirementFormDialog
        open={formOpen}
        record={editingRecord}
        historyOptions={historyOptionsQuery.data}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={async (payload) => {
          if ("id" in payload) {
            await updateMutation.mutateAsync(payload);
            return;
          }
          await createMutation.mutateAsync(payload);
        }}
      />

      <AnalyzeDialog
        open={Boolean(analyzeTarget)}
        record={analyzeTarget}
        pending={analyzeMutation.isPending}
        onClose={() => setAnalyzeTarget(null)}
        onSubmit={async (payload) => {
          if (!analyzeTarget) return;
          await analyzeMutation.mutateAsync({ id: analyzeTarget.id, payload });
        }}
      />

      <ReviewDialog
        open={Boolean(reviewTarget)}
        record={reviewTarget}
        pending={reviewMutation.isPending}
        onClose={() => setReviewTarget(null)}
        onSubmit={async (payload) => {
          if (!reviewTarget) return;
          await reviewMutation.mutateAsync({ id: reviewTarget.id, payload });
        }}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-xl font-semibold">确认删除需求</h2>
              <p className="mt-1 text-sm text-muted-foreground">删除后该需求将从当前列表移除，仅用于模拟首版行为。</p>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="font-medium text-foreground">{deleteTarget.title}</p>
                <p className="mt-1">状态：{statusLabel(deleteTarget.status)}</p>
                <p className="mt-1">优先级：{priorityLabel(deleteTarget.priority)}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={async () => {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                }}
              >
                {deleteMutation.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LifecycleSheet
        open={Boolean(lifecycleTarget)}
        title={lifecycleTarget?.title ?? "需求生命周期"}
        loading={lifecycleQuery.isLoading}
        error={lifecycleQuery.isError ? (lifecycleQuery.error instanceof Error ? lifecycleQuery.error.message : "生命周期加载失败") : null}
        items={lifecycleQuery.data ?? []}
        onClose={() => setLifecycleTarget(null)}
      />
    </div>
  );
}
