"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  funcDocListFilterSchema,
  funcDocUploadSchema,
  type FuncDocListFilterInput,
  type FuncDocListFilterValues,
  type FuncDocUploadInput,
  type FuncDocUploadValues,
} from "@/features/func-doc/schema";
import {
  deleteFuncDoc,
  exportFuncDocHeadings,
  exportFuncDocInterfaces,
  listFuncDocs,
  uploadFuncDoc,
} from "@/features/func-doc/mock-service";
import type { FuncDocExportPayload, FuncDocListItem, FuncDocParseStatus } from "@/features/func-doc/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const pageSizeOptions = [6, 8, 12] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

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

function formatSize(size: number) {
  if (size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
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

function getStatusBadgeClass(status: FuncDocParseStatus) {
  if (status === "READY") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "PARSING") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function statusLabel(status: FuncDocParseStatus) {
  if (status === "READY") return "解析完成";
  if (status === "FAILED") return "解析失败";
  if (status === "PARSING") return "解析中";
  return "已上传";
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

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-[26px] border border-border bg-card p-4 shadow-sm"
    >
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function DocCard({
  doc,
  deleting,
  exporting,
  onDelete,
  onExportHeadings,
  onExportInterfaces,
}: {
  doc: FuncDocListItem;
  deleting: boolean;
  exporting: boolean;
  onDelete: () => void;
  onExportHeadings: () => void;
  onExportInterfaces: () => void;
}) {
  const isReady = doc.parseStatus === "READY";

  return (
    <div className="rounded-[24px] border border-border bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{doc.fileName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            上传时间：{formatDateTime(doc.createDate)} · 文件大小：{formatSize(doc.fileSize)} · MD5：{doc.md5}
          </p>
        </div>
        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStatusBadgeClass(doc.parseStatus))}>
          {statusLabel(doc.parseStatus)}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{doc.remark || "暂无备注"}</p>
      {doc.parseError ? <p className="mt-2 text-xs text-red-600">{doc.parseError}</p> : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs">
          标题数 <span className="ml-2 font-semibold">{doc.headingCount}</span>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs">
          流程节点 <span className="ml-2 font-semibold">{doc.processNodeCount}</span>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs">
          三级功能点 <span className="ml-2 font-semibold">{doc.featureCount}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/func-docs/${doc.id}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium",
            isReady ? "border-border bg-background hover:bg-muted" : "pointer-events-none border-border/60 bg-muted/40 text-muted-foreground",
          )}
        >
          详情
        </Link>
        <Link
          href={`/func-docs/${doc.id}/features`}
          className={cn(
            "inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium",
            isReady ? "border-border bg-background hover:bg-muted" : "pointer-events-none border-border/60 bg-muted/40 text-muted-foreground",
          )}
        >
          功能点
        </Link>
        <button
          type="button"
          onClick={onExportHeadings}
          disabled={!isReady || exporting}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          导出标题
        </button>
        <button
          type="button"
          onClick={onExportInterfaces}
          disabled={!isReady || exporting}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          导出接口
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
      </div>
    </div>
  );
}

