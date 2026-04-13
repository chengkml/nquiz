"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Cable, Database, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import {
  collectDatasourceSchema,
  createDatasource,
  deleteDatasource,
  fetchDatasourceDetail,
  previewDatasourceSchema,
  testDatasourceConnection,
  updateDatasource,
  validateDatasourceConnection,
} from "@/features/datasource/api/client";
import { DatasourceFormSheet } from "@/features/datasource/components/datasource-form-sheet";
import { SchemaExplorer } from "@/features/datasource/components/schema-explorer";
import { useDatasourceList } from "@/features/datasource/hooks/use-datasource-list";
import { useDatasourceSchemas } from "@/features/datasource/hooks/use-datasource-schemas";
import type { DatasourceFilterValues, DatasourceSummary } from "@/lib/datasource/types";
import { queryKeys } from "@/lib/query/query-keys";

const defaultFilter: DatasourceFilterValues = {
  name: "",
  active: "",
};

export function DatasourceManagementPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<DatasourceFilterValues>(defaultFilter);
  const [keyword, setKeyword] = useState("");
  const [pageNum, setPageNum] = useState(0);
  const [pageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schema, setSchema] = useState("");
  const [schemaResult, setSchemaResult] = useState<Awaited<ReturnType<typeof previewDatasourceSchema>> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const listQuery = useDatasourceList({
    name: filter.name,
    active: filter.active,
    pageNum,
    pageSize,
  });

  const items = useMemo(() => listQuery.data?.content ?? [], [listQuery.data?.content]);
  const effectiveSelectedId = selectedId ?? items[0]?.id ?? null;

  const detailQuery = useQuery({
    queryKey: queryKeys.datasourceDetail(effectiveSelectedId),
    queryFn: () => fetchDatasourceDetail(effectiveSelectedId as string),
    enabled: Boolean(effectiveSelectedId),
  });

  const schemaQuery = useDatasourceSchemas(effectiveSelectedId);
  const effectiveSchema = schema && (schemaQuery.data ?? []).includes(schema) ? schema : (schemaQuery.data?.[0] ?? "");

  const createMutation = useMutation({
    mutationFn: createDatasource,
    onSuccess: async (created) => {
      setFeedback({ type: "success", message: "数据源已创建" });
      setSheetOpen(false);
      setSelectedId(created.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.datasourcesRoot });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateDatasource,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "数据源已更新" });
      setSheetOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.datasourcesRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.datasourceDetail(selectedId) }),
      ]);
    },
  });

  const testMutation = useMutation({
    mutationFn: testDatasourceConnection,
    onSuccess: async (result) => {
      setFeedback({ type: result.success ? "success" : "error", message: result.message });
      await queryClient.invalidateQueries({ queryKey: queryKeys.datasourcesRoot });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDatasource,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "数据源已删除" });
      setSchemaResult(null);
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.datasourcesRoot });
    },
  });

  const previewMutation = useMutation({
    mutationFn: ({ id, selectedSchema }: { id: string; selectedSchema: string }) =>
      previewDatasourceSchema(id, selectedSchema),
    onSuccess: (result) => {
      setSchemaResult(result);
      setFeedback({ type: "success", message: "已获取只读 schema 预览" });
    },
  });

  const collectMutation = useMutation({
    mutationFn: ({ id, selectedSchema }: { id: string; selectedSchema: string }) =>
      collectDatasourceSchema(id, selectedSchema),
    onSuccess: async (result) => {
      setSchemaResult(result);
      setFeedback({ type: "success", message: "schema 已采集并缓存" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.datasourcesRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.datasourceDetail(effectiveSelectedId) }),
      ]);
    },
  });

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? detailQuery.data ?? null,
    [detailQuery.data, items, selectedId],
  );

  const totalPages = listQuery.data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                <Database className="size-4" />
                [nquiz迁移] DatasourceManagement
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  数据接入中心 · 首期闭环
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  基于旧 quiz 的 DatasourceManagement 重构：本版优先保留数据源 CRUD、连接校验、schema/catalog 获取、结构预览与采集缓存。
                  同时显式拆开“只读预览”与“确认采集”，为后续 DataQuery / 数据字典复用同一数据源域打底。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <TopMetric label="数据源" value={String(listQuery.data?.totalElements ?? 0)} />
              <TopMetric label="启用中" value={String(items.filter((item) => item.active).length)} />
              <TopMetric label="已采集缓存" value={String(items.filter((item) => item.collectedSchemaCount > 0).length)} />
            </div>
          </div>
        </header>

        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">数据源列表</h2>
                <p className="mt-1 text-sm text-slate-500">名称筛选、启用状态筛选、分页、行内操作已补齐。</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                onClick={() => {
                  setSheetMode("create");
                  setSheetOpen(true);
                }}
              >
                <Plus className="size-4" />
                新增
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1fr)_160px]">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>名称关键字</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    value={keyword}
                    placeholder="输入名称后查询"
                    onChange={(event) => setKeyword(event.target.value)}
                  />
                </div>
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>启用状态</span>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  value={filter.active}
                  onChange={(event) => {
                    setPageNum(0);
                    setFilter((prev) => ({ ...prev, active: event.target.value as DatasourceFilterValues["active"] }));
                  }}
                >
                  <option value="">全部</option>
                  <option value="true">启用</option>
                  <option value="false">禁用</option>
                </select>
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={() => {
                    setPageNum(0);
                    setFilter((prev) => ({ ...prev, name: keyword.trim() }));
                  }}
                >
                  查询
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setKeyword("");
                    setPageNum(0);
                    setFilter(defaultFilter);
                  }}
                >
                  重置
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {listQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">正在加载数据源列表…</div>
              ) : null}

              {items.map((item) => (
                <DatasourceRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  busy={testMutation.isPending || deleteMutation.isPending}
                  onSelect={() => {
                    setSelectedId(item.id);
                    setSchemaResult(null);
                  }}
                  onEdit={() => {
                    setSelectedId(item.id);
                    setSheetMode("edit");
                    setSheetOpen(true);
                  }}
                  onTest={() => testMutation.mutate(item.id)}
                  onDelete={() => deleteMutation.mutate(item.id)}
                />
              ))}

              {!listQuery.isLoading && items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  当前筛选下没有数据源。可以先新增一个 mock 数据源验证页面链路。
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>
                第 {pageNum + 1} / {totalPages} 页，共 {listQuery.data?.totalElements ?? 0} 条
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pageNum === 0}
                  onClick={() => setPageNum((prev) => Math.max(prev - 1, 0))}
                >
                  上一页
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pageNum + 1 >= totalPages}
                  onClick={() => setPageNum((prev) => prev + 1)}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>

          <SchemaExplorer
            datasource={detailQuery.data ?? (selectedItem ? { ...selectedItem, schemaOptions: [] } : null)}
            schemaOptions={schemaQuery.data ?? []}
            schema={schema}
            schemaLoading={schemaQuery.isLoading}
            selectedSchemaResult={schemaResult}
            previewing={previewMutation.isPending}
            collecting={collectMutation.isPending}
            onSchemaChange={setSchema}
            onPreview={async () => {
              if (!effectiveSelectedId) return;
              await previewMutation.mutateAsync({ id: effectiveSelectedId, selectedSchema: effectiveSchema });
            }}
            onCollect={async () => {
              if (!effectiveSelectedId) return;
              await collectMutation.mutateAsync({ id: effectiveSelectedId, selectedSchema: effectiveSchema });
            }}
          />
        </section>
      </div>

      <DatasourceFormSheet
        open={sheetOpen}
        mode={sheetMode}
        initialValue={sheetMode === "edit" ? detailQuery.data : null}
        saving={createMutation.isPending || updateMutation.isPending}
        onClose={() => setSheetOpen(false)}
        onValidate={validateDatasourceConnection}
        onSubmit={async (values) => {
          if (sheetMode === "create") {
            await createMutation.mutateAsync(values);
            return;
          }
          await updateMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function DatasourceRow({
  item,
  selected,
  busy,
  onSelect,
  onEdit,
  onTest,
  onDelete,
}: {
  item: DatasourceSummary;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-950/10"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold">{item.name}</span>
            <Pill inverse={selected}>{item.type}</Pill>
            <Pill inverse={selected} tone={item.active ? "success" : "muted"}>
              {item.active ? "启用" : "禁用"}
            </Pill>
          </div>
          <p className={`text-sm leading-6 ${selected ? "text-white/80" : "text-slate-500"}`}>{item.description || "暂无描述"}</p>
        </div>
        <ArrowUpRight className={`size-4 shrink-0 ${selected ? "text-white/80" : "text-slate-400"}`} />
      </div>

      <div className={`mt-4 grid gap-2 text-xs ${selected ? "text-white/75" : "text-slate-500"}`}>
        <p>JDBC：{item.jdbcUrl}</p>
        <p>用户：{item.username}</p>
        <p>最近采集：{item.lastCollectedSchema || "—"}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
        <ActionButton icon={<PencilLine className="size-3.5" />} label="编辑" inverse={selected} onClick={onEdit} />
        <ActionButton
          icon={<Cable className="size-3.5" />}
          label="测试连接"
          inverse={selected}
          disabled={busy}
          onClick={onTest}
        />
        <ActionButton
          icon={<Trash2 className="size-3.5" />}
          label="删除"
          inverse={selected}
          tone="danger"
          disabled={busy}
          onClick={onDelete}
        />
      </div>
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  inverse,
  tone = "default",
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  inverse: boolean;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  const className = inverse
    ? tone === "danger"
      ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
      : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
    : tone === "danger"
      ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function Pill({
  children,
  tone = "default",
  inverse = false,
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
  inverse?: boolean;
}) {
  const className = inverse
    ? "bg-white/10 text-white"
    : tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "muted"
        ? "bg-slate-200 text-slate-700"
        : "bg-blue-50 text-blue-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}
