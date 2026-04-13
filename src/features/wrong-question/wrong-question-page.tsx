"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BrainCircuit,
  ExternalLink,
  FileImage,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  wrongQuestionFilterSchema,
  wrongQuestionFormSchema,
  type WrongQuestionFilterInput,
  type WrongQuestionFilterValues,
  type WrongQuestionFormInput,
  type WrongQuestionFormValues,
} from "@/features/wrong-question/schema";
import {
  createWrongQuestion,
  deleteWrongQuestion,
  listWrongQuestionCategories,
  listWrongQuestionOcrModels,
  listWrongQuestionSubjects,
  listWrongQuestions,
  recognizeWrongQuestionImage,
  removeUploadedWrongQuestionImage,
  updateWrongQuestion,
  uploadWrongQuestionImage,
} from "@/features/wrong-question/mock-service";
import { DIFFICULTY_OPTIONS, QUESTION_TYPE_OPTIONS, type WrongQuestionCategory, type WrongQuestionImageMeta, type WrongQuestionMutationInput, type WrongQuestionRecord } from "@/features/wrong-question/types";

const pageSizeOptions = [5, 10, 20] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;
type OcrApplyMode = "append" | "replace";

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

function getTypeLabel(value?: string) {
  return QUESTION_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value ?? "-";
}

