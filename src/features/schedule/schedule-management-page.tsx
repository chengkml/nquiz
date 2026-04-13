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
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";
import {
  completeScheduleEvent,
  createScheduleEvent,
  deleteScheduleEvent,
  fetchScheduleEvents,
  updateScheduleEvent,
} from "@/features/schedule/api/client";
import {
  scheduleEventFormSchema,
  type ScheduleEventFormInput,
  type ScheduleEventFormValues,
} from "@/features/schedule/schema";
import type {
  ScheduleEditableStatus,
  ScheduleEvent,
  ScheduleListFilters,
  ScheduleMutationInput,
  SchedulePriority,
  ScheduleStatus,
  ScheduleViewMode,
} from "@/features/schedule/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

type ViewOption = { value: ScheduleViewMode; label: string; description: string };
type FormDialogMode = "create" | "edit";
type FeedbackState = { type: "success" | "error"; message: string } | null;

type DateRange = { start: Date; end: Date };

const viewOptions: ViewOption[] = [
  { value: "MONTH", label: "月视图", description: "按月查看排期窗口" },
  { value: "WEEK", label: "周视图", description: "聚焦本周执行节奏" },
  { value: "YEAR", label: "年视图", description: "查看全年分布趋势" },
];

const statusOptions: Array<{ value: ScheduleEditableStatus; label: string }> = [
  { value: "SCHEDULED", label: "待执行" },
  { value: "IN_PROGRESS", label: "进行中" },
  { value: "CANCELLED", label: "已取消" },
];

const priorityOptions: Array<{ value: SchedulePriority; label: string }> = [
  { value: "HIGH", label: "高" },
  { value: "MEDIUM", label: "中" },
  { value: "LOW", label: "低" },
];

const statusLabel: Record<ScheduleStatus, string> = {
  SCHEDULED: "待执行",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  EXPIRED: "已过期",
};

const priorityLabel: Record<SchedulePriority, string> = {
  HIGH: "高优先级",
  MEDIUM: "中优先级",
  LOW: "低优先级",
};

