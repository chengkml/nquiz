"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { diaryFilterSchema, diaryFormSchema, type DiaryFilterInput, type DiaryFilterValues, type DiaryFormInput, type DiaryFormValues } from "@/features/diary/schema";
import { createDiary, getDiaryDetail, listDiaryRecords, removeDiary, setDiaryArchiveState, updateDiary } from "@/features/diary/mock-service";
import { DIARY_MOOD_OPTIONS, type DiaryListFilters, type DiaryListItem, type DiaryMood } from "@/features/diary/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 12, 18] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

const archiveStateOptions = [
  { value: "ALL", label: "全部状态" },
  { value: "ACTIVE", label: "仅未归档" },
  { value: "ARCHIVED", label: "仅已归档" },
] as const;

const moodToneMap: Record<DiaryMood, string> = {
  HAPPY: "border-amber-200 bg-amber-50 text-amber-700",
  CALM: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SAD: "border-sky-200 bg-sky-50 text-sky-700",
  ANGRY: "border-rose-200 bg-rose-50 text-rose-700",
  TIRED: "border-slate-200 bg-slate-50 text-slate-700",
  EXCITED: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
};

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function moodLabel(mood: DiaryMood) {
  return DIARY_MOOD_OPTIONS.find((item) => item.value === mood)?.label ?? mood;
}

function formatDate(value?: string) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

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

function parseFilters(searchParams: URLSearchParams): DiaryListFilters {
  return diaryFilterSchema.parse({
    keyword: searchParams.get("keyword") ?? "",
    mood: searchParams.get("mood") ?? "",
    archiveState: searchParams.get("archiveState") ?? "ALL",
    startDate: searchParams.get("startDate") ?? "",
    endDate: searchParams.get("endDate") ?? "",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 6,
    selectedId: searchParams.get("id") ?? "",
  });
}

