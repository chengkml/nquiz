"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  priceAlertRuleSchema,
  priceCollectSchema,
  priceMonitorFilterSchema,
  priceMonitorItemSchema,
  type PriceAlertRuleInput,
  type PriceAlertRuleValues,
  type PriceCollectInput,
  type PriceCollectValues,
  type PriceMonitorFilterInput,
  type PriceMonitorFilterValues,
  type PriceMonitorItemInput,
  type PriceMonitorItemValues,
} from "@/features/price-monitor/schema";
import {
  collectPrice,
  createPriceMonitorItem,
  deletePriceMonitorItem,
  getPriceAlertRule,
  getPriceMonitorItem,
  getPriceSnapshots,
  getPriceTrend,
  listPriceAlertLogs,
  listPriceMonitorItems,
  savePriceAlertRule,
  updatePriceMonitorItem,
} from "@/features/price-monitor/mock-service";
import type {
  PriceAlertRuleEntity,
  PriceMonitorListFilters,
  PriceMonitorListItem,
  PriceTrendResult,
} from "@/features/price-monitor/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 12, 18] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

function formatDateTime(value?: string) {
  if (!value) return "-";
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

function formatMoney(value?: number, currency = "CNY") {
  if (value === undefined) {
    return "-";
  }
  return `${currency} ${value.toFixed(2)}`;
}

function formatRatio(value?: number) {
  if (value === undefined) {
    return "-";
  }
  return `${(value * 100).toFixed(2)}%`;
}

function parseFilters(searchParams: URLSearchParams): PriceMonitorListFilters {
  const parsed = priceMonitorFilterSchema.parse({
    platform: searchParams.get("platform") ?? "",
    itemName: searchParams.get("itemName") ?? "",
    monitoringEnabled: searchParams.get("monitoringEnabled") ?? "ALL",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 6,
    itemId: searchParams.get("itemId") ?? "",
  });

  return parsed;
}

function buildSearchParams(filters: PriceMonitorListFilters) {
  const params = new URLSearchParams();
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.itemName) params.set("itemName", filters.itemName);
  if (filters.monitoringEnabled !== "ALL") params.set("monitoringEnabled", filters.monitoringEnabled);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 6) params.set("pageSize", String(filters.pageSize));
  if (filters.itemId) params.set("itemId", filters.itemId);
  return params.toString();
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
      initial={{ opacity: 0, y: 18 }}
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

