"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import {
  funcDocFeatureFilterSchema,
  type FuncDocFeatureFilterInput,
  type FuncDocFeatureFilterValues,
} from "@/features/func-doc/schema";
import {
  exportFuncDocInterfaces,
  generateFuncDocFeatureField,
  getFuncDocDetail,
  listFuncDocFeatureTree,
  listFuncDocFeatures,
} from "@/features/func-doc/mock-service";
import type {
  FuncDocAIGenerationStatus,
  FuncDocExportPayload,
  FuncDocFeaturePoint,
  FuncDocFeatureTreeNode,
} from "@/features/func-doc/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 8, 12] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;
type GenerationField = "process" | "flow" | "interface";

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

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function statusLabel(status: string) {
  if (status === "READY") return "解析完成";
  if (status === "FAILED") return "解析失败";
  if (status === "PARSING") return "解析中";
  return "已上传";
}

function statusClass(status: string) {
  if (status === "READY") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "PARSING") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function genStatusClass(status: FuncDocAIGenerationStatus) {
  if (status === "READY") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "RUNNING") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function genStatusLabel(status: FuncDocAIGenerationStatus) {
  if (status === "READY") return "已生成";
  if (status === "FAILED") return "失败";
  if (status === "RUNNING") return "生成中";
  return "未生成";
}

