"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarClock,
  ChartLine,
  CircleCheckBig,
  GraduationCap,
  RefreshCcw,
  Target,
} from "lucide-react";
import { fetchKnowledgeMasteryDashboard } from "@/features/statistics/knowledge-mastery/api/client";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

type IconComponent = React.ComponentType<{ className?: string }>;

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
  accentClassName,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: IconComponent;
  accentClassName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p>
        </div>
        <div className={cn("flex size-11 items-center justify-center rounded-2xl text-white shadow-sm", accentClassName)}>
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
          <h3 className="text-base font-semibold">知识点掌握统计加载失败</h3>
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

function HorizontalBars({
  data,
  colorClassName,
  emptyTitle,
  emptyDescription,
}: {
  data: Array<{ label: string; value: number; hint?: string }>;
  colorClassName: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
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
    return <EmptyState title="暂无复习趋势数据" description="当前还没有复习记录，先去今日复习完成一轮知识点复习。" />;
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

export function KnowledgeMasteryPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.statistics.knowledgeMasteryDashboard,
    queryFn: fetchKnowledgeMasteryDashboard,
  });

  const dashboard = dashboardQuery.data?.dashboard;
  const insights = dashboardQuery.data?.insights;

  const masteryDistribution = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.masteryDistribution).map(([label, value]) => ({
      label,
      value,
      hint: "沿用旧 quiz 的 repetition 分层口径",
    }));
  }, [dashboard]);

  const subjectDistribution = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.knowledgeCountBySubject)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, hint: "按当前用户未归档知识点聚合" }));
  }, [dashboard]);

  const reviewScores = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.reviewScoreDistribution).map(([label, value]) => ({
      label,
      value,
      hint: "0~5 分评分桶",
    }));
  }, [dashboard]);

  const reviewTrend = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.reviewCountByLastSevenDays).map(([label, value]) => ({
      label: formatDateLabel(label),
      value,
    }));
  }, [dashboard]);

  const masteredRate = insights?.masteredRate ?? 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_45%,#f8fafc_100%)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-sm backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <Brain className="size-4" />
                [nquiz迁移] 知识点统计页
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Knowledge · 知识点掌握统计</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  不恢复旧的独立 statistics-center 壳，而是把它收回 Knowledge 域，作为“知识点列表 / 今日复习”的学习洞察页。
                  首版保留旧 quiz 的掌握度核心口径，并补齐去复习、去列表的业务闭环。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">统计范围</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{dashboard?.meta.scopeLabel ?? "当前用户"}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">只看当前登录用户自己的知识点学习状态。</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">最近刷新</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {dashboard?.meta.generatedAt ? formatDateTime(dashboard.meta.generatedAt) : "-"}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">当前为 BFF mock 聚合，后续可平滑切换真实后端。</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2 xl:col-span-1">
                <p className="text-sm text-slate-500">快速动作</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href="/knowledge/review"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    去今日复习
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/knowledge"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    查看知识点列表
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        {dashboardQuery.isError ? (
          <ErrorState message={dashboardQuery.error.message} onRetry={() => dashboardQuery.refetch()} />
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="知识点总数"
            value={dashboard?.overview.totalKnowledges ?? 0}
            hint="含已归档与活跃知识点"
            icon={BookOpenCheck}
            accentClassName="bg-slate-950"
          />
          <StatCard
            label="活跃知识点"
            value={dashboard?.overview.activeKnowledges ?? 0}
            hint="未归档、仍在学习节奏内"
            icon={GraduationCap}
            accentClassName="bg-cyan-600"
          />
          <StatCard
            label="今日待复习"
            value={dashboard?.overview.dueTodayKnowledges ?? 0}
            hint="可直接进入今日复习闭环"
            icon={CalendarClock}
            accentClassName="bg-amber-500"
          />
          <StatCard
            label="已掌握"
            value={dashboard?.overview.masteredKnowledges ?? 0}
            hint="repetition ≥ 6 的未归档知识点"
            icon={Target}
            accentClassName="bg-emerald-600"
          />
          <StatCard
            label="掌握率"
            value={`${masteredRate}%`}
            hint="已掌握 / 活跃知识点（前端派生）"
            icon={ChartLine}
            accentClassName="bg-violet-600"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">知识掌握分层</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">按旧 quiz 的 repetition 规则划分：0 / 1-2 / 3-5 / 6+。</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                口径沿用旧后端
              </span>
            </div>
            {dashboardQuery.isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <HorizontalBars
                data={masteryDistribution}
                colorClassName="bg-emerald-500"
                emptyTitle="暂无知识掌握分层"
                emptyDescription="当前还没有有效的活跃知识点数据，可先去知识点列表创建内容。"
              />
            )}
          </div>

          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950">学习质量概览</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">保留平均连续记对次数与平均简易度因子，并补上解释文案。</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm text-slate-500">平均连续记对次数</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{dashboard?.overview.averageRepetition ?? 0}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">只统计未归档知识点，用来观察当前学习节奏是否稳定。</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm text-slate-500">平均简易度因子</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{dashboard?.overview.averageEasinessFactor ?? 0}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">沿用 SM-2 记忆模型语义，数值越高代表复习压力相对更低。</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 sm:col-span-2">
                <p className="text-sm text-slate-500">学习提示</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <p>{dashboard?.meta.masteryNotice ?? "-"}</p>
                  <p>{dashboard?.meta.dueTodayNotice ?? "-"}</p>
                  <p>{dashboard?.meta.reviewScoreNotice ?? "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">学科知识点分布</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">按 subject.name 聚合，空值回落到“未归类学科”。</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Top 学科：{insights?.topSubject.subject ?? "-"}
              </span>
            </div>
            {dashboardQuery.isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <HorizontalBars
                data={subjectDistribution}
                colorClassName="bg-sky-500"
                emptyTitle="暂无学科知识点分布"
                emptyDescription="当前还没有和学科建立关联的知识点，可先去知识点列表补齐学科维度。"
              />
            )}
          </div>

          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950">复习评分分布</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">保留 0~5 分完整分桶，不强行收缩为 0/3/5 三档。</p>
            </div>
            {dashboardQuery.isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <HorizontalBars
                data={reviewScores}
                colorClassName="bg-amber-500"
                emptyTitle="暂无复习评分分布"
                emptyDescription="当前还没有复习评分记录，先去今日复习完成一轮评分。"
              />
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">近 7 天复习趋势</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">统计 review_log 中近 7 天每天的复习次数。</p>
              </div>
              <button
                type="button"
                onClick={() => dashboardQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                <RefreshCcw className={cn("size-4", dashboardQuery.isFetching && "animate-spin")} />
                刷新
              </button>
            </div>
            {dashboardQuery.isLoading ? (
              <div className="h-64 animate-pulse rounded-[24px] bg-slate-100" />
            ) : (
              <TrendBars data={reviewTrend} tone="emerald" />
            )}
          </div>

          <div className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950">业务闭环建议</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">这张页不再只是“只看不动”的报表页，而是 Knowledge 域里的学习洞察入口。</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm text-slate-500">今日复习总量</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{insights?.reviewCountLastSevenDays ?? 0}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">近 7 天累计复习次数，可作为当前复习节奏的粗粒度信号。</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm text-slate-500">最大掌握桶</p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{insights?.biggestMasteryBucket ?? "-"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">用于观察当前知识点主要集中在哪个掌握阶段。</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/knowledge?filter=active"
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  查看活跃知识点
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/knowledge/review?source=mastery"
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  继续今日复习
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
