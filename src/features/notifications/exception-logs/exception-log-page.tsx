"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  BellRing,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  notificationExceptionLogFilterSchema,
  type NotificationExceptionLogFilterInput,
  type NotificationExceptionLogFilterValues,
} from "@/features/notifications/exception-logs/schema";
import {
  fetchNotificationExceptionLogs,
  retryNotificationExceptionLog,
} from "@/features/notifications/exception-logs/api/client";
import type {
  NotificationExceptionLogFilters,
  NotificationExceptionLogItem,
} from "@/features/notifications/exception-logs/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [5, 10, 20] as const;
type FeedbackState = { type: "success" | "error"; message: string } | null;

function parseFilters(searchParams: URLSearchParams): NotificationExceptionLogFilters {
  return notificationExceptionLogFilterSchema.parse({
    keyword: searchParams.get("keyword") ?? "",
    channelType: searchParams.get("channelType") ?? "ALL",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 10,
  });
}

function buildSearchParams(filters: NotificationExceptionLogFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.channelType !== "ALL") params.set("channelType", filters.channelType);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  return params.toString();
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

function channelBadgeClassName(channelType: NotificationExceptionLogItem["channelType"]) {
  if (channelType === "BROWSER") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (channelType === "EMAIL") return "border-sky-200 bg-sky-50 text-sky-700";
  if (channelType === "SMS") return "border-amber-200 bg-amber-50 text-amber-700";
  if (channelType === "WECHAT") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) return null;
  const toneClassName =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", toneClassName)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{feedback.message}</div>
      <button type="button" className="text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
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

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function DetailSheet({
  item,
  onClose,
}: {
  item: NotificationExceptionLogItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 px-4 py-6 backdrop-blur-sm">
      <div className="ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-[32px] border border-border bg-background shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-background/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Exception Detail</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{item.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              查看完整 payload、错误详情和最近重试结果，不再依赖前端临时解析原始 JSON。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard label="渠道类型" value={item.channelType} hint={`发送时间：${formatDateTime(item.createdAt)}`} />
            <SummaryCard label="重试次数" value={String(item.retryCount)} hint={item.lastRetryResult ?? "尚未执行重试"} />
          </div>

          <div className="grid gap-4 rounded-[28px] border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="发送人" value={item.senderId} />
              <FieldRow label="接收人" value={item.recipient} />
              <FieldRow label="标题" value={item.title} />
              <FieldRow label="最近重试时间" value={formatDateTime(item.lastRetryAt)} />
            </div>
            <FieldRow label="异常信息" value={item.errorMessage} multiline />
            <FieldRow
              label="重试能力"
              value={item.retryable ? "可重试" : item.retryBlockedReason || "不可重试"}
              multiline
            />
            <FieldRow label="最近重试结果" value={item.lastRetryResult || "-"} multiline />
          </div>

          <div className="rounded-[28px] border border-border bg-card p-5">
            <p className="text-sm font-medium">原始 payload</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-black px-4 py-4 text-xs text-white">
              {item.rawPayload ? JSON.stringify(item.rawPayload, null, 2) : item.rawPayloadText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-sm text-foreground", multiline && "whitespace-pre-wrap leading-6")}>{value}</p>
    </div>
  );
}

export function NotificationExceptionLogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isRoutePending, startRouteTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedLog, setSelectedLog] = useState<NotificationExceptionLogItem | null>(null);
  const [retryTarget, setRetryTarget] = useState<NotificationExceptionLogItem | null>(null);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const form = useForm<NotificationExceptionLogFilterInput, undefined, NotificationExceptionLogFilterValues>({
    resolver: zodResolver(notificationExceptionLogFilterSchema),
    defaultValues: filters,
  });

  useEffect(() => {
    form.reset(filters);
  }, [filters, form]);

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.exceptionLogs(filters),
    queryFn: () => fetchNotificationExceptionLogs(filters),
  });

  const retryMutation = useMutation({
    mutationFn: retryNotificationExceptionLog,
    onSuccess: async (result) => {
      setRetryTarget(null);
      setSelectedLog(result.resolved ? null : result.log);
      setFeedback({
        type: result.success ? "success" : "error",
        message: result.message,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "重试失败，请稍后再试。",
      });
    },
  });

  function updateFilters(nextFilters: NotificationExceptionLogFilters) {
    const nextUrl = buildSearchParams(nextFilters);
    startRouteTransition(() => {
      router.replace(nextUrl ? `${pathname}?${nextUrl}` : pathname);
    });
  }

  function handleSearch(values: NotificationExceptionLogFilterValues) {
    updateFilters({
      ...values,
      page: 1,
    });
  }

  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / filters.pageSize)) : 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_34%),linear-gradient(180deg,_rgba(2,6,23,0.03),_transparent_16%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-medium shadow-sm transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-medium shadow-sm transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
          >
            <RefreshCcw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
            刷新
          </button>
        </div>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                <BellRing className="h-3.5 w-3.5" />
                Notification Exception Logs
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">通知异常日志页</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  这不是普通日志表。当前页面的职责是快速发现通知发送失败记录、查看结构化 payload，并对可重试日志执行单条补发。
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="当前异常总数"
            value={String(listQuery.data?.summary.totalErrors ?? 0)}
            hint="默认只统计 ERROR 级别通知日志。"
          />
          <SummaryCard
            label="可直接重试"
            value={String(listQuery.data?.summary.retryableCount ?? 0)}
            hint="payload 完整且具备最小发送要素的记录。"
          />
          <SummaryCard
            label="阻断项"
            value={String(listQuery.data?.summary.blockedCount ?? 0)}
            hint="坏 JSON、缺接收人或缺标题等场景不会强行重试。"
          />
        </div>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_220px_220px_auto]" onSubmit={form.handleSubmit(handleSearch)}>
            <div>
              <label className="mb-2 block text-sm font-medium">关键字</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="渠道 / 发送人 / 接收人 / 标题 / 异常信息"
                  className={inputClassName(Boolean(form.formState.errors.keyword?.message))}
                  {...form.register("keyword")}
                  style={{ paddingLeft: "2.5rem" }}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">渠道类型</label>
              <select className={inputClassName()} {...form.register("channelType")}>
                <option value="ALL">全部渠道</option>
                <option value="BROWSER">BROWSER</option>
                <option value="EMAIL">EMAIL</option>
                <option value="SMS">SMS</option>
                <option value="WECHAT">WECHAT</option>
                <option value="PUSH">PUSH</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">每页条数</label>
              <select className={inputClassName()} {...form.register("pageSize")}>
                {pageSizeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} 条
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                <Search className="h-4 w-4" />
                搜索
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-2xl border border-border px-4 text-sm font-medium transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
                onClick={() => {
                  form.reset({
                    keyword: "",
                    channelType: "ALL",
                    page: 1,
                    pageSize: filters.pageSize,
                  });
                  updateFilters({
                    keyword: "",
                    channelType: "ALL",
                    page: 1,
                    pageSize: filters.pageSize,
                  });
                }}
              >
                重置
              </button>
            </div>
          </form>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="rounded-[32px] border border-border bg-card shadow-sm">
          {listQuery.isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                正在加载异常日志
              </div>
            </div>
          ) : listQuery.data && listQuery.data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-6 py-4 font-medium">渠道</th>
                    <th className="px-6 py-4 font-medium">发送人</th>
                    <th className="px-6 py-4 font-medium">接收人</th>
                    <th className="px-6 py-4 font-medium">标题</th>
                    <th className="px-6 py-4 font-medium">异常信息</th>
                    <th className="px-6 py-4 font-medium">发送时间</th>
                    <th className="px-6 py-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data.items.map((item) => (
                    <tr key={item.id} className="border-b border-border/70 align-top last:border-b-0">
                      <td className="px-6 py-5">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", channelBadgeClassName(item.channelType))}>
                          {item.channelType}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-muted-foreground">{item.senderId}</td>
                      <td className="px-6 py-5">{item.recipient}</td>
                      <td className="px-6 py-5">{item.title}</td>
                      <td className="max-w-xs px-6 py-5">
                        <p className="line-clamp-2 text-sm leading-6 text-red-700">{item.errorMessage}</p>
                        {!item.retryable ? (
                          <p className="mt-2 text-xs text-amber-700">{item.retryBlockedReason}</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-5 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex h-10 items-center rounded-2xl border border-border px-3 text-sm font-medium transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
                            onClick={() => setSelectedLog(item)}
                          >
                            详情
                          </button>
                          <button
                            type="button"
                            disabled={!item.retryable || retryMutation.isPending}
                            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-black px-3 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                            onClick={() => setRetryTarget(item)}
                          >
                            <RotateCcw className="h-4 w-4" />
                            重试
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyPanel
                title="当前条件下没有异常日志"
                description="可能是当前筛选条件太窄，也可能是这些异常日志已被成功重试并从 ERROR 列表移除。"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              共 {listQuery.data?.total ?? 0} 条异常日志，第 {filters.page} / {totalPages} 页
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={filters.page <= 1 || isRoutePending}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border px-3 text-sm font-medium transition hover:border-black/15 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-white/15"
                onClick={() => updateFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </button>
              <button
                type="button"
                disabled={filters.page >= totalPages || isRoutePending}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border px-3 text-sm font-medium transition hover:border-black/15 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-white/15"
                onClick={() => updateFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <DetailSheet item={selectedLog} onClose={() => setSelectedLog(null)} />

      {retryTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-background p-6 shadow-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Retry Confirm</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">确认重试该条异常日志</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              重试会重新构造通知消息并再次投递。如果投递成功，这条记录会从当前异常列表中移除。
            </p>
            <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="font-medium">{retryTarget.title}</p>
              <p className="mt-1 text-muted-foreground">
                {retryTarget.channelType} · {retryTarget.recipient}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-2xl border border-border px-4 text-sm font-medium transition hover:border-black/15 hover:bg-muted/40 dark:hover:border-white/15"
                onClick={() => setRetryTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={retryMutation.isPending}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                onClick={() => retryMutation.mutate(retryTarget.id)}
              >
                {retryMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                立即重试
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function NotificationExceptionLogPageRoute() {
  return (
    <Suspense fallback={null}>
      <NotificationExceptionLogPage />
    </Suspense>
  );
}
