"use client";

import { type ComponentType, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  CircleCheckBig,
  FolderKanban,
  ListTodo,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import { fetchQuestionBankDashboard } from "@/features/statistics/question-bank/api/client";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/query-keys";

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          <Icon className="size-5" />
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
      <CircleCheckBig className="size-10 text-slate-300" />
      <h3 className="mt-4 text-lg font-medium text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-rose-50/90 p-6 text-rose-900 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5" />
        <div className="flex-1">
          <h3 className="text-base font-semibold">题库统计数据加载失败</h3>
          <p className="mt-2 text-sm leading-6 text-rose-800">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800"
          >
            <RefreshCcw className="size-4" />
            重试
          </button>
        </div>
      </div>
    </div>
  );
}

function VerticalBarChart({
  data,
  colorClassName,
}: {
  data: Array<{ label: string; value: number; hint?: string }>;
  colorClassName: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  if (!data.length) {
    return <EmptyState title="暂无学科分布数据" description="当前还没有建立学科关联的题目，后续可在知识点/分类链路接入后自动形成分布。" />;
  }

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const width = `${Math.max((item.value / max) * 100, 8)}%`;
        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                {item.hint ? <p className="text-xs text-slate-500">{item.hint}</p> : null}
              </div>
              <span className="text-sm font-semibold text-slate-700">{item.value}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div className={cn("h-3 rounded-full transition-all", colorClassName)} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendBars({ data, tone = "indigo" }: { data: Array<{ label: string; value: number }>; tone?: "indigo" | "emerald" }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.value), 1);
  const toneClass = tone === "emerald" ? "bg-emerald-500" : "bg-indigo-500";
  const toneSoftClass = tone === "emerald" ? "bg-emerald-100" : "bg-indigo-100";

  if (!data.length) {
    return <EmptyState title="暂无趋势数据" description="首版保留空状态，待真实后端聚合接口接入后直接复用同一图表容器。" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-64 items-end gap-2 rounded-[24px] border border-slate-200 bg-white/60 px-4 pb-4 pt-6">
        {data.map((item, index) => {
          const height = `${Math.max((item.value / max) * 100, 8)}%`;
          const active = activeIndex === index;
          return (
            <button
              key={`${item.label}-${index}`}
              type="button"
              className="group flex flex-1 flex-col items-center justify-end gap-2"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            >
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] font-medium text-slate-600 transition",
                  active ? `${toneSoftClass} text-slate-900` : "opacity-0 group-hover:opacity-100 group-focus:opacity-100",
                )}
              >
                {item.value}
              </span>
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full rounded-t-2xl transition-all duration-200",
                    active ? toneClass : `${toneClass} opacity-75`,
                  )}
                  style={{ height }}
                />
              </div>
              <span className="text-[11px] text-slate-500">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function QuestionBankStatisticsPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.statistics.questionBankDashboard,
    queryFn: fetchQuestionBankDashboard,
  });

  const dashboard = dashboardQuery.data?.dashboard;
  const insights = dashboardQuery.data?.insights;

  const subjectDistribution = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.questionCountBySubject)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, hint: "按题目学科关联聚合" }));
  }, [dashboard]);

  const lastSevenDays = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.questionCountByLastSevenDays).map(([label, value]) => ({
      label: formatDateLabel(label),
      value,
    }));
  }, [dashboard]);

  const lastMonth = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.questionCountByLastMonth).map(([label, value]) => ({
      label: formatDateLabel(label),
      value,
    }));
  }, [dashboard]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-sm backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                <TrendingUp className="size-4" />
                [nquiz迁移] 题库统计页
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">统计中心 · 题库统计</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  保留 quiz 旧版“当前登录用户维度的题库运营看板”语义，但不继续沿用 Arco + imperative ECharts。
                  首版聚焦 4 个 KPI、学科分布、近 7/30 天新增趋势与口径说明，方便后续直接切到真实聚合接口。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">统计范围</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{dashboard?.meta.scopeLabel ?? "当前用户"}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">只看当前登录用户自己的题库、学科与待办。</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">最近刷新</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {dashboard?.meta.generatedAt ? formatDateTime(dashboard.meta.generatedAt) : "-"}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">当前为 BFF mock 聚合，后续可平滑替换为真实后端。</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">操作</p>
                <button
                  type="button"
                  onClick={() => dashboardQuery.refetch()}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <RefreshCcw className={cn("size-4", dashboardQuery.isFetching && "animate-spin")} />
                  刷新看板
                </button>
                <p className="mt-2 text-xs leading-5 text-slate-500">首版只提供手动刷新，不额外增加筛选复杂度。</p>
              </div>
            </div>
          </div>
        </header>

        {dashboardQuery.isError ? (
          <ErrorState message={dashboardQuery.error.message} onRetry={() => dashboardQuery.refetch()} />
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="待办数"
            value={dashboard?.overview.todoCount ?? 0}
            hint="当前用户待处理 + 进行中的 Todo"
            icon={ListTodo}
          />
          <StatCard
            label="题目总数"
            value={dashboard?.overview.questionCount ?? 0}
            hint="当前用户已创建的题目总量"
            icon={BookOpenText}
          />
          <StatCard
            label="昨日新增题目数"
            value={dashboard?.overview.yesterdayQuestionCount ?? 0}
            hint="昨天新增的题目数量"
            icon={CalendarDays}
          />
          <StatCard
            label="学科总数"
            value={dashboard?.overview.subjectCount ?? 0}
            hint="当前用户创建的学科数，不等于有题目的学科数"
            icon={FolderKanban}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">学科题目分布</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  修正旧 quiz 中“知识点数量统计”误标，首版只保留可解释的学科题目分布表达。
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                <ArrowUpRight className="size-3.5" />
                口径已修正
              </span>
            </div>
            {dashboardQuery.isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <VerticalBarChart data={subjectDistribution} colorClassName="bg-gradient-to-r from-indigo-500 to-violet-500" />
            )}
          </div>

          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950">近 30 天新增趋势</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">保留旧版核心趋势洞察，但先用轻量组件化图表替代 imperative ECharts 初始化。</p>
            </div>
            {dashboardQuery.isLoading ? (
              <div className="h-64 animate-pulse rounded-[24px] bg-slate-100" />
            ) : (
              <TrendBars data={lastMonth} tone="indigo" />
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950">近 7 天新增题目</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">保留旧版近 7 天趋势能力，用更聚焦的周视角观察录题节奏。</p>
            </div>
            {dashboardQuery.isLoading ? (
              <div className="h-64 animate-pulse rounded-[24px] bg-slate-100" />
            ) : (
              <TrendBars data={lastSevenDays} tone="emerald" />
            )}
          </div>

          <div className="space-y-6 rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">口径说明与迁移取舍</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                首版优先对齐业务语义与信息架构，不继续复制旧实现里命名混乱、图表重复、缺少解释的部分。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard title="待办指标说明" description={dashboard?.meta.todoNotice ?? "-"} />
              <InfoCard title="学科分布说明" description={dashboard?.meta.subjectDistributionNotice ?? "-"} />
              <InfoCard
                title="本期最高单日新增"
                description={`${insights?.maxDayIncrease ?? 0} 题`}
                accent="indigo"
              />
              <InfoCard
                title="Top 学科"
                description={insights ? `${insights.topSubject.subject} · ${insights.topSubject.count} 题` : "-"}
                accent="emerald"
              />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
              <h3 className="text-sm font-semibold text-slate-900">与旧 quiz 相比，本页明确做了 3 个收敛</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>1. 删除旧版“知识点数量统计”误标，避免展示与真实数据口径不一致的图。</li>
                <li>2. 合并重复表达：先保留一个主学科分布视图，不同时摆柱图 + 饼图。</li>
                <li>3. 补充统计口径、空态、失败态与刷新入口，降低误解成本。</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  description,
  accent = "slate",
}: {
  title: string;
  description: string;
  accent?: "slate" | "indigo" | "emerald";
}) {
  const accentClassName =
    accent === "indigo"
      ? "border-indigo-200 bg-indigo-50/70"
      : accent === "emerald"
        ? "border-emerald-200 bg-emerald-50/70"
        : "border-slate-200 bg-white";

  return (
    <div className={cn("rounded-[24px] border p-4", accentClassName)}>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
