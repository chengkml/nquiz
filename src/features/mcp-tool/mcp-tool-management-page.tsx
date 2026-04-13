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
  DatabaseZap,
  ExternalLink,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  Server,
  Shield,
  Trash2,
  Wrench,
} from "lucide-react";
import { mcpToolFilterSchema, mcpToolFormSchema, type McpToolFilterInput, type McpToolFilterValues, type McpToolFormInput, type McpToolFormValues } from "@/features/mcp-tool/schema";
import {
  MCP_TOOL_ENV_OPTIONS,
  MCP_TOOL_STATUS_OPTIONS,
  type McpToolListFilters,
  type McpToolListItem,
  type McpToolStatus,
} from "@/features/mcp-tool/types";
import {
  createMcpTool,
  deleteMcpTool,
  getMcpToolDetail,
  listMcpToolMeta,
  listMcpTools,
  updateMcpTool,
} from "@/features/mcp-tool/mock-service";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 12, 18] as const;
const emptySchemaTemplate = `{
  "type": "object",
  "properties": {}
}`;
const emptyStrategyTemplate = `{
  "timeoutMs": 30000,
  "retry": 0
}`;
const emptyVisibilityTemplate = `{
  "apps": [],
  "roles": [],
  "scenes": []
}`;

type FeedbackState = { type: "success" | "error"; message: string } | null;

const statusMeta: Record<McpToolStatus, { label: string; className: string }> = {
  REGISTERED: { label: "已接入", className: "border-sky-200 bg-sky-50 text-sky-700" },
  ENABLED: { label: "启用", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  DISABLED: { label: "禁用", className: "border-zinc-200 bg-zinc-100 text-zinc-700" },
  GRAY_RELEASE: { label: "灰度", className: "border-amber-200 bg-amber-50 text-amber-700" },
  SOURCE_REMOVED: { label: "来源已删除", className: "border-red-200 bg-red-50 text-red-700" },
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

function parseFilters(searchParams: URLSearchParams): McpToolListFilters {
  return mcpToolFilterSchema.parse({
    keyword: searchParams.get("keyword") ?? "",
    env: searchParams.get("env") ?? "",
    status: searchParams.get("status") ?? "ALL",
    serverId: searchParams.get("serverId") ?? "",
    category: searchParams.get("category") ?? "",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 6,
    selectedId: searchParams.get("selectedId") ?? "",
  });
}

function buildSearchParams(filters: McpToolListFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.env) params.set("env", filters.env);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.serverId) params.set("serverId", filters.serverId);
  if (filters.category) params.set("category", filters.category);
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
  return cn(inputClassName(hasError), "min-h-28 resize-y font-mono text-xs leading-6");
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

function StatusBadge({ status }: { status: McpToolStatus }) {
  const meta = statusMeta[status];
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>;
}

function JsonPreviewCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  let pretty = value;
  try {
    pretty = JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    pretty = value;
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <p className="mt-1 text-xs leading-6 text-slate-500">{hint}</p>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-700">{pretty}</pre>
    </div>
  );
}

function visibilitySummary(rawJson: string) {
  try {
    const parsed = JSON.parse(rawJson) as { apps?: string[]; roles?: string[]; scenes?: string[] };
    return [
      ...(parsed.apps?.map((item) => `App:${item}`) ?? []),
      ...(parsed.roles?.map((item) => `Role:${item}`) ?? []),
      ...(parsed.scenes?.map((item) => `Scene:${item}`) ?? []),
    ];
  } catch {
    return [];
  }
}

