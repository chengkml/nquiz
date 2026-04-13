"use client";

import { Database, Eye, LoaderCircle, RefreshCw, ScanSearch } from "lucide-react";
import type { DatabaseSchemaSummary, DatasourceDetail } from "@/lib/datasource/types";

export function SchemaExplorer({
  datasource,
  schemaOptions,
  schema,
  schemaLoading,
  selectedSchemaResult,
  previewing,
  collecting,
  onSchemaChange,
  onPreview,
  onCollect,
}: {
  datasource: DatasourceDetail | null;
  schemaOptions: string[];
  schema: string;
  schemaLoading: boolean;
  selectedSchemaResult: DatabaseSchemaSummary | null;
  previewing: boolean;
  collecting: boolean;
  onSchemaChange: (value: string) => void;
  onPreview: () => Promise<void>;
  onCollect: () => Promise<void>;
}) {
  if (!datasource) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm leading-6 text-slate-500">
        先从左侧列表选择一个数据源，再查看 schema/catalog、执行预览或确认采集。
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Database className="size-4" />
            Schema Explorer
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{datasource.name}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              将“只读预览”与“确认采集”拆开，避免旧版 DatasourceManagement 查看即写库。
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="上次测试" value={datasource.lastTestedAt ? formatDateTime(datasource.lastTestedAt) : "未测试"} />
          <StatCard label="上次采集" value={datasource.lastCollectedAt ? formatDateTime(datasource.lastCollectedAt) : "未采集"} />
          <StatCard label="最近 schema" value={datasource.lastCollectedSchema || "—"} />
          <StatCard label="缓存表数" value={String(datasource.collectedSchemaCount)} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Schema / Catalog</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              value={schema}
              onChange={(event) => onSchemaChange(event.target.value)}
              disabled={schemaLoading || schemaOptions.length === 0}
            >
              {schemaOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 text-sm text-slate-500">
            <p>旧版后端语义：schema 为空时优先查 schema，不存在再回退 catalog。</p>
            <p>首版先保留该认知，在 UI 上显式暴露当前选择，减少误采集。</p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => void onPreview()}
              disabled={previewing}
            >
              {previewing ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
              只读预览结构
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={() => void onCollect()}
              disabled={collecting}
            >
              {collecting ? <LoaderCircle className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
              确认采集并缓存
            </button>
          </div>
        </aside>

        <div className="space-y-4">
          {schemaLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">正在加载 schema 列表…</div>
          ) : null}

          {selectedSchemaResult ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetaCard label="数据库" value={selectedSchemaResult.productName} />
                <MetaCard label="版本" value={selectedSchemaResult.productVersion} />
                <MetaCard label="驱动" value={selectedSchemaResult.driverName} />
                <MetaCard label="schema" value={selectedSchemaResult.schemaName} />
                <MetaCard
                  label="模式"
                  value={selectedSchemaResult.previewMode ? "Preview Only" : "Collected"}
                  highlight={!selectedSchemaResult.previewMode}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-950">表结构总览</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      共 {selectedSchemaResult.tables.length} 张表。当前结果{selectedSchemaResult.previewMode ? "未落库" : "已标记为采集缓存"}。
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <RefreshCw className="size-3.5" />
                    {selectedSchemaResult.collectedAt ? formatDateTime(selectedSchemaResult.collectedAt) : "刚刚预览"}
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {selectedSchemaResult.tables.map((table) => (
                    <div key={`${table.tableName}-${table.tableSchem}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-base font-semibold text-slate-950">{table.tableName}</h5>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              {table.group}
                            </span>
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {table.tableType}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{table.remarks || "暂无备注"}</p>
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <p>catalog：{table.tableCat || "—"}</p>
                          <p>schema：{table.tableSchem || "—"}</p>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="px-3 py-2 font-medium">字段</th>
                              <th className="px-3 py-2 font-medium">类型</th>
                              <th className="px-3 py-2 font-medium">长度</th>
                              <th className="px-3 py-2 font-medium">约束</th>
                              <th className="px-3 py-2 font-medium">备注</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.columns.map((column) => (
                              <tr key={column.columnName} className="border-b border-slate-100 align-top last:border-b-0">
                                <td className="px-3 py-3 font-medium text-slate-900">{column.columnName}</td>
                                <td className="px-3 py-3 text-slate-600">{column.dataType}</td>
                                <td className="px-3 py-3 text-slate-600">{column.columnSize ?? "—"}</td>
                                <td className="px-3 py-3 text-slate-600">
                                  <div className="flex flex-wrap gap-2">
                                    {column.primaryKey ? <Badge>PK</Badge> : null}
                                    {column.nullable ? <Badge variant="muted">NULL</Badge> : <Badge variant="muted">NOT NULL</Badge>}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-slate-600">{column.remarks || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm leading-6 text-slate-500">
              还没有结构结果。你可以先做只读预览，再确认采集，让后续 DataQuery / 数据字典模块复用缓存结果。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function MetaCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        highlight ? "border-blue-200 bg-blue-50 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-900"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "muted" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        variant === "default" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