function buildSearchParams(filters: DiaryListFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.mood) params.set("mood", filters.mood);
  if (filters.archiveState !== "ALL") params.set("archiveState", filters.archiveState);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 6) params.set("pageSize", String(filters.pageSize));
  if (filters.selectedId) params.set("id", filters.selectedId);
  return params.toString();
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function MoodBadge({ mood }: { mood: DiaryMood }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs", moodToneMap[mood])}>{moodLabel(mood)}</span>;
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
      <button type="button" className="cursor-pointer text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
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

function DiaryEditorDialog({
  open,
  mode,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  record: DiaryListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: DiaryFormValues) => Promise<void>;
}) {
  const form = useForm<DiaryFormInput, undefined, DiaryFormValues>({
    resolver: zodResolver(diaryFormSchema),
    defaultValues: {
      title: record?.title ?? "",
      content: record?.content ?? "",
      diaryDate: record?.diaryDate ?? todayInputValue(),
      mood: record?.mood ?? "CALM",
      weather: record?.weather ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: record?.title ?? "",
      content: record?.content ?? "",
      diaryDate: record?.diaryDate ?? todayInputValue(),
      mood: record?.mood ?? "CALM",
      weather: record?.weather ?? "",
    });
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{mode === "create" ? "写日记" : "编辑日记"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">保留个人日记语义，首版支持标题、正文、日期、心情、天气与归档状态。</p>
        </div>

        <form className="grid gap-4 px-6 py-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-medium">标题</label>
            <input className={inputClassName(Boolean(form.formState.errors.title?.message))} {...form.register("title")} />
            <FieldError message={form.formState.errors.title?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">正文</label>
            <textarea rows={8} className={inputClassName(Boolean(form.formState.errors.content?.message))} {...form.register("content")} />
            <FieldError message={form.formState.errors.content?.message} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">日记日期</label>
              <input type="date" className={inputClassName(Boolean(form.formState.errors.diaryDate?.message))} {...form.register("diaryDate")} />
              <FieldError message={form.formState.errors.diaryDate?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">心情</label>
              <select className={inputClassName(Boolean(form.formState.errors.mood?.message))} {...form.register("mood")}>
                {DIARY_MOOD_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.mood?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">天气</label>
              <input className={inputClassName(Boolean(form.formState.errors.weather?.message))} placeholder="例如：晴 / 阴 / 小雨" {...form.register("weather")} />
              <FieldError message={form.formState.errors.weather?.message} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "创建日记" : "保存修改"}
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
  record: DiaryListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除日记</h2>
          <p className="mt-1 text-sm text-muted-foreground">删除后无法恢复，该记录会从个人日记列表中移除。</p>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="font-medium">{record.title}</p>
            <p className="mt-1 text-muted-foreground">{record.diaryDate}</p>
            <p className="mt-2 line-clamp-3 text-muted-foreground">{record.contentPreview}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

export function DiaryManagementPage() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [activeRecord, setActiveRecord] = useState<DiaryListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const filtersForm = useForm<DiaryFilterInput, undefined, DiaryFilterValues>({
    resolver: zodResolver(diaryFilterSchema),
    defaultValues: filters,
  });

  useEffect(() => {
    filtersForm.reset(filters);
  }, [filtersForm, filters]);

  const listQuery = useQuery({
    queryKey: queryKeys.diary.list(filters),
    queryFn: () => listDiaryRecords(filters),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.diary.detail(filters.selectedId || null),
    queryFn: () => getDiaryDetail(filters.selectedId),
    enabled: Boolean(filters.selectedId),
  });

  const updateUrlFilters = useCallback(
    (nextFilters: DiaryListFilters) => {
      const query = buildSearchParams(nextFilters);
      const target = query ? `${pathname}?${query}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    if (filters.selectedId) return;
    const first = listQuery.data?.items[0];
    if (!first) return;

    updateUrlFilters({ ...filters, selectedId: first.id });
  }, [filters, listQuery.data?.items, updateUrlFilters]);

  const createMutation = useMutation({
    mutationFn: createDiary,
    onSuccess: (record) => {
      setEditorOpen(false);
      setActiveRecord(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all });
      updateUrlFilters({ ...filters, page: 1, selectedId: record.id });
      setFeedback({ type: "success", message: "已创建新日记。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败，请稍后重试。" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DiaryFormValues }) => updateDiary(id, payload),
    onSuccess: (record) => {
      setEditorOpen(false);
      setActiveRecord(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all });
      updateUrlFilters({ ...filters, selectedId: record.id });
      setFeedback({ type: "success", message: "日记已更新。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败，请稍后重试。" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeDiary(id),
    onSuccess: () => {
      setDeleteOpen(false);
      setActiveRecord(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all });
      const fallbackId = listQuery.data?.items.find((item) => item.id !== filters.selectedId)?.id ?? "";
      updateUrlFilters({ ...filters, selectedId: fallbackId });
      setFeedback({ type: "success", message: "日记已删除。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败，请稍后重试。" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setDiaryArchiveState(id, archived),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all });
      setFeedback({ type: "success", message: record.archived ? "已归档该日记。" : "已取消归档。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "归档操作失败，请稍后重试。" });
    },
  });

  const selectedRecord = detailQuery.data ?? null;
  const listResult = listQuery.data;
  const totalPages = Math.max(1, Math.ceil((listResult?.total ?? 0) / filters.pageSize));

  const moodSummaryText = useMemo(() => {
    const summary = listResult?.summary;
    if (!summary) return "-";

    const top = [...summary.moodBreakdown]
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((item) => `${moodLabel(item.mood)} ${item.count}`)
      .join(" · ");

    return top || "暂无心情数据";
  }, [listResult?.summary]);

  const pendingSubmit = createMutation.isPending || updateMutation.isPending;
  const pendingDelete = deleteMutation.isPending;

  const openCreateDialog = () => {
    setEditorMode("create");
    setActiveRecord(null);
    setEditorOpen(true);
  };

  const openEditDialog = (record: DiaryListItem) => {
    setEditorMode("edit");
    setActiveRecord(record);
    setEditorOpen(true);
  };

  const openDeleteDialog = (record: DiaryListItem) => {
    setActiveRecord(record);
    setDeleteOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            DiaryManagement · 个人日记管理
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">我的日记</h1>
          <p className="text-sm text-muted-foreground">按当前登录用户隔离数据，支持筛选、查看、编辑、删除、归档与取消归档。</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted/40">
            返回首页
          </Link>
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            <Plus className="h-4 w-4" />
            写日记
          </button>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="总日记数" value={String(listResult?.summary.totalDiaries ?? 0)} hint="当前登录用户" />
        <MetricCard label="未归档" value={String(listResult?.summary.activeDiaries ?? 0)} hint="可继续编辑" />
        <MetricCard label="已归档" value={String(listResult?.summary.archivedDiaries ?? 0)} hint="历史沉淀" />
        <MetricCard label="心情分布" value={moodSummaryText} hint={`今日记录 ${listResult?.summary.todayDiaryCount ?? 0} 条`} />
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-7"
          onSubmit={filtersForm.handleSubmit((values) => {
            updateUrlFilters({ ...values, page: 1, selectedId: filters.selectedId });
          })}
        >
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs text-muted-foreground">关键词</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={cn(inputClassName(Boolean(filtersForm.formState.errors.keyword?.message)), "pl-9")} {...filtersForm.register("keyword")} />
            </div>
            <FieldError message={filtersForm.formState.errors.keyword?.message} />
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted-foreground">心情</label>
            <select className={inputClassName(Boolean(filtersForm.formState.errors.mood?.message))} {...filtersForm.register("mood")}>
              <option value="">全部心情</option>
              {DIARY_MOOD_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <FieldError message={filtersForm.formState.errors.mood?.message} />
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted-foreground">归档状态</label>
            <select className={inputClassName(Boolean(filtersForm.formState.errors.archiveState?.message))} {...filtersForm.register("archiveState")}>
              {archiveStateOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <FieldError message={filtersForm.formState.errors.archiveState?.message} />
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted-foreground">开始日期</label>
            <input type="date" className={inputClassName(Boolean(filtersForm.formState.errors.startDate?.message))} {...filtersForm.register("startDate")} />
            <FieldError message={filtersForm.formState.errors.startDate?.message} />
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted-foreground">结束日期</label>
            <input type="date" className={inputClassName(Boolean(filtersForm.formState.errors.endDate?.message))} {...filtersForm.register("endDate")} />
            <FieldError message={filtersForm.formState.errors.endDate?.message} />
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted-foreground">每页条数</label>
            <select className={inputClassName(Boolean(filtersForm.formState.errors.pageSize?.message))} {...filtersForm.register("pageSize", { valueAsNumber: true })}>
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <FieldError message={filtersForm.formState.errors.pageSize?.message} />
          </div>

          <div className="md:col-span-2 xl:col-span-7 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
              onClick={() => {
                const reset = {
                  keyword: "",
                  mood: "",
                  archiveState: "ALL",
                  startDate: "",
                  endDate: "",
                  page: 1,
                  pageSize: filters.pageSize,
                  selectedId: filters.selectedId,
                } as DiaryListFilters;

                filtersForm.reset(reset);
                updateUrlFilters(reset);
              }}
            >
              重置
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background">
              应用筛选
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold">日记列表</h2>
              <p className="text-sm text-muted-foreground">共 {listResult?.total ?? 0} 条匹配结果</p>
            </div>
            <div className="text-xs text-muted-foreground">排序：日记日期倒序</div>
          </div>

          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              正在加载日记列表...
            </div>
          ) : listQuery.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">加载失败，请刷新后重试。</div>
          ) : (listResult?.items.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8" />
              <p className="text-sm">当前筛选条件下没有日记记录。</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {listResult?.items.map((item) => {
                const isActive = filters.selectedId === item.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => updateUrlFilters({ ...filters, selectedId: item.id })}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition",
                      isActive ? "border-foreground/30 bg-muted/30" : "border-border hover:border-foreground/20",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="line-clamp-1 text-base font-medium">{item.title}</h3>
                      <div className="flex items-center gap-2">
                        <MoodBadge mood={item.mood} />
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs",
                            item.archived ? "border-slate-300 bg-slate-100 text-slate-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {item.archived ? "已归档" : "未归档"}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.contentPreview}</p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {item.diaryDate}
                      </div>

                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="rounded-xl border border-border px-2.5 py-1 text-xs transition hover:bg-muted/40"
                          onClick={() => openEditDialog(item)}
                        >
                          <span className="inline-flex items-center gap-1">
                            <PencilLine className="h-3.5 w-3.5" /> 编辑
                          </span>
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-border px-2.5 py-1 text-xs transition hover:bg-muted/40"
                          onClick={() => archiveMutation.mutate({ id: item.id, archived: !item.archived })}
                        >
                          <span className="inline-flex items-center gap-1">
                            {item.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                            {item.archived ? "取消归档" : "归档"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-red-200 px-2.5 py-1 text-xs text-red-700 transition hover:bg-red-50"
                          onClick={() => openDeleteDialog(item)}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={filters.page <= 1}
              onClick={() => updateUrlFilters({ ...filters, page: filters.page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </button>
            <span className="text-sm text-muted-foreground">
              第 {filters.page} / {totalPages} 页
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={filters.page >= totalPages}
              onClick={() => updateUrlFilters({ ...filters, page: filters.page + 1 })}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold">日记详情</h2>
            <p className="text-sm text-muted-foreground">支持快速查看，不强制跳转详情页。</p>
          </div>

          {detailQuery.isFetching && filters.selectedId ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              正在加载详情...
            </div>
          ) : !selectedRecord ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8" />
              <p className="text-sm">选择一条日记查看完整内容。</p>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedRecord.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <MoodBadge mood={selectedRecord.mood} />
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs",
                      selectedRecord.archived ? "border-slate-300 bg-slate-100 text-slate-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {selectedRecord.archived ? "已归档" : "未归档"}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                    日期：{selectedRecord.diaryDate}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm leading-7 whitespace-pre-wrap">{selectedRecord.content}</div>

              <dl className="grid gap-3 rounded-2xl border border-border bg-muted/10 p-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">天气</dt>
                  <dd className="mt-1 font-medium">{selectedRecord.weather || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">创建时间</dt>
                  <dd className="mt-1 font-medium">{formatDate(selectedRecord.createDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">最近更新</dt>
                  <dd className="mt-1 font-medium">{formatDate(selectedRecord.updateDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">记录归属</dt>
                  <dd className="mt-1 font-medium">{selectedRecord.createUserName}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-2xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted/40"
                  onClick={() => openEditDialog(selectedRecord as DiaryListItem)}
                >
                  <span className="inline-flex items-center gap-1">
                    <PencilLine className="h-4 w-4" />
                    编辑
                  </span>
                </button>

                <button
                  type="button"
                  className="rounded-2xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted/40"
                  onClick={() => archiveMutation.mutate({ id: selectedRecord.id, archived: !selectedRecord.archived })}
                >
                  <span className="inline-flex items-center gap-1">
                    {selectedRecord.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {selectedRecord.archived ? "取消归档" : "归档"}
                  </span>
                </button>

                <button
                  type="button"
                  className="rounded-2xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  onClick={() => openDeleteDialog(selectedRecord as DiaryListItem)}
                >
                  <span className="inline-flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />
                    删除
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <DiaryEditorDialog
        open={editorOpen}
        mode={editorMode}
        record={activeRecord}
        pending={pendingSubmit}
        onClose={() => {
          setEditorOpen(false);
          setActiveRecord(null);
        }}
        onSubmit={async (values) => {
          if (editorMode === "create") {
            await createMutation.mutateAsync(values);
            return;
          }

          if (!activeRecord) {
            throw new Error("未找到需要编辑的日记记录");
          }

          await updateMutation.mutateAsync({ id: activeRecord.id, payload: values });
        }}
      />

      <DeleteDialog
        open={deleteOpen}
        record={activeRecord}
        pending={pendingDelete}
        onClose={() => {
          setDeleteOpen(false);
          setActiveRecord(null);
        }}
        onConfirm={async () => {
          if (!activeRecord) return;
          await deleteMutation.mutateAsync(activeRecord.id);
        }}
      />
    </div>
  );
}