function ToolDialog({
  open,
  record,
  pending,
  serverOptions,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: McpToolListItem | null;
  pending: boolean;
  serverOptions: { id: string; label: string }[];
  onClose: () => void;
  onSubmit: (values: McpToolFormValues) => Promise<void>;
}) {
  const form = useForm<McpToolFormInput, undefined, McpToolFormValues>({
    resolver: zodResolver(mcpToolFormSchema),
    defaultValues: {
      serverId: record?.serverId ?? serverOptions[0]?.id ?? "",
      env: record?.env ?? "dev",
      originName: record?.originName ?? "",
      displayName: record?.displayName ?? "",
      description: record?.description ?? "",
      category: record?.category ?? "",
      tags: record?.tags ?? "",
      status: record?.status ?? "REGISTERED",
      schemaJson: record?.schemaJson ?? emptySchemaTemplate,
      strategyJson: record?.strategyJson ?? emptyStrategyTemplate,
      visibilityJson: record?.visibilityJson ?? emptyVisibilityTemplate,
      sourceDeletedFlag: record?.sourceDeletedFlag ?? false,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      serverId: record?.serverId ?? serverOptions[0]?.id ?? "",
      env: record?.env ?? "dev",
      originName: record?.originName ?? "",
      displayName: record?.displayName ?? "",
      description: record?.description ?? "",
      category: record?.category ?? "",
      tags: record?.tags ?? "",
      status: record?.status ?? "REGISTERED",
      schemaJson: record?.schemaJson ?? emptySchemaTemplate,
      strategyJson: record?.strategyJson ?? emptyStrategyTemplate,
      visibilityJson: record?.visibilityJson ?? emptyVisibilityTemplate,
      sourceDeletedFlag: record?.sourceDeletedFlag ?? false,
    });
  }, [form, open, record, serverOptions]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑 MCP 工具" : "新增 MCP 工具"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">这里只治理已入库工具，不负责发现。启停/复制/指标等旧前端假能力不在首版暴露。</p>
        </div>

        <form className="grid gap-5 px-6 py-5" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">所属 Server</label>
              <select className={inputClassName(Boolean(form.formState.errors.serverId?.message))} {...form.register("serverId")}>
                {serverOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.serverId?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">环境</label>
              <select className={inputClassName(Boolean(form.formState.errors.env?.message))} {...form.register("env")}>
                {MCP_TOOL_ENV_OPTIONS.filter((item) => item.value).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.env?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}>
                {MCP_TOOL_STATUS_OPTIONS.filter((item) => item.value !== "ALL").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.status?.message} />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" className="h-4 w-4" {...form.register("sourceDeletedFlag")} />
              标记来源已删除
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">原始名称</label>
              <input className={inputClassName(Boolean(form.formState.errors.originName?.message))} {...form.register("originName")} />
              <FieldError message={form.formState.errors.originName?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">显示名称</label>
              <input className={inputClassName(Boolean(form.formState.errors.displayName?.message))} {...form.register("displayName")} />
              <FieldError message={form.formState.errors.displayName?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">分类</label>
              <input className={inputClassName(Boolean(form.formState.errors.category?.message))} {...form.register("category")} />
              <FieldError message={form.formState.errors.category?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">标签</label>
              <input className={inputClassName(Boolean(form.formState.errors.tags?.message))} placeholder="多个标签用英文逗号分隔" {...form.register("tags")} />
              <FieldError message={form.formState.errors.tags?.message} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea className={cn(inputClassName(Boolean(form.formState.errors.description?.message)), "min-h-24 resize-y")} {...form.register("description")} />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Schema JSON</label>
              <textarea className={textareaClassName(Boolean(form.formState.errors.schemaJson?.message))} {...form.register("schemaJson")} />
              <FieldError message={form.formState.errors.schemaJson?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">策略 JSON</label>
              <textarea className={textareaClassName(Boolean(form.formState.errors.strategyJson?.message))} {...form.register("strategyJson")} />
              <FieldError message={form.formState.errors.strategyJson?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">可见范围 JSON</label>
              <textarea className={textareaClassName(Boolean(form.formState.errors.visibilityJson?.message))} {...form.register("visibilityJson")} />
              <FieldError message={form.formState.errors.visibilityJson?.message} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "提交中..." : record ? "保存修改" : "创建工具"}
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
  record?: McpToolListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">删除 MCP 工具</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          删除后该工具将从治理台账中移除。当前目标：
          <span className="font-medium text-foreground"> {record.displayName}</span>
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

export function McpToolManagementPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filterForm = useForm<McpToolFilterInput, undefined, McpToolFilterValues>({
    resolver: zodResolver(mcpToolFilterSchema),
    defaultValues: filters,
  });

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<McpToolListItem | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<McpToolListItem | null>(null);

  useEffect(() => {
    filterForm.reset(filters);
  }, [filterForm, filters]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const metaQuery = useQuery({
    queryKey: queryKeys.mcpTools.meta,
    queryFn: listMcpToolMeta,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.mcpTools.list(filters),
    queryFn: () => listMcpTools(filters),
  });

  const activeSelectedId =
    filters.selectedId && listQuery.data?.items.some((item) => item.id === filters.selectedId)
      ? filters.selectedId
      : listQuery.data?.items[0]?.id ?? "";

  const detailQuery = useQuery({
    queryKey: queryKeys.mcpTools.detail(activeSelectedId),
    queryFn: () => getMcpToolDetail(activeSelectedId),
    enabled: Boolean(activeSelectedId),
  });

  const applyFilters = (nextFilters: McpToolListFilters) => {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const createMutation = useMutation({
    mutationFn: createMcpTool,
    onSuccess: async (tool) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpTools.all });
      setCreateDialogOpen(false);
      setFeedback({ type: "success", message: "MCP 工具已创建。" });
      applyFilters({ ...filters, page: 1, selectedId: tool.id });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "MCP 工具创建失败。" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: McpToolFormValues) => {
      if (!editingRecord) throw new Error("缺少待编辑工具");
      return updateMcpTool(editingRecord.id, values);
    },
    onSuccess: async (tool) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpTools.all });
      setEditingRecord(null);
      setFeedback({ type: "success", message: "MCP 工具已更新。" });
      applyFilters({ ...filters, selectedId: tool.id });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "MCP 工具更新失败。" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRecord) throw new Error("缺少待删除工具");
      return deleteMcpTool(deletingRecord.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcpTools.all });
      setFeedback({ type: "success", message: "MCP 工具已删除。" });
      const shouldClearSelection = deletingRecord?.id === activeSelectedId;
      setDeletingRecord(null);
      if (shouldClearSelection) {
        applyFilters({ ...filters, selectedId: "" });
      }
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "MCP 工具删除失败。" });
    },
  });

  const handleSearch = filterForm.handleSubmit((values) => {
    applyFilters({ ...values, page: 1, selectedId: values.selectedId || "" });
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));
  const serverOptions = metaQuery.data?.servers ?? [];
  const selectedTool = detailQuery.data;
  const selectedVisibility = selectedTool ? visibilitySummary(selectedTool.visibilityJson) : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0%,#eff6ff_30%,#fff7ed_70%,#f8fafc_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                nquiz 迁移 · AI / MCP 配置域
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">MCP 工具管理页</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  这里管理的是已入库 MCP 工具的治理台账，不负责发现工具。发现与导入继续归属 MCP Server 管理页，首版只交付真实 CRUD、状态展示与 JSON 配置治理。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                <Server className="h-4 w-4" />
                工具发现入口：MCP Server（待迁移）
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                onClick={() => {
                  setEditingRecord(null);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新建工具
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="工具总数" value={String(listQuery.data?.summary.totalTools ?? 0)} hint="当前用户治理域内的全部已入库 MCP 工具。" />
          <StatCard label="已启用" value={String(listQuery.data?.summary.enabledTools ?? 0)} hint="当前可被 Agent / 编排消费的工具数量。" />
          <StatCard label="灰度中" value={String(listQuery.data?.summary.grayReleaseTools ?? 0)} hint="保留灰度状态语义，但首版不额外做灰度动作按钮。" />
          <StatCard label="来源已删除" value={String(listQuery.data?.summary.sourceRemovedTools ?? 0)} hint="提示这些台账仍存在，但对应 Server 侧来源已失效。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.3fr_repeat(4,minmax(0,0.7fr))_auto] lg:items-end" onSubmit={handleSearch}>
            <div>
              <label className="mb-2 block text-sm font-medium">关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")} placeholder="按 displayName / originName 搜索" {...filterForm.register("keyword")} />
              </div>
              <FieldError message={filterForm.formState.errors.keyword?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">环境</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.env?.message))} {...filterForm.register("env")}>
                {MCP_TOOL_ENV_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.status?.message))} {...filterForm.register("status")}>
                {MCP_TOOL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Server</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.serverId?.message))} {...filterForm.register("serverId")}>
                <option value="">全部 Server</option>
                {serverOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">分类</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.category?.message))} {...filterForm.register("category")}>
                <option value="">全部分类</option>
                {(metaQuery.data?.categories ?? []).map((category) => (
                  <option key={category} value={category}>
                    {category}
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
                  const defaults = mcpToolFilterSchema.parse({});
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

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_400px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border bg-card px-5 py-4 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold">工具台账</h2>
                <p className="mt-1 text-sm text-muted-foreground">首版只保留真实后端已支撑的台账治理能力，不再展示未落地动作按钮。</p>
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
                <p className="mt-3 text-sm text-muted-foreground">MCP 工具台账加载中...</p>
              </div>
            ) : null}

            {!listQuery.isLoading && listQuery.data?.items.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
                <p className="text-lg font-medium">当前筛选下没有 MCP 工具</p>
                <p className="mt-2 text-sm text-muted-foreground">可以先手工补录一条工具台账，或等待 MCP Server 页迁移后导入。</p>
              </div>
            ) : null}

            {listQuery.data?.items.map((item) => (
              <motion.article
                key={item.id}
                layout
                className={cn(
                  "rounded-[28px] border p-5 shadow-sm transition",
                  activeSelectedId === item.id ? "border-slate-950 bg-slate-950 text-white" : "border-border bg-card",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs",
                          activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600",
                        )}
                      >
                        {MCP_TOOL_ENV_OPTIONS.find((option) => option.value === item.env)?.label || item.env}
                      </span>
                      {item.sourceDeletedFlag ? (
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", activeSelectedId === item.id ? "border-red-200/30 bg-red-500/10 text-red-100" : "border-red-200 bg-red-50 text-red-700")}>
                          来源已删除
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight">{item.displayName}</h2>
                      <p className={cn("mt-1 text-sm", activeSelectedId === item.id ? "text-white/65" : "text-muted-foreground")}>{item.originName}</p>
                      <p className={cn("mt-3 text-sm leading-7", activeSelectedId === item.id ? "text-white/78" : "text-muted-foreground")}>{item.description || "未填写描述"}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={cn(
                      "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                      activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted",
                    )}
                    onClick={() => applyFilters({ ...filters, selectedId: item.id })}
                  >
                    查看详情
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">所属 Server</p>
                    <p className="mt-2 text-sm font-medium">{item.serverName}</p>
                  </div>
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">分类</p>
                    <p className="mt-2 text-sm font-medium">{item.category || "未分类"}</p>
                  </div>
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">更新时间</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(item.updateDate)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tagList.length ? (
                    item.tagList.map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs",
                          activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600",
                        )}
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/70" : "border-slate-200 bg-slate-100 text-slate-500")}>
                      无标签
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition",
                      activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted",
                    )}
                    onClick={() => setEditingRecord(item)}
                  >
                    <PencilLine className="h-4 w-4" />
                    编辑
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition",
                      activeSelectedId === item.id ? "border-red-200/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" : "border-red-200 text-red-600 hover:bg-red-50",
                    )}
                    onClick={() => setDeletingRecord(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </motion.article>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border bg-card px-5 py-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                第 {filters.page} / {totalPages} 页，共 {listQuery.data?.total ?? 0} 条工具
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
            {selectedTool ? (
              <>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedTool.status} />
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                      {MCP_TOOL_ENV_OPTIONS.find((option) => option.value === selectedTool.env)?.label || selectedTool.env}
                    </span>
                  </div>
                  <div className="mt-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{selectedTool.displayName}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedTool.originName}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{selectedTool.description || "未填写描述"}</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">所属 Server</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">{selectedTool.serverName}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">分类</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">{selectedTool.category || "未分类"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">来源状态</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">{selectedTool.sourceDeletedFlag ? "来源已删除" : "来源正常"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-950">可见范围摘要</p>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-slate-500">首版先保留 `visibilityJson` 字段，但详情区会把常见维度拆成可读摘要。</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedVisibility.length ? (
                      selectedVisibility.map((item) => (
                        <span key={item} className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">未配置可见范围</span>
                    )}
                  </div>
                </div>

                <JsonPreviewCard title="Schema 定义" value={selectedTool.schemaJson} hint="用于描述工具输入结构；首版支持 JSON 合法性校验与只读预览。" />
                <JsonPreviewCard title="调用策略" value={selectedTool.strategyJson} hint="保留 strategyJson 语义，但不继续用假按钮包装不存在的运行态能力。" />
                <JsonPreviewCard title="可见范围" value={selectedTool.visibilityJson} hint="首版保留 JSON 存储方式，同时通过摘要降低阅读成本。" />

                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                  <div className="flex items-center gap-2 font-medium">
                    <DatabaseZap className="h-4 w-4" />
                    首版有意不暴露的能力
                  </div>
                  <p className="mt-2">
                    旧 quiz 前端声明了启用/禁用、复制配置、指标、runtime tools 等接口，但当前真实后端在 MCP Tool 侧并未落地。nquiz 首版不继续保留这些假能力，避免界面与后端契约再度错位。
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                <p className="text-lg font-medium">还没有选中的 MCP 工具</p>
                <p className="mt-2 text-sm text-muted-foreground">从左侧台账选择一条工具记录后，这里会展示治理详情与 JSON 配置。</p>
              </div>
            )}
          </aside>
        </section>

        <div className="flex items-center justify-between rounded-[24px] border border-dashed border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">
          <span>发现工具请去 MCP Server 页；MCP Tool 页只消费已入库记录。</span>
          <Link href="https://github.com/chengkml/nquiz.git" target="_blank" className="inline-flex items-center gap-2 font-medium text-foreground">
            仓库
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <ToolDialog
        open={createDialogOpen || Boolean(editingRecord)}
        record={editingRecord}
        pending={createMutation.isPending || updateMutation.isPending}
        serverOptions={serverOptions.map((item) => ({ id: item.id, label: item.label }))}
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
