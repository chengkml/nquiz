"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bot,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { agentFilterSchema, agentFormSchema, type AgentFilterInput, type AgentFilterValues, type AgentFormInput, type AgentFormValues } from "@/features/agent/schema";
import { createAgent, deleteAgent, duplicateAgent, getAgentDetail, listAgentMeta, listAgents, setAgentStatus, updateAgent } from "@/features/agent/mock-service";
import type { AgentDetail, AgentListFilters, AgentPromptMode, AgentStatus } from "@/features/agent/types";
import { listSelectableMcpTools } from "@/features/mcp-tool/mock-service";
import type { McpToolListItem } from "@/features/mcp-tool/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 12, 18] as const;
const defaultModelConfig = `{
  "temperature": 0.4,
  "maxTokens": 1800
}`;

type FeedbackState = { type: "success" | "error"; message: string } | null;

const statusMeta: Record<AgentStatus, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "border-zinc-200 bg-zinc-100 text-zinc-700" },
  ENABLED: { label: "启用", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  DISABLED: { label: "禁用", className: "border-red-200 bg-red-50 text-red-700" },
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

function parseFilters(searchParams: URLSearchParams): AgentListFilters {
  return agentFilterSchema.parse({
    keyword: searchParams.get("keyword") ?? "",
    status: searchParams.get("status") ?? "ALL",
    category: searchParams.get("category") ?? "",
    modelId: searchParams.get("modelId") ?? "",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 6,
    selectedId: searchParams.get("selectedId") ?? "",
  });
}

function buildSearchParams(filters: AgentListFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.modelId) params.set("modelId", filters.modelId);
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
  return cn(inputClassName(hasError), "min-h-28 resize-y");
}

function jsonTextareaClassName(hasError = false) {
  return cn(textareaClassName(hasError), "font-mono text-xs leading-6");
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

function StatusBadge({ status }: { status: AgentStatus }) {
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
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-xs leading-6 text-slate-500">{hint}</p>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-700">{pretty}</pre>
    </div>
  );
}

