"use client";

import Link from "next/link";
import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  LoaderCircle,
  Search,
  Workflow,
} from "lucide-react";
import {
  funcDocProcessFilterSchema,
  type FuncDocProcessFilterInput,
  type FuncDocProcessFilterValues,
} from "@/features/func-doc/schema";
import {
  getFuncDocDetail,
  listFuncDocHeadingTree,
  listFuncDocProcessNodes,
} from "@/features/func-doc/mock-service";
import type { FuncDocHeadingNode } from "@/features/func-doc/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
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

function flattenHeadingNodes(nodes: FuncDocHeadingNode[]) {
  const result: Array<{ id: string; title: string; depth: number }> = [];

  const walk = (current: FuncDocHeadingNode[], depth: number) => {
    current.forEach((node) => {
      result.push({ id: node.id, title: node.title, depth });
      walk(node.children, depth + 1);
    });
  };

  walk(nodes, 0);
  return result;
}

function HeadingTree({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: {
  nodes: FuncDocHeadingNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              "w-full rounded-xl px-3 py-2 text-left text-sm transition",
              selectedId === node.id ? "bg-foreground text-background" : "hover:bg-muted",
            )}
            style={{ paddingLeft: `${12 + depth * 14}px` }}
          >
            {node.title}
          </button>
          <HeadingTree nodes={node.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export function FuncDocDetailPage({ docId }: { docId: string }) {
  const filterForm = useForm<FuncDocProcessFilterInput, undefined, FuncDocProcessFilterValues>({
    resolver: zodResolver(funcDocProcessFilterSchema),
    defaultValues: {
      keyword: "",
      headingId: "",
      page: 1,
      pageSize: 10,
    },
  });

  const watchedProcessFilters = useWatch({ control: filterForm.control });
  const processFilters: FuncDocProcessFilterValues = funcDocProcessFilterSchema.parse({
    keyword: watchedProcessFilters?.keyword ?? "",
    headingId: watchedProcessFilters?.headingId ?? "",
    page: watchedProcessFilters?.page ?? 1,
    pageSize: watchedProcessFilters?.pageSize ?? 10,
  });
  const processPage = Number(processFilters.page) || 1;
  const processPageSize = Number(processFilters.pageSize) || 10;

  const detailQuery = useQuery({
    queryKey: queryKeys.funcDocs.detail(docId),
    queryFn: () => getFuncDocDetail(docId),
  });

  const headingTreeQuery = useQuery({
    queryKey: queryKeys.funcDocs.headings(docId),
    queryFn: () => listFuncDocHeadingTree(docId),
    enabled: detailQuery.data?.parseStatus === "READY",
  });

  const processQuery = useQuery({
    queryKey: queryKeys.funcDocs.processNodes({
      docId,
      headingId: processFilters.headingId || "",
      keyword: processFilters.keyword,
      page: processPage,
      pageSize: processPageSize,
    }),
    queryFn: () =>
      listFuncDocProcessNodes({
        docId,
        headingId: processFilters.headingId || "",
        keyword: processFilters.keyword,
        page: processPage,
        pageSize: processPageSize,
      }),
    enabled: detailQuery.data?.parseStatus === "READY" && Boolean(processFilters.headingId || ""),
  });

  const headingTree = useMemo(() => headingTreeQuery.data ?? [], [headingTreeQuery.data]);
  const headingOptions = useMemo(() => flattenHeadingNodes(headingTreeQuery.data ?? []), [headingTreeQuery.data]);
  const selectedHeadingId = processFilters.headingId || headingOptions[0]?.id || "";

  const totalPages = useMemo(() => {
    const total = processQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / processPageSize));
  }, [processPageSize, processQuery.data?.total]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[30px] border border-border bg-background/90 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">FuncDoc Detail</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">文档详情与流程节点</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                左侧浏览标题树，右侧查看当前标题下的流程节点，保持 quiz 旧链路语义但用更清晰结构重写。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/func-docs"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                返回列表
              </Link>
              <Link
                href={`/func-docs/${docId}/features`}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <Workflow className="h-4 w-4" />
                查看功能点
              </Link>
            </div>
          </div>
        </header>

        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            正在加载文档详情...
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
                    上传于 {formatDateTime(detailQuery.data.createDate)} · 最近更新 {formatDateTime(detailQuery.data.updateDate)}
                  </p>
                </div>
                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusClass(detailQuery.data.parseStatus))}>
                  {statusLabel(detailQuery.data.parseStatus)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">标题数：{detailQuery.data.headingCount}</div>
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">流程节点：{detailQuery.data.processNodeCount}</div>
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">解析完成：{formatDateTime(detailQuery.data.parseCompletedAt)}</div>
              </div>

              {detailQuery.data.parseStatus !== "READY" ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {detailQuery.data.parseStatus === "FAILED"
                    ? detailQuery.data.parseError || "解析失败，请检查文档模板"
                    : "文档仍在解析中，请稍后刷新本页"}
                </div>
              ) : null}
            </section>

            {detailQuery.data.parseStatus === "READY" ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
                <section className="space-y-3 rounded-[26px] border border-border bg-background p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">标题树</h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                      <FolderTree className="h-3.5 w-3.5" />
                      {headingOptions.length} 项
                    </span>
                  </div>

                  {headingTreeQuery.isLoading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">正在加载标题树...</div>
                  ) : headingTreeQuery.isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {headingTreeQuery.error instanceof Error ? headingTreeQuery.error.message : "标题树加载失败"}
                    </div>
                  ) : headingTree.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">当前文档尚无标题树</div>
                  ) : (
                    <div className="max-h-[560px] overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
                      <HeadingTree
                        nodes={headingTree}
                        selectedId={selectedHeadingId}
                        onSelect={(headingId) => {
                          filterForm.setValue("headingId", headingId, { shouldValidate: true });
                          filterForm.setValue("page", 1, { shouldValidate: true });
                        }}
                      />
                    </div>
                  )}
                </section>

                <section className="space-y-4 rounded-[26px] border border-border bg-background p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">流程节点</h2>
                    <button
                      type="button"
                      onClick={() => processQuery.refetch()}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      刷新
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        className={cn(inputClassName(false), "pl-9")}
                        placeholder="按标题或步骤内容搜索"
                        value={processFilters.keyword}
                        onChange={(event) => {
                          filterForm.setValue("keyword", event.target.value, { shouldValidate: true });
                          filterForm.setValue("page", 1, { shouldValidate: true });
                        }}
                      />
                    </div>

                    <select
                      className={inputClassName(false)}
                      value={selectedHeadingId}
                      onChange={(event) => {
                        filterForm.setValue("headingId", event.target.value, { shouldValidate: true });
                        filterForm.setValue("page", 1, { shouldValidate: true });
                      }}
                    >
                      {headingOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {`${"-".repeat(option.depth)} ${option.title}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {processQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      正在加载流程节点...
                    </div>
                  ) : processQuery.isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {processQuery.error instanceof Error ? processQuery.error.message : "流程节点加载失败"}
                    </div>
                  ) : processQuery.data && processQuery.data.items.length > 0 ? (
                    <div className="space-y-2">
                      {processQuery.data.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{item.headingTitle}</p>
                          <p className="mt-2 text-sm font-medium">步骤 {item.stepNo}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                      当前筛选条件下没有流程节点
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground">
                    <span>
                      第 {processPage} / {totalPages} 页 · 共 {processQuery.data?.total ?? 0} 条
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={processPage <= 1}
                        onClick={() => filterForm.setValue("page", Math.max(1, processPage - 1), { shouldValidate: true })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={processPage >= totalPages}
                        onClick={() =>
                          filterForm.setValue("page", Math.min(totalPages, processPage + 1), { shouldValidate: true })
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
    </main>
  );
}
