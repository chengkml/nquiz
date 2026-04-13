"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HeartPulse,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCcw,
  ScanSearch,
  Search,
  Server,
  Shield,
  Trash2,
  Wrench,
} from "lucide-react";
import { mcpServerFilterSchema, mcpServerFormSchema, type McpServerFilterInput, type McpServerFilterValues, type McpServerFormInput, type McpServerFormValues } from "@/features/mcp-server/schema";
import {
  MCP_SERVER_ENV_OPTIONS,
  MCP_SERVER_STATUS_OPTIONS,
  type McpServerDetail,
  type McpServerListFilters,
  type McpServerStatus,
} from "@/features/mcp-server/types";
import { createMcpServer, deleteMcpServer, discoverServerTools, getMcpServerDetail, healthCheckMcpServer, listMcpServers, updateMcpServer } from "@/features/mcp-server/mock-service";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 12, 18] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

const statusMeta: Record<McpServerStatus, { label: string; className: string }> = {
  CREATED: { label: "已创建", className: "border-sky-200 bg-sky-50 text-sky-700" },
  ACTIVE: { label: "可用", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  DEGRADED: { label: "降级", className: "border-amber-200 bg-amber-50 text-amber-700" },
  INACTIVE: { label: "禁用", className: "border-zinc-200 bg-zinc-100 text-zinc-700" },
};

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

function parseFilters(searchParams: URLSearchParams): McpServerListFilters {
  return mcpServerFilterSchema.parse({
    keyword: searchParams.get("keyword") ?? "",
    env: searchParams.get("env") ?? "",
    status: searchParams.get("status") ?? "ALL",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 6,
    selectedId: searchParams.get("selectedId") ?? "",
  });
}

function buildSearchParams(filters: McpServerListFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.env) params.set("env", filters.env);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 6) params.set("pageSize", String(filters.pageSize));
  if (filters.selectedId) params.set("selectedId", filters.selectedId);
  return params.toString();
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function textareaClassName(hasError = false) {
  return cn(inputClassName(hasError), "min-h-24 resize-y");
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

function StatusBadge({ status }: { status: McpServerStatus }) {
  const meta = statusMeta[status];
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>;
}

function ServerDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: McpServerDetail | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: McpServerFormValues) => Promise<void>;
}) {
  const form = useForm<McpServerFormInput, undefined, McpServerFormValues>({
    resolver: zodResolver(mcpServerFormSchema),
    defaultValues: {
      name: record?.name ?? "",
      identifier: record?.identifier ?? "",
      env: record?.env ?? "dev",
      description: record?.description ?? "",
      address: record?.address ?? "",
      authConfig: record?.authConfig ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: record?.name ?? "",
      identifier: record?.identifier ?? "",
      env: record?.env ?? "dev",
      description: record?.description ?? "",
      address: record?.address ?? "",
      authConfig: record?.authConfig ?? "",
    });
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑 MCP 服务器" : "新增 MCP 服务器"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">首版聚焦连接台账、健康检查和发现工具入口；认证配置只在编辑态可见，详情侧栏默认脱敏展示。</p>
        </div>

        <form className="grid gap-4 px-6 py-5 md:grid-cols-2" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div>
            <label className="mb-2 block text-sm font-medium">名称</label>
            <input className={inputClassName(Boolean(form.formState.errors.name?.message))} {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">标识</label>
            <input className={inputClassName(Boolean(form.formState.errors.identifier?.message))} {...form.register("identifier")} />
            <FieldError message={form.formState.errors.identifier?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">环境</label>
            <select className={inputClassName(Boolean(form.formState.errors.env?.message))} {...form.register("env")}>
              {MCP_SERVER_ENV_OPTIONS.filter((item) => item.value).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.env?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">地址</label>
            <input className={inputClassName(Boolean(form.formState.errors.address?.message))} {...form.register("address")} />
            <FieldError message={form.formState.errors.address?.message} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea className={textareaClassName(Boolean(form.formState.errors.description?.message))} {...form.register("description")} />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">认证配置</label>
            <textarea className={textareaClassName(Boolean(form.formState.errors.authConfig?.message))} placeholder="可选，通常是 Bearer Token 或其它认证信息" {...form.register("authConfig")} />
            <FieldError message={form.formState.errors.authConfig?.message} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "提交中..." : record ? "保存修改" : "创建服务器"}
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
  record?: McpServerDetail | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">删除 MCP 服务器</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          删除后会移除该服务器的发现快照，但不会自动删除已经同步到 MCP Tool 域的工具台账。当前目标：
          <span className="font-medium text-foreground"> {record.name}</span>
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

export function McpServerManagementPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filterForm = useForm<McpServerFilterInput, undefined, McpServerFilterValues>({
    resolver: zodResolver(mcpServerFilterSchema),
    defaultValues: filters,
  });

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<McpServerDetail | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<McpServerDetail | null>(null);

  useEffect(() => {
    filterForm.reset(filters);
  }, [filterForm, filters]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const listQuery = useQuery({
    queryKey: queryKeys.mcpServers.list(filters),
    queryFn: () => listMcpServers(filters),
  });

  const activeSelectedId =
    filters.selectedId && listQuery.data?.items.some((item) => item.id === filters.selectedId)
      ? filters.selectedId
      : listQuery.data?.items[0]?.id ?? "";

  const detailQuery = useQuery({
    queryKey: queryKeys.mcpServers.detail(activeSelectedId),
    queryFn: () => getMcpServerDetail(activeSelectedId),
    enabled: Boolean(activeSelectedId),
  });

  const applyFilters = (nextFilters: McpServerListFilters) => {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const createMutation = useMutation({
    mutationFn: createMcpServer,
    onSuccess: async (server) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      setCreateDialogOpen(false);
      setFeedback({ type: "success", message: "MCP 服务器已创建。" });
      applyFilters({ ...filters, page: 1, selectedId: server.id });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "MCP 服务器创建失败。" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: McpServerFormValues) => {
      if (!editingRecord) throw new Error("缺少待编辑服务器");
      return updateMcpServer(editingRecord.id, values);
    },
    onSuccess: async (server) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      setEditingRecord(null);
      setFeedback({ type: "success", message: "MCP 服务器已更新。" });
      applyFilters({ ...filters, selectedId: server.id });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "MCP 服务器更新失败。" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRecord) throw new Error("缺少待删除服务器");
      return deleteMcpServer(deletingRecord.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      const shouldClearSelection = deletingRecord?.id === activeSelectedId;
      setDeletingRecord(null);
      setFeedback({ type: "success", message: "MCP 服务器已删除。" });
      if (shouldClearSelection) {
        applyFilters({ ...filters, selectedId: "" });
      }
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "MCP 服务器删除失败。" });
    },
  });

  const healthMutation = useMutation({
    mutationFn: healthCheckMcpServer,
    onSuccess: async (server) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.detail(server.id) });
      setFeedback({
        type: server.status === "INACTIVE" ? "error" : "success",
        message: server.status === "ACTIVE" ? "健康检查通过，服务器状态为可用。" : server.lastErrorSummary || "健康检查已完成。",
      });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "健康检查失败。" });
    },
  });

  const discoverMutation = useMutation({
    mutationFn: discoverServerTools,
    onSuccess: async (detail) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.detail(detail.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpTools.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.toolOptions });
      setFeedback({ type: "success", message: detail.lastDiscoverySummary || "发现工具完成。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "发现工具失败。" });
    },
  });

  const handleSearch = filterForm.handleSubmit((values) => {
    applyFilters({ ...values, page: 1, selectedId: values.selectedId || "" });
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));
  const selectedServer = detailQuery.data;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef2ff_0%,#ecfeff_35%,#fff7ed_72%,#f8fafc_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Server className="h-3.5 w-3.5" />
                nquiz 迁移 · MCP 基础设施入口
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">MCP 服务器管理页</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  这里维护 MCP Server 接入台账、健康检查和发现工具入口；发现结果会同步沉淀到 MCP Tool 域，不再把“发现”和“治理”混在同一页。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/mcp-tool" className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted">
                MCP 工具治理
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
                新建服务器
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="服务器总数" value={String(listQuery.data?.summary.totalServers ?? 0)} hint="当前用户可维护的 MCP Server 台账总数。" />
          <StatCard label="可用" value={String(listQuery.data?.summary.activeServers ?? 0)} hint="最近一次健康检查通过的服务器数量。" />
          <StatCard label="降级" value={String(listQuery.data?.summary.degradedServers ?? 0)} hint="通常意味着认证缺失或初始化不完整。" />
          <StatCard label="禁用" value={String(listQuery.data?.summary.inactiveServers ?? 0)} hint="最近一次检查或发现动作失败，需要人工排查。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.4fr_0.7fr_0.7fr_auto] lg:items-end" onSubmit={handleSearch}>
            <div>
              <label className="mb-2 block text-sm font-medium">关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")} placeholder="按名称、标识或地址搜索" {...filterForm.register("keyword")} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">环境</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.env?.message))} {...filterForm.register("env")}>
                {MCP_SERVER_ENV_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.status?.message))} {...filterForm.register("status")}>
                {MCP_SERVER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background">
                <Search className="h-4 w-4" />
                搜索
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                onClick={() => {
                  const defaults = mcpServerFilterSchema.parse({});
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

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border bg-card px-5 py-4 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold">Server 台账</h2>
                <p className="mt-1 text-sm text-muted-foreground">首版保留台账、健康检查和发现工具三条主链路，不继续沿用旧版“点名称打开抽屉”的耦合交互。</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>每页</span>
                <select className="rounded-xl border border-border bg-background px-2 py-1.5" value={filters.pageSize} onChange={(event) => applyFilters({ ...filters, page: 1, pageSize: Number(event.target.value) })}>
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {listQuery.isLoading ? (
              <div className="rounded-[28px] border border-border bg-card px-6 py-12 text-center shadow-sm">
                <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">MCP 服务器列表加载中...</p>
              </div>
            ) : null}

            {!listQuery.isLoading && listQuery.data?.items.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
                <p className="text-lg font-medium">当前筛选下没有服务器</p>
                <p className="mt-2 text-sm text-muted-foreground">可以先创建一个 Server 台账，再执行健康检查和发现工具。</p>
              </div>
            ) : null}

            {listQuery.data?.items.map((item) => (
              <motion.article
                key={item.id}
                layout
                className={cn("rounded-[28px] border p-5 shadow-sm transition", activeSelectedId === item.id ? "border-slate-950 bg-slate-950 text-white" : "border-border bg-card")}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600")}>
                        {MCP_SERVER_ENV_OPTIONS.find((option) => option.value === item.env)?.label || item.env}
                      </span>
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600")}>
                        {item.hasAuthConfig ? "已配置认证" : "未配置认证"}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight">{item.name}</h2>
                      <p className={cn("mt-1 text-sm", activeSelectedId === item.id ? "text-white/65" : "text-muted-foreground")}>{item.identifier}</p>
                      <p className={cn("mt-3 text-sm leading-7", activeSelectedId === item.id ? "text-white/78" : "text-muted-foreground")}>{item.description || "未填写描述"}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={cn("rounded-2xl border px-4 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted")}
                    onClick={() => applyFilters({ ...filters, selectedId: item.id })}
                  >
                    查看详情
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">地址</p>
                    <p className="mt-2 break-all text-sm font-medium">{item.address}</p>
                  </div>
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">最近心跳</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(item.lastHeartbeatAt)}</p>
                  </div>
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">认证摘要</p>
                    <p className="mt-2 text-sm font-medium">{item.maskedAuthConfig}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted")}
                    onClick={() => healthMutation.mutate(item.id)}
                  >
                    <HeartPulse className="h-4 w-4" />
                    健康检查
                  </button>
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted")}
                    onClick={() => discoverMutation.mutate(item.id)}
                  >
                    <ScanSearch className="h-4 w-4" />
                    发现工具
                  </button>
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted")}
                    onClick={async () => setEditingRecord(await getMcpServerDetail(item.id))}
                  >
                    <PencilLine className="h-4 w-4" />
                    编辑
                  </button>
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-red-200/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" : "border-red-200 text-red-600 hover:bg-red-50")}
                    onClick={async () => setDeletingRecord(await getMcpServerDetail(item.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </motion.article>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border bg-card px-5 py-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                第 {filters.page} / {totalPages} 页，共 {listQuery.data?.total ?? 0} 条 Server
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={filters.page <= 1}
                  onClick={() => applyFilters({ ...filters, page: filters.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={filters.page >= totalPages}
                  onClick={() => applyFilters({ ...filters, page: filters.page + 1 })}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4 rounded-[32px] border border-border bg-card p-5 shadow-sm">
            {selectedServer ? (
              <>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedServer.status} />
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {MCP_SERVER_ENV_OPTIONS.find((option) => option.value === selectedServer.env)?.label || selectedServer.env}
                        </span>
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{selectedServer.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{selectedServer.identifier}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{selectedServer.description || "未填写描述"}</p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-950">连接摘要</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">地址</p>
                      <p className="mt-2 break-all text-sm font-medium text-slate-950">{selectedServer.address}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">认证</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">{selectedServer.maskedAuthConfig}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">最近心跳</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">{formatDateTime(selectedServer.lastHeartbeatAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-950">发现工具结果</p>
                    </div>
                    <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => discoverMutation.mutate(selectedServer.id)}>
                      <ScanSearch className="h-3.5 w-3.5" />
                      重新发现
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-slate-500">发现动作会同步更新 MCP Tool 域，并把最近一次发现摘要保留在当前 Server 详情里。</p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">最近发现</p>
                    <p className="mt-2 text-sm font-medium text-slate-950">{formatDateTime(selectedServer.lastDiscoveryAt)}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{selectedServer.lastDiscoverySummary || "尚未执行过发现动作"}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {selectedServer.discoveredTools.length ? (
                      selectedServer.discoveredTools.map((tool) => (
                        <div key={`${selectedServer.id}-${tool.name}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-950">{tool.name}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{tool.schemaDigest}</span>
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                  tool.syncAction === "new"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : tool.syncAction === "updated"
                                      ? "border-sky-200 bg-sky-50 text-sky-700"
                                      : tool.syncAction === "removed"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-zinc-200 bg-zinc-100 text-zinc-700",
                                )}
                              >
                                {tool.syncAction}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 text-xs leading-6 text-slate-500">{tool.description || "未填写描述"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">还没有发现工具。请先执行健康检查，再触发发现动作。</div>
                    )}
                  </div>
                </div>

                {selectedServer.lastErrorSummary ? (
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertCircle className="h-4 w-4" />
                      最近错误摘要
                    </div>
                    <p className="mt-2">{selectedServer.lastErrorSummary}</p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                <p className="text-lg font-medium">还没有选中的服务器</p>
                <p className="mt-2 text-sm text-muted-foreground">从左侧选择一条 Server 记录后，这里会展示连接摘要和最近一次发现结果。</p>
              </div>
            )}
          </aside>
        </section>
      </div>

      <ServerDialog
        open={createDialogOpen || Boolean(editingRecord)}
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
