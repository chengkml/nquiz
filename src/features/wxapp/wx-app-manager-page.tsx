"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  PencilLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  createWxAppSchema,
  updateWxAppSchema,
  wxAppFilterSchema,
  type CreateWxAppInput,
  type CreateWxAppValues,
  type UpdateWxAppInput,
  type UpdateWxAppValues,
  type WxAppFilterInput,
  type WxAppFilterValues,
} from "@/features/wxapp/schema";
import {
  createWxApp,
  deleteWxApp,
  listWxApps,
  listWxAppUsers,
  updateWxApp,
} from "@/features/wxapp/mock-service";
import type { WxAppListFilters, WxAppListItem, WxAppMutationInput, WxAppUser } from "@/features/wxapp/types";

const pageSizeOptions = [5, 10, 20];

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

function parseFilters(searchParams: URLSearchParams): WxAppListFilters {
  const parsed = wxAppFilterSchema.parse({
    keyword: searchParams.get("keyword") ?? "",
    appId: searchParams.get("appId") ?? "",
    status: searchParams.get("status") ?? "ALL",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 5,
  });

  return parsed;
}

function buildSearchParams(filters: WxAppListFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.appId) params.set("appId", filters.appId);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 5) params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

function normalizeMutationInput(values: CreateWxAppValues | UpdateWxAppValues): WxAppMutationInput {
  return {
    appId: values.appId.trim(),
    appName: values.appName.trim(),
    appSecret: values.appSecret?.trim() || undefined,
    appDescr: values.appDescr.trim(),
    status: values.status,
  };
}

function getFormDefaults(record?: WxAppListItem | null): CreateWxAppValues {
  return {
    appId: record?.appId ?? "",
    appName: record?.appName ?? "",
    appSecret: "",
    appDescr: record?.appDescr ?? "",
    status: record?.status ?? "ENABLED",
  };
}