function getDifficultyLabel(value?: string) {
  return DIFFICULTY_OPTIONS.find((item) => item.value === value)?.label ?? value ?? "-";
}

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function previewContent(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
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

function WrongQuestionDialog({
  open,
  record,
  categories,
  pending,
  models,
  onClose,
  onSubjectChange,
  onSubmit,
}: {
  open: boolean;
  record: WrongQuestionRecord | null;
  categories: WrongQuestionCategory[];
  pending: boolean;
  models: { id: string; name: string; isDefault?: boolean }[];
  onClose: () => void;
  onSubjectChange: (subjectId?: string) => void;
  onSubmit: (payload: WrongQuestionMutationInput) => Promise<void>;
}) {
  const form = useForm<WrongQuestionFormInput, undefined, WrongQuestionFormValues>({
    resolver: zodResolver(wrongQuestionFormSchema),
    defaultValues: {
      subjectId: record?.subjectId ?? "",
      categoryId: record?.categoryId ?? "",
      type: record?.type ?? "SINGLE",
      difficulty: record?.difficulty ?? undefined,
      content: record?.content ?? "",
      answer: record?.answer ?? "",
      remark: record?.remark ?? "",
    },
  });

  const [uploadMeta, setUploadMeta] = useState<WrongQuestionImageMeta | null>(
    record?.originalImageFileId
      ? {
          id: record.originalImageFileId,
          originalName: record.originalImageName ?? "已上传原图",
          url: record.originalImageUrl ?? "",
          uploadedAt: record.updateDate,
          size: 0,
        }
      : null,
  );
  const [ocrText, setOcrText] = useState(record?.ocrText ?? "");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models.find((item) => item.isDefault)?.name ?? models[0]?.name ?? "");
  const [unsavedUploadHint, setUnsavedUploadHint] = useState(false);
  const [ocrApplyMode, setOcrApplyMode] = useState<OcrApplyMode>("append");

  useEffect(() => {
    if (!open) return;
    form.reset({
      subjectId: record?.subjectId ?? "",
      categoryId: record?.categoryId ?? "",
      type: record?.type ?? "SINGLE",
      difficulty: record?.difficulty ?? undefined,
      content: record?.content ?? "",
      answer: record?.answer ?? "",
      remark: record?.remark ?? "",
    });
    setUploadMeta(
      record?.originalImageFileId
        ? {
            id: record.originalImageFileId,
            originalName: record.originalImageName ?? "已上传原图",
            url: record.originalImageUrl ?? "",
            uploadedAt: record.updateDate,
            size: 0,
          }
        : null,
    );
    setOcrText(record?.ocrText ?? "");
    setSelectedModel(models.find((item) => item.isDefault)?.name ?? models[0]?.name ?? "");
    setUnsavedUploadHint(false);
    setOcrApplyMode("append");
  }, [open, record, form, models]);

  if (!open) return null;

  async function handleFileSelect(file: File) {
    const meta = await uploadWrongQuestionImage(file);
    setUploadMeta(meta);
    setUnsavedUploadHint(true);
    setOcrLoading(true);
    setOcrText("");

    let collected = "";
    try {
      collected = await recognizeWrongQuestionImage(file, selectedModel, (chunk) => {
        collected += chunk;
        setOcrText(collected);
      });

      const currentContent = form.getValues("content").trim();
      if (!currentContent) {
        form.setValue("content", collected.trim(), { shouldValidate: true, shouldDirty: true });
      } else if (ocrApplyMode === "replace") {
        form.setValue("content", collected.trim(), { shouldValidate: true, shouldDirty: true });
      } else {
        form.setValue("content", `${currentContent}\n\n${collected.trim()}`.trim(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    } finally {
      setOcrLoading(false);
    }
  }

  async function cleanupUnsavedUpload() {
    if (unsavedUploadHint && uploadMeta?.id && uploadMeta.id !== record?.originalImageFileId) {
      await removeUploadedWrongQuestionImage(uploadMeta.id);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{record ? "编辑错题" : "新增错题"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            按“当前用户自己的错题沉淀台账”重构，保留图片留档与 OCR 辅助录入，但避免旧版的粗暴覆盖策略。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              subjectId: values.subjectId,
              categoryId: values.categoryId,
              type: values.type,
              difficulty: values.difficulty,
              content: values.content,
              answer: values.answer,
              remark: values.remark,
              originalImageFileId: uploadMeta?.id,
              originalImageName: uploadMeta?.originalName,
              originalImageUrl: uploadMeta?.url,
              ocrText,
            });
            setUnsavedUploadHint(false);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">学科</label>
            <select
              className={inputClassName(Boolean(form.formState.errors.subjectId?.message))}
              {...form.register("subjectId")}
              onChange={(event) => {
                form.setValue("subjectId", event.target.value, { shouldDirty: true, shouldValidate: true });
                form.setValue("categoryId", undefined, { shouldDirty: true });
                onSubjectChange(event.target.value || undefined);
              }}
            >
              <option value="">请选择学科</option>
              <option value="subject-math">数学</option>
              <option value="subject-english">英语</option>
              <option value="subject-programming">编程</option>
            </select>
            <FieldError message={form.formState.errors.subjectId?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">分类</label>
            <select className={inputClassName(Boolean(form.formState.errors.categoryId?.message))} {...form.register("categoryId")}>
              <option value="">不指定分类</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.categoryId?.message as string | undefined} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">题型</label>
            <select className={inputClassName(Boolean(form.formState.errors.type?.message))} {...form.register("type")}>
              {QUESTION_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.type?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">难度</label>
            <select className={inputClassName(Boolean(form.formState.errors.difficulty?.message))} {...form.register("difficulty")}>
              <option value="">不指定难度</option>
              {DIFFICULTY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.difficulty?.message as string | undefined} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">题目内容</label>
            <textarea
              rows={6}
              className={inputClassName(Boolean(form.formState.errors.content?.message))}
              placeholder="请输入错题内容；若先上传图片，识别文本会按当前策略回填。"
              {...form.register("content")}
            />
            <FieldError message={form.formState.errors.content?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">答案</label>
            <textarea rows={4} className={inputClassName(Boolean(form.formState.errors.answer?.message))} {...form.register("answer")} />
            <FieldError message={form.formState.errors.answer?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">解析 / 备注</label>
            <textarea rows={4} className={inputClassName(Boolean(form.formState.errors.remark?.message))} {...form.register("remark")} />
            <FieldError message={form.formState.errors.remark?.message} />
          </div>

          <div className="md:col-span-2 rounded-3xl border border-border bg-muted/40 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-base font-semibold">原图留档与 OCR 辅助录入</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  修正旧实现的一个问题：上传成功但未保存时，页面会明确提示“当前图片尚未归档到错题记录”。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[220px_160px]">
                <select className={inputClassName(false)} value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
                  {models.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select className={inputClassName(false)} value={ocrApplyMode} onChange={(event) => setOcrApplyMode(event.target.value as OcrApplyMode)}>
                  <option value="append">已有内容时追加</option>
                  <option value="replace">已有内容时覆盖</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
                <Upload className="h-4 w-4" />
                上传图片并识别
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await handleFileSelect(file);
                    event.target.value = "";
                  }}
                />
              </label>
              {uploadMeta ? (
                <button
                  type="button"
                  className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                  onClick={async () => {
                    await cleanupUnsavedUpload();
                    setUploadMeta(null);
                    setOcrText("");
                    setUnsavedUploadHint(false);
                  }}
                >
                  清空图片与识别结果
                </button>
              ) : null}
            </div>

            {unsavedUploadHint ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                当前图片已上传到暂存区，但还没有随表单保存到错题记录；如果直接取消，将尝试清理本次未归档图片。
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-border bg-background p-3">
                {uploadMeta?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploadMeta.url} alt={uploadMeta.originalName} className="h-64 w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                    暂无原图
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {uploadMeta ? `文件：${uploadMeta.originalName}` : "支持截图/拍照题目上传"}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BrainCircuit className="h-4 w-4" />
                  OCR 识别结果
                </div>
                <div className="mt-3 min-h-64 whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">
                  {ocrLoading ? (
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      正在流式识别，请稍候...
                    </span>
                  ) : ocrText ? (
                    ocrText
                  ) : (
                    "上传图片后会在这里展示识别文本；当题目内容为空时，系统会自动回填，否则按你选择的策略追加或覆盖。"
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              onClick={async () => {
                await cleanupUnsavedUpload();
                onClose();
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending || ocrLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(pending || ocrLoading) && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {record ? "保存修改" : "创建错题"}
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
  record: WrongQuestionRecord | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除错题</h2>
          <p className="mt-1 text-sm text-muted-foreground">保留 quiz 的删除语义，但明确展示删除目标，避免误删。</p>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="rounded-2xl border border-border bg-muted/50 p-4">
            <p className="font-medium">{previewContent(record.content)}</p>
            <p className="mt-2 text-muted-foreground">{record.subjectName} / {record.categoryName || "未分类"}</p>
          </div>
          <p className="text-muted-foreground">删除后将仅影响当前用户自己的错题记录，不会影响其他用户。</p>
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

export function WrongQuestionPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [filters, setFilters] = useState<WrongQuestionFilterValues>(wrongQuestionFilterSchema.parse({}));
  const [editingRecord, setEditingRecord] = useState<WrongQuestionRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<WrongQuestionRecord | null>(null);
  const [categorySubjectId, setCategorySubjectId] = useState<string | undefined>(undefined);

  const filterForm = useForm<WrongQuestionFilterInput, undefined, WrongQuestionFilterValues>({
    resolver: zodResolver(wrongQuestionFilterSchema),
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

  const subjectsQuery = useQuery({
    queryKey: queryKeys.wrongQuestions.meta.subjects,
    queryFn: listWrongQuestionSubjects,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.wrongQuestions.meta.categories(categorySubjectId ?? ""),
    queryFn: () => listWrongQuestionCategories(categorySubjectId),
    enabled: Boolean(categorySubjectId),
  });

  const modelsQuery = useQuery({
    queryKey: queryKeys.wrongQuestions.meta.ocrModels,
    queryFn: listWrongQuestionOcrModels,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.wrongQuestions.list(filters),
    queryFn: () => listWrongQuestions(filters),
  });

  const createMutation = useMutation({
    mutationFn: createWrongQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wrongQuestions.all });
      setFeedback({ type: "success", message: "错题已创建。" });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: WrongQuestionMutationInput) => {
      if (!editingRecord) throw new Error("缺少待编辑错题");
      return updateWrongQuestion(editingRecord.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wrongQuestions.all });
      setFeedback({ type: "success", message: "错题已更新。" });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRecord) throw new Error("缺少待删除错题");
      return deleteWrongQuestion(deletingRecord.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wrongQuestions.all });
      setFeedback({ type: "success", message: "错题已删除。" });
      setDeletingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败" });
    },
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));
  const currentCategories = categorySubjectId ? categoriesQuery.data ?? [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                nquiz 迁移 · 个人错题台账
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">WrongQuestion</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  把 quiz 旧版“错题本”重构为更清晰的个人工作台：保留筛选、增删改、原图留档、OCR 辅助录入，但明确“仅当前用户自己的错题”语义。
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
                  setCategorySubjectId(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新增错题
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="我的错题" value={String(listQuery.data?.summary.total ?? 0)} hint="只统计当前用户自己的错题记录。" />
          <StatCard label="含原图" value={String(listQuery.data?.summary.withImage ?? 0)} hint="用于保留错题截图或拍照原始证据。" />
          <StatCard label="含 OCR" value={String(listQuery.data?.summary.withOcr ?? 0)} hint="已完成识别并保留识别文本的记录数。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form
            className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_1.2fr_auto] lg:items-end"
            onSubmit={filterForm.handleSubmit((values) => setFilters({ ...values, page: 1 }))}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">学科</label>
              <select
                className={inputClassName(Boolean(filterForm.formState.errors.subjectId?.message))}
                {...filterForm.register("subjectId")}
                onChange={(event) => {
                  const subjectId = event.target.value;
                  filterForm.setValue("subjectId", subjectId, { shouldDirty: true, shouldValidate: true });
                  filterForm.setValue("categoryId", "", { shouldDirty: true });
                }}
              >
                <option value="">全部学科</option>
                {(subjectsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">分类</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.categoryId?.message))} {...filterForm.register("categoryId")}>
                <option value="">全部分类</option>
                {(filterForm.watch("subjectId") ? (subjectsQuery.data ? currentCategories.length ? currentCategories : [] : []) : [])
                  .concat([])
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">题型</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.type?.message))} {...filterForm.register("type")}>
                <option value="">全部题型</option>
                {QUESTION_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">难度</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.difficulty?.message))} {...filterForm.register("difficulty")}>
                <option value="">全部难度</option>
                {DIFFICULTY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">题干关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")} placeholder="按题干 / 备注 / OCR 搜索" {...filterForm.register("keyword")} />
              </div>
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
                  const defaults = wrongQuestionFilterSchema.parse({});
                  filterForm.reset(defaults);
                  setFilters(defaults);
                }}
              >
                重置
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold">错题列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">保留旧系统主链路，但把内容预览、图片状态、OCR 状态和删除确认做得更清晰。</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>每页</span>
              <select
                className="rounded-xl border border-border bg-background px-2 py-1.5"
                value={filters.pageSize}
                onChange={(event) => setFilters((prev) => ({ ...prev, page: 1, pageSize: Number(event.target.value) as 5 | 10 | 20 }))}
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
              正在加载错题列表...
            </div>
          ) : listQuery.isError ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium text-foreground">列表加载失败</p>
                <p className="mt-1">请稍后重试。</p>
              </div>
              <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={() => listQuery.refetch()}>
                重新加载
              </button>
            </div>
          ) : (listQuery.data?.items.length ?? 0) === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <Search className="h-8 w-8" />
              <div>
                <p className="font-medium text-foreground">当前没有匹配的错题</p>
                <p className="mt-1">可以调整筛选，或直接新增一条个人错题记录。</p>
              </div>
              <button
                type="button"
                className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background"
                onClick={() => {
                  setEditingRecord(null);
                  setCategorySubjectId(undefined);
                  setDialogOpen(true);
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
                      <th className="px-6 py-4 font-medium">题干</th>
                      <th className="px-6 py-4 font-medium">学科 / 分类</th>
                      <th className="px-6 py-4 font-medium">题型 / 难度</th>
                      <th className="px-6 py-4 font-medium">原图 / OCR</th>
                      <th className="px-6 py-4 font-medium">更新时间</th>
                      <th className="px-6 py-4 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {listQuery.data?.items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="max-w-xl px-6 py-5">
                          <div className="font-medium leading-7">{previewContent(item.content)}</div>
                          {item.remark ? <div className="mt-2 text-xs text-muted-foreground">备注：{previewContent(item.remark)}</div> : null}
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">
                          <p className="font-medium text-foreground">{item.subjectName}</p>
                          <p className="mt-2">{item.categoryName || "未分类"}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{getTypeLabel(item.type)}</span>
                            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">{getDifficultyLabel(item.difficulty)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium">
                              <FileImage className="h-4 w-4" />
                              {item.originalImageUrl ? "已留档原图" : "无原图"}
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium">
                              <BrainCircuit className="h-4 w-4" />
                              {item.ocrText ? "已保存 OCR" : "无 OCR"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">{formatDateTime(item.updateDate || item.createDate)}</td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => {
                                setEditingRecord(item);
                                setCategorySubjectId(item.subjectId);
                                setDialogOpen(true);
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
                    className="rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={filters.page >= totalPages}
                    className="rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-[32px] border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          <h3 className="text-base font-semibold text-foreground">迁移说明</h3>
          <ul className="mt-4 space-y-2 leading-7">
            <li>• 保留 quiz 旧版核心能力：个人错题列表、筛选、增删改、原图留档、OCR 识别回填。</li>
            <li>• 明确“当前用户自己的错题”语义，不把它误迁成全局题库后台。</li>
            <li>• 首版仍使用本地 mock 数据层形成闭环，真实后端 / 文件服务 / OCR SSE 代理待后续接入。</li>
          </ul>
        </section>
      </div>

      <WrongQuestionDialog
        open={dialogOpen}
        record={editingRecord}
        categories={currentCategories}
        pending={createMutation.isPending || updateMutation.isPending}
        models={modelsQuery.data ?? []}
        onClose={() => {
          setDialogOpen(false);
          setEditingRecord(null);
          setCategorySubjectId(undefined);
        }}
        onSubjectChange={setCategorySubjectId}
        onSubmit={async (payload) => {
          if (editingRecord) {
            await updateMutation.mutateAsync(payload);
          } else {
            await createMutation.mutateAsync(payload);
          }
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
