"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  Shield,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";
import {
  roleFilterSchema,
  roleFormSchema,
  type RoleFilterInput,
  type RoleFilterValues,
  type RoleFormInput,
  type RoleFormValues,
} from "@/features/role/schema";
import {
  createRole,
  deleteRole,
  getRolePermissionSnapshot,
  listRoleMenuTree,
  listRoles,
  replaceRoleMenus,
  setRoleState,
  updateRole,
} from "@/features/role/mock-service";
import type { RoleFilters, RoleMenuNode, RoleMutationInput, RoleRecord } from "@/features/role/types";

const pageSizeOptions = [5, 10, 20];

type FeedbackState = { type: "success" | "error"; message: string } | null;

function parseFilters(searchParams: URLSearchParams): RoleFilters {
  return roleFilterSchema.parse({
    keyword: searchParams.get("keyword") ?? "",
    state: searchParams.get("state") ?? "ALL",
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 10,
  });
}

function buildSearchParams(filters: RoleFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.state !== "ALL") params.set("state", filters.state);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getFormDefaults(record?: RoleRecord | null): RoleFormValues {
  return {
    roleCode: record?.roleCode ?? "",
    roleName: record?.roleName ?? "",
    roleDescr: record?.roleDescr ?? "",
    state: record?.state ?? "ENABLED",
  };
}

function normalizeMutationInput(values: RoleFormValues): RoleMutationInput {
  return {
    roleCode: values.roleCode.trim(),
    roleName: values.roleName.trim(),
    roleDescr: values.roleDescr?.trim() || undefined,
    state: values.state,
  };
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
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{feedback.message}</div>
      <button type="button" className="cursor-pointer text-xs opacity-80" onClick={onClose}>
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
      transition={{ duration: 0.24 }}
      className="rounded-3xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function getRoleStateBadgeClass(state: RoleRecord["state"]) {
  return state === "ENABLED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function collectDescendantIds(node: RoleMenuNode): string[] {
  const result = [node.id];
  node.children.forEach((child) => {
    result.push(...collectDescendantIds(child));
  });
  return result;
}

function countAssignedTree(nodes: RoleMenuNode[], assignedIds: string[]) {
  const assigned = new Set(assignedIds);
  let count = 0;
  const walk = (items: RoleMenuNode[]) => {
    items.forEach((item) => {
      if (assigned.has(item.id)) {
        count += 1;
      }
      if (item.children.length) walk(item.children);
    });
  };
  walk(nodes);
  return count;
}

function RoleDialog({
  open,
  mode,
  record,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  record?: RoleRecord | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) {
  const form = useForm<RoleFormInput, undefined, RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: getFormDefaults(record),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(getFormDefaults(record));
  }, [form, open, record]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">{mode === "create" ? "新增角色" : "编辑角色"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            首版明确区分内部主键与业务编码：用户维护的是稳定 roleCode，而不是数据库主键。
          </p>
        </div>
        <form
          className="grid gap-4 px-6 py-5 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">角色编码</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.roleCode?.message))}
              placeholder="例如 sys_mgr / content_editor"
              disabled={mode === "edit"}
              {...form.register("roleCode")}
            />
            <p className="mt-1 text-xs text-muted-foreground">稳定业务编码，编辑态只读，避免再次混淆主键语义。</p>
            <FieldError message={form.formState.errors.roleCode?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">角色名称</label>
            <input
              className={inputClassName(Boolean(form.formState.errors.roleName?.message))}
              placeholder="请输入展示名称"
              {...form.register("roleName")}
            />
            <FieldError message={form.formState.errors.roleName?.message} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">状态</label>
            <select className={inputClassName(Boolean(form.formState.errors.state?.message))} {...form.register("state")}>
              <option value="ENABLED">启用</option>
              <option value="DISABLED">禁用</option>
            </select>
            <FieldError message={form.formState.errors.state?.message} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">角色描述</label>
            <textarea
              className={inputClassName(Boolean(form.formState.errors.roleDescr?.message))}
              rows={4}
              placeholder="说明该角色的职责边界、适用用户或权限范围"
              {...form.register("roleDescr")}
            />
            <FieldError message={form.formState.errors.roleDescr?.message} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "创建角色" : "保存修改"}
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
  record?: RoleRecord | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">确认删除角色</h2>
          <p className="mt-1 text-sm text-muted-foreground">首版直接补强删除安全性：若仍绑定用户，则阻止删除。</p>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="rounded-2xl border border-border bg-muted/50 p-4">
            <p>
              <span className="text-muted-foreground">角色名称：</span>
              <span className="font-medium">{record.roleName}</span>
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">角色编码：</span>
              <span className="font-mono text-xs">{record.roleCode}</span>
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">绑定用户数：</span>
              <span className="font-medium">{record.boundUserCount}</span>
            </p>
          </div>
          <p className="text-muted-foreground">若角色已被用户引用，不允许继续删除，避免权限域对象被误清空。</p>
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