export function FuncDocManagementPage() {
  const queryClient = useQueryClient();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportingDocId, setExportingDocId] = useState<string | null>(null);

  const filterForm = useForm<FuncDocListFilterInput, undefined, FuncDocListFilterValues>({
    resolver: zodResolver(funcDocListFilterSchema),
    defaultValues: {
      keyword: "",
      status: "ALL",
      page: 1,
      pageSize: 8,
    },
  });

  const uploadForm = useForm<FuncDocUploadInput, undefined, FuncDocUploadValues>({
    resolver: zodResolver(funcDocUploadSchema),
    defaultValues: {
      fileName: "",
      remark: "",
    },
  });

  const watchedListFilters = useWatch({ control: filterForm.control });
  const listFilters: FuncDocListFilterValues = funcDocListFilterSchema.parse({
    keyword: watchedListFilters?.keyword ?? "",
    status: watchedListFilters?.status ?? "ALL",
    page: watchedListFilters?.page ?? 1,
    pageSize: watchedListFilters?.pageSize ?? 8,
  });

  const docsQuery = useQuery({
    queryKey: queryKeys.funcDocs.list(listFilters),
    queryFn: () => listFuncDocs(listFilters),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadFuncDoc,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "文档已上传，系统开始解析。" });
      setSelectedFile(null);
      uploadForm.reset({ fileName: "", remark: "" });
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.funcDocs.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "上传失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFuncDoc,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "文档已删除" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.funcDocs.all });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败" });
    },
  });

  const docs = docsQuery.data?.items ?? [];
  const summary = docsQuery.data?.summary;
  const totalPages = useMemo(() => {
    const total = docsQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / listFilters.pageSize));
  }, [docsQuery.data?.total, listFilters.pageSize]);

  async function handleExport(docId: string, mode: "headings" | "interfaces") {
    setExportingDocId(docId);
    try {
      const payload = mode === "headings" ? await exportFuncDocHeadings(docId) : await exportFuncDocInterfaces(docId);
      downloadPayload(payload);
      setFeedback({ type: "success", message: mode === "headings" ? "标题导出成功" : "接口台账导出成功" });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "导出失败" });
    } finally {
      setExportingDocId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[30px] border border-border bg-background/90 px-6 py-6 shadow-sm backdrop-blur"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">FuncDoc Workbench</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">功能文档管理</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                对齐 quiz 的文档解析语义，首版先交付文档上传、解析状态、详情跳转、功能点入口与导出能力闭环。
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </div>
        </motion.header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="文档总数" value={String(summary?.total ?? 0)} hint="当前账号可管理范围" />
          <StatCard label="解析完成" value={String(summary?.ready ?? 0)} hint="可进入详情与功能点页" />
          <StatCard label="解析中" value={String(summary?.parsing ?? 0)} hint="等待后台结构化处理" />
          <StatCard label="解析失败" value={String(summary?.failed ?? 0)} hint="建议按模板修正文档" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
          <section className="space-y-4 rounded-[28px] border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">上传文档</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                支持 .docx
              </span>
            </div>

            <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

            <form
              className="space-y-4"
              onSubmit={uploadForm.handleSubmit(async (values) => {
                if (!selectedFile) {
                  uploadForm.setError("fileName", { message: "请先选择 docx 文档" });
                  return;
                }

                await uploadMutation.mutateAsync({
                  fileName: values.fileName,
                  fileSize: selectedFile.size,
                  remark: values.remark || "",
                });
              })}
            >
              <div>
                <label className="mb-2 block text-sm font-medium">文档文件</label>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".docx"
                  className={inputClassName(Boolean(uploadForm.formState.errors.fileName?.message))}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    uploadForm.setValue("fileName", file?.name ?? "", { shouldValidate: true });
                  }}
                />
                <FieldError message={uploadForm.formState.errors.fileName?.message} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">备注</label>
                <textarea
                  className={cn(inputClassName(Boolean(uploadForm.formState.errors.remark?.message)), "min-h-24 resize-y")}
                  placeholder="可记录文档范围、目标模块或解析说明"
                  {...uploadForm.register("remark")}
                />
                <FieldError message={uploadForm.formState.errors.remark?.message} />
              </div>

              <button
                type="submit"
                disabled={uploadMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                上传并解析
              </button>
            </form>
          </section>

          <section className="space-y-4 rounded-[28px] border border-border bg-background p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">文档列表</h2>
              <button
                type="button"
                onClick={() => docsQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                刷新
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_120px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={cn(inputClassName(false), "pl-9")}
                  placeholder="按文件名或备注搜索"
                  value={listFilters.keyword}
                  onChange={(event) => {
                    filterForm.setValue("keyword", event.target.value, { shouldValidate: true });
                    filterForm.setValue("page", 1, { shouldValidate: true });
                  }}
                />
              </div>

              <select
                className={inputClassName(false)}
                value={listFilters.status}
                onChange={(event) => {
                  filterForm.setValue("status", event.target.value as FuncDocListFilterValues["status"], {
                    shouldValidate: true,
                  });
                  filterForm.setValue("page", 1, { shouldValidate: true });
                }}
              >
                <option value="ALL">全部状态</option>
                <option value="PARSING">解析中</option>
                <option value="READY">解析完成</option>
                <option value="FAILED">解析失败</option>
              </select>

              <select
                className={inputClassName(false)}
                value={String(listFilters.pageSize)}
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

            {docsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-14 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                正在加载文档列表...
              </div>
            ) : docs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
                暂无匹配文档
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    deleting={deleteMutation.isPending}
                    exporting={exportingDocId === doc.id}
                    onDelete={async () => {
                      const confirmed = window.confirm(`确认删除文档「${doc.fileName}」吗？`);
                      if (!confirmed) return;
                      await deleteMutation.mutateAsync(doc.id);
                    }}
                    onExportHeadings={() => handleExport(doc.id, "headings")}
                    onExportInterfaces={() => handleExport(doc.id, "interfaces")}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground">
              <span>
                第 {listFilters.page} / {totalPages} 页 · 共 {docsQuery.data?.total ?? 0} 条
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={listFilters.page <= 1}
                  onClick={() => filterForm.setValue("page", Math.max(1, listFilters.page - 1), { shouldValidate: true })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={listFilters.page >= totalPages}
                  onClick={() =>
                    filterForm.setValue("page", Math.min(totalPages, listFilters.page + 1), { shouldValidate: true })
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">迁移口径（本页）</h2>
          <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <p className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              保留 quiz 的“上传 docx 到解析状态再到详情与功能点联动”业务语义。
            </p>
            <p className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              首版把导出能力收敛为标题导出与接口台账导出，不引入无边界扩展。
            </p>
            <p className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              解析失败会显式暴露错误原因，避免旧版静默失败难排查问题。
            </p>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            模拟数据层：localStorage（后续可替换为真实后端 API + Drizzle 持久化）
          </div>
        </section>
      </div>
    </main>
  );
}
