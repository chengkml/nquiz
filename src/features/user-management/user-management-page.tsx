"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  PencilLine,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  assignRolesSchema,
  createUserSchema,
  resetUserPasswordSchema,
  updateUserSchema,
  userManagementFilterSchema,
  type AssignRolesValues,
  type CreateUserInput,
  type CreateUserValues,
  type ResetUserPasswordValues,
  type UpdateUserInput,
  type UpdateUserValues,
  type UserManagementFilterInput,
  type UserManagementFilterValues,
} from "@/features/user-management/schema";
import {
  createUser,
  deleteUser,
  listAssignableRoles,
  listUsers,
  replaceUserRoles,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "@/features/user-management/mock-service";
import type { UserListItem, UserManagementFilters, UserRoleOption, UserStatus } from "@/features/user-management/types";

const pageSizeOptions = [5, 10, 20] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;

type DialogState =
  | { type: "create" }
  | { type: "edit"; record: UserListItem }
  | { type: "reset-password"; record: UserListItem }
  | { type: "assign-roles"; record: UserListItem }
  | { type: "confirm-delete"; record: UserListItem }
  | { type: "confirm-status"; record: UserListItem; nextStatus: UserStatus };

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

function getStatusBadgeClass(status: UserStatus) {
  return status === "ENABLED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  return (
    <div
      className={cn(
        "mb-2 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
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

function buildRoleSummary(roles: UserRoleOption[]) {
  if (roles.length === 0) {
    return "未分配角色";
  }
  return roles.map((role) => role.name).join("、");
}

function UserFormDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: UserListItem;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: CreateUserValues | UpdateUserValues) => Promise<void>;
}) {
  const isEdit = Boolean(record);
  const form = useForm<CreateUserInput | UpdateUserInput, undefined, CreateUserValues | UpdateUserValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: isEdit
      ? {
          userId: record?.userId ?? "",
          userName: record?.userName ?? "",
          email: record?.email ?? "",
          phone: record?.phone ?? "",
          logo: record?.logo ?? "",
        }
      : {
          userId: "",
          userName: "",
          password: "",
          email: "",
          phone: "",
          logo: "",
        },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      isEdit
        ? {
            userId: record?.userId ?? "",
            userName: record?.userName ?? "",
            email: record?.email ?? "",
            phone: record?.phone ?? "",
            logo: record?.logo ?? "",
          }
        : {
            userId: "",
            userName: "",
            password: "",
            email: "",
            phone: "",
            logo: "",
          },
    );
  }, [open, isEdit, record, form]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? "编辑用户" : "新增用户"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保留 quiz 原有“新增 / 编辑基础资料”主链路，但把资料编辑与敏感操作彻底分流。
          </p>
        </div>
        <form className="grid gap-4 px-6 py-5 md:grid-cols-2" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div>
            <label className="mb-2 block text-sm font-medium">用户 ID</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.userId?.message))}
              disabled={isEdit}
              placeholder="例如 admin / teacher.demo"
              {...form.register("userId")}
            />
            <p className="mt-1 text-xs text-muted-foreground">编辑态只读，避免误改账号主键。</p>
            <FieldError message={form.formState.errors.userId?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">用户姓名</label>
            <input className={inputClassName(Boolean(form.formState.errors.userName?.message))} {...form.register("userName")} />
            <FieldError message={form.formState.errors.userName?.message} />
          </div>

          {!isEdit ? (
            <div>
              <label className="mb-2 block text-sm font-medium">初始密码</label>
              <input
                type="password"
                className={inputClassName(Boolean("password" in form.formState.errors && form.formState.errors.password?.message))}
                placeholder="至少 6 位"
                {...form.register("password" as "password")}
              />
              <FieldError message={"password" in form.formState.errors ? form.formState.errors.password?.message : undefined} />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              密码不在普通编辑流里修改；请使用独立的“管理员重置密码”动作。
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">邮箱</label>
            <input className={inputClassName(Boolean(form.formState.errors.email?.message))} {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">手机号</label>
            <input className={inputClassName(Boolean(form.formState.errors.phone?.message))} {...form.register("phone")} />
            <FieldError message={form.formState.errors.phone?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">头像 URL</label>
            <input className={inputClassName(Boolean(form.formState.errors.logo?.message))} {...form.register("logo")} />
            <FieldError message={form.formState.errors.logo?.message} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isEdit ? "保存修改" : "创建用户"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  open,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: UserListItem;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: ResetUserPasswordValues) => Promise<void>;
}) {
  const form = useForm<ResetUserPasswordValues>({
    resolver: zodResolver(resetUserPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ newPassword: "" });
  }, [open, form]);

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">管理员重置密码</h2>
          <p className="mt-1 text-sm text-muted-foreground">该流程与资料编辑分离，避免把敏感操作混在普通表单中。</p>
        </div>
        <form className="space-y-4 px-6 py-5" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm">
            <p>
              <span className="text-muted-foreground">目标用户：</span>
              <span className="font-medium">{record.userName}</span>
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{record.userId}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">新密码</label>
            <input type="password" className={inputClassName(Boolean(form.formState.errors.newPassword?.message))} {...form.register("newPassword")} />
            <FieldError message={form.formState.errors.newPassword?.message} />
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            nquiz 首版只保留管理员重置入口，不在页面中暴露任何密码哈希或旧密码信息。
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              确认重置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignRolesDialog({
  open,
  record,
  roles,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: UserListItem;
  roles: UserRoleOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: AssignRolesValues) => Promise<void>;
}) {
  const form = useForm<AssignRolesValues>({
    resolver: zodResolver(assignRolesSchema),
    defaultValues: { roleIds: [] },
  });

  useEffect(() => {
    if (!open || !record) return;
    form.reset({ roleIds: record.roles.map((role) => role.id) });
  }, [open, record, form]);

  const selectedIds = form.watch("roleIds");
  const beforeSummary = record ? buildRoleSummary(record.roles) : "-";
  const afterSummary = roles.filter((role) => selectedIds.includes(role.id)).map((role) => role.name).join("、") || "未分配角色";

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">分配角色</h2>
          <p className="mt-1 text-sm text-muted-foreground">保留 quiz 的 replace-all 语义，但明确展示变更前后摘要，降低误操作成本。</p>
        </div>
        <form className="space-y-4 px-6 py-5" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
          <div className="grid gap-4 rounded-2xl border border-border bg-muted/40 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">当前角色</p>
              <p className="mt-2 text-sm font-medium">{beforeSummary}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">保存后角色</p>
              <p className="mt-2 text-sm font-medium">{afterSummary}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((role) => {
              const checked = selectedIds.includes(role.id);
              return (
                <label key={role.id} className={cn("flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm transition", checked ? "border-foreground/20 bg-foreground/5" : "border-border hover:bg-muted/40") }>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked ? [...selectedIds, role.id] : selectedIds.filter((item) => item !== role.id);
                      form.setValue("roleIds", next, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", role.state === "ENABLED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-100 text-zinc-700") }>
                        {role.state === "ENABLED" ? "启用" : "停用"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{role.id}</div>
                    <p className="mt-2 text-xs text-muted-foreground">{role.descr || "无描述"}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <FieldError message={form.formState.errors.roleIds?.message} />

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              保存角色分配
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  pending,
  confirmText,
  confirmClassName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  pending: boolean;
  confirmText: string;
  confirmClassName?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-5">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
              confirmClassName ?? "bg-red-600",
            )}
            onClick={onConfirm}
          >
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [filters, setFilters] = useState<UserManagementFilters>(userManagementFilterSchema.parse({}));

  const filterForm = useForm<UserManagementFilterInput, undefined, UserManagementFilterValues>({
    resolver: zodResolver(userManagementFilterSchema),
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

  const rolesQuery = useQuery({
    queryKey: queryKeys.users.roles.active,
    queryFn: () => listAssignableRoles(),
  });

  const listQuery = useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => listUsers(filters),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateUserValues | UpdateUserValues) => createUser(values as CreateUserValues),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setFeedback({ type: "success", message: "用户创建成功。" });
      setDialog(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ record, values }: { record: UserListItem; values: CreateUserValues | UpdateUserValues }) => updateUser(record.id, values as UpdateUserValues),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setFeedback({ type: "success", message: "用户资料已更新。" });
      setDialog(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "更新失败" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ record, values }: { record: UserListItem; values: ResetUserPasswordValues }) => resetUserPassword(record.id, values.newPassword),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setFeedback({ type: "success", message: "密码已重置。" });
      setDialog(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "密码重置失败" });
    },
  });

  const assignRolesMutation = useMutation({
    mutationFn: ({ record, values }: { record: UserListItem; values: AssignRolesValues }) => replaceUserRoles(record.userId, values.roleIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setFeedback({ type: "success", message: "角色分配已保存。" });
      setDialog(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "角色分配失败" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (record: UserListItem) => deleteUser(record.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setFeedback({ type: "success", message: "用户已删除。" });
      setDialog(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "删除失败" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ record, nextStatus }: { record: UserListItem; nextStatus: UserStatus }) => updateUserStatus(record.id, nextStatus),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setFeedback({ type: "success", message: variables.nextStatus === "ENABLED" ? "用户已启用。" : "用户已禁用。" });
      setDialog(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "状态切换失败" });
    },
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));
  const assignableRoles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                nquiz 迁移 · 系统管理用户台账
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">UserManagement</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  迁移 quiz 的用户管理主链路：用户查询、新增、编辑、删除、管理员重置密码、分配角色；并把启用 / 禁用操作显性化，避免继续停留在旧版“只可筛选不可直管”的状态。
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
                onClick={() => setDialog({ type: "create" })}
              >
                <UserPlus className="h-4 w-4" />
                新增用户
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="用户总数" value={String(listQuery.data?.summary.totalUsers ?? 0)} hint="系统管理域里的基础账号台账。" />
          <StatCard label="已启用" value={String(listQuery.data?.summary.enabledUsers ?? 0)} hint="当前可正常登录和参与权限体系的账号。" />
          <StatCard label="已禁用" value={String(listQuery.data?.summary.disabledUsers ?? 0)} hint="保留账号但暂停使用，优先于直接物理删除。" />
          <StatCard label="已分配角色" value={String(listQuery.data?.summary.assignedUsers ?? 0)} hint="已进入角色-菜单权限体系的账号数。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_1fr_auto] lg:items-end" onSubmit={filterForm.handleSubmit((values) => setFilters({ ...values, page: 1 }))}>
            <div>
              <label className="mb-2 block text-sm font-medium">关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")} placeholder="按 userId / userName / 邮箱 / 手机号搜索" {...filterForm.register("keyword")} />
              </div>
              <FieldError message={filterForm.formState.errors.keyword?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.status?.message))} {...filterForm.register("status")}>
                <option value="ALL">全部状态</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">禁用</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">角色</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.roleId?.message))} {...filterForm.register("roleId")}>
                <option value="">全部角色</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90">
                <Search className="h-4 w-4" />
                搜索
              </button>
              <button
                type="button"
                className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                onClick={() => {
                  const defaults = userManagementFilterSchema.parse({});
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
              <h2 className="text-lg font-semibold">用户列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">首版工作台保留旧系统核心操作，但把角色摘要、状态和敏感动作分层做清楚。</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>每页</span>
              <select className="rounded-xl border border-border bg-background px-2 py-1.5" value={filters.pageSize} onChange={(event) => setFilters((prev) => ({ ...prev, page: 1, pageSize: Number(event.target.value) as 5 | 10 | 20 }))}>
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
              正在加载用户列表...
            </div>
          ) : listQuery.isError ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium text-foreground">用户列表加载失败</p>
                <p className="mt-1">请稍后重试。</p>
              </div>
              <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={() => listQuery.refetch()}>
                重新加载
              </button>
            </div>
          ) : (listQuery.data?.items.length ?? 0) === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <Users className="h-8 w-8" />
              <div>
                <p className="font-medium text-foreground">没有找到匹配的用户</p>
                <p className="mt-1">可调整筛选条件，或直接新增账号。</p>
              </div>
              <button type="button" className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background" onClick={() => setDialog({ type: "create" })}>
                立即新增
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">账号</th>
                      <th className="px-6 py-4 font-medium">联系方式</th>
                      <th className="px-6 py-4 font-medium">状态</th>
                      <th className="px-6 py-4 font-medium">角色</th>
                      <th className="px-6 py-4 font-medium">创建 / 最近变更</th>
                      <th className="px-6 py-4 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {listQuery.data?.items.map((item) => {
                      const nextStatus = item.state === "ENABLED" ? "DISABLED" : "ENABLED";
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="px-6 py-5">
                            <div className="flex items-start gap-3">
                              {item.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.logo} alt={item.userName} className="h-10 w-10 rounded-full border border-border object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                                  {item.userName.slice(0, 1)}
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{item.userName}</div>
                                <div className="mt-2 font-mono text-xs text-muted-foreground">{item.userId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-muted-foreground">
                            <p>{item.email || "未填写邮箱"}</p>
                            <p className="mt-2">{item.phone || "未填写手机号"}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStatusBadgeClass(item.state))}>
                              {item.state === "ENABLED" ? "启用" : "禁用"}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="max-w-xs text-sm text-muted-foreground">{buildRoleSummary(item.roles)}</div>
                          </td>
                          <td className="px-6 py-5 text-muted-foreground">
                            <p>创建：{formatDateTime(item.createDate)}</p>
                            <p className="mt-2">资料更新：{formatDateTime(item.updateDate)}</p>
                            <p className="mt-2">密码更新：{formatDateTime(item.passwordUpdatedAt)}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted" onClick={() => setDialog({ type: "edit", record: item })}>
                                <PencilLine className="h-4 w-4" />
                                编辑
                              </button>
                              <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted" onClick={() => setDialog({ type: "assign-roles", record: item })}>
                                <ShieldCheck className="h-4 w-4" />
                                分配角色
                              </button>
                              <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted" onClick={() => setDialog({ type: "reset-password", record: item })}>
                                <KeyRound className="h-4 w-4" />
                                重置密码
                              </button>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-medium transition",
                                  nextStatus === "DISABLED" ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                                )}
                                onClick={() => setDialog({ type: "confirm-status", record: item, nextStatus })}
                              >
                                <Power className="h-4 w-4" />
                                {nextStatus === "DISABLED" ? "禁用" : "启用"}
                              </button>
                              <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50" onClick={() => setDialog({ type: "confirm-delete", record: item })}>
                                <Trash2 className="h-4 w-4" />
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-border px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <p>
                  共 {listQuery.data?.total ?? 0} 条，当前第 {filters.page} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={filters.page <= 1} className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}>
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </button>
                  <button type="button" disabled={filters.page >= totalPages} className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}>
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
            <li>• 已覆盖旧 quiz 主链路：用户分页查询、新增、编辑、删除、管理员重置密码、分配角色。</li>
            <li>• 显式补强了账号启用 / 禁用操作，不再只把状态停留在筛选条件里。</li>
            <li>• 首版仍采用本地 mock 数据层闭环，尚未接真实认证 / 菜单 / 后端权限体系，也未向前端暴露任何 password 哈希字段。</li>
          </ul>
        </section>
      </div>

      <UserFormDialog
        open={dialog?.type === "create" || dialog?.type === "edit"}
        record={dialog?.type === "edit" ? dialog.record : undefined}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => setDialog(null)}
        onSubmit={async (values) => {
          if (dialog?.type === "edit") {
            await updateMutation.mutateAsync({ record: dialog.record, values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />

      <ResetPasswordDialog
        open={dialog?.type === "reset-password"}
        record={dialog?.type === "reset-password" ? dialog.record : undefined}
        pending={resetPasswordMutation.isPending}
        onClose={() => setDialog(null)}
        onSubmit={async (values) => {
          if (dialog?.type !== "reset-password") return;
          await resetPasswordMutation.mutateAsync({ record: dialog.record, values });
        }}
      />

      <AssignRolesDialog
        open={dialog?.type === "assign-roles"}
        record={dialog?.type === "assign-roles" ? dialog.record : undefined}
        roles={assignableRoles}
        pending={assignRolesMutation.isPending}
        onClose={() => setDialog(null)}
        onSubmit={async (values) => {
          if (dialog?.type !== "assign-roles") return;
          await assignRolesMutation.mutateAsync({ record: dialog.record, values });
        }}
      />

      <ConfirmDialog
        open={dialog?.type === "confirm-delete"}
        title="确认删除用户"
        description={dialog?.type === "confirm-delete" ? `确定删除用户“${dialog.record.userName}”吗？该首版仍保留 quiz 的物理删除语义。` : ""}
        pending={deleteMutation.isPending}
        confirmText="确认删除"
        confirmClassName="bg-red-600"
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.type !== "confirm-delete") return;
          await deleteMutation.mutateAsync(dialog.record);
        }}
      />

      <ConfirmDialog
        open={dialog?.type === "confirm-status"}
        title={dialog?.type === "confirm-status" && dialog.nextStatus === "DISABLED" ? "确认禁用用户" : "确认启用用户"}
        description={
          dialog?.type === "confirm-status"
            ? dialog.nextStatus === "DISABLED"
              ? `禁用后，用户“${dialog.record.userName}”将不再参与正常登录。`
              : `启用后，用户“${dialog.record.userName}”可重新参与系统登录与权限体系。`
            : ""
        }
        pending={statusMutation.isPending}
        confirmText={dialog?.type === "confirm-status" && dialog.nextStatus === "DISABLED" ? "确认禁用" : "确认启用"}
        confirmClassName={dialog?.type === "confirm-status" && dialog.nextStatus === "DISABLED" ? "bg-amber-600" : "bg-emerald-600"}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.type !== "confirm-status") return;
          await statusMutation.mutateAsync({ record: dialog.record, nextStatus: dialog.nextStatus });
        }}
      />
    </div>
  );
}
