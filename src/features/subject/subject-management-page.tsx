"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers3,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  subjectFilterSchema,
  subjectFormSchema,
  type SubjectFilterInput,
  type SubjectFilterValues,
  type SubjectFormInput,
  type SubjectFormValues,
} from "@/features/subject/schema";
import {
  checkSubjectNameUnique,
  createSubject,
  deleteSubject,
  listSubjectOptions,
  listSubjects,
  updateSubject,
} from "@/features/subject/mock-service";
import type { SubjectListItem, SubjectMutationInput } from "@/features/subject/types";

const pageSizeOptions = [6, 12, 24] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

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
        "mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
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

function normalizeMutationInput(values: SubjectFormValues): SubjectMutationInput {
  return {
    name: values.name.trim(),
    label: values.label.trim(),
    descr: values.descr?.trim() || "",
  };
}

function getFormDefaults(record?: SubjectListItem | null): SubjectFormValues {
  return {
    name: record?.name ?? "",
    label: record?.label ?? "",
    descr: record?.descr ?? "",
  };
}

function SubjectDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: SubjectListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: SubjectMutationInput) => Promise<void>;
}) {
  const form = useForm<SubjectFormInput, undefined, SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: getFormDefaults(record),
  });
  const [nameChecking, setNameChecking] = useState(false);

  const isEdit = Boolean(record);

  useEffect(() => {
    if (!open) return;
    form.reset(getFormDefaults(record));
  }, [open, record, form]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? "编辑学科" : "新增学科"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保留旧 quiz 的英文名规则与“当前用户域内唯一”语义，同时把表单、校验和交互职责拆清楚。
          </p>
        </div>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={form.handleSubmit(async (values) => {
            const payload = normalizeMutationInput(values);
            setNameChecking(true);
            try {
              if (!isEdit || payload.name !== record?.name) {
                const unique = await checkSubjectNameUnique(payload.name, record?.id);
                if (!unique) {
                  form.setError("name", { message: "该英文名称已存在" });
                  return;
                }
              }
            } finally {
              setNameChecking(false);
            }

            await onSubmit(payload);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">英文名称</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.name?.message))}
              placeholder="例如 math / english / programming"
              {...form.register("name")}
            />
            <p className="mt-1 text-xs text-muted-foreground">以字母开头，只允许字母、数字和下划线；在当前用户域内唯一。</p>
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">中文名称</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.label?.message))}
              placeholder="例如 数学 / 英语 / 编程"
              {...form.register("label")}
            />
            <FieldError message={form.formState.errors.label?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">描述</label>
            <textarea
              rows={5}
              className={inputClassName(Boolean(form.formState.errors.descr?.message))}
              placeholder="说明该学科的业务覆盖范围、知识组织方式或迁移约束"
              {...form.register("descr")}
            />
            <FieldError message={form.formState.errors.descr?.message as string | undefined} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                form.reset(getFormDefaults(record));
                onClose();
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending || nameChecking}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(pending || nameChecking) && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isEdit ? "保存修改" : "创建学科"}
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
  record: SubjectListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  const hasRelatedAssets = record.knowledgeNum > 0 || record.questionNum > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除学科</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            删除动作会影响下游模块的可选学科列表，因此首版在有知识点/题目沉淀时只允许阻断，不做静默级联删除。
          </p>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-muted-foreground">
          <div className="rounded-3xl border border-border bg-muted/40 p-4">
            <p className="font-medium text-foreground">{record.label}</p>
            <p className="mt-1 font-mono text-xs">{record.name}</p>
            <p className="mt-3">知识点数：{record.knowledgeNum}</p>
            <p className="mt-1">关联题目数：{record.questionNum}</p>
          </div>

          {hasRelatedAssets ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
              当前学科仍有关联资产。为避免破坏 Category / Knowledge / Question 等上游主数据语义，首版禁止删除。
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              该学科暂无关联知识点与题目，可以安全删除。
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            disabled={pending || hasRelatedAssets}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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

function SubjectCard({
  item,
  onEdit,
  onDelete,
}: {
  item: SubjectListItem;
  onEdit: (record: SubjectListItem) => void;
  onDelete: (record: SubjectListItem) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="flex h-full flex-col rounded-[28px] border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            {item.label}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground">
              {item.name}
            </span>
            <span>更新于 {formatDateTime(item.updateDate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-2xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => onEdit(item)}
            aria-label={`编辑 ${item.label}`}
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-2xl border border-border p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
            onClick={() => onDelete(item)}
            aria-label={`删除 ${item.label}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted-foreground">
        {item.descr || "暂无描述。建议补充学科定位、下游模块依赖或迁移边界说明。"}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">知识点</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{item.knowledgeNum}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">关联题目</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{item.questionNum}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">资产总量</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{item.totalAssets}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>创建人：{item.createUserName}</span>
        <span>创建时间：{formatDateTime(item.createDate)}</span>
      </div>
    </motion.article>
  );
}

export function SubjectManagementPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [filters, setFilters] = useState<SubjectFilterValues>({
    keyword: "",
    page: 1,
    pageSize: 6,
  });
  const [editingRecord, setEditingRecord] = useState<SubjectListItem | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<SubjectListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filterForm = useForm<SubjectFilterInput, undefined, SubjectFilterValues>({
    resolver: zodResolver(subjectFilterSchema),
    defaultValues: filters,
  });

  const subjectListQuery = useQuery({
    queryKey: queryKeys.subjects.list(filters),
    queryFn: () => listSubjects(filters),
  });

  useQuery({
    queryKey: queryKeys.subjects.options,
    queryFn: listSubjectOptions,
  });

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      setFeedback({ type: "success", message: "学科创建成功。" });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建学科失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubjectMutationInput }) => updateSubject(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      setFeedback({ type: "success", message: "学科更新成功。" });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新学科失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      setFeedback({ type: "success", message: "学科删除成功。" });
      setDeletingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除学科失败" });
    },
  });

  const totalPages = useMemo(() => {
    const total = subjectListQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / filters.pageSize));
  }, [subjectListQuery.data?.total, filters.pageSize]);

  const summary = subjectListQuery.data?.summary;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-border bg-background p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Link>
              <div className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                SubjectManagement · nquiz 迁移首版
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">学科管理</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  按 quiz 的基础主数据语义重构：保留当前用户域内唯一的英文名规则、列表 CRUD 和下游可复用的学科列表能力，
                  同时补上知识点 / 题目聚合信息，不继续沿用旧页“搜索字段和后端条件错位”的历史包袱。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                onClick={() => subjectListQuery.refetch()}
              >
                <Search className="h-4 w-4" />
                刷新列表
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
                onClick={() => {
                  setEditingRecord(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                新增学科
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="当前用户学科数"
            value={String(summary?.totalSubjects ?? 0)}
            hint="维持与旧系统一致的用户隔离语义，不提升为全局主数据。"
          />
          <StatCard
            label="知识点总量"
            value={String(summary?.totalKnowledge ?? 0)}
            hint="复用旧后端已存在的 subject -> knowledge 聚合语义。"
          />
          <StatCard
            label="关联题目总量"
            value={String(summary?.totalQuestions ?? 0)}
            hint="明确这是通过知识点关联归集的题目数，不是裸题直接挂学科。"
          />
        </section>

        <section className="rounded-[32px] border border-border bg-background p-6 shadow-sm">
          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
            onSubmit={filterForm.handleSubmit((values) => {
              setFilters({ ...values, page: 1 });
            })}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-10")}
                  placeholder="同时匹配英文名 / 中文名 / 描述"
                  {...filterForm.register("keyword")}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">首版显式收敛为一个统一关键词，确保前后端过滤字段一致。</p>
              <FieldError message={filterForm.formState.errors.keyword?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">每页条数</label>
              <select
                className={inputClassName(false)}
                {...filterForm.register("pageSize", {
                  setValueAs: (value) => Number(value),
                })}
              >
                {pageSizeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item} 条 / 页
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">下游复用提示</p>
              <p className="mt-1">已同步准备学科 options 查询键，后续 Category / Knowledge / Question 可直接复用。</p>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="button"
                className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                onClick={() => {
                  const next = { keyword: "", page: 1, pageSize: filters.pageSize };
                  filterForm.reset(next);
                  setFilters(next);
                }}
              >
                重置
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                查询
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[32px] border border-border bg-background p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">学科列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                当前共 {subjectListQuery.data?.total ?? 0} 条匹配记录，首版保持卡片视图，优先强化主数据阅读和操作清晰度。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                <BookOpen className="h-3.5 w-3.5" /> 关联知识点统计
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                <Layers3 className="h-3.5 w-3.5" /> 下游菜单复用主数据
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                <Database className="h-3.5 w-3.5" /> 当前为 mock 闭环
              </span>
            </div>
          </div>

          {subjectListQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              正在加载学科列表...
            </div>
          ) : subjectListQuery.data && subjectListQuery.data.items.length > 0 ? (
            <>
              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {subjectListQuery.data.items.map((item) => (
                  <SubjectCard
                    key={item.id}
                    item={item}
                    onEdit={(record) => {
                      setEditingRecord(record);
                      setDialogOpen(true);
                    }}
                    onDelete={(record) => setDeletingRecord(record)}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  第 {filters.page} / {totalPages} 页 · 共 {subjectListQuery.data.total} 条
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={filters.page <= 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" /> 上一页
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={filters.page >= totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    下一页 <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border px-6 py-18 text-center text-sm text-muted-foreground">
              当前没有匹配的学科记录。你可以直接新增一个学科，或调整关键词重新搜索。
            </div>
          )}
        </section>
      </div>

      <SubjectDialog
        open={dialogOpen}
        record={editingRecord}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setDialogOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={async (payload) => {
          if (editingRecord) {
            await updateMutation.mutateAsync({ id: editingRecord.id, payload });
            return;
          }
          await createMutation.mutateAsync(payload);
        }}
      />

      <DeleteDialog
        open={Boolean(deletingRecord)}
        record={deletingRecord}
        pending={deleteMutation.isPending}
        onClose={() => setDeletingRecord(null)}
        onConfirm={async () => {
          if (!deletingRecord) return;
          await deleteMutation.mutateAsync(deletingRecord.id);
        }}
      />
    </div>
  );
}