function getStatusBadgeClass(status: WxAppListItem["status"]) {
  return status === "ENABLED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) {
    return null;
  }

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
      <button type="button" className="cursor-pointer text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function WxAppDialog({
  open,
  mode,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  record?: WxAppListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: CreateWxAppValues | UpdateWxAppValues) => Promise<void>;
}) {
  const schema = mode === "create" ? createWxAppSchema : updateWxAppSchema;
  const form = useForm<CreateWxAppInput | UpdateWxAppInput, undefined, CreateWxAppValues | UpdateWxAppValues>({
    resolver: zodResolver(schema),
    defaultValues: getFormDefaults(record),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(getFormDefaults(record));
  }, [open, record, form]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{mode === "create" ? "新增微信小程序" : "编辑微信小程序"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            统一使用 appId / appName / appDescr 字段，不把 quiz 里的命名混乱继续扩散到 UI。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">AppID</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.appId?.message))}
              placeholder="例如 wx8f1c-demo-edu"
              disabled={mode === "edit"}
              {...form.register("appId")}
            />
            <p className="mt-1 text-xs text-muted-foreground">唯一标识。编辑态只读，避免误改业务主键。</p>
            <FieldError message={form.formState.errors.appId?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">小程序名称</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.appName?.message))}
              placeholder="请输入面向业务的展示名称"
              {...form.register("appName")}
            />
            <FieldError message={form.formState.errors.appName?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">AppSecret</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.appSecret?.message))}
              type="password"
              placeholder={mode === "create" ? "新增时必填" : "留空表示不修改"}
              {...form.register("appSecret")}
            />
            <FieldError message={form.formState.errors.appSecret?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">状态</label>
            <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}>
              <option value="ENABLED">启用</option>
              <option value="DISABLED">停用</option>
            </select>
            <FieldError message={form.formState.errors.status?.message} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea
              className={inputClassName(Boolean(form.formState.errors.appDescr?.message))}
              rows={4}
              placeholder="说明该小程序的用途、场景或接入边界"
              {...form.register("appDescr")}
            />
            <FieldError message={form.formState.errors.appDescr?.message} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
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
              {mode === "create" ? "创建小程序" : "保存修改"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersDialog({ open, app, users, loading, onClose }: { open: boolean; app?: WxAppListItem | null; users: WxAppUser[]; loading: boolean; onClose: () => void }) {
  if (!open || !app) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">绑定用户 · {app.appName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">AppID：{app.appId}</p>
          </div>
          <button type="button" className="rounded-2xl border border-border px-3 py-1.5 text-sm" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              正在加载绑定用户...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              当前小程序还没有绑定用户。
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">用户名称</th>
                    <th className="px-4 py-3 font-medium">系统用户 ID</th>
                    <th className="px-4 py-3 font-medium">OpenID</th>
                    <th className="px-4 py-3 font-medium">绑定时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {users.map((user) => (
                    <tr key={`${user.appId}-${user.userId}`}>
                      <td className="px-4 py-3 font-medium">{user.userName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.userId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.openId}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(user.createTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
  record?: WxAppListItem | null;
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
          <h2 className="text-xl font-semibold">确认删除微信小程序</h2>
          <p className="mt-1 text-sm text-muted-foreground">删除后会同时清掉该小程序下的绑定用户映射示例数据。</p>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="rounded-2xl border border-border bg-muted/50 p-4">
            <p>
              <span className="text-muted-foreground">名称：</span>
              <span className="font-medium">{record.appName}</span>
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">AppID：</span>
              <span className="font-mono text-xs">{record.appId}</span>
            </p>
          </div>
          <p className="text-muted-foreground">该操作不可恢复，符合 quiz 原页面的删除确认语义，但补强了目标信息展示。</p>
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

export function WxAppManagerPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WxAppListItem | null>(null);
  const [usersTarget, setUsersTarget] = useState<WxAppListItem | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<WxAppListItem | null>(null);

  const filterForm = useForm<WxAppFilterInput, undefined, WxAppFilterValues>({
    resolver: zodResolver(wxAppFilterSchema),
    defaultValues: filters,
  });

  useEffect(() => {
    filterForm.reset(filters);
  }, [filters, filterForm]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const listQuery = useQuery({
    queryKey: [...queryKeys.wxApps.list, filters],
    queryFn: () => listWxApps(filters),
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.wxApps.users(usersTarget?.appId ?? ""),
    queryFn: () => listWxAppUsers(usersTarget?.appId ?? ""),
    enabled: Boolean(usersTarget),
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateWxAppValues | UpdateWxAppValues) => createWxApp(normalizeMutationInput(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wxApps.all });
      setFeedback({ type: "success", message: "微信小程序创建成功，列表已刷新。" });
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败，请稍后重试。" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: CreateWxAppValues | UpdateWxAppValues) => {
      if (!editingRecord) {
        throw new Error("缺少待编辑记录");
      }
      return updateWxApp(editingRecord.id, normalizeMutationInput(values));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wxApps.all });
      setFeedback({ type: "success", message: "微信小程序更新成功，列表已刷新。" });
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败，请稍后重试。" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRecord) {
        throw new Error("缺少待删除记录");
      }
      return deleteWxApp(deletingRecord.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wxApps.all });
      setFeedback({ type: "success", message: "微信小程序删除成功。" });
      setDeletingRecord(null);
      if (usersTarget && deletingRecord && usersTarget.id === deletingRecord.id) {
        setUsersTarget(null);
      }
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败，请稍后重试。" });
    },
  });

  const applyFilters = (nextFilters: WxAppListFilters) => {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = filterForm.handleSubmit((values) => {
    applyFilters({ ...values, page: 1 });
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                nquiz 迁移 · 第三方应用接入管理
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">WxAppManager</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  首版聚焦 quiz 旧版的核心闭环：列表筛选、分页、新增、编辑、删除、查看绑定用户；同时统一字段命名，补齐删除确认与状态展示。
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
                新增微信小程序
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="小程序总数" value={String(listQuery.data?.summary.totalApps ?? 0)} hint="覆盖当前资源池中的全部第三方小程序配置。" />
          <StatCard label="已启用" value={String(listQuery.data?.summary.enabledApps ?? 0)} hint="可用于实际登录 / 绑定流程的配置数量。" />
          <StatCard label="绑定用户" value={String(listQuery.data?.summary.totalBindings ?? 0)} hint="用于验证“查看用户”子视图的首版闭环。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.2fr_1fr_0.8fr_auto] lg:items-end" onSubmit={handleSearch}>
            <div>
              <label className="mb-2 block text-sm font-medium">名称 / 描述</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")} placeholder="按名称或描述搜索" {...filterForm.register("keyword")} />
              </div>
              <FieldError message={filterForm.formState.errors.keyword?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">AppID</label>
              <input className={inputClassName(Boolean(filterForm.formState.errors.appId?.message))} placeholder="按 AppID 过滤" {...filterForm.register("appId")} />
              <FieldError message={filterForm.formState.errors.appId?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.status?.message))} {...filterForm.register("status")}>
                <option value="ALL">全部状态</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">停用</option>
              </select>
              <FieldError message={filterForm.formState.errors.status?.message} />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90">
                <Search className="h-4 w-4" />
                搜索
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                onClick={() => {
                  const defaults = wxAppFilterSchema.parse({});
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

        <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold">微信小程序列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">保留旧系统的工具页能力，但把字段层级和操作反馈做得更清晰。</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>每页</span>
              <select
                className="rounded-xl border border-border bg-background px-2 py-1.5"
                value={filters.pageSize}
                onChange={(event) => {
                  applyFilters({ ...filters, page: 1, pageSize: Number(event.target.value) });
                }}
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
              正在加载微信小程序列表...
            </div>
          ) : listQuery.isError ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium text-foreground">列表加载失败</p>
                <p className="mt-1">请重试，或检查本地 mock 数据是否异常。</p>
              </div>
              <button
                type="button"
                className="rounded-2xl border border-border px-4 py-2 text-sm font-medium"
                onClick={() => listQuery.refetch()}
              >
                重新加载
              </button>
            </div>
          ) : (listQuery.data?.items.length ?? 0) === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <Search className="h-8 w-8" />
              <div>
                <p className="font-medium text-foreground">没有找到匹配的小程序</p>
                <p className="mt-1">可调整筛选条件，或直接新增一条小程序配置。</p>
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">名称 / AppID</th>
                      <th className="px-6 py-4 font-medium">描述</th>
                      <th className="px-6 py-4 font-medium">状态</th>
                      <th className="px-6 py-4 font-medium">绑定用户</th>
                      <th className="px-6 py-4 font-medium">创建 / 更新</th>
                      <th className="px-6 py-4 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {listQuery.data?.items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-6 py-5">
                          <div className="font-medium">{item.appName}</div>
                          <div className="mt-2 font-mono text-xs text-muted-foreground">{item.appId}</div>
                        </td>
                        <td className="max-w-md px-6 py-5 text-muted-foreground">{item.appDescr || "-"}</td>
                        <td className="px-6 py-5">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStatusBadgeClass(item.status))}>
                            {item.status === "ENABLED" ? "启用" : "停用"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                            onClick={() => setUsersTarget(item)}
                          >
                            <Users className="h-4 w-4" />
                            {item.boundUserCount} 人
                          </button>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">
                          <p>创建：{formatDateTime(item.createDate)}</p>
                          <p className="mt-2">更新：{formatDateTime(item.updateDate)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => setUsersTarget(item)}
                            >
                              <Users className="h-4 w-4" />
                              查看用户
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => {
                                setCreateDialogOpen(false);
                                setEditingRecord(item);
                              }}
                            >
                              <PencilLine className="h-4 w-4" />
                              编辑
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              onClick={() => setDeletingRecord(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-border px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <p>
                  共 {listQuery.data?.total ?? 0} 条，当前第 {filters.page} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={filters.page <= 1}
                    className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => applyFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={filters.page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => applyFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-[32px] border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          <h3 className="text-base font-semibold text-foreground">迁移说明</h3>
          <ul className="mt-4 space-y-2 leading-7">
            <li>• 保留旧版核心能力：列表查询、新增、编辑、删除、查看绑定用户。</li>
            <li>• 统一前端字段命名为 appId / appName / appDescr / createDate / updateDate，避免 quiz 里的 description/appDescr、id/appId 混用继续外溢。</li>
            <li>• 首版仍采用列表页 + 用户弹层，未拆成详情页或用户独立子页，后续可按规模再演进。</li>
          </ul>
        </section>
      </div>

      <WxAppDialog
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
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />

      <UsersDialog
        open={Boolean(usersTarget)}
        app={usersTarget}
        users={usersQuery.data ?? []}
        loading={usersQuery.isLoading}
        onClose={() => setUsersTarget(null)}
      />

      <DeleteDialog
        open={Boolean(deletingRecord)}
        record={deletingRecord}
        pending={deleteMutation.isPending}
        onClose={() => setDeletingRecord(null)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}