function statusBadgeClassName(status: ScheduleStatus) {
  if (status === "SCHEDULED") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "IN_PROGRESS") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function priorityBadgeClassName(priority: SchedulePriority) {
  if (priority === "HIGH") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function nowDate() {
  return new Date();
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const diff = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
}

function endOfWeek(value: Date) {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return endOfDay(date);
}

function startOfMonth(value: Date) {
  const date = new Date(value.getFullYear(), value.getMonth(), 1);
  return startOfDay(date);
}

function endOfMonth(value: Date) {
  const date = new Date(value.getFullYear(), value.getMonth() + 1, 0);
  return endOfDay(date);
}

function startOfYear(value: Date) {
  const date = new Date(value.getFullYear(), 0, 1);
  return startOfDay(date);
}

function endOfYear(value: Date) {
  const date = new Date(value.getFullYear(), 11, 31);
  return endOfDay(date);
}

function buildDateRange(viewMode: ScheduleViewMode, anchorDate: Date): DateRange {
  if (viewMode === "WEEK") {
    return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
  }
  if (viewMode === "YEAR") {
    return { start: startOfYear(anchorDate), end: endOfYear(anchorDate) };
  }
  return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
}

function shiftAnchorDate(date: Date, viewMode: ScheduleViewMode, direction: -1 | 1) {
  const next = new Date(date);
  if (viewMode === "WEEK") {
    next.setDate(next.getDate() + direction * 7);
    return next;
  }
  if (viewMode === "YEAR") {
    next.setFullYear(next.getFullYear() + direction);
    return next;
  }
  next.setMonth(next.getMonth() + direction);
  return next;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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

function formatRangeLabel(viewMode: ScheduleViewMode, range: DateRange) {
  if (viewMode === "YEAR") {
    return `${range.start.getFullYear()} 年`;
  }
  if (viewMode === "MONTH") {
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(range.start);
  }
  return `${formatDate(range.start.toISOString())} - ${formatDate(range.end.toISOString())}`;
}

function toInputDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(input: string) {
  return new Date(input).toISOString();
}

function normalizeMutationInput(values: ScheduleEventFormValues): ScheduleMutationInput {
  return {
    title: values.title.trim(),
    descr: values.descr?.trim() || "",
    status: values.status,
    priority: values.priority,
    startTime: toIsoDateTime(values.startTime),
    endTime: toIsoDateTime(values.endTime),
    expireTime: values.expireTime ? toIsoDateTime(values.expireTime) : undefined,
    allDay: values.allDay,
  };
}

function normalizeEditableStatus(status?: ScheduleStatus): ScheduleEditableStatus {
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "CANCELLED") return "CANCELLED";
  return "SCHEDULED";
}

function getFormDefaults(record: ScheduleEvent | null): ScheduleEventFormValues {
  const baseDate = nowDate();
  const baseStart = new Date(baseDate.getTime() + 30 * 60000);
  const baseEnd = new Date(baseStart.getTime() + 60 * 60000);

  return {
    title: record?.title ?? "",
    descr: record?.descr ?? "",
    status: normalizeEditableStatus(record?.status),
    priority: record?.priority ?? "MEDIUM",
    startTime: toInputDateTime(record?.startTime) || toInputDateTime(baseStart.toISOString()),
    endTime: toInputDateTime(record?.endTime) || toInputDateTime(baseEnd.toISOString()),
    expireTime: toInputDateTime(record?.expireTime),
    allDay: record?.allDay ?? false,
  };
}

function groupEventsByDay(items: ScheduleEvent[]) {
  const map = new Map<string, ScheduleEvent[]>();

  items.forEach((item) => {
    const key = new Date(item.startTime).toISOString().slice(0, 10);
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  });

  return [...map.entries()].map(([day, events]) => ({
    day,
    events: events.sort((left, right) => (left.startTime < right.startTime ? -1 : 1)),
  }));
}

function yearlyMonthSummary(items: ScheduleEvent[]) {
  const map = new Map<number, number>();
  items.forEach((item) => {
    const month = new Date(item.startTime).getMonth();
    map.set(month, (map.get(month) ?? 0) + 1);
  });

  return Array.from({ length: 12 }, (_, index) => ({
    month: index,
    count: map.get(index) ?? 0,
  }));
}

function canEditEvent(event: ScheduleEvent) {
  return event.status !== "COMPLETED" && event.status !== "EXPIRED";
}

function canCompleteEvent(event: ScheduleEvent) {
  return event.status === "SCHEDULED" || event.status === "IN_PROGRESS";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function EventCard({
  item,
  onEdit,
  onDelete,
  onComplete,
  pending,
}: {
  item: ScheduleEvent;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
  onComplete: (event: ScheduleEvent) => void;
  pending: boolean;
}) {
  const editable = canEditEvent(item);
  const completable = canCompleteEvent(item);

  return (
    <article className="rounded-3xl border border-border bg-background/90 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.startTime)} - {formatDateTime(item.endTime)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full border px-2.5 py-1 text-xs", statusBadgeClassName(item.status))}>
            {statusLabel[item.status]}
          </span>
          <span className={cn("rounded-full border px-2.5 py-1 text-xs", priorityBadgeClassName(item.priority))}>
            {priorityLabel[item.priority]}
          </span>
          {item.allDay ? <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">全天</span> : null}
        </div>
      </div>

      {item.descr ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.descr}</p> : null}

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>过期时间：{formatDateTime(item.expireTime)}</p>
        <p>完成时间：{formatDateTime(item.completedAt)}</p>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={!editable || pending}
          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onEdit(item)}
        >
          <PencilLine className="h-3.5 w-3.5" />
          编辑
        </button>
        <button
          type="button"
          disabled={!completable || pending}
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onComplete(item)}
        >
          <Check className="h-3.5 w-3.5" />
          标记完成
        </button>
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
      </div>
    </article>
  );
}

