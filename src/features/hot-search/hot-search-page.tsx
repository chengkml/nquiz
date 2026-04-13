"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  PanelRightClose,
  PencilLine,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  hotSearchFilterSchema,
  type HotSearchFilterInput,
  hotSearchTopicFormSchema,
  type HotSearchFilterValues,
  type HotSearchTopicFormInput,
  type HotSearchTopicFormValues,
} from "@/features/hot-search/schema";
import {
  createHotSearchTopic,
  deleteHotSearchTopic,
  getHotSearchDetail,
  listHotSearchTopics,
  searchHotSearchRecords,
  updateHotSearchTopic,
} from "@/features/hot-search/mock-service";
import { HOT_SEARCH_SOURCE_OPTIONS, type HotSearchFilters, type HotSearchFollowTopic, type HotSearchTopicMutationInput } from "@/features/hot-search/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [5, 10, 20] as const;

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

function parseFilters(searchParams: URLSearchParams): HotSearchFilters {
  return hotSearchFilterSchema.parse({
    source: searchParams.get("source") ?? "",
    keyword: searchParams.get("keyword") ?? "",
    followedOnly: searchParams.get("followedOnly") ?? "false",
    fromTime: searchParams.get("fromTime") ?? "",
    toTime: searchParams.get("toTime") ?? "",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 10,
    selectedId: searchParams.get("id") ?? "",
  });
}

function buildSearchParams(filters: HotSearchFilters) {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.followedOnly) params.set("followedOnly", "true");
  if (filters.fromTime) params.set("fromTime", filters.fromTime);
  if (filters.toTime) params.set("toTime", filters.toTime);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  if (filters.selectedId) params.set("id", filters.selectedId);
  return params.toString();
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
      <button type="button" className="cursor-pointer text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
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

