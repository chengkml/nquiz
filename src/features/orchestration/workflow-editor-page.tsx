"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  GitBranchPlus,
  Grip,
  LayoutTemplate,
  LoaderCircle,
  Play,
  Save,
  Sparkles,
} from "lucide-react";
import { orchestrationNodeCatalog, orchestrationNodeGroups, orchestrationStatusMeta } from "@/features/orchestration/constants";
import {
  orchestrationRunFormSchema,
  orchestrationVersionFormSchema,
  type OrchestrationRunFormInput,
  type OrchestrationRunFormValues,
  type OrchestrationVersionFormInput,
  type OrchestrationVersionFormValues,
} from "@/features/orchestration/schema";
import {
  createOrchestrationWorkflowVersion,
  createStarterWorkflowGraph,
  getOrchestrationWorkflowDetail,
  listOrchestrationWorkflowRuns,
  listOrchestrationWorkflowVersions,
  publishOrchestrationWorkflowVersion,
  runOrchestrationWorkflow,
} from "@/features/orchestration/mock-service";
import type {
  OrchestrationNodeType,
  OrchestrationWorkflowGraph,
  OrchestrationWorkflowListItem,
  OrchestrationWorkflowNode,
  OrchestrationWorkflowRunEntity,
  OrchestrationWorkflowVersionEntity,
} from "@/features/orchestration/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

type FeedbackState = { type: "success" | "error"; message: string } | null;
type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
  versionKey: string;
  initialGraph: OrchestrationWorkflowGraph;
} | null;

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

