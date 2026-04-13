"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  completeTodo,
  createTodo,
  deleteTodo,
  getTodoDetail,
  listTodos,
  updateTodo,
} from "@/features/todo/mock-service";
import {
  todoFilterSchema,
  todoFormSchema,
  type TodoFilterInput,
  type TodoFilterValues,
  type TodoFormInput,
  type TodoFormValues,
} from "@/features/todo/schema";
import {
  TODO_EDITABLE_STATUS_OPTIONS,
  TODO_PRIORITY_OPTIONS,
  TODO_STATUS_OPTIONS,
  type TodoEntity,
  type TodoFilters,
  type TodoMutationInput,
} from "@/features/todo/types";

const pageSizeOptions = [5, 8, 12, 20] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;
type FormDialogState = { mode: "create" | "edit"; record: TodoEntity | null } | null;

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

function toDateTimeLocalValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function statusBadgeClass(status: TodoEntity["status"]) {
  if (status === "SCHEDULED") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "IN_PROGRESS") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "EXPIRED") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function priorityBadgeClass(priority: TodoEntity["priority"]) {
  if (priority === "HIGH") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusLabel(value: TodoEntity["status"] | "") {
  return TODO_STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function priorityLabel(value: TodoEntity["priority"] | "") {
  return TODO_PRIORITY_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function canEdit(record?: TodoEntity | null) {
  if (!record) return false;
  return record.status !== "COMPLETED" && record.status !== "EXPIRED";
}

function canComplete(record?: TodoEntity | null) {
  if (!record) return false;
  return record.status !== "COMPLETED" && record.status !== "EXPIRED";
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
        "mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
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

function getFormDefaults(record?: TodoEntity | null): TodoFormValues {
  return {
    title: record?.title ?? "",
    descr: record?.descr ?? "",
    status: record?.status === "IN_PROGRESS" || record?.status === "CANCELLED" ? record.status : "SCHEDULED",
    priority: record?.priority ?? "MEDIUM",
    startTime: toDateTimeLocalValue(record?.startTime),
    dueDate: toDateTimeLocalValue(record?.dueDate),
    expireTime: toDateTimeLocalValue(record?.expireTime),
  };
}

function normalizeMutationInput(values: TodoFormValues): TodoMutationInput {
  return {
    title: values.title.trim(),
    descr: values.descr?.trim() ?? "",
    status: values.status,
    priority: values.priority,
    startTime: values.startTime || "",
    dueDate: values.dueDate || "",
    expireTime: values.expireTime || "",
  };
}

function TodoFormDialog({
  state,
  pending,
  onClose,
  onSubmit,
}: {
  state: FormDialogState;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: TodoMutationInput) => Promise<void>;
}) {
  const form = useForm<TodoFormInput, undefined, TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: getFormDefaults(state?.record),
  });

  useEffect(() => {
    if (!state) return;
    form.reset(getFormDefaults(state.record));
  }, [form, state]);

  if (!state) return null;

  const isEdit = state.mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? "编辑待办" : "新增待办"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            迁移保持“个人待办”语义，首版先完成创建、状态流转、过期与日程关联字段闭环。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(normalizeMutationInput(values));
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">标题</label>
            <input className={inputClassName(Boolean(form.formState.errors.title?.message))} {...form.register("title")} />
            <FieldError message={form.formState.errors.title?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea rows={4} className={inputClassName(Boolean(form.formState.errors.descr?.message))} {...form.register("descr")} />
            <FieldError message={form.formState.errors.descr?.message as string | undefined} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}> 
                {TODO_EDITABLE_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.status?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">优先级</label>
              <select className={inputClassName(Boolean(form.formState.errors.priority?.message))} {...form.register("priority")}>
                {TODO_PRIORITY_OPTIONS.filter((item) => item.value).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.priority?.message} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">开始时间</label>
              <input type="datetime-local" className={inputClassName(Boolean(form.formState.errors.startTime?.message))} {...form.register("startTime")} />
              <FieldError message={form.formState.errors.startTime?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">截止时间</label>
              <input type="datetime-local" className={inputClassName(Boolean(form.formState.errors.dueDate?.message))} {...form.register("dueDate")} />
              <FieldError message={form.formState.errors.dueDate?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">过期时间</label>
              <input type="datetime-local" className={inputClassName(Boolean(form.formState.errors.expireTime?.message))} {...form.register("expireTime")} />
              <FieldError message={form.formState.errors.expireTime?.message} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
              onClick={() => {
                form.reset(getFormDefaults(state.record));
                onClose();
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isEdit ? "保存修改" : "创建待办"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  record,
  pending,
  onClose,
  onConfirm,
}: {
  record: TodoEntity | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除待办</h2>
          <p className="mt-1 text-sm text-muted-foreground">删除后会同步清理关联日程，避免遗留孤儿数据。</p>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm text-muted-foreground">
          <div className="rounded-3xl border border-border bg-muted/40 p-4">
            <p className="font-medium text-foreground">{record.title}</p>
            <p className="mt-2">状态：{statusLabel(record.status)}</p>
            <p className="mt-1">优先级：{priorityLabel(record.priority)}</p>
            <p className="mt-1">关联日程：{record.calendarEventId || "无"}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
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

export function TodoManagementPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [formDialogState, setFormDialogState] = useState<FormDialogState>(null);
  const [deletingRecord, setDeletingRecord] = useState<TodoEntity | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string>("");

  const filterForm = useForm<TodoFilterInput, undefined, TodoFilterValues>({
    resolver: zodResolver(todoFilterSchema),
    defaultValues: {
      keyword: "",
      status: "SCHEDULED",
      priority: "",
      page: 1,
      pageSize: 8,
    },
  });

  const filters = useWatch({ control: filterForm.control }) as TodoFilterValues;

  const listFilters = useMemo<TodoFilters>(
    () => ({
      keyword: String(filters.keyword ?? ""),
      status: (filters.status ?? "SCHEDULED") as TodoFilters["status"],
      priority: (filters.priority ?? "") as TodoFilters["priority"],
      page: Number(filters.page ?? 1),
      pageSize: Number(filters.pageSize ?? 8),
    }),
    [filters.keyword, filters.page, filters.pageSize, filters.priority, filters.status],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.todos.list(listFilters),
    queryFn: () => listTodos(listFilters),
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const effectiveSelectedTodoId = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    if (items.length === 0) return "";
    if (selectedTodoId && items.some((item) => item.id === selectedTodoId)) {
      return selectedTodoId;
    }
    return items[0].id;
  }, [listQuery.data?.items, selectedTodoId]);

  const detailQuery = useQuery({
    queryKey: queryKeys.todos.detail(effectiveSelectedTodoId || null),
    queryFn: () => getTodoDetail(effectiveSelectedTodoId),
    enabled: Boolean(effectiveSelectedTodoId),
  });

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all });
      setFormDialogState(null);
      setSelectedTodoId(created.id);
      setFeedback({ type: "success", message: "待办已创建，已同步生成关联日程。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败，请重试" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TodoMutationInput }) => updateTodo(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all });
      setFormDialogState(null);
      setSelectedTodoId(updated.id);
      setFeedback({ type: "success", message: "待办已更新，关联日程时间已同步。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败，请重试" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeTodo,
    onSuccess: (todo) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all });
      setSelectedTodoId(todo.id);
      setFeedback({ type: "success", message: "待办已标记完成，关联日程状态已同步。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "完成操作失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all });
      setDeletingRecord(null);
      setFeedback({ type: "success", message: "待办已删除，关联日程已清理。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败" });
    },
  });

  const currentRecord = detailQuery.data ?? null;
  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / (filters.pageSize || 8)));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="inline-flex items-center gap-1 transition hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <span>/</span>
            <span>TodoManagement</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">个人待办管理</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            保留 quiz 旧版“当前用户待办”语义，覆盖创建、筛选、编辑、完成、删除、过期与日程关联字段闭环。
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background"
          onClick={() => setFormDialogState({ mode: "create", record: null })}
        >
          <Plus className="h-4 w-4" />
          新增待办
        </button>
      </div>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="待办总数" value={String(listQuery.data?.summary.totalTodos ?? 0)} hint="当前用户数据隔离口径" />
        <StatCard label="活跃待办" value={String(listQuery.data?.summary.activeTodos ?? 0)} hint="待处理 + 进行中" />
        <StatCard label="已完成" value={String(listQuery.data?.summary.completedTodos ?? 0)} hint="完成后只读查看" />
        <StatCard label="已过期" value={String(listQuery.data?.summary.expiredTodos ?? 0)} hint="由后端扫描策略等价实现" />
        <StatCard label="48h 临期" value={String(listQuery.data?.summary.dueSoonTodos ?? 0)} hint="帮助优先处理临近截止任务" />
      </div>

      <div className="rounded-3xl border border-border bg-card p-4">
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
          onSubmit={filterForm.handleSubmit((values) => {
            filterForm.setValue("keyword", values.keyword);
            filterForm.setValue("status", values.status);
            filterForm.setValue("priority", values.priority);
            filterForm.setValue("page", 1);
          })}
        >
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs text-muted-foreground">关键词</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="w-full rounded-2xl border bg-background py-2 pl-9 pr-3 text-sm" placeholder="标题 / 描述" {...filterForm.register("keyword")} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">状态</label>
            <select className="w-full rounded-2xl border bg-background px-3 py-2 text-sm" {...filterForm.register("status")}>
              {TODO_STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">优先级</label>
            <select className="w-full rounded-2xl border bg-background px-3 py-2 text-sm" {...filterForm.register("priority")}>
              {TODO_PRIORITY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">每页条数</label>
            <select
              className="w-full rounded-2xl border bg-background px-3 py-2 text-sm"
              value={String(filters.pageSize)}
              onChange={(event) => {
                filterForm.setValue("pageSize", Number(event.target.value));
                filterForm.setValue("page", 1);
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} 条
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button type="submit" className="flex-1 rounded-2xl bg-foreground px-3 py-2 text-sm font-medium text-background">
              查询
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border px-3 py-2 text-sm"
              onClick={() => {
                filterForm.reset({
                  keyword: "",
                  status: "SCHEDULED",
                  priority: "",
                  page: 1,
                  pageSize: filters.pageSize,
                });
              }}
            >
              重置
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-border bg-card p-4">
          {listQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> 正在加载待办...
            </div>
          ) : (listQuery.data?.items.length ?? 0) === 0 ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              当前筛选条件下没有待办。
            </div>
          ) : (
            <div className="space-y-3">
              {listQuery.data?.items.map((item) => {
                const active = item.id === effectiveSelectedTodoId;
                const editable = canEdit(item);
                return (
                  <article
                    key={item.id}
                    className={cn(
                      "rounded-3xl border p-4 transition",
                      active ? "border-foreground/30 bg-muted/30" : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <button
                          type="button"
                          className="text-left text-base font-semibold transition hover:text-foreground/80"
                          onClick={() => setSelectedTodoId(item.id)}
                        >
                          {item.title}
                        </button>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={cn("rounded-full border px-2.5 py-1", statusBadgeClass(item.status))}>{statusLabel(item.status)}</span>
                          <span className={cn("rounded-full border px-2.5 py-1", priorityBadgeClass(item.priority))}>{priorityLabel(item.priority)}</span>
                          <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-foreground">
                            创建于 {formatDateTime(item.createDate)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{item.descr || "暂无描述"}</p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs"
                          onClick={() => {
                            setSelectedTodoId(item.id);
                            if (editable) {
                              setFormDialogState({ mode: "edit", record: item });
                            }
                          }}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          {editable ? "编辑" : "详情"}
                        </button>

                        <button
                          type="button"
                          disabled={!canComplete(item) || completeMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => completeMutation.mutate(item.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> 完成
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-2.5 py-1.5 text-xs text-red-600"
                          onClick={() => setDeletingRecord(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> 删除
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              共 {listQuery.data?.total ?? 0} 条，第 {filters.page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={filters.page <= 1}
                onClick={() => filterForm.setValue("page", Math.max(1, filters.page - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> 上一页
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={filters.page >= totalPages}
                onClick={() => filterForm.setValue("page", Math.min(totalPages, filters.page + 1))}
              >
                下一页 <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-card p-5">
          {!effectiveSelectedTodoId ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">请选择左侧待办查看详情。</div>
          ) : detailQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> 正在加载详情...
            </div>
          ) : !currentRecord ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">该待办不存在或已被删除。</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold leading-7">{currentRecord.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{currentRecord.descr || "暂无描述"}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className={cn("rounded-full border px-2.5 py-1", statusBadgeClass(currentRecord.status))}>{statusLabel(currentRecord.status)}</span>
                <span className={cn("rounded-full border px-2.5 py-1", priorityBadgeClass(currentRecord.priority))}>{priorityLabel(currentRecord.priority)}</span>
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-foreground">
                  {canEdit(currentRecord) ? "可编辑" : "只读详情"}
                </span>
              </div>

              {!canEdit(currentRecord) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  已完成/已过期待办默认只读，避免误改历史状态语义。
                </div>
              )}

              <div className="grid gap-3 text-sm">
                <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="h-4 w-4" /> 时间信息
                  </div>
                  <p>开始：{formatDateTime(currentRecord.startTime)}</p>
                  <p>截止：{formatDateTime(currentRecord.dueDate)}</p>
                  <p>过期：{formatDateTime(currentRecord.expireTime)}</p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" /> 日程联动
                  </div>
                  <p>关联日程 ID：{currentRecord.calendarEventId || "未生成"}</p>
                  <p>更新时间：{formatDateTime(currentRecord.updateDate)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={!canEdit(currentRecord)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setFormDialogState({ mode: "edit", record: currentRecord })}
                >
                  <PencilLine className="h-4 w-4" /> 编辑
                </button>
                <button
                  type="button"
                  disabled={!canComplete(currentRecord) || completeMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => completeMutation.mutate(currentRecord.id)}
                >
                  <CheckCircle2 className="h-4 w-4" /> 标记完成
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-600"
                  onClick={() => setDeletingRecord(currentRecord)}
                >
                  <Trash2 className="h-4 w-4" /> 删除
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <TodoFormDialog
        state={formDialogState}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => setFormDialogState(null)}
        onSubmit={async (payload) => {
          if (formDialogState?.mode === "create") {
            await createMutation.mutateAsync(payload);
            return;
          }
          if (formDialogState?.record) {
            await updateMutation.mutateAsync({ id: formDialogState.record.id, payload });
          }
        }}
      />

      <DeleteDialog
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