function TopicDialog({
  open,
  topic,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  topic: HotSearchFollowTopic | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: HotSearchTopicMutationInput) => Promise<void>;
}) {
  const form = useForm<HotSearchTopicFormInput, undefined, HotSearchTopicFormValues>({
    resolver: zodResolver(hotSearchTopicFormSchema),
    defaultValues: {
      topicName: topic?.topicName ?? "",
      keywords: topic?.keywords ?? "",
      enabled: topic?.enabled ?? true,
      seq: topic?.seq ?? 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      topicName: topic?.topicName ?? "",
      keywords: topic?.keywords ?? "",
      enabled: topic?.enabled ?? true,
      seq: topic?.seq ?? 0,
    });
  }, [form, open, topic]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{topic ? "编辑关注主题" : "新增关注主题"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">保留 quiz 的个人主题语义，首版继续支持名称、关键词、启停和排序。</p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              topicName: values.topicName,
              keywords: values.keywords || "",
              enabled: values.enabled,
              seq: values.seq,
            });
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">主题名称</label>
            <input className={inputClassName(Boolean(form.formState.errors.topicName?.message))} {...form.register("topicName")} />
            <FieldError message={form.formState.errors.topicName?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">关键词</label>
            <textarea
              rows={5}
              className={inputClassName(Boolean(form.formState.errors.keywords?.message))}
              placeholder="支持逗号或换行分隔，例如：AI, Agent, 大模型"
              {...form.register("keywords")}
            />
            <FieldError message={form.formState.errors.keywords?.message} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">排序</label>
              <input type="number" className={inputClassName(Boolean(form.formState.errors.seq?.message))} {...form.register("seq")} />
              <FieldError message={form.formState.errors.seq?.message} />
            </div>
            <label className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" className="h-4 w-4" {...form.register("enabled")} />
              启用匹配
            </label>
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
              {topic ? "保存修改" : "创建主题"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  open,
  topic,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  topic: HotSearchFollowTopic | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !topic) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除关注主题</h2>
          <p className="mt-1 text-sm text-muted-foreground">删除后，该主题不会再参与标题关键词命中。</p>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="font-medium">{topic.topicName}</p>
            <p className="mt-2 text-muted-foreground">关键词：{topic.keywords || "（为空时退回主题名本身参与匹配）"}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-5">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
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

function TopicSheet({
  open,
  topics,
  loading,
  onClose,
  onCreate,
  onEdit,
  onDelete,
}: {
  open: boolean;
  topics: HotSearchFollowTopic[];
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (topic: HotSearchFollowTopic) => void;
  onDelete: (topic: HotSearchFollowTopic) => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-40 w-full max-w-xl transform border-l border-border bg-background shadow-2xl transition duration-200",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">关注主题管理</h2>
            <p className="mt-1 text-sm text-muted-foreground">保留个人主题隔离语义，首版继续在同页完成管理闭环。</p>
          </div>
          <button type="button" className="rounded-2xl border border-border p-2" onClick={onClose}>
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="text-sm text-muted-foreground">共 {topics.length} 个主题，启用 {topics.filter((item) => item.enabled).length} 个</div>
          <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            新增主题
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              正在加载关注主题...
            </div>
          ) : topics.length === 0 ? (
            <div className="flex min-h-60 items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">
              当前还没有关注主题。
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => (
                <div key={topic.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{topic.topicName}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs",
                            topic.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {topic.enabled ? "启用" : "停用"}
                        </span>
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">排序 {topic.seq}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{topic.keywords || "未填写关键词，默认用主题名参与匹配。"}</p>
                      <p className="text-xs text-muted-foreground">更新时间：{formatDateTime(topic.updateDate)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium" onClick={() => onEdit(topic)}>
                        <PencilLine className="h-3.5 w-3.5" /> 编辑
                      </button>
                      <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600" onClick={() => onDelete(topic)}>
                        <Trash2 className="h-3.5 w-3.5" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HotSearchPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<HotSearchFollowTopic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<HotSearchFollowTopic | null>(null);

  const filterForm = useForm<HotSearchFilterInput, undefined, HotSearchFilterValues>({
    resolver: zodResolver(hotSearchFilterSchema),
    defaultValues: filters,
  });

  useEffect(() => {
    filterForm.reset(filters);
  }, [filterForm, filters]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const listFilters = useMemo(
    () => ({
      source: filters.source,
      keyword: filters.keyword,
      followedOnly: filters.followedOnly,
      fromTime: filters.fromTime,
      toTime: filters.toTime,
      page: filters.page,
      pageSize: filters.pageSize,
    }),
    [filters.followedOnly, filters.fromTime, filters.keyword, filters.page, filters.pageSize, filters.source, filters.toTime],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.hotSearch.list(listFilters),
    queryFn: () => searchHotSearchRecords(filters),
  });

  const topicsQuery = useQuery({
    queryKey: queryKeys.hotSearch.topics,
    queryFn: listHotSearchTopics,
  });

  const selectedId = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    if (filters.selectedId && items.some((item) => item.id === filters.selectedId)) {
      return filters.selectedId;
    }
    return items[0]?.id ?? "";
  }, [filters.selectedId, listQuery.data?.items]);

  useEffect(() => {
    const items = listQuery.data?.items ?? [];
    if (!items.length) return;
    if (filters.selectedId && items.some((item) => item.id === filters.selectedId)) return;
    applyFilters({ ...filters, selectedId: items[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, listQuery.data?.items]);

  const detailQuery = useQuery({
    queryKey: queryKeys.hotSearch.detail(selectedId),
    queryFn: () => getHotSearchDetail(selectedId),
    enabled: Boolean(selectedId),
  });

  const createTopicMutation = useMutation({
    mutationFn: createHotSearchTopic,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.hotSearch.topics }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hotSearch.all }),
      ]);
      setEditingTopic(null);
      setFeedback({ type: "success", message: "关注主题已创建。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败" });
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: async (payload: HotSearchTopicMutationInput) => {
      if (!editingTopic) throw new Error("缺少待编辑主题");
      return updateHotSearchTopic(editingTopic.id, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.hotSearch.topics }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hotSearch.all }),
      ]);
      setEditingTopic(null);
      setFeedback({ type: "success", message: "关注主题已更新。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败" });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async () => {
      if (!deletingTopic) throw new Error("缺少待删除主题");
      return deleteHotSearchTopic(deletingTopic.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.hotSearch.topics }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hotSearch.all }),
      ]);
      setDeletingTopic(null);
      setFeedback({ type: "success", message: "关注主题已删除。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败" });
    },
  });

  function applyFilters(nextFilters: HotSearchFilters) {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const handleSearch = filterForm.handleSubmit((values) => {
    applyFilters({ ...filters, ...values, page: 1, selectedId: "" });
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                nquiz 迁移 · 热搜浏览 + 个人关注主题
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">热搜页</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  按 quiz 旧模块真实语义迁移：保留热搜浏览、标题筛选、只看关注、详情查看、个人关注主题管理；但用 Next.js + URL 化筛选 + Query 驱动状态重构成更清晰的工作台。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="https://github.com/chengkml/nquiz.git"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                仓库
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                onClick={() => setTopicSheetOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                管理关注主题
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="热搜记录" value={String(listQuery.data?.summary.totalRecords ?? 0)} hint="mock 数据按 quiz 热搜记录结构组织。" />
          <StatCard label="命中关注" value={String(listQuery.data?.summary.matchedRecords ?? 0)} hint="至少命中一个启用主题的热搜记录数。" />
          <StatCard label="启用主题" value={String(listQuery.data?.summary.enabledTopicCount ?? 0)} hint="当前用户启用中的关注主题数。" />
          <StatCard label="最近抓取" value={listQuery.data?.summary.latestCrawlTime ? formatDateTime(listQuery.data.summary.latestCrawlTime) : "-"} hint="保留 crawlTime 语义，方便后续接真实导入链路。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 xl:grid-cols-[180px_1fr_180px_180px_180px_auto] xl:items-end" onSubmit={handleSearch}>
            <div>
              <label className="mb-2 block text-sm font-medium">来源</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.source?.message))} {...filterForm.register("source")}>
                {HOT_SEARCH_SOURCE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">标题关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")} placeholder="按标题关键词搜索" {...filterForm.register("keyword")} />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">开始时间</label>
              <input type="datetime-local" className={inputClassName(Boolean(filterForm.formState.errors.fromTime?.message))} {...filterForm.register("fromTime")} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">结束时间</label>
              <input type="datetime-local" className={inputClassName(Boolean(filterForm.formState.errors.toTime?.message))} {...filterForm.register("toTime")} />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" className="h-4 w-4" {...filterForm.register("followedOnly")} />
              只看命中关注主题
            </label>

            <div className="flex gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background">
                <Search className="h-4 w-4" /> 查询
              </button>
              <button
                type="button"
                className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium"
                onClick={() => {
                  const defaults = hotSearchFilterSchema.parse({});
                  filterForm.reset(defaults);
                  applyFilters(defaults);
                }}
              >
                重置
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">热搜列表</h2>
                <p className="mt-1 text-sm text-muted-foreground">列表只保留摘要字段，详情内容独立放到右侧详情区，避免延续旧页 search 承担双重负载。</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>每页</span>
                <select
                  className="rounded-xl border border-border bg-background px-2 py-1.5"
                  value={filters.pageSize}
                  onChange={(event) => applyFilters({ ...filters, page: 1, pageSize: Number(event.target.value) as 5 | 10 | 20, selectedId: "" })}
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {listQuery.isLoading ? (
              <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                正在加载热搜列表...
              </div>
            ) : listQuery.isError ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-medium text-foreground">列表加载失败</p>
                  <p className="mt-1">请稍后重试。</p>
                </div>
                <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={() => listQuery.refetch()}>
                  重新加载
                </button>
              </div>
            ) : (listQuery.data?.items.length ?? 0) === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8" />
                <div>
                  <p className="font-medium text-foreground">当前没有匹配的热搜</p>
                  <p className="mt-1">可以调整筛选条件，或先新增几个关注主题再看只看关注视图。</p>
                </div>
                <button type="button" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" onClick={() => setTopicSheetOpen(true)}>
                  打开主题管理
                </button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {listQuery.data?.items.map((item) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn("w-full px-6 py-5 text-left transition hover:bg-muted/30", isSelected && "bg-muted/40")}
                        onClick={() => applyFilters({ ...filters, selectedId: item.id })}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">#{item.rankIndex}</span>
                              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{item.source}</span>
                              {item.hotValue ? <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs text-orange-700">热度 {item.hotValue}</span> : null}
                            </div>
                            <div className="text-base font-medium leading-7">{item.title}</div>
                            <div className="flex flex-wrap gap-2">
                              {item.matchedTopics.length > 0 ? (
                                item.matchedTopics.map((topic) => (
                                  <span key={`${item.id}-${topic}`} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                                    {topic}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">未命中关注主题</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">抓取时间：{formatDateTime(item.crawlTime)}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-4 border-t border-border px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                  <p>
                    共 {listQuery.data?.total ?? 0} 条，当前第 {filters.page} / {totalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={filters.page <= 1}
                      className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:opacity-50"
                      onClick={() => applyFilters({ ...filters, page: Math.max(1, filters.page - 1), selectedId: "" })}
                    >
                      <ChevronLeft className="h-4 w-4" /> 上一页
                    </button>
                    <button
                      type="button"
                      disabled={filters.page >= totalPages}
                      className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:opacity-50"
                      onClick={() => applyFilters({ ...filters, page: Math.min(totalPages, filters.page + 1), selectedId: "" })}
                    >
                      下一页 <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            {!detailQuery.data ? (
              <div className="flex min-h-[560px] items-center justify-center rounded-[32px] border border-dashed border-border bg-card text-sm text-muted-foreground">
                请选择一条热搜查看详情。
              </div>
            ) : (
              <>
                <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">#{detailQuery.data.rankIndex}</span>
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{detailQuery.data.source}</span>
                        {detailQuery.data.hotValue ? <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs text-orange-700">热度 {detailQuery.data.hotValue}</span> : null}
                      </div>
                      <h2 className="text-2xl font-semibold leading-9">{detailQuery.data.title}</h2>
                      <p className="text-sm leading-7 text-muted-foreground">详情区从列表负载中拆出，后续接真实接口时可以直接替换成 `/hot-search/[id]` 单条查询。</p>
                    </div>
                    {detailQuery.data.url ? (
                      <Link href={detailQuery.data.url} target="_blank" className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted">
                        打开原文
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="来源" value={detailQuery.data.source} hint="保留 source 语义，后续可扩展多来源。" />
                    <StatCard label="热度" value={detailQuery.data.hotValue || "-"} hint="沿用旧记录的 hotValue 字段。" />
                    <StatCard label="抓取时间" value={formatDateTime(detailQuery.data.crawlTime)} hint="按 crawlTime 展示内容新鲜度。" />
                    <StatCard label="命中主题" value={String(detailQuery.data.matchedTopics.length)} hint="命中规则：标题 contains，大小写不敏感。" />
                  </div>
                </section>

                <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">命中关注主题</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {detailQuery.data.matchedTopics.length > 0 ? (
                      detailQuery.data.matchedTopics.map((topic) => (
                        <span key={`${detailQuery.data?.id}-${topic}`} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700">
                          {topic}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">当前热搜未命中任何启用中的关注主题。</span>
                    )}
                  </div>
                </section>

                <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">详情内容</h3>
                  <div className="mt-4 rounded-3xl border border-border bg-muted/20 p-5 text-sm leading-8 whitespace-pre-wrap text-muted-foreground">
                    {detailQuery.data.detailMarkdown || "暂无详情内容。"}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">批次号</p>
                      <p className="mt-3 break-all text-sm text-foreground">{detailQuery.data.batchNo}</p>
                    </div>
                    <div className="rounded-3xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">扩展 JSON</p>
                      <p className="mt-3 break-all text-sm text-foreground">{detailQuery.data.extraJson || "-"}</p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          <h3 className="text-base font-semibold text-foreground">迁移说明</h3>
          <ul className="mt-4 space-y-2 leading-7">
            <li>• 已覆盖 quiz 原菜单主链路：热搜列表、标题筛选、只看关注、详情查看、个人关注主题管理。</li>
            <li>• 有意把筛选条件 URL 化，刷新后仍能保留查询状态，不再像旧页一样全部丢失。</li>
            <li>• 首版仍使用本地 mock 数据形成闭环；真实后端、用户鉴权隔离和导入链路待后续接入。</li>
          </ul>
        </section>
      </div>

      <TopicSheet
        open={topicSheetOpen}
        topics={topicsQuery.data ?? []}
        loading={topicsQuery.isLoading}
        onClose={() => setTopicSheetOpen(false)}
        onCreate={() => setEditingTopic({ id: "", topicName: "", keywords: "", enabled: true, seq: topicsQuery.data?.length ?? 0, createDate: "", updateDate: "" })}
        onEdit={(topic) => setEditingTopic(topic)}
        onDelete={(topic) => setDeletingTopic(topic)}
      />

      <TopicDialog
        open={Boolean(editingTopic)}
        topic={editingTopic}
        pending={createTopicMutation.isPending || updateTopicMutation.isPending}
        onClose={() => setEditingTopic(null)}
        onSubmit={async (payload) => {
          if (editingTopic?.id) {
            await updateTopicMutation.mutateAsync(payload);
            return;
          }
          await createTopicMutation.mutateAsync(payload);
        }}
      />

      <DeleteDialog
        open={Boolean(deletingTopic)}
        topic={deletingTopic}
        pending={deleteTopicMutation.isPending}
        onClose={() => setDeletingTopic(null)}
        onConfirm={async () => {
          await deleteTopicMutation.mutateAsync();
        }}
      />
    </div>
  );
}