function PriceMonitorItemDialog({
  open,
  mode,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  record?: PriceMonitorListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: PriceMonitorItemValues) => Promise<void>;
}) {
  const form = useForm<PriceMonitorItemInput, undefined, PriceMonitorItemValues>({
    resolver: zodResolver(priceMonitorItemSchema),
    defaultValues: {
      platform: record?.platform ?? "",
      itemName: record?.itemName ?? "",
      itemUrl: record?.itemUrl ?? "",
      externalItemId: record?.externalItemId ?? "",
      monitoringEnabled: record?.monitoringEnabled ?? true,
      currency: record?.currency ?? "CNY",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      platform: record?.platform ?? "",
      itemName: record?.itemName ?? "",
      itemUrl: record?.itemUrl ?? "",
      externalItemId: record?.externalItemId ?? "",
      monitoringEnabled: record?.monitoringEnabled ?? true,
      currency: record?.currency ?? "CNY",
    });
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{mode === "create" ? "新增监控商品" : "编辑监控商品"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保留 quiz 的商品监控语义，但把字段层级和校验边界统一收口到 RHF + Zod。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">平台</label>
            <input className={inputClassName(Boolean(form.formState.errors.platform?.message))} {...form.register("platform")} />
            <FieldError message={form.formState.errors.platform?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">商品名称</label>
            <input className={inputClassName(Boolean(form.formState.errors.itemName?.message))} {...form.register("itemName")} />
            <FieldError message={form.formState.errors.itemName?.message} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">商品链接</label>
            <input className={inputClassName(Boolean(form.formState.errors.itemUrl?.message))} {...form.register("itemUrl")} />
            <FieldError message={form.formState.errors.itemUrl?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">商品标识</label>
            <input className={inputClassName(Boolean(form.formState.errors.externalItemId?.message))} {...form.register("externalItemId")} />
            <FieldError message={form.formState.errors.externalItemId?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">币种</label>
            <input className={inputClassName(Boolean(form.formState.errors.currency?.message))} {...form.register("currency")} />
            <FieldError message={form.formState.errors.currency?.message} />
          </div>

          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <input type="checkbox" className="h-4 w-4" {...form.register("monitoringEnabled")} />
            启用监控
          </label>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "创建监控商品" : "保存修改"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PriceCollectDialog({
  open,
  item,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item?: PriceMonitorListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: PriceCollectValues) => Promise<void>;
}) {
  const form = useForm<PriceCollectInput, undefined, PriceCollectValues>({
    resolver: zodResolver(priceCollectSchema),
    defaultValues: {
      collectedAt: "",
      originalPrice: undefined,
      discountText: "",
      discountAmount: undefined,
      finalPrice: item?.lastFinalPrice ?? 0,
      remark: "",
      rawPayload: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      collectedAt: "",
      originalPrice: item?.lastOriginalPrice,
      discountText: item?.lastDiscountText ?? "",
      discountAmount: item?.lastDiscountAmount,
      finalPrice: item?.lastFinalPrice ?? 0,
      remark: item?.lastRemark ?? "",
      rawPayload: "",
    });
  }, [form, item, open]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">手动采集 · {item.itemName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            首版继续保留 quiz 的“手动录入快照”模式，不把范围扩成自动抓价平台。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">采集时间</label>
            <input className={inputClassName(Boolean(form.formState.errors.collectedAt?.message))} {...form.register("collectedAt")} placeholder="默认留空，使用当前时间" />
            <FieldError message={form.formState.errors.collectedAt?.message} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">原价</label>
            <input type="number" step="0.01" className={inputClassName(Boolean(form.formState.errors.originalPrice?.message))} {...form.register("originalPrice")} />
            <FieldError message={form.formState.errors.originalPrice?.message as string | undefined} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">优惠描述</label>
            <input className={inputClassName(Boolean(form.formState.errors.discountText?.message))} {...form.register("discountText")} />
            <FieldError message={form.formState.errors.discountText?.message} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">优惠金额</label>
            <input type="number" step="0.01" className={inputClassName(Boolean(form.formState.errors.discountAmount?.message))} {...form.register("discountAmount")} />
            <FieldError message={form.formState.errors.discountAmount?.message as string | undefined} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">最终到手价</label>
            <input type="number" step="0.01" className={inputClassName(Boolean(form.formState.errors.finalPrice?.message))} {...form.register("finalPrice")} />
            <FieldError message={form.formState.errors.finalPrice?.message} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">备注</label>
            <input className={inputClassName(Boolean(form.formState.errors.remark?.message))} {...form.register("remark")} />
            <FieldError message={form.formState.errors.remark?.message} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">原始响应摘要</label>
            <textarea className={inputClassName(Boolean(form.formState.errors.rawPayload?.message))} rows={4} {...form.register("rawPayload")} />
            <FieldError message={form.formState.errors.rawPayload?.message} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存采集结果
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PriceAlertRuleDialog({
  open,
  item,
  rule,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item?: PriceMonitorListItem | null;
  rule?: PriceAlertRuleEntity | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: PriceAlertRuleValues) => Promise<void>;
}) {
  const form = useForm<PriceAlertRuleInput, undefined, PriceAlertRuleValues>({
    resolver: zodResolver(priceAlertRuleSchema),
    defaultValues: {
      enabled: rule?.enabled ?? true,
      alertOnIncrease: rule?.alertOnIncrease ?? false,
      alertOnDecrease: rule?.alertOnDecrease ?? true,
      absoluteThreshold: rule?.absoluteThreshold,
      percentageThreshold: rule?.percentageThreshold,
      channel: rule?.channel ?? "EMAIL",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      enabled: rule?.enabled ?? true,
      alertOnIncrease: rule?.alertOnIncrease ?? false,
      alertOnDecrease: rule?.alertOnDecrease ?? true,
      absoluteThreshold: rule?.absoluteThreshold,
      percentageThreshold: rule?.percentageThreshold,
      channel: rule?.channel ?? "EMAIL",
    });
  }, [form, open, rule]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">预警规则 · {item.itemName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            首版明确按“单商品单配置”收口，避免 quiz 里数据库支持多条、页面只展示一条的语义分裂继续外溢。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <input type="checkbox" className="h-4 w-4" {...form.register("enabled")} />
            启用规则
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
              <input type="checkbox" className="h-4 w-4" {...form.register("alertOnIncrease")} />
              上涨预警
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
              <input type="checkbox" className="h-4 w-4" {...form.register("alertOnDecrease")} />
              下降预警
            </label>
          </div>
          <FieldError message={form.formState.errors.alertOnIncrease?.message} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">绝对值阈值</label>
              <input type="number" step="0.01" className={inputClassName(Boolean(form.formState.errors.absoluteThreshold?.message))} {...form.register("absoluteThreshold")} />
              <FieldError message={form.formState.errors.absoluteThreshold?.message as string | undefined} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">比例阈值</label>
              <input type="number" step="0.0001" className={inputClassName(Boolean(form.formState.errors.percentageThreshold?.message))} {...form.register("percentageThreshold")} />
              <FieldError message={form.formState.errors.percentageThreshold?.message as string | undefined} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">通知方式</label>
            <select className={inputClassName(Boolean(form.formState.errors.channel?.message))} {...form.register("channel")}>
              <option value="EMAIL">邮件</option>
            </select>
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
              保存规则
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  open,
  item,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  item?: PriceMonitorListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除监控商品</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            首版显式按“商品 + 快照 + 规则 + 预警日志”一起删除，避免 quiz 旧实现的孤儿数据风险继续带过来。
          </p>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p>
              <span className="text-muted-foreground">商品：</span>
              <span className="font-medium">{item.itemName}</span>
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">平台：</span>
              <span>{item.platform}</span>
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">快照数：</span>
              <span>{item.snapshotCount}</span>
            </p>
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

function PriceTrendChart({ trend }: { trend?: PriceTrendResult | null }) {
  const points = trend?.points ?? [];
  const maxPrice = points.length > 0 ? Math.max(...points.map((point) => Math.max(point.finalPrice, point.originalPrice ?? point.finalPrice))) : 0;

  if (!trend || points.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        暂无价格趋势数据，先录入一次采集快照。
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">价格趋势</h3>
          <p className="mt-1 text-sm text-muted-foreground">保留原有“原价 / 最终价”双线语义，首版用纯 React SVG 实现，避免命令式 ECharts 生命周期负担。</p>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{trend.currency}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="overflow-hidden rounded-3xl border border-border bg-muted/20 p-4">
          <svg viewBox="0 0 680 260" className="h-72 w-full">
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1="44" y1={40 + line * 52} x2="640" y2={40 + line * 52} stroke="rgba(100,116,139,0.18)" strokeDasharray="4 4" />
            ))}
            {points.map((point, index) => {
              const x = 44 + (596 / Math.max(points.length - 1, 1)) * index;
              return <text key={`label-${point.collectedAt}`} x={x} y="246" textAnchor="middle" fontSize="11" fill="rgb(100,116,139)">{new Date(point.collectedAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}</text>;
            })}

            <polyline
              fill="none"
              stroke="rgb(37,99,235)"
              strokeWidth="3"
              points={points
                .map((point, index) => {
                  const x = 44 + (596 / Math.max(points.length - 1, 1)) * index;
                  const y = 220 - ((point.finalPrice / Math.max(maxPrice, 1)) * 160);
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="rgb(16,185,129)"
              strokeWidth="3"
              strokeDasharray="8 6"
              points={points
                .map((point, index) => {
                  const x = 44 + (596 / Math.max(points.length - 1, 1)) * index;
                  const y = 220 - ((((point.originalPrice ?? point.finalPrice) as number) / Math.max(maxPrice, 1)) * 160);
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-muted/20 p-4 text-sm">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <TrendingDown className="h-4 w-4" />
              <span className="font-medium">最终价</span>
            </div>
            <p className="mt-3 text-xl font-semibold">{formatMoney(points.at(-1)?.finalPrice, trend.currency)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">原价</span>
            </div>
            <p className="mt-3 text-xl font-semibold">{formatMoney(points.at(-1)?.originalPrice, trend.currency)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4 text-muted-foreground">
            <p>采样点数：{points.length}</p>
            <p className="mt-2">最新采集：{formatDateTime(points.at(-1)?.collectedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PriceMonitorPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PriceMonitorListItem | null>(null);
  const [collectingRecord, setCollectingRecord] = useState<PriceMonitorListItem | null>(null);
  const [alertRuleRecord, setAlertRuleRecord] = useState<PriceMonitorListItem | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<PriceMonitorListItem | null>(null);

  const filterForm = useForm<PriceMonitorFilterInput, undefined, PriceMonitorFilterValues>({
    resolver: zodResolver(priceMonitorFilterSchema),
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

  const listQuery = useQuery({
    queryKey: queryKeys.priceMonitor.list(filters),
    queryFn: () => listPriceMonitorItems(filters),
  });

  const selectedId = useMemo(() => {
    const currentList = listQuery.data?.items ?? [];
    if (filters.itemId && currentList.some((item) => item.id === filters.itemId)) {
      return filters.itemId;
    }
    return currentList[0]?.id ?? "";
  }, [filters.itemId, listQuery.data?.items]);

  useEffect(() => {
    const currentList = listQuery.data?.items ?? [];
    if (!currentList.length) return;
    if (filters.itemId && currentList.some((item) => item.id === filters.itemId)) return;
    applyFilters({ ...filters, itemId: currentList[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, listQuery.data?.items]);

  const detailQuery = useQuery({
    queryKey: queryKeys.priceMonitor.detail(selectedId),
    queryFn: () => getPriceMonitorItem(selectedId),
    enabled: Boolean(selectedId),
  });

  const trendQuery = useQuery({
    queryKey: queryKeys.priceMonitor.trend(selectedId),
    queryFn: () => getPriceTrend(selectedId),
    enabled: Boolean(selectedId),
  });

  const snapshotsQuery = useQuery({
    queryKey: queryKeys.priceMonitor.snapshots(selectedId),
    queryFn: () => getPriceSnapshots(selectedId),
    enabled: Boolean(selectedId),
  });

  const alertRuleQuery = useQuery({
    queryKey: queryKeys.priceMonitor.alertRule(selectedId),
    queryFn: () => getPriceAlertRule(selectedId),
    enabled: Boolean(selectedId),
  });

  const alertLogsQuery = useQuery({
    queryKey: queryKeys.priceMonitor.alertLogs(selectedId),
    queryFn: () => listPriceAlertLogs(selectedId),
    enabled: Boolean(selectedId),
  });

  const refreshSelection = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.detail(selectedId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.trend(selectedId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.snapshots(selectedId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.alertRule(selectedId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.alertLogs(selectedId) }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createPriceMonitorItem,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.all });
      applyFilters({ ...filters, itemId: created.id, page: 1 });
      setCreateDialogOpen(false);
      setFeedback({ type: "success", message: "监控商品创建成功。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败，请稍后重试。" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: PriceMonitorItemValues) => {
      if (!editingRecord) throw new Error("缺少待编辑记录");
      return updatePriceMonitorItem(editingRecord.id, values);
    },
    onSuccess: async () => {
      await refreshSelection();
      setEditingRecord(null);
      setFeedback({ type: "success", message: "监控商品更新成功。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败，请稍后重试。" });
    },
  });

  const collectMutation = useMutation({
    mutationFn: async (values: PriceCollectValues) => {
      if (!collectingRecord) throw new Error("缺少待采集商品");
      return collectPrice(collectingRecord.id, {
        collectedAt: values.collectedAt,
        originalPrice: values.originalPrice,
        discountText: values.discountText,
        discountAmount: values.discountAmount,
        finalPrice: values.finalPrice,
        remark: values.remark,
        rawPayload: values.rawPayload,
      });
    },
    onSuccess: async (result) => {
      await refreshSelection();
      setCollectingRecord(null);
      setFeedback({
        type: "success",
        message:
          result.triggeredRules.length > 0
            ? `采集成功，已触发 ${result.triggeredRules.join(" / ")}；${result.notifyResult}`
            : `采集成功，${result.notifyResult}`,
      });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "采集失败，请稍后重试。" });
    },
  });

  const saveRuleMutation = useMutation({
    mutationFn: async (values: PriceAlertRuleValues) => {
      if (!alertRuleRecord) throw new Error("缺少待配置商品");
      return savePriceAlertRule(alertRuleRecord.id, values);
    },
    onSuccess: async () => {
      await refreshSelection();
      setAlertRuleRecord(null);
      setFeedback({ type: "success", message: "预警规则保存成功。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "规则保存失败，请稍后重试。" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRecord) throw new Error("缺少待删除记录");
      return deletePriceMonitorItem(deletingRecord.id);
    },
    onSuccess: async () => {
      const deletedId = deletingRecord?.id;
      await queryClient.invalidateQueries({ queryKey: queryKeys.priceMonitor.all });
      setDeletingRecord(null);
      setFeedback({ type: "success", message: "监控商品已删除。" });
      if (deletedId && filters.itemId === deletedId) {
        applyFilters({ ...filters, itemId: "" });
      }
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败，请稍后重试。" });
    },
  });

  function applyFilters(nextFilters: PriceMonitorListFilters) {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const handleSearch = filterForm.handleSubmit((values) => {
    applyFilters({ ...filters, ...values, page: 1 });
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));
  const selectedItem = detailQuery.data ?? null;
  const latestAlertLog = alertLogsQuery.data?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                nquiz 迁移 · 个人价格监控工作台
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">价格监控页</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  首版按一个完整菜单闭环迁移 quiz 的价格监控模块：商品管理、手动采集、趋势与快照、预警规则全部保留；但交互改成 Next.js + Query 驱动的列表 / 详情工作台。
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
                onClick={() => {
                  setEditingRecord(null);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新增监控商品
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="监控商品" value={String(listQuery.data?.summary.totalItems ?? 0)} hint="当前用户名下的全部监控项。" />
          <MetricCard label="启用中" value={String(listQuery.data?.summary.enabledItems ?? 0)} hint="仍在持续维护价格的商品数。" />
          <MetricCard label="快照数" value={String(listQuery.data?.summary.snapshotCount ?? 0)} hint="手动采集沉淀出的历史价格快照。" />
          <MetricCard label="启用规则" value={String(listQuery.data?.summary.enabledRuleCount ?? 0)} hint="当前处于激活状态的阈值预警配置。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-end" onSubmit={handleSearch}>
            <div>
              <label className="mb-2 block text-sm font-medium">平台</label>
              <input className={inputClassName(Boolean(filterForm.formState.errors.platform?.message))} placeholder="按平台过滤" {...filterForm.register("platform")} />
              <FieldError message={filterForm.formState.errors.platform?.message} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">商品名称</label>
              <input className={inputClassName(Boolean(filterForm.formState.errors.itemName?.message))} placeholder="按商品名称搜索" {...filterForm.register("itemName")} />
              <FieldError message={filterForm.formState.errors.itemName?.message} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">监控状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.monitoringEnabled?.message))} {...filterForm.register("monitoringEnabled")}>
                <option value="ALL">全部</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">停用</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background">
                <Search className="h-4 w-4" />
                查询
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium"
                onClick={() => {
                  const defaults = priceMonitorFilterSchema.parse({});
                  filterForm.reset(defaults);
                  applyFilters(defaults);
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                重置
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">监控商品列表</h2>
                <p className="mt-1 text-sm text-muted-foreground">保留平台 / 名称 / 状态 / 最近价格这些关键字段，删除入口显式二次确认。</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>每页</span>
                <select
                  className="rounded-xl border border-border bg-background px-2 py-1.5"
                  value={filters.pageSize}
                  onChange={(event) => applyFilters({ ...filters, page: 1, pageSize: Number(event.target.value) })}
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
                正在加载价格监控列表...
              </div>
            ) : listQuery.isError ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-medium text-foreground">列表加载失败</p>
                  <p className="mt-1">请重试，或检查本地 mock 数据是否异常。</p>
                </div>
                <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={() => listQuery.refetch()}>
                  重新加载
                </button>
              </div>
            ) : (listQuery.data?.items.length ?? 0) === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8" />
                <div>
                  <p className="font-medium text-foreground">当前没有匹配的监控商品</p>
                  <p className="mt-1">可以调整筛选条件，或新增一条商品开始迁移验证。</p>
                </div>
                <button
                  type="button"
                  className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background"
                  onClick={() => {
                    setEditingRecord(null);
                    setCreateDialogOpen(true);
                  }}
                >
                  立即新增
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
                        className={cn(
                          "w-full px-6 py-5 text-left transition hover:bg-muted/30",
                          isSelected && "bg-muted/40",
                        )}
                        onClick={() => applyFilters({ ...filters, itemId: item.id })}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{item.itemName}</span>
                              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{item.platform}</span>
                              <span
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-xs",
                                  item.monitoringEnabled
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-zinc-200 bg-zinc-100 text-zinc-600",
                                )}
                              >
                                {item.monitoringEnabled ? "启用" : "停用"}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-xs",
                                  item.alertRuleEnabled
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-zinc-200 bg-zinc-100 text-zinc-600",
                                )}
                              >
                                {item.alertRuleEnabled ? "规则已启用" : "未启用规则"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">最近最终价：{formatMoney(item.lastFinalPrice, item.currency)} · 最近采集：{formatDateTime(item.lastCollectedAt)}</p>
                            <p className="text-xs text-muted-foreground">快照 {item.snapshotCount} 条 {item.lastAlertAt ? `· 最近预警 ${formatDateTime(item.lastAlertAt)}` : "· 暂无预警记录"}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium"
                            onClick={() => setEditingRecord(item)}
                          >
                            <PencilLine className="h-3.5 w-3.5" /> 编辑
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium"
                            onClick={() => setCollectingRecord(item)}
                          >
                            <TrendingDown className="h-3.5 w-3.5" /> 采集
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium"
                            onClick={() => setAlertRuleRecord(item)}
                          >
                            <Bell className="h-3.5 w-3.5" /> 预警
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
                            onClick={() => setDeletingRecord(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </button>
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
                      onClick={() => applyFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                    >
                      <ChevronLeft className="h-4 w-4" /> 上一页
                    </button>
                    <button
                      type="button"
                      disabled={filters.page >= totalPages}
                      className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:opacity-50"
                      onClick={() => applyFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                    >
                      下一页 <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            {!selectedItem ? (
              <div className="flex min-h-[540px] items-center justify-center rounded-[32px] border border-dashed border-border bg-card text-sm text-muted-foreground">
                请选择一个监控商品查看趋势、快照和预警配置。
              </div>
            ) : (
              <>
                <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold">{selectedItem.itemName}</h2>
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{selectedItem.platform}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs",
                            selectedItem.monitoringEnabled
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-zinc-200 bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {selectedItem.monitoringEnabled ? "监控中" : "已停用"}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        这个详情工作台保留 quiz 原有右侧详情区的核心语义，但把趋势、快照、规则、预警结果拆成更清晰的卡片层次。
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={() => setCollectingRecord(selectedItem)}>
                        手动采集
                      </button>
                      <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={() => setAlertRuleRecord(selectedItem)}>
                        配置预警
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryTile label="最近最终价" value={formatMoney(selectedItem.lastFinalPrice, selectedItem.currency)} hint={selectedItem.lastDiscountText || "暂无优惠描述"} />
                    <SummaryTile label="最近采集" value={formatDateTime(selectedItem.lastCollectedAt)} hint={selectedItem.lastRemark || "暂无备注"} />
                    <SummaryTile label="快照历史" value={`${selectedItem.snapshotCount} 条`} hint={selectedItem.externalItemId || "未填写商品标识"} />
                    <SummaryTile label="最近预警" value={latestAlertLog ? formatDateTime(latestAlertLog.triggeredAt) : "未触发"} hint={latestAlertLog?.notifyResult || "暂无通知结果"} />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <InfoPanel label="商品链接" value={selectedItem.itemUrl || "-"} />
                    <InfoPanel label="商品标识" value={selectedItem.externalItemId || "-"} />
                  </div>
                </section>

                <PriceTrendChart trend={trendQuery.data} />

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">快照历史</h3>
                        <p className="mt-1 text-sm text-muted-foreground">保留时间线 + 数值对比语义，首版不额外做分页，先确保模块闭环。</p>
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-3xl border border-border">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/60 text-left text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">采集时间</th>
                            <th className="px-4 py-3 font-medium">原价</th>
                            <th className="px-4 py-3 font-medium">优惠</th>
                            <th className="px-4 py-3 font-medium">最终价</th>
                            <th className="px-4 py-3 font-medium">备注</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-background">
                          {(snapshotsQuery.data ?? []).map((snapshot) => (
                            <tr key={snapshot.id}>
                              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(snapshot.collectedAt)}</td>
                              <td className="px-4 py-3">{formatMoney(snapshot.originalPrice, selectedItem.currency)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{snapshot.discountText || "-"}</td>
                              <td className="px-4 py-3 font-medium">{formatMoney(snapshot.finalPrice, selectedItem.currency)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{snapshot.remark || "-"}</td>
                            </tr>
                          ))}
                          {!snapshotsQuery.data?.length ? (
                            <tr>
                              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                                暂无快照历史。
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">预警规则</h3>
                          <p className="mt-1 text-sm text-muted-foreground">首版固定为单商品单规则配置。</p>
                        </div>
                        <button type="button" className="rounded-2xl border border-border px-3 py-1.5 text-sm font-medium" onClick={() => setAlertRuleRecord(selectedItem)}>
                          编辑规则
                        </button>
                      </div>

                      <div className="mt-5 space-y-3 rounded-3xl border border-border bg-muted/20 p-4 text-sm">
                        <RuleRow label="启用状态" value={alertRuleQuery.data?.enabled ? "已启用" : "未启用"} />
                        <RuleRow
                          label="方向"
                          value={
                            alertRuleQuery.data
                              ? `${alertRuleQuery.data.alertOnIncrease ? "涨" : ""}${alertRuleQuery.data.alertOnDecrease ? "跌" : ""}` || "未选择"
                              : "未配置"
                          }
                        />
                        <RuleRow label="绝对值阈值" value={alertRuleQuery.data?.absoluteThreshold !== undefined ? formatMoney(alertRuleQuery.data.absoluteThreshold, selectedItem.currency) : "-"} />
                        <RuleRow label="比例阈值" value={alertRuleQuery.data?.percentageThreshold !== undefined ? formatRatio(alertRuleQuery.data.percentageThreshold) : "-"} />
                        <RuleRow label="通知方式" value={alertRuleQuery.data?.channel ?? "EMAIL"} />
                      </div>
                    </section>

                    <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        <h3 className="text-lg font-semibold">最近预警结果</h3>
                      </div>
                      {latestAlertLog ? (
                        <div className="mt-5 space-y-3 rounded-3xl border border-border bg-muted/20 p-4 text-sm">
                          <RuleRow label="触发时间" value={formatDateTime(latestAlertLog.triggeredAt)} />
                          <RuleRow label="方向" value={latestAlertLog.direction === "INCREASE" ? "上涨" : "下降"} />
                          <RuleRow label="变动金额" value={formatMoney(latestAlertLog.deltaAmount, selectedItem.currency)} />
                          <RuleRow label="变动比例" value={formatRatio(latestAlertLog.deltaRatio)} />
                          <RuleRow label="通知结果" value={latestAlertLog.notifyResult} />
                          <p className="rounded-2xl border border-border bg-background p-3 text-muted-foreground">{latestAlertLog.messageContent}</p>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-3xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                          暂未触发预警。
                        </div>
                      )}
                    </section>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          <h3 className="text-base font-semibold text-foreground">迁移说明</h3>
          <ul className="mt-4 space-y-2 leading-7">
            <li>• 已覆盖 quiz 原菜单的核心能力：商品 CRUD、手动采集、趋势、快照历史、预警规则。</li>
            <li>• 有意把“规则列表”语义收口成“单商品单规则配置”，因为旧版页面实际上也只消费第一条规则。</li>
            <li>• 删除链路显式联动删除快照、规则、预警日志，避免原系统潜在孤儿数据问题继续延续。</li>
          </ul>
        </section>
      </div>

      <PriceMonitorItemDialog
        open={createDialogOpen || Boolean(editingRecord)}
        mode={editingRecord ? "edit" : "create"}
        record={editingRecord}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={async (values) => {
          if (editingRecord) {
            await updateMutation.mutateAsync(values);
            return;
          }
          await createMutation.mutateAsync(values);
        }}
      />

      <PriceCollectDialog
        open={Boolean(collectingRecord)}
        item={collectingRecord}
        pending={collectMutation.isPending}
        onClose={() => setCollectingRecord(null)}
        onSubmit={async (values) => {
          await collectMutation.mutateAsync(values);
        }}
      />

      <PriceAlertRuleDialog
        open={Boolean(alertRuleRecord)}
        item={alertRuleRecord}
        rule={alertRuleRecord?.id === selectedId ? alertRuleQuery.data : null}
        pending={saveRuleMutation.isPending}
        onClose={() => setAlertRuleRecord(null)}
        onSubmit={async (values) => {
          await saveRuleMutation.mutateAsync(values);
        }}
      />

      <DeleteDialog
        open={Boolean(deletingRecord)}
        item={deletingRecord}
        pending={deleteMutation.isPending}
        onClose={() => setDeletingRecord(null)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 break-all text-sm text-foreground">{value}</p>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