function PermissionTree({
  nodes,
  selected,
  onToggle,
}: {
  nodes: RoleMenuNode[];
  selected: Set<string>;
  onToggle: (node: RoleMenuNode, checked: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {nodes.map((node) => (
        <PermissionNode key={node.id} node={node} selected={selected} onToggle={onToggle} level={0} />
      ))}
    </div>
  );
}

function PermissionNode({
  node,
  selected,
  onToggle,
  level,
}: {
  node: RoleMenuNode;
  selected: Set<string>;
  onToggle: (node: RoleMenuNode, checked: boolean) => void;
  level: number;
}) {
  const checked = selected.has(node.id);
  const typeLabel = node.type === "DIRECTORY" ? "目录" : node.type === "MENU" ? "菜单" : "按钮";

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          checked={checked}
          onChange={(event) => onToggle(node, event.target.checked)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{node.label}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{typeLabel}</span>
            {node.path ? <span className="font-mono text-[11px] text-muted-foreground">{node.path}</span> : null}
            {node.permissionKey ? (
              <span className="font-mono text-[11px] text-muted-foreground">{node.permissionKey}</span>
            ) : null}
          </div>
          {node.children.length ? (
            <div className="mt-3 space-y-3 border-l border-dashed border-border pl-4">
              {node.children.map((child) => (
                <PermissionNode key={child.id} node={child} selected={selected} onToggle={onToggle} level={level + 1} />
              ))}
            </div>
          ) : null}
        </div>
      </label>
    </div>
  );
}

function PermissionDialog({
  open,
  role,
  pending,
  menuTree,
  initialAssignedIds,
  assignedLabels,
  onClose,
  onSubmit,
}: {
  open: boolean;
  role?: RoleRecord | null;
  pending: boolean;
  menuTree: RoleMenuNode[];
  initialAssignedIds: string[];
  assignedLabels: string[];
  onClose: () => void;
  onSubmit: (menuIds: string[]) => Promise<void>;
}) {
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[] | null>(null);

  if (!open || !role) return null;

  const selectedIds = draftSelectedIds ?? initialAssignedIds;
  const selected = new Set(selectedIds);

  const handleToggle = (node: RoleMenuNode, checked: boolean) => {
    const relatedIds = collectDescendantIds(node);
    setDraftSelectedIds((prev) => {
      const base = new Set(prev ?? initialAssignedIds);
      relatedIds.forEach((id) => {
        if (checked) base.add(id);
        else base.delete(id);
      });
      return Array.from(base);
    });
  };

  const totalAssigned = countAssignedTree(menuTree, selectedIds);
  const diffAdded = selectedIds.filter((id) => !initialAssignedIds.includes(id));
  const diffRemoved = initialAssignedIds.filter((id) => !selected.has(id));

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/45 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-4xl flex-col bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold">菜单授权 · {role.roleName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保留 quiz 的 replace-all 业务语义，但补充当前授权概览与变更差异感知。
          </p>
        </div>

        <div className="grid flex-1 gap-6 overflow-hidden px-6 py-5 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="min-h-0 overflow-y-auto pr-1">
            <PermissionTree nodes={menuTree} selected={selected} onToggle={handleToggle} />
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">授权摘要</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">已勾选节点</p>
                  <p className="mt-2 text-2xl font-semibold">{totalAssigned}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">新增变更</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">{diffAdded.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">移除变更</p>
                  <p className="mt-2 text-2xl font-semibold text-red-600">{diffRemoved.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">当前已授权</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {assignedLabels.length ? (
                  assignedLabels.map((label) => (
                    <span key={label} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">当前角色还没有分配菜单权限。</span>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">
              <p>• 首版未接真实用户影响分析接口，当前只提示绑定用户数，不做逐用户 diff。</p>
              <p className="mt-2">• 目录节点和菜单节点采用“勾选即包含后代”的简化规则，便于先形成闭环。</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-5">
          <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            onClick={async () => onSubmit(Array.from(selected))}
          >
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            保存菜单授权
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoleManagementPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filterForm = useForm<RoleFilterInput, undefined, RoleFilterValues>({
    resolver: zodResolver(roleFilterSchema),
    defaultValues: filters,
  });

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RoleRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<RoleRecord | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<RoleRecord | null>(null);

  useEffect(() => {
    filterForm.reset(filters);
  }, [filterForm, filters]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const listQuery = useQuery({
    queryKey: queryKeys.roles.list(filters),
    queryFn: () => listRoles(filters),
  });

  const menuTreeQuery = useQuery({
    queryKey: queryKeys.roles.menuTree,
    queryFn: listRoleMenuTree,
  });

  const permissionSnapshotQuery = useQuery({
    queryKey: queryKeys.roles.permissionSnapshot(permissionTarget?.id ?? ""),
    queryFn: () => getRolePermissionSnapshot(permissionTarget?.id ?? ""),
    enabled: Boolean(permissionTarget),
  });

  const createMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => createRole(normalizeMutationInput(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      setFeedback({ type: "success", message: "角色创建成功。" });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "角色创建失败。" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      if (!editingRecord) throw new Error("缺少待编辑角色");
      return updateRole(editingRecord.id, normalizeMutationInput(values));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      setFeedback({ type: "success", message: "角色更新成功。" });
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "角色更新失败。" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRecord) throw new Error("缺少待删除角色");
      return deleteRole(deletingRecord.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      setFeedback({ type: "success", message: "角色删除成功。" });
      setDeletingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "角色删除失败。" });
    },
  });

  const stateMutation = useMutation({
    mutationFn: async (payload: { roleId: string; state: RoleRecord["state"] }) => setRoleState(payload.roleId, payload.state),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      setFeedback({
        type: "success",
        message: variables.state === "ENABLED" ? "角色已启用。" : "角色已禁用。",
      });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "状态切换失败。" });
    },
  });

  const permissionMutation = useMutation({
    mutationFn: async (menuIds: string[]) => {
      if (!permissionTarget) throw new Error("缺少待授权角色");
      return replaceRoleMenus(permissionTarget.id, menuIds);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissionSnapshot(permissionTarget?.id ?? "") });
      setFeedback({
        type: "success",
        message: `菜单授权已保存：新增 ${result.addedIds.length} 项，移除 ${result.removedIds.length} 项。`,
      });
      setPermissionTarget(null);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "菜单授权保存失败。" });
    },
  });

  const applyFilters = (nextFilters: RoleFilters) => {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = filterForm.handleSubmit((values) => {
    applyFilters({ ...values, page: 1 });
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / filters.pageSize));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <section className="rounded-[32px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                nquiz 迁移 · 系统管理 / 角色工作台
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">角色管理页</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  首版保留 quiz 的核心语义：角色台账 + 菜单权限分配；同时修正旧版“角色 ID 语义错位”和“状态筛选假存在”问题。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="https://github.com/chengkml/nquiz.git"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                仓库
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
                新增角色
              </button>
            </div>
          </div>
        </section>

        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="角色总数" value={String(listQuery.data?.summary.total ?? 0)} hint="当前系统中已配置的角色数量。" />
          <StatCard label="启用角色" value={String(listQuery.data?.summary.enabled ?? 0)} hint="可实际参与菜单授权链路的角色。" />
          <StatCard label="已禁用角色" value={String(listQuery.data?.summary.disabled ?? 0)} hint="保留历史台账，但当前不应再继续分配。" />
          <StatCard label="绑定用户总数" value={String(listQuery.data?.summary.totalBindings ?? 0)} hint="用于提示删除风险与角色影响面。" />
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_auto] lg:items-end" onSubmit={handleSearch}>
            <div>
              <label className="mb-2 block text-sm font-medium">关键词</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={cn(inputClassName(Boolean(filterForm.formState.errors.keyword?.message)), "pl-9")}
                  placeholder="按角色编码、名称或描述搜索"
                  {...filterForm.register("keyword")}
                />
              </div>
              <FieldError message={filterForm.formState.errors.keyword?.message} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">状态</label>
              <select className={inputClassName(Boolean(filterForm.formState.errors.state?.message))} {...filterForm.register("state")}>
                <option value="ALL">全部状态</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">禁用</option>
              </select>
              <FieldError message={filterForm.formState.errors.state?.message} />
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
                  const defaults = roleFilterSchema.parse({});
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

        <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold">角色列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">把角色资料与菜单授权作为同一条管理主链路处理，而不是孤立字典 CRUD。</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>每页</span>
              <select
                className="rounded-xl border border-border bg-background px-2 py-1.5"
                value={filters.pageSize}
                onChange={(event) => applyFilters({ ...filters, page: 1, pageSize: Number(event.target.value) })}
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
              正在加载角色列表...
            </div>
          ) : listQuery.isError ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium text-foreground">角色列表加载失败</p>
                <p className="mt-1">请重试，或检查本地 mock 数据是否异常。</p>
              </div>
              <button type="button" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium" onClick={() => listQuery.refetch()}>
                重新加载
              </button>
            </div>
          ) : (listQuery.data?.items.length ?? 0) === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
              <Shield className="h-8 w-8" />
              <div>
                <p className="font-medium text-foreground">没有找到匹配角色</p>
                <p className="mt-1">可调整筛选条件，或直接新增角色。</p>
              </div>
              <button
                type="button"
                className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background"
                onClick={() => {
                  setEditingRecord(null);
                  setCreateDialogOpen(true);
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
                      <th className="px-6 py-4 font-medium">角色</th>
                      <th className="px-6 py-4 font-medium">描述</th>
                      <th className="px-6 py-4 font-medium">状态</th>
                      <th className="px-6 py-4 font-medium">绑定用户</th>
                      <th className="px-6 py-4 font-medium">已授权菜单</th>
                      <th className="px-6 py-4 font-medium">创建 / 更新</th>
                      <th className="px-6 py-4 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {listQuery.data?.items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-6 py-5">
                          <div className="font-medium">{item.roleName}</div>
                          <div className="mt-2 font-mono text-xs text-muted-foreground">{item.roleCode}</div>
                        </td>
                        <td className="max-w-md px-6 py-5 text-muted-foreground">{item.roleDescr || "-"}</td>
                        <td className="px-6 py-5">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getRoleStateBadgeClass(item.state))}>
                            {item.state === "ENABLED" ? "启用" : "禁用"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">{item.boundUserCount} 人</td>
                        <td className="px-6 py-5 text-muted-foreground">{item.assignedMenuIds.length} 项</td>
                        <td className="px-6 py-5 text-muted-foreground">
                          <p>创建：{formatDateTime(item.createDate)}</p>
                          <p className="mt-2">更新：{formatDateTime(item.updateDate)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => setPermissionTarget(item)}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              分配菜单
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() => {
                                setCreateDialogOpen(false);
                                setEditingRecord(item);
                              }}
                            >
                              <PencilLine className="h-4 w-4" />
                              编辑
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                              onClick={() =>
                                stateMutation.mutate({
                                  roleId: item.id,
                                  state: item.state === "ENABLED" ? "DISABLED" : "ENABLED",
                                })
                              }
                            >
                              {item.state === "ENABLED" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                              {item.state === "ENABLED" ? "禁用" : "启用"}
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
                    className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => applyFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={filters.page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => applyFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                  >
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
            <li>• 已覆盖：角色查询、新增、编辑、启停、删除、菜单权限分配。</li>
            <li>• 明确使用 roleCode 作为稳定业务编码，不再让“用户输入数据库主键”。</li>
            <li>• 状态筛选已真正接入数据层，不再延续旧 quiz 的“前端有筛选、后端没实现”的假闭环。</li>
            <li>• 删除前增加绑定用户拦截，避免权限域对象被误删。</li>
          </ul>
        </section>
      </div>

      <RoleDialog
        open={createDialogOpen || Boolean(editingRecord)}
        mode={editingRecord ? "edit" : "create"}
        record={editingRecord}
        pending={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={async (values) => {
          if (editingRecord) {
            await updateMutation.mutateAsync(values);
          } else {
            await createMutation.mutateAsync(values);
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

      <PermissionDialog
        open={Boolean(permissionTarget)}
        role={permissionTarget}
        pending={permissionMutation.isPending}
        menuTree={menuTreeQuery.data ?? []}
        initialAssignedIds={permissionSnapshotQuery.data?.assignedMenuIds ?? []}
        assignedLabels={permissionSnapshotQuery.data?.assignedMenuLabels ?? []}
        onClose={() => setPermissionTarget(null)}
        onSubmit={async (menuIds) => {
          await permissionMutation.mutateAsync(menuIds);
        }}
      />
    </div>
  );
}