function downloadPayload(payload: FuncDocExportPayload) {
  const blob = new Blob([payload.content], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
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

function TreePanel({
  tree,
  selectedLevel2Id,
  onSelect,
}: {
  tree: FuncDocFeatureTreeNode[];
  selectedLevel2Id: string;
  onSelect: (level2Id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn(
          "w-full rounded-xl border px-3 py-2 text-left text-sm",
          selectedLevel2Id === "" ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted",
        )}
      >
        全部二级功能
      </button>

      {tree.map((level1) => (
        <div key={level1.id} className="rounded-xl border border-border bg-muted/20 p-2">
          <p className="px-2 py-1 text-sm font-semibold">{level1.name}</p>
          <div className="space-y-1">
            {level1.children.map((level2) => (
              <button
                key={level2.id}
                type="button"
                onClick={() => onSelect(level2.id)}
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 text-left text-xs",
                  selectedLevel2Id === level2.id
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                {level2.name}（{level2.count}）
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureDetailSheet({
  feature,
  onClose,
}: {
  feature: FuncDocFeaturePoint | null;
  onClose: () => void;
}) {
  if (!feature) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 px-4 py-6 backdrop-blur-sm">
      <div className="ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-[30px] border border-border bg-background shadow-2xl">
        <div className="sticky top-0 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Feature Detail</p>
              <h2 className="mt-2 text-xl font-semibold">{feature.level3Name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.level1Name} / {feature.level2Name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm">
          <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">流程节点摘要</p>
            <p className="mt-2 whitespace-pre-wrap leading-6">{feature.processDetail}</p>
          </section>

          <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">业务说明</p>
            <p className="mt-2 whitespace-pre-wrap leading-6">{feature.businessDesc || "尚未生成"}</p>
          </section>

          <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">流程简述</p>
            <p className="mt-2 whitespace-pre-wrap leading-6">{feature.processSummary || "尚未生成"}</p>
          </section>

          <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">功能描述</p>
            <p className="mt-2 whitespace-pre-wrap leading-6">{feature.functionDesc || "尚未生成"}</p>
          </section>

          <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mermaid 流程图</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-black px-3 py-3 text-xs text-white">
              {feature.mermaidCode || "尚未生成"}
            </pre>
          </section>

          <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">接口说明</p>
            <p className="mt-2 whitespace-pre-wrap leading-6">{feature.infDesc || "尚未生成"}</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-black px-3 py-3 text-xs text-white">
              {feature.infDetail || "尚未生成"}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

export function FuncDocFeaturesPage({ docId }: { docId: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedFeature, setSelectedFeature] = useState<FuncDocFeaturePoint | null>(null);
  const [selectedLevel2Id, setSelectedLevel2Id] = useState("");
  const [exporting, setExporting] = useState(false);

  const filterForm = useForm<FuncDocFeatureFilterInput, undefined, FuncDocFeatureFilterValues>({
    resolver: zodResolver(funcDocFeatureFilterSchema),
    defaultValues: {
      keyword: "",
      level2Id: "",
      page: 1,
      pageSize: 8,
    },
  });

  const watchedFeatureFilters = useWatch({ control: filterForm.control });
  const featureFilters: FuncDocFeatureFilterValues = funcDocFeatureFilterSchema.parse({
    keyword: watchedFeatureFilters?.keyword ?? "",
    level2Id: watchedFeatureFilters?.level2Id ?? "",
    page: watchedFeatureFilters?.page ?? 1,
    pageSize: watchedFeatureFilters?.pageSize ?? 8,
  });
  const featurePage = Number(featureFilters.page) || 1;
  const featurePageSize = Number(featureFilters.pageSize) || 8;

  const detailQuery = useQuery({
    queryKey: queryKeys.funcDocs.detail(docId),
    queryFn: () => getFuncDocDetail(docId),
  });

  const treeQuery = useQuery({
    queryKey: queryKeys.funcDocs.featureTree(docId),
    queryFn: () => listFuncDocFeatureTree(docId),
    enabled: detailQuery.data?.parseStatus === "READY",
  });

  const featuresQuery = useQuery({
    queryKey: queryKeys.funcDocs.features({
      docId,
      level2Id: selectedLevel2Id,
      keyword: featureFilters.keyword,
      page: featurePage,
      pageSize: featurePageSize,
    }),
    queryFn: () =>
      listFuncDocFeatures({
        docId,
        level2Id: selectedLevel2Id,
        keyword: featureFilters.keyword,
        page: featurePage,
        pageSize: featurePageSize,
      }),
    enabled: detailQuery.data?.parseStatus === "READY",
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: { featureId: string; field: GenerationField }) =>
      generateFuncDocFeatureField(payload.featureId, payload.field),
    onSuccess: async () => {
      setFeedback({ type: "success", message: "AI 生成结果已回写" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.funcDocs.featuresRoot(docId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.funcDocs.featureTree(docId) }),
      ]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "生成失败" });
    },
  });

  const totalPages = useMemo(() => {
    const total = featuresQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / featurePageSize));
  }, [featurePageSize, featuresQuery.data?.total]);

  async function handleExportInterfaces() {
    setExporting(true);
    try {
      const payload = await exportFuncDocInterfaces(docId);
      downloadPayload(payload);
      setFeedback({ type: "success", message: "接口台账导出成功" });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "导出失败" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[30px] border border-border bg-background/90 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">FuncDoc Features</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">功能点管理</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                浏览三级功能点并触发 AI 生成流程说明、流程图、接口说明，补齐可导出的功能台账。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/func-docs/${docId}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                返回详情
              </Link>
              <button
                type="button"
                onClick={handleExportInterfaces}
                disabled={exporting || detailQuery.data?.parseStatus !== "READY"}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                导出接口台账
              </button>
            </div>
          </div>
        </header>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            正在加载文档信息...
          </div>
        ) : detailQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {detailQuery.error instanceof Error ? detailQuery.error.message : "加载失败"}
          </div>
        ) : detailQuery.data ? (
          <>
            <section className="rounded-[26px] border border-border bg-background p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{detailQuery.data.fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    最近更新：{formatDateTime(detailQuery.data.updateDate)} · 三级功能点：{detailQuery.data.featureCount}
                  </p>
                </div>
                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusClass(detailQuery.data.parseStatus))}>
                  {statusLabel(detailQuery.data.parseStatus)}
                </span>
              </div>

              {detailQuery.data.parseStatus !== "READY" ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {detailQuery.data.parseStatus === "FAILED"
                    ? detailQuery.data.parseError || "解析失败，请先修正文档后重试"
                    : "文档仍在解析中，完成后即可查看功能点树与 AI 生成结果"}
                </div>
              ) : null}
            </section>

            {detailQuery.data.parseStatus === "READY" ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                <section className="space-y-3 rounded-[26px] border border-border bg-background p-4 shadow-sm">
                  <h2 className="text-lg font-semibold">功能点树</h2>
                  {treeQuery.isLoading ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">正在加载树结构...</div>
                  ) : treeQuery.isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {treeQuery.error instanceof Error ? treeQuery.error.message : "功能点树加载失败"}
                    </div>
                  ) : (
                    <TreePanel
                      tree={treeQuery.data ?? []}
                      selectedLevel2Id={selectedLevel2Id}
                      onSelect={(level2Id) => {
                        setSelectedLevel2Id(level2Id);
                        filterForm.setValue("page", 1, { shouldValidate: true });
                      }}
                    />
                  )}
                </section>

                <section className="space-y-4 rounded-[26px] border border-border bg-background p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">三级功能点</h2>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                      <Bot className="h-3.5 w-3.5" />
                      AI 生成字段
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        className={cn(inputClassName(false), "pl-9")}
                        placeholder="按功能点名称或流程关键字搜索"
                        value={featureFilters.keyword}
                        onChange={(event) => {
                          filterForm.setValue("keyword", event.target.value, { shouldValidate: true });
                          filterForm.setValue("page", 1, { shouldValidate: true });
                        }}
                      />
                    </div>

                    <select
                      className={inputClassName(false)}
                      value={String(featurePageSize)}
                      onChange={(event) => {
                        filterForm.setValue("pageSize", Number(event.target.value), { shouldValidate: true });
                        filterForm.setValue("page", 1, { shouldValidate: true });
                      }}
                    >
                      {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option} / 页
                        </option>
                      ))}
                    </select>
                  </div>

                  {featuresQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      正在加载功能点...
                    </div>
                  ) : featuresQuery.isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {featuresQuery.error instanceof Error ? featuresQuery.error.message : "功能点加载失败"}
                    </div>
                  ) : featuresQuery.data && featuresQuery.data.items.length > 0 ? (
                    <div className="space-y-3">
                      {featuresQuery.data.items.map((feature) => (
                        <div key={feature.id} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{feature.level3Name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {feature.level1Name} / {feature.level2Name}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedFeature(feature)}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                            >
                              查看详情
                            </button>
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{feature.processDetail}</p>

                          <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                            <span className={cn("inline-flex rounded-full border px-2 py-0.5", genStatusClass(feature.processGenStatus))}>
                              流程说明：{genStatusLabel(feature.processGenStatus)}
                            </span>
                            <span className={cn("inline-flex rounded-full border px-2 py-0.5", genStatusClass(feature.flowGenStatus))}>
                              流程图：{genStatusLabel(feature.flowGenStatus)}
                            </span>
                            <span className={cn("inline-flex rounded-full border px-2 py-0.5", genStatusClass(feature.infGenStatus))}>
                              接口说明：{genStatusLabel(feature.infGenStatus)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={generateMutation.isPending}
                              onClick={() => generateMutation.mutate({ featureId: feature.id, field: "process" })}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              生成流程说明
                            </button>
                            <button
                              type="button"
                              disabled={generateMutation.isPending}
                              onClick={() => generateMutation.mutate({ featureId: feature.id, field: "flow" })}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              生成流程图
                            </button>
                            <button
                              type="button"
                              disabled={generateMutation.isPending}
                              onClick={() => generateMutation.mutate({ featureId: feature.id, field: "interface" })}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              生成接口说明
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                      当前筛选条件下没有三级功能点
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground">
                    <span>
                      第 {featurePage} / {totalPages} 页 · 共 {featuresQuery.data?.total ?? 0} 条
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={featurePage <= 1}
                        onClick={() => filterForm.setValue("page", Math.max(1, featurePage - 1), { shouldValidate: true })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={featurePage >= totalPages}
                        onClick={() =>
                          filterForm.setValue("page", Math.min(totalPages, featurePage + 1), { shouldValidate: true })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <FeatureDetailSheet feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
    </main>
  );
}