function ToolPicker({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: McpToolListItem[];
  onChange: (next: string[]) => void;
}) {
  const selectedSet = new Set(value);
  const available = options.filter((item) => !selectedSet.has(item.id));
  const selected = value
    .map((toolId) => options.find((item) => item.id === toolId))
    .filter(Boolean) as McpToolListItem[];

  const addTool = (toolId: string) => onChange([...value, toolId]);
  const removeTool = (toolId: string) => onChange(value.filter((item) => item !== toolId));
  const moveTool = (toolId: string, direction: -1 | 1) => {
    const index = value.indexOf(toolId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= value.length) return;
    const copy = [...value];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
    onChange(copy);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">可选工具</h3>
          <span className="text-xs text-slate-500">{available.length} 个</span>
        </div>
        <div className="mt-3 space-y-2">
          {available.length ? (
            available.map((tool) => (
              <div key={tool.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{tool.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">{tool.description || tool.originName}</p>
                  </div>
                  <button type="button" className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => addTool(tool.id)}>
                    添加
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">当前没有更多可选工具。可先去 MCP 工具页启用工具。</div>
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">已选工具</h3>
          <span className="text-xs text-slate-500">顺序越靠前，priority 越高</span>
        </div>
        <div className="mt-3 space-y-2">
          {selected.length ? (
            selected.map((tool) => (
              <div key={tool.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{tool.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">{tool.category || "未分类"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded-xl border border-slate-200 p-1 text-slate-600 transition hover:bg-slate-50" onClick={() => moveTool(tool.id, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="rounded-xl border border-slate-200 p-1 text-slate-600 transition hover:bg-slate-50" onClick={() => moveTool(tool.id, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="rounded-xl border border-red-200 p-1 text-red-600 transition hover:bg-red-50" onClick={() => removeTool(tool.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">尚未选择任何工具。首版支持工具排序，但暂不开放单工具 config 编辑。</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentDialog({
  open,
  record,
  pending,
  promptTemplates,
  models,
  tools,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: AgentDetail | null;
  pending: boolean;
  promptTemplates: { id: string; name: string; summary: string }[];
  models: { id: string; name: string; summary: string }[];
  tools: McpToolListItem[];
  onClose: () => void;
  onSubmit: (values: AgentFormValues) => Promise<void>;
}) {
  const form = useForm<AgentFormInput, undefined, AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: record?.name ?? "",
      identifier: record?.identifier ?? "",
      description: record?.description ?? "",
      icon: record?.icon ?? "🤖",
      category: record?.category ?? "",
      promptMode: record?.promptMode ?? "direct",
      systemPrompt: record?.systemPrompt ?? "",
      promptTemplateId: record?.promptTemplateId ?? "",
      modelId: record?.modelId ?? models[0]?.id ?? "",
      modelConfig: record?.modelConfig ?? defaultModelConfig,
      status: record?.status ?? "DRAFT",
      agentTags: record?.tags ?? "",
      toolIds: record?.tools.map((item) => item.mcpToolId) ?? [],
    },
  });

  const promptMode = useWatch({ control: form.control, name: "promptMode" }) as AgentPromptMode;
  const toolIds = useWatch({ control: form.control, name: "toolIds" }) ?? [];

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: record?.name ?? "",
      identifier: record?.identifier ?? "",
      description: record?.description ?? "",
      icon: record?.icon ?? "🤖",
      category: record?.category ?? "",
      promptMode: record?.promptMode ?? "direct",
      systemPrompt: record?.systemPrompt ?? "",
      promptTemplateId: record?.promptTemplateId ?? "",
      modelId: record?.modelId ?? models[0]?.id ?? "",
      modelConfig: record?.modelConfig ?? defaultModelConfig,
      status: record?.status ?? "DRAFT",
      agentTags: record?.tags ?? "",
      toolIds: record?.tools.map((item) => item.mcpToolId) ?? [],
    });
  }, [form, models, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑 Agent" : "新建 Agent"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">首版不再用一个超长 Tabs Modal 平铺所有内容，而是把 Prompt、模型、工具按配置区块收口。</p>
        </div>

        <form className="grid gap-5 px-6 py-5" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">名称</label>
              <input className={inputClassName(Boolean(form.formState.errors.name?.message))} {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">标识符</label>
              <input className={inputClassName(Boolean(form.formState.errors.identifier?.message))} {...form.register("identifier")} />
              <FieldError message={form.formState.errors.identifier?.message} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">图标</label>
              <input className={inputClassName(Boolean(form.formState.errors.icon?.message))} {...form.register("icon")} />
              <FieldError message={form.formState.errors.icon?.message} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(form.formState.errors.status?.message))} {...form.register("status")}>
                <option value="DRAFT">草稿</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">禁用</option>
              </select>
              <FieldError message={form.formState.errors.status?.message} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">分类</label>
              <input className={inputClassName(Boolean(form.formState.errors.category?.message))} {...form.register("category")} />
              <FieldError message={form.formState.errors.category?.message} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">标签</label>
              <input className={inputClassName(Boolean(form.formState.errors.agentTags?.message))} placeholder="多个标签用英文逗号分隔" {...form.register("agentTags")} />
              <FieldError message={form.formState.errors.agentTags?.message} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea className={textareaClassName(Boolean(form.formState.errors.description?.message))} {...form.register("description")} />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-950">Prompt 配置</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-medium transition",
                    promptMode === "direct" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => form.setValue("promptMode", "direct", { shouldDirty: true })}
                >
                  直接 Prompt
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-medium transition",
                    promptMode === "template" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => form.setValue("promptMode", "template", { shouldDirty: true })}
                >
                  引用模板
                </button>
              </div>

              {promptMode === "direct" ? (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium">系统 Prompt</label>
                  <textarea className={textareaClassName(Boolean(form.formState.errors.systemPrompt?.message))} {...form.register("systemPrompt")} />
                  <FieldError message={form.formState.errors.systemPrompt?.message} />
                </div>
              ) : (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium">Prompt 模板</label>
                  <select className={inputClassName(Boolean(form.formState.errors.promptTemplateId?.message))} {...form.register("promptTemplateId")}>
                    <option value="">请选择模板</option>
                    {promptTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={form.formState.errors.promptTemplateId?.message} />
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-950">模型配置</p>
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium">模型</label>
                <select className={inputClassName(Boolean(form.formState.errors.modelId?.message))} {...form.register("modelId")}>
                  <option value="">请选择模型</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.modelId?.message} />
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium">模型参数 JSON</label>
                <textarea className={jsonTextareaClassName(Boolean(form.formState.errors.modelConfig?.message))} {...form.register("modelConfig")} />
                <FieldError message={form.formState.errors.modelConfig?.message} />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-950">工具配置</p>
            </div>
            <p className="mt-1 text-xs leading-6 text-slate-500">首版补齐工具排序能力，对齐数据层的 `priority` 语义；单工具 `config` 留作后续扩展。</p>
            <div className="mt-4">
              <ToolPicker value={toolIds} options={tools} onChange={(next) => form.setValue("toolIds", next, { shouldDirty: true })} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "提交中..." : record ? "保存修改" : "创建 Agent"}
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
  record?: AgentDetail | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">删除 Agent</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          删除后会一并移除该 Agent 的工具关联。当前目标：
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

export function AgentManagementPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filterForm = useForm<AgentFilterInput, undefined, AgentFilterValues>({
    resolver: zodResolver(agentFilterSchema),
    defaultValues: filters,
  });

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AgentDetail | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AgentDetail | null>(null);

  useEffect(() => {
    filterForm.reset(filters);
  }, [filterForm, filters]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const metaQuery = useQuery({
    queryKey: queryKeys.agents.meta,
    queryFn: listAgentMeta,
  });

  const toolOptionsQuery = useQuery({
    queryKey: queryKeys.agents.toolOptions,
    queryFn: listSelectableMcpTools,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.agents.list(filters),
    queryFn: () => listAgents(filters),
  });

  const activeSelectedId =
    filters.selectedId && listQuery.data?.items.some((item) => item.id === filters.selectedId)
      ? filters.selectedId
      : listQuery.data?.items[0]?.id ?? "";

  const detailQuery = useQuery({
    queryKey: queryKeys.agents.detail(activeSelectedId),
    queryFn: () => getAgentDetail(activeSelectedId),
    enabled: Boolean(activeSelectedId),
  });

  const applyFilters = (nextFilters: AgentListFilters) => {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const createMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: async (agent) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      setCreateDialogOpen(false);
      setFeedback({ type: "success", message: "Agent 已创建。" });
      applyFilters({ ...filters, page: 1, selectedId: agent.id });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Agent 创建失败。" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: AgentFormValues) => {
      if (!editingRecord) throw new Error("缺少待编辑 Agent");
      return updateAgent(editingRecord.id, values);
    },
    onSuccess: async (agent) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      setEditingRecord(null);
      setFeedback({ type: "success", message: "Agent 已更新。" });
      applyFilters({ ...filters, selectedId: agent.id });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Agent 更新失败。" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRecord) throw new Error("缺少待删除 Agent");
      return deleteAgent(deletingRecord.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      const shouldClearSelection = deletingRecord?.id === activeSelectedId;
      setDeletingRecord(null);
      setFeedback({ type: "success", message: "Agent 已删除。" });
      if (shouldClearSelection) {
        applyFilters({ ...filters, selectedId: "" });
      }
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Agent 删除失败。" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateAgent,
    onSuccess: async (agent) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      setFeedback({ type: "success", message: "Agent 副本已创建，状态已重置为草稿。" });
      applyFilters({ ...filters, selectedId: agent.id });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Agent 复制失败。" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: AgentStatus }) => setAgentStatus(payload.id, payload.status),
    onSuccess: async (agent) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      setFeedback({ type: "success", message: agent.status === "ENABLED" ? "Agent 已启用。" : "Agent 已禁用。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "状态切换失败。" });
    },
  });

  const handleSearch = filterForm.handleSubmit((values) => {
    applyFilters({ ...values, page: 1, selectedId: values.selectedId || "" });
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));
  const selectedAgent = detailQuery.data;
  const selectableTools = toolOptionsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef2ff_0%,#ecfeff_35%,#fff7ed_72%,#f8fafc_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
                nquiz 迁移 · Agent 配置资产中心
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">Agent 管理页</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  这里管理的是可复用的 Agent 配置资产，而不是聊天运行页。首版保留 Prompt、模型、工具、启停、复制等核心能力，但重构成列表工作台 + 详情侧栏 + 配置弹窗。
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
                新建 Agent
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Agent 总数" value={String(listQuery.data?.summary.totalAgents ?? 0)} hint="当前用户可维护的全部 Agent 配置资产。" />
          <StatCard label="已启用" value={String(listQuery.data?.summary.enabledAgents ?? 0)} hint="理论上可被其它业务链路直接消费的 Agent 数量。" />
          <StatCard label="草稿" value={String(listQuery.data?.summary.draftAgents ?? 0)} hint="通常意味着仍在补 Prompt、模型或工具配置。" />
          <StatCard label="已禁用" value={String(listQuery.data?.summary.disabledAgents ?? 0)} hint="保留配置台账，但暂不继续使用。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.3fr_repeat(3,minmax(0,0.7fr))_auto] lg:items-end" onSubmit={handleSearch}>
            <div>
              <label className="mb-2 block text-sm font-medium">关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")} placeholder="按名称、标识符、描述搜索" {...filterForm.register("keyword")} />
              </div>
              <FieldError message={filterForm.formState.errors.keyword?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.status?.message))} {...filterForm.register("status")}>
                <option value="ALL">全部状态</option>
                <option value="DRAFT">草稿</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">禁用</option>
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

            <div>
              <label className="mb-2 block text-sm font-medium">模型</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.modelId?.message))} {...filterForm.register("modelId")}>
                <option value="">全部模型</option>
                {(metaQuery.data?.models ?? []).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
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
                  const defaults = agentFilterSchema.parse({});
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
                <h2 className="text-lg font-semibold">Agent 列表工作台</h2>
                <p className="mt-1 text-sm text-muted-foreground">首版聚焦配置资产治理，不把聊天运行、日志监控和 Prompt/模型本体维护混进来。</p>
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
                <p className="mt-3 text-sm text-muted-foreground">Agent 列表加载中...</p>
              </div>
            ) : null}

            {!listQuery.isLoading && listQuery.data?.items.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
                <p className="text-lg font-medium">当前筛选下没有 Agent</p>
                <p className="mt-2 text-sm text-muted-foreground">可以先新建一个 Agent，后续再逐步补 Prompt、模型和工具配置。</p>
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
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600")}>
                        {item.category || "未分类"}
                      </span>
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600")}>
                        {item.promptMode === "direct" ? "直接 Prompt" : "模板 Prompt"}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 text-3xl">{item.icon || "🤖"}</span>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">{item.name}</h2>
                        <p className={cn("mt-1 text-sm", activeSelectedId === item.id ? "text-white/65" : "text-muted-foreground")}>{item.identifier}</p>
                        <p className={cn("mt-3 text-sm leading-7", activeSelectedId === item.id ? "text-white/78" : "text-muted-foreground")}>{item.description || "未填写描述"}</p>
                      </div>
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
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">模型</p>
                    <p className="mt-2 text-sm font-medium">{item.modelName || "未配置"}</p>
                  </div>
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">工具数</p>
                    <p className="mt-2 text-sm font-medium">{item.toolCount}</p>
                  </div>
                  <div className={cn("rounded-2xl border px-4 py-3", activeSelectedId === item.id ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">更新时间</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(item.updateDate)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tagList.length ? (
                    item.tagList.map((tag) => (
                      <span key={`${item.id}-${tag}`} className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white/80" : "border-slate-200 bg-slate-100 text-slate-600")}>
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
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted")}
                    onClick={async () => setEditingRecord(await getAgentDetail(item.id))}
                  >
                    <PencilLine className="h-4 w-4" />
                    编辑
                  </button>
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted")}
                    onClick={() => duplicateMutation.mutate(item.id)}
                  >
                    <Copy className="h-4 w-4" />
                    复制
                  </button>
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border hover:bg-muted")}
                    onClick={() => statusMutation.mutate({ id: item.id, status: item.status === "ENABLED" ? "DISABLED" : "ENABLED" })}
                  >
                    {item.status === "ENABLED" ? "禁用" : "启用"}
                  </button>
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition", activeSelectedId === item.id ? "border-red-200/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" : "border-red-200 text-red-600 hover:bg-red-50")}
                    onClick={async () => setDeletingRecord(await getAgentDetail(item.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </motion.article>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border bg-card px-5 py-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                第 {filters.page} / {totalPages} 页，共 {listQuery.data?.total ?? 0} 条 Agent
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
            {selectedAgent ? (
              <>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedAgent.icon || "🤖"}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedAgent.status} />
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">{selectedAgent.promptMode === "direct" ? "直接 Prompt" : "模板 Prompt"}</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{selectedAgent.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{selectedAgent.identifier}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{selectedAgent.description || "未填写描述"}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">模型</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">{selectedAgent.modelName || "未配置"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Prompt 来源</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">{selectedAgent.promptMode === "direct" ? "直接 Prompt" : selectedAgent.promptTemplateName || "模板已失效"}</p>
                    </div>
                  </div>
                </div>

                {selectedAgent.readinessWarnings.length ? (
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="h-4 w-4" />
                      启用前检查
                    </div>
                    <ul className="mt-3 space-y-2">
                      {selectedAgent.readinessWarnings.map((warning) => (
                        <li key={warning} className="leading-7">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    当前 Agent 的 Prompt、模型和工具引用都通过了首版完整性检查。
                  </div>
                )}

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">工具绑定</h3>
                    <Link href="/mcp-tool" className="text-xs font-medium text-slate-600 transition hover:text-slate-950">
                      去工具治理
                    </Link>
                  </div>
                  <div className="mt-3 space-y-2">
                    {selectedAgent.tools.length ? (
                      selectedAgent.tools.map((tool, index) => (
                        <div key={tool.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-950">{tool.mcpToolName}</p>
                            <span className="text-xs text-slate-500">priority {selectedAgent.tools.length - index}</span>
                          </div>
                          <p className="mt-1 text-xs leading-6 text-slate-500">{tool.mcpToolDescription || "未填写描述"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">当前还没有绑定任何 MCP 工具。</div>
                    )}
                  </div>
                </div>

                {selectedAgent.promptMode === "direct" ? (
                  <JsonPreviewCard title="系统 Prompt" value={selectedAgent.systemPrompt} hint="直接 Prompt 模式下，Agent 会直接使用这段系统指令。" />
                ) : null}

                <JsonPreviewCard title="模型参数" value={selectedAgent.modelConfig} hint="首版仍保留 JSON 参数配置，但表单层已做合法性校验。" />
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                <p className="text-lg font-medium">还没有选中的 Agent</p>
                <p className="mt-2 text-sm text-muted-foreground">从左侧工作台选择一个 Agent，这里会展示它的配置摘要与完整性检查。</p>
              </div>
            )}
          </aside>
        </section>
      </div>

      <AgentDialog
        open={createDialogOpen || Boolean(editingRecord)}
        record={editingRecord}
        pending={createMutation.isPending || updateMutation.isPending}
        promptTemplates={metaQuery.data?.promptTemplates ?? []}
        models={metaQuery.data?.models ?? []}
        tools={selectableTools}
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