function formatDuration(ms?: number) {
  if (!ms) return "-";
  return `${(ms / 1000).toFixed(1)}s`;
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

function WorkflowStatusBadge({ status }: { status: OrchestrationWorkflowListItem["status"] }) {
  const meta = orchestrationStatusMeta[status];
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>;
}

function RunStatusBadge({ status }: { status?: OrchestrationWorkflowRunEntity["status"] }) {
  if (!status) {
    return <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">未运行</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "SUCCESS" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {status === "SUCCESS" ? "运行成功" : "运行失败"}
    </span>
  );
}

function VersionDialog({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: OrchestrationVersionFormValues) => Promise<void>;
}) {
  const form = useForm<OrchestrationVersionFormInput, undefined, OrchestrationVersionFormValues>({
    resolver: zodResolver(orchestrationVersionFormSchema),
    defaultValues: {
      remark: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ remark: "" });
  }, [form, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">保存新版本</h2>
          <p className="mt-1 text-sm text-muted-foreground">新版本会把当前画布中的标准 graph schema 快照下来，供后续发布或回看。</p>
        </div>
        <form className="px-6 py-5" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <label className="mb-2 block text-sm font-medium">版本说明</label>
          <input className={inputClassName(Boolean(form.formState.errors.remark?.message))} placeholder="例如：补齐运行结果与知识检索节点" {...form.register("remark")} />
          <FieldError message={form.formState.errors.remark?.message} />
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending}>
              {pending ? "保存中..." : "保存版本"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RunDialog({
  open,
  versions,
  currentVersionId,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  versions: OrchestrationWorkflowVersionEntity[];
  currentVersionId?: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: OrchestrationRunFormValues) => Promise<void>;
}) {
  const form = useForm<OrchestrationRunFormInput, undefined, OrchestrationRunFormValues>({
    resolver: zodResolver(orchestrationRunFormSchema),
    defaultValues: {
      versionId: currentVersionId || versions[0]?.id,
      inputText: "",
      variablesJson: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      versionId: currentVersionId || versions[0]?.id,
      inputText: "",
      variablesJson: "",
    });
  }, [currentVersionId, form, open, versions]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">试运行当前编排</h2>
          <p className="mt-1 text-sm text-muted-foreground">运行结果会写入最近运行记录，便于在编辑器里直接对照版本与输出。</p>
        </div>

        <form className="grid gap-4 px-6 py-5" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div>
            <label className="mb-2 block text-sm font-medium">运行版本</label>
            <select className={inputClassName(Boolean(form.formState.errors.versionId?.message))} {...form.register("versionId")}>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} · {version.remark}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.versionId?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">运行输入</label>
            <textarea className={textareaClassName(Boolean(form.formState.errors.inputText?.message))} placeholder="例如：请生成今天的 AI Agent 资讯简报" {...form.register("inputText")} />
            <FieldError message={form.formState.errors.inputText?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">额外变量 JSON</label>
            <textarea className={textareaClassName(Boolean(form.formState.errors.variablesJson?.message))} placeholder='例如：{"audience":"产品经理"}' {...form.register("variablesJson")} />
            <FieldError message={form.formState.errors.variablesJson?.message} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" disabled={pending || versions.length === 0}>
              {pending ? "运行中..." : "开始试运行"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildNode(type: OrchestrationNodeType, index: number): OrchestrationWorkflowNode {
  const catalog = orchestrationNodeCatalog[type];
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    type,
    name: catalog.label,
    position: {
      x: 96 + index * 64,
      y: 72 + (index % 3) * 124,
    },
    config: { ...catalog.defaults },
  };
}

function cloneGraph(graph: OrchestrationWorkflowGraph): OrchestrationWorkflowGraph {
  return JSON.parse(JSON.stringify(graph)) as OrchestrationWorkflowGraph;
}

function autoLayoutGraph(graph: OrchestrationWorkflowGraph) {
  return {
    ...graph,
    nodes: graph.nodes.map((node, index) => ({
      ...node,
      position: {
        x: 96 + index * 240,
        y: index % 2 === 0 ? 144 : 280,
      },
    })),
  };
}

export function WorkflowEditorPage({ workflowId }: { workflowId: string }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [versionPreferenceId, setVersionPreferenceId] = useState<string | null>(null);
  const [versionDrafts, setVersionDrafts] = useState<Record<string, OrchestrationWorkflowGraph>>({});
  const [selectedNodeIds, setSelectedNodeIds] = useState<Record<string, string | null>>({});
  const [connectSourceIds, setConnectSourceIds] = useState<Record<string, string | null>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);

  const detailQuery = useQuery({
    queryKey: queryKeys.orchestration.detail(workflowId),
    queryFn: () => getOrchestrationWorkflowDetail(workflowId),
  });

  const versionsQuery = useQuery({
    queryKey: queryKeys.orchestration.versions(workflowId),
    queryFn: () => listOrchestrationWorkflowVersions(workflowId),
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.orchestration.runs(workflowId),
    queryFn: () => listOrchestrationWorkflowRuns(workflowId, 8),
  });

  useEffect(() => {
    if (!dragState) return;
    const currentDrag = dragState;

    function handlePointerMove(event: PointerEvent) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const width = 196;
      const height = 112;
      const nextX = Math.max(20, Math.min(event.clientX - rect.left - currentDrag.offsetX, rect.width - width - 20));
      const nextY = Math.max(20, Math.min(event.clientY - rect.top - currentDrag.offsetY, rect.height - height - 20));

      setVersionDrafts((previous) => {
        const current = previous[currentDrag.versionKey] ?? currentDrag.initialGraph;
        return {
          ...previous,
          [currentDrag.versionKey]: {
            ...current,
            nodes: current.nodes.map((node) =>
              node.id === currentDrag.nodeId
                ? {
                    ...node,
                    position: { x: nextX, y: nextY },
                  }
                : node,
            ),
          },
        };
      });
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  const workflow = detailQuery.data?.workflow ?? null;
  const versions = versionsQuery.data ?? [];
  const activeVersionId =
    (versionPreferenceId && versions.some((version) => version.id === versionPreferenceId) ? versionPreferenceId : null) ||
    detailQuery.data?.currentVersion?.id ||
    versions[0]?.id ||
    "__starter__";
  const activeVersion = versions.find((version) => version.id === activeVersionId) || null;
  const initialGraph = activeVersion ? cloneGraph(activeVersion.definitionGraph) : createStarterWorkflowGraph(detailQuery.data?.workflow.name || "新工作流");
  const draftGraph = versionDrafts[activeVersionId] ?? initialGraph;
  const selectedNodeId =
    selectedNodeIds[activeVersionId] && draftGraph.nodes.some((node) => node.id === selectedNodeIds[activeVersionId])
      ? selectedNodeIds[activeVersionId]
      : draftGraph.nodes[0]?.id ?? null;
  const connectSourceId =
    connectSourceIds[activeVersionId] && draftGraph.nodes.some((node) => node.id === connectSourceIds[activeVersionId])
      ? connectSourceIds[activeVersionId]
      : null;
  const selectedNode = draftGraph.nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedVersion = activeVersion;

  const saveVersionMutation = useMutation({
    mutationFn: async (values: OrchestrationVersionFormValues) =>
      createOrchestrationWorkflowVersion(workflowId, {
        remark: values.remark,
        definitionGraph: draftGraph,
      }),
    onSuccess: async (version) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.detail(workflowId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.versions(workflowId) });
      setVersionPreferenceId(version.id);
      setSaveDialogOpen(false);
      setFeedback({ type: "success", message: `已保存版本 v${version.versionNumber}。` });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "版本保存失败" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => publishOrchestrationWorkflowVersion(workflowId, activeVersionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.detail(workflowId) });
      setFeedback({ type: "success", message: "当前版本已发布到线上版本位。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "版本发布失败" });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (values: OrchestrationRunFormValues) => runOrchestrationWorkflow(workflowId, values),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.detail(workflowId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orchestration.runs(workflowId) });
      setRunDialogOpen(false);
      setFeedback({
        type: run.status === "SUCCESS" ? "success" : "error",
        message: run.status === "SUCCESS" ? "试运行成功，结果已加入最近运行记录。" : run.errorSummary || "试运行失败。",
      });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "试运行失败" });
    },
  });

  if (detailQuery.isLoading && versionsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#fff7ed_45%,#f8fafc_100%)] px-6 py-10">
        <div className="rounded-[32px] border border-white/70 bg-white/90 px-8 py-6 text-center shadow-sm">
          <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-muted-foreground">编排编辑器加载中...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#fff7ed_45%,#f8fafc_100%)] px-6 py-10">
        <div className="max-w-xl rounded-[32px] border border-white/70 bg-white/90 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">工作流不存在</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">当前路由对应的工作流没有找到，或者已经被删除。</p>
          <Link href="/orchestration" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
            返回工作台
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  function updateNode(nodeId: string, updater: (current: OrchestrationWorkflowNode) => OrchestrationWorkflowNode) {
    setVersionDrafts((previous) => {
      const current = previous[activeVersionId] ?? initialGraph;
      return {
        ...previous,
        [activeVersionId]: {
          ...current,
          nodes: current.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
        },
      };
    });
  }

  function addNode(type: OrchestrationNodeType) {
    if (type === "start" && draftGraph.nodes.some((node) => node.type === "start")) {
      setFeedback({ type: "error", message: "首版编排只允许 1 个开始节点。" });
      return;
    }

    const nextNode = buildNode(type, draftGraph.nodes.length);
    setVersionDrafts((previous) => {
      const current = previous[activeVersionId] ?? initialGraph;
      return {
        ...previous,
        [activeVersionId]: {
          ...current,
          nodes: [...current.nodes, nextNode],
        },
      };
    });
    setSelectedNodeIds((previous) => ({ ...previous, [activeVersionId]: nextNode.id }));
  }

  function removeNode(nodeId: string) {
    setVersionDrafts((previous) => {
      const current = previous[activeVersionId] ?? initialGraph;
      return {
        ...previous,
        [activeVersionId]: {
          ...current,
          nodes: current.nodes.filter((node) => node.id !== nodeId),
          edges: current.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        },
      };
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeIds((previous) => ({ ...previous, [activeVersionId]: null }));
    }
  }

  function addEdge(source: string, target: string) {
    if (source === target) {
      setFeedback({ type: "error", message: "连线起点和终点不能相同。" });
      return;
    }

    const duplicated = draftGraph.edges.some((edge) => edge.source === source && edge.target === target);
    if (duplicated) {
      setFeedback({ type: "error", message: "相同的连线已存在。" });
      return;
    }

    setVersionDrafts((previous) => {
      const current = previous[activeVersionId] ?? initialGraph;
      return {
        ...previous,
        [activeVersionId]: {
          ...current,
          edges: [...current.edges, { id: `edge-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, source, target }],
        },
      };
    });
    setConnectSourceIds((previous) => ({ ...previous, [activeVersionId]: null }));
  }

  function removeEdge(edgeId: string) {
    setVersionDrafts((previous) => {
      const current = previous[activeVersionId] ?? initialGraph;
      return {
        ...previous,
        [activeVersionId]: {
          ...current,
          edges: current.edges.filter((edge) => edge.id !== edgeId),
        },
      };
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0%,#eff6ff_30%,#fff7ed_65%,#f8fafc_100%)] px-6 py-8">
      <div className="mx-auto max-w-[1500px]">
        <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <Link href="/orchestration" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" />
                返回编排工作台
              </Link>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <WorkflowStatusBadge status={workflow.status} />
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{workflow.code}</span>
                </div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950">{workflow.name}</h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">{workflow.description}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">当前线上版本</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{workflow.currentVersionNumber ? `v${workflow.currentVersionNumber}` : "未发布"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">版本数</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{versionsQuery.data?.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">最近运行</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{formatDateTime(runsQuery.data?.[0]?.endTime)}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5">
          <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
        </div>

        <section className="mt-5 rounded-[30px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={activeVersionId === "__starter__" ? "" : activeVersionId}
                onChange={(event) => {
                  setVersionPreferenceId(event.target.value || null);
                }}
                className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
              >
                {(versionsQuery.data ?? []).map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.versionNumber} · {version.remark}
                  </option>
                ))}
                {!versionsQuery.data?.length ? <option value="">未保存版本</option> : null}
              </select>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                当前草稿节点 {draftGraph.nodes.length} 个 · 连线 {draftGraph.edges.length} 条
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setSaveDialogOpen(true)}
              >
                <Save className="h-4 w-4" />
                保存新版本
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!selectedVersion}
                onClick={() => publishMutation.mutate()}
              >
                <GitBranchPlus className="h-4 w-4" />
                {publishMutation.isPending ? "发布中..." : "发布当前版本"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!versionsQuery.data?.length}
                onClick={() => setRunDialogOpen(true)}
              >
                <Play className="h-4 w-4" />
                试运行
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside className="space-y-4 rounded-[30px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
            <div>
              <p className="text-sm font-semibold text-slate-950">节点库</p>
              <p className="mt-1 text-sm text-slate-500">只保留首版真正可运行的一组节点，避免界面能力和运行能力脱节。</p>
            </div>

            {orchestrationNodeGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.key} className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{group.title}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => addNode(item.type)}
                        >
                          <div className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border", item.accentClassName)}>
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-950">{item.label}</p>
                            <p className="mt-1 text-xs leading-6 text-slate-500">{item.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </aside>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  const template = createStarterWorkflowGraph(workflow.name);
                  setVersionDrafts((previous) => ({ ...previous, [activeVersionId]: template }));
                  setSelectedNodeIds((previous) => ({ ...previous, [activeVersionId]: template.nodes[0]?.id ?? null }));
                  setConnectSourceIds((previous) => ({ ...previous, [activeVersionId]: null }));
                }}
              >
                <LayoutTemplate className="h-4 w-4" />
                插入推荐模板
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() =>
                  setVersionDrafts((previous) => {
                    const current = previous[activeVersionId] ?? initialGraph;
                    return { ...previous, [activeVersionId]: autoLayoutGraph(current) };
                  })
                }
              >
                <Grip className="h-4 w-4" />
                自动整理
              </button>
              {connectSourceId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  当前连线起点：{draftGraph.nodes.find((node) => node.id === connectSourceId)?.name ?? "已失效"}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">点击某个节点上的“设为起点”，再到目标节点上“连接到此”。</div>
              )}
            </div>

            <div ref={canvasRef} className="relative h-[700px] overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(0deg,rgba(255,255,255,0.65),rgba(255,255,255,0.65)),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:auto,32px_32px,32px_32px] shadow-sm">
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                <defs>
                  <marker id="editor-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M0 0L10 5L0 10Z" fill="#475569" />
                  </marker>
                </defs>
                {draftGraph.edges.map((edge) => {
                  const source = draftGraph.nodes.find((node) => node.id === edge.source);
                  const target = draftGraph.nodes.find((node) => node.id === edge.target);
                  if (!source || !target) return null;

                  const startX = source.position.x + 196;
                  const startY = source.position.y + 56;
                  const endX = target.position.x;
                  const endY = target.position.y + 56;
                  const controlX = startX + Math.max(60, (endX - startX) / 2);

                  return (
                    <path
                      key={edge.id}
                      d={`M${startX},${startY} C${controlX},${startY} ${endX - 60},${endY} ${endX},${endY}`}
                      stroke="#475569"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#editor-arrow)"
                      opacity="0.7"
                    />
                  );
                })}
              </svg>

              {draftGraph.nodes.map((node) => {
                const meta = orchestrationNodeCatalog[node.type];
                const Icon = meta.icon;
                const isSelected = node.id === selectedNodeId;
                return (
                  <motion.button
                    key={node.id}
                    type="button"
                    layout
                    className={cn(
                      "absolute w-[196px] rounded-[26px] border bg-white p-4 text-left shadow-[0_20px_40px_-30px_rgba(15,23,42,0.7)] transition",
                      isSelected ? "border-slate-950 ring-2 ring-slate-900/15" : "border-slate-200 hover:border-slate-300",
                    )}
                    style={{ left: node.position.x, top: node.position.y }}
                    onClick={() => setSelectedNodeIds((previous) => ({ ...previous, [activeVersionId]: node.id }))}
                    onPointerDown={(event) => {
                      if ((event.target as HTMLElement).closest("[data-node-action='true']")) {
                        return;
                      }

                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      setSelectedNodeIds((previous) => ({ ...previous, [activeVersionId]: node.id }));
                      setDragState({
                        nodeId: node.id,
                        offsetX: event.clientX - rect.left - node.position.x,
                        offsetY: event.clientY - rect.top - node.position.y,
                        versionKey: activeVersionId,
                        initialGraph,
                      });
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", meta.accentClassName)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-medium", meta.accentClassName)}>{meta.label}</span>
                    </div>
                    <div className="mt-4">
                      <p className="text-base font-semibold text-slate-950">{node.name}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-500">{meta.description}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        data-node-action="true"
                        type="button"
                        className={cn(
                          "rounded-2xl border px-2.5 py-1.5 text-xs font-medium transition",
                          connectSourceId === node.id
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedNodeIds((previous) => ({ ...previous, [activeVersionId]: node.id }));
                          if (connectSourceId === node.id) {
                            setConnectSourceIds((previous) => ({ ...previous, [activeVersionId]: null }));
                            return;
                          }
                          if (connectSourceId && connectSourceId !== node.id) {
                            addEdge(connectSourceId, node.id);
                            return;
                          }
                          setConnectSourceIds((previous) => ({ ...previous, [activeVersionId]: node.id }));
                        }}
                      >
                        {connectSourceId === node.id ? "取消起点" : connectSourceId ? "连接到此" : "设为起点"}
                      </button>
                      <button
                        data-node-action="true"
                        type="button"
                        className="rounded-2xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeNode(node.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4 rounded-[30px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">节点配置</p>
                  <p className="text-xs text-slate-500">当前编辑的是标准 graph schema，而不是 React Flow 的内部结构。</p>
                </div>
              </div>

              {selectedNode ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">节点名称</label>
                    <input
                      className={inputClassName()}
                      value={selectedNode.name}
                      onChange={(event) =>
                        updateNode(selectedNode.id, (current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">节点类型</label>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">{orchestrationNodeCatalog[selectedNode.type].label}</div>
                  </div>

                  {selectedNode.type === "start" ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium">输入 Schema</label>
                      <textarea
                        className={textareaClassName()}
                        value={selectedNode.config.inputSchema || ""}
                        onChange={(event) =>
                          updateNode(selectedNode.id, (current) => ({
                            ...current,
                            config: { ...current.config, inputSchema: event.target.value },
                          }))
                        }
                      />
                    </div>
                  ) : null}

                  {selectedNode.type === "knowledge" ? (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium">知识库</label>
                        <input
                          className={inputClassName()}
                          value={selectedNode.config.knowledgeBase || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, knowledgeBase: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">检索模板</label>
                        <textarea
                          className={textareaClassName()}
                          value={selectedNode.config.retrievalQuery || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, retrievalQuery: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">输出变量名</label>
                        <input
                          className={inputClassName()}
                          value={selectedNode.config.outputKey || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, outputKey: event.target.value, topK: current.config.topK || "3" },
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}

                  {selectedNode.type === "llm" ? (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium">模型名</label>
                        <input
                          className={inputClassName()}
                          value={selectedNode.config.modelName || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, modelName: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">提示词模板</label>
                        <textarea
                          className={textareaClassName()}
                          value={selectedNode.config.prompt || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, prompt: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">输出变量名</label>
                        <input
                          className={inputClassName()}
                          value={selectedNode.config.outputKey || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, outputKey: event.target.value },
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}

                  {selectedNode.type === "skill" ? (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium">技能名</label>
                        <input
                          className={inputClassName()}
                          value={selectedNode.config.skillName || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, skillName: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">动作</label>
                        <input
                          className={inputClassName()}
                          value={selectedNode.config.action || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, action: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Payload 模板</label>
                        <textarea
                          className={textareaClassName()}
                          value={selectedNode.config.payloadTemplate || ""}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (current) => ({
                              ...current,
                              config: { ...current.config, payloadTemplate: event.target.value },
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}

                  {selectedNode.type === "end" ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium">结果模板</label>
                      <textarea
                        className={textareaClassName()}
                        value={selectedNode.config.responseTemplate || ""}
                        onChange={(event) =>
                          updateNode(selectedNode.id, (current) => ({
                            ...current,
                            config: { ...current.config, responseTemplate: event.target.value },
                          }))
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">选择一个节点后，这里会显示它的类型化配置项。</div>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-950">连线清单</p>
                <span className="text-xs text-slate-500">{draftGraph.edges.length} 条</span>
              </div>
              <div className="mt-3 space-y-2">
                {draftGraph.edges.length ? (
                  draftGraph.edges.map((edge) => {
                    const source = draftGraph.nodes.find((node) => node.id === edge.source);
                    const target = draftGraph.nodes.find((node) => node.id === edge.target);
                    return (
                      <div key={edge.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-950">
                            {source?.name || edge.source} → {target?.name || edge.target}
                          </p>
                          <button type="button" className="text-xs font-medium text-red-600 transition hover:text-red-700" onClick={() => removeEdge(edge.id)}>
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">还没有连线。先在画布中设置起点，再连接到目标节点。</div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-950">最近运行记录</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setRunDialogOpen(true)}
                >
                  <Play className="h-3.5 w-3.5" />
                  再跑一次
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {runsQuery.data?.length ? (
                  runsQuery.data.map((run) => (
                    <div key={run.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <RunStatusBadge status={run.status} />
                        <span className="text-xs text-slate-500">{formatDuration(run.durationMs)}</span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-950">v{run.workflowVersionNumber}</p>
                      <p className="mt-1 text-sm text-slate-600">{run.outputSummary || run.errorSummary || "暂无摘要"}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Sparkles className="h-3.5 w-3.5" />
                        {formatDateTime(run.endTime)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">还没有运行记录。建议先保存并发布一个版本，再做试运行。</div>
                )}
              </div>
            </div>

            {selectedVersion ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-950">当前版本</p>
                  <Link href="/orchestration" className="text-xs font-medium text-slate-600 transition hover:text-slate-950">
                    回工作台
                  </Link>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-slate-950">v{selectedVersion.versionNumber}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedVersion.remark}</p>
                  <p className="mt-3 text-xs text-slate-500">{formatDateTime(selectedVersion.createDate)}</p>
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </div>

      <VersionDialog
        open={saveDialogOpen}
        pending={saveVersionMutation.isPending}
        onClose={() => setSaveDialogOpen(false)}
        onSubmit={async (values) => {
          await saveVersionMutation.mutateAsync(values);
        }}
      />

      <RunDialog
        open={runDialogOpen}
        versions={versionsQuery.data ?? []}
        currentVersionId={workflow.currentVersionId}
        pending={runMutation.isPending}
        onClose={() => setRunDialogOpen(false)}
        onSubmit={async (values) => {
          await runMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