export function ScheduleManagementPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("MONTH");
  const [anchorDate, setAnchorDate] = useState(() => nowDate());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<FormDialogMode>("create");
  const [activeEvent, setActiveEvent] = useState<ScheduleEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEvent | null>(null);

  const form = useForm<ScheduleEventFormInput, undefined, ScheduleEventFormValues>({
    resolver: zodResolver(scheduleEventFormSchema),
    defaultValues: getFormDefaults(null),
  });

  const range = useMemo(() => buildDateRange(viewMode, anchorDate), [anchorDate, viewMode]);

  const filters = useMemo<ScheduleListFilters>(
    () => ({
      viewMode,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
    }),
    [range.end, range.start, viewMode],
  );

  const scheduleQuery = useQuery({
    queryKey: queryKeys.schedule.list(filters),
    queryFn: () => fetchScheduleEvents(filters),
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(getFormDefaults(activeEvent));
  }, [activeEvent, dialogOpen, form]);

  const refreshSchedule = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
  };

  const createMutation = useMutation({
    mutationFn: createScheduleEvent,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "日程已创建" });
      await refreshSchedule();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ScheduleMutationInput }) => updateScheduleEvent(id, values),
    onSuccess: async () => {
      setFeedback({ type: "success", message: "日程已更新" });
      await refreshSchedule();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScheduleEvent,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "日程已删除" });
      await refreshSchedule();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeScheduleEvent,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "已标记为完成" });
      await refreshSchedule();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "标记完成失败" });
    },
  });

  const groupedEvents = useMemo(() => groupEventsByDay(scheduleQuery.data?.items ?? []), [scheduleQuery.data?.items]);
  const yearlySummary = useMemo(() => yearlyMonthSummary(scheduleQuery.data?.items ?? []), [scheduleQuery.data?.items]);
  const summary = scheduleQuery.data?.summary;

  const isDialogSubmitting = createMutation.isPending || updateMutation.isPending;
  const isActionPending = deleteMutation.isPending || completeMutation.isPending || isDialogSubmitting;

  const openCreateDialog = () => {
    setDialogMode("create");
    setActiveEvent(null);
    setDialogOpen(true);
  };

  const openEditDialog = (event: ScheduleEvent) => {
    setDialogMode("edit");
    setActiveEvent(event);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (isDialogSubmitting) return;
    setDialogOpen(false);
    setActiveEvent(null);
    form.reset(getFormDefaults(null));
  };

  const submitForm = form.handleSubmit(async (values) => {
    const payload = normalizeMutationInput(values);

    if (dialogMode === "create") {
      await createMutation.mutateAsync(payload);
      setDialogOpen(false);
      form.reset(getFormDefaults(null));
      return;
    }

    if (!activeEvent) {
      setFeedback({ type: "error", message: "未找到待编辑日程" });
      return;
    }

    await updateMutation.mutateAsync({ id: activeEvent.id, values: payload });
    setDialogOpen(false);
    setActiveEvent(null);
  });

  const rangeLabel = formatRangeLabel(viewMode, range);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#ffffff_38%,#f5f7ff_100%)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-border bg-background/85 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                <CalendarDays className="h-4 w-4" />
                [nquiz迁移] ScheduleManagement
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">日程管理页</h1>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
                  保留旧 quiz 的个人日程语义与状态模型，重构为可持续演进的 Next.js 日程工作台。首版覆盖月/周/年范围查询、
                  新增/编辑/删除、独立完成动作、状态与优先级展示。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {viewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    option.value === viewMode
                      ? "border-sky-300 bg-sky-100 text-sky-800"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                  onClick={() => setViewMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                onClick={openCreateDialog}
              >
                <Plus className="h-4 w-4" />
                新增日程
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <button
              type="button"
              className="rounded-lg border border-border bg-background p-2 transition hover:bg-muted"
              onClick={() => setAnchorDate((current) => shiftAnchorDate(current, viewMode, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border border-border bg-background p-2 transition hover:bg-muted"
              onClick={() => setAnchorDate((current) => shiftAnchorDate(current, viewMode, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:bg-muted"
              onClick={() => setAnchorDate(nowDate())}
            >
              回到今天
            </button>
            <div className="inline-flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm text-foreground">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              {rangeLabel}
            </div>
            <div className="text-sm text-muted-foreground">当前查询区间：{formatDateTime(filters.rangeStart)} - {formatDateTime(filters.rangeEnd)}</div>
          </div>
        </header>

        {feedback ? (
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{feedback.message}</div>
            <button type="button" className="text-xs opacity-80" onClick={() => setFeedback(null)}>
              关闭
            </button>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="区间总日程" value={String(summary?.total ?? 0)} hint="只统计当前视图时间窗口内的数据。" />
          <SummaryCard label="进行中" value={String(summary?.inProgress ?? 0)} hint="保留旧系统的 IN_PROGRESS 状态语义。" />
          <SummaryCard label="已完成" value={String(summary?.completed ?? 0)} hint="只能通过独立“标记完成”动作写入完成时间。" />
          <SummaryCard label="已过期" value={String(summary?.expired ?? 0)} hint="过期状态由 expireTime 自动推导，不允许表单直接设置。" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[2rem] border border-border bg-background/90 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">日程列表</h2>
              <span className="text-sm text-muted-foreground">按开始时间升序展示</span>
            </div>

            {scheduleQuery.isLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                正在加载日程...
              </div>
            ) : scheduleQuery.isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {scheduleQuery.error instanceof Error ? scheduleQuery.error.message : "日程加载失败"}
              </div>
            ) : groupedEvents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
                <p className="text-base font-medium">当前时间窗口没有日程</p>
                <p className="mt-2 text-sm text-muted-foreground">可以先创建一条日程，验证新增/编辑/完成/删除闭环。</p>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedEvents.map((group) => (
                  <div key={group.day} className="space-y-3">
                    <div className="sticky top-0 z-10 rounded-xl bg-background/95 py-1 text-sm font-medium text-foreground backdrop-blur">
                      {formatDate(`${group.day}T00:00:00.000Z`)}
                    </div>
                    <div className="space-y-3">
                      {group.events.map((item) => (
                        <EventCard
                          key={item.id}
                          item={item}
                          pending={isActionPending}
                          onEdit={openEditDialog}
                          onDelete={setDeleteTarget}
                          onComplete={(event) => completeMutation.mutate(event.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-border bg-background/90 p-5 shadow-sm">
              <h3 className="text-lg font-semibold">视图说明</h3>
              <p className="mt-2 text-sm text-muted-foreground">{viewOptions.find((option) => option.value === viewMode)?.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>1. 仅显示当前登录用户日程，保留个人数据隔离语义。</li>
                <li>2. 日程完成必须走独立动作，避免状态与完成时间不一致。</li>
                <li>3. EXPIRED 由系统根据过期时间推导，不在表单中手工设置。</li>
              </ul>
            </div>

            {viewMode === "YEAR" ? (
              <div className="rounded-[2rem] border border-border bg-background/90 p-5 shadow-sm">
                <h3 className="text-lg font-semibold">年视图分布</h3>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  {yearlySummary.map((item) => (
                    <div key={item.month} className="rounded-xl border border-border bg-muted/25 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{item.month + 1} 月</p>
                      <p className="mt-1 text-lg font-semibold">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-xl font-semibold">{dialogMode === "create" ? "新增日程" : "编辑日程"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                保留 `SCHEDULED / IN_PROGRESS / CANCELLED` 的可编辑状态；`COMPLETED` 必须由“标记完成”动作生成。
              </p>
            </div>

            <form className="space-y-4 px-6 py-5" onSubmit={submitForm}>
              <div>
                <label className="mb-2 block text-sm font-medium">标题</label>
                <input
                  className={inputClassName(Boolean(form.formState.errors.title?.message))}
                  placeholder="例如：迁移模块联调"
                  {...form.register("title")}
                />
                <FieldError message={form.formState.errors.title?.message} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">描述</label>
                <textarea
                  rows={4}
                  className={inputClassName(Boolean(form.formState.errors.descr?.message))}
                  placeholder="补充业务目标、联动模块或验收关注点"
                  {...form.register("descr")}
                />
                <FieldError message={form.formState.errors.descr?.message} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">状态</label>
                  <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={form.formState.errors.status?.message} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">优先级</label>
                  <select className={inputClassName(Boolean(form.formState.errors.priority?.message))} {...form.register("priority")}>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={form.formState.errors.priority?.message} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">开始时间</label>
                  <input
                    type="datetime-local"
                    className={inputClassName(Boolean(form.formState.errors.startTime?.message))}
                    {...form.register("startTime")}
                  />
                  <FieldError message={form.formState.errors.startTime?.message} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">结束时间</label>
                  <input
                    type="datetime-local"
                    className={inputClassName(Boolean(form.formState.errors.endTime?.message))}
                    {...form.register("endTime")}
                  />
                  <FieldError message={form.formState.errors.endTime?.message} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium">过期时间（可选）</label>
                  <input
                    type="datetime-local"
                    className={inputClassName(Boolean(form.formState.errors.expireTime?.message))}
                    {...form.register("expireTime")}
                  />
                  <FieldError message={form.formState.errors.expireTime?.message} />
                </div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                  <input type="checkbox" className="size-4" {...form.register("allDay")} />
                  全天
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  onClick={closeDialog}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isDialogSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDialogSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {dialogMode === "create" ? "创建日程" : "保存修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-xl font-semibold">确认删除日程</h2>
              <p className="mt-1 text-sm text-muted-foreground">删除后该日程会从当前用户台账中移除，无法恢复。</p>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <p className="font-medium text-foreground">{deleteTarget.title}</p>
                <p className="mt-1">{formatDateTime(deleteTarget.startTime)} - {formatDateTime(deleteTarget.endTime)}</p>
                <p className="mt-1">状态：{statusLabel[deleteTarget.status]}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                className="rounded-2xl border border-border px-4 py-2 text-sm"
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                {deleteMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
