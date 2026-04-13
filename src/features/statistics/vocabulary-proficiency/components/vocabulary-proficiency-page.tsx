"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CircleCheckBig,
  Flame,
  Layers3,
  RefreshCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { fetchVocabularyProficiencyDashboard } from "@/features/statistics/vocabulary-proficiency/api/client";
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

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accentClassName,
  href,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
  href?: string;
}) {
  const content = (
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
        <div className={cn("flex size-11 items-center justify-center rounded-2xl text-white shadow-sm", accentClassName)}>
          <Icon className="size-5" />
        </div>
      </div>
      {href ? (
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          前往相关页面
          <ArrowRight className="size-4" />
        </div>
      ) : null}
    </motion.div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-md">
      {content}
    </Link>
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
          <h3 className="text-base font-semibold">单词熟练度数据加载失败</h3>
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

function TrendBars({ data }: { data: Array<{ label: string; value: number }> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.value), 1);

  if (!data.length) {
    return <EmptyState title="最近 7 天暂无复习趋势" description="先去完成今日复习，后续这里会自动展示近 7 天的复习活跃度。" />;
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
                  "rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-slate-900 transition",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus:opacity-100",
                )}
              >
                {item.value}
              </span>
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className={cn("w-full rounded-t-2xl bg-emerald-500 transition-all duration-200", !active && "opacity-75")}
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

function MetricPanel({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function VocabularyProficiencyPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.statistics.vocabularyProficiencyDashboard,
    queryFn: fetchVocabularyProficiencyDashboard,
  });

  const dashboard = dashboardQuery.data?.dashboard;
  const insights = dashboardQuery.data?.insights;

  const proficiencyDistribution = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.proficiencyDistribution).map(([label, value]) => ({
      label,
      value,
      hint: "按 repetition 分层聚合",
    }));
  }, [dashboard]);

  const reviewScoreDistribution = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.reviewScoreDistribution).map(([label, value]) => ({
      label,
      value,
      hint: "按 review_log score 分桶",
    }));
  }, [dashboard]);

  const reviewTrend = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.reviewCountByLastSevenDays).map(([label, value]) => ({
      label: formatDateLabel(label),
      value,
    }));
  }, [dashboard]);

  const isEmpty = dashboard && dashboard.overview.totalWords === 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_45%,#f8fafc_100%)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-sm backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <Sparkles className="size-4" />
                [nquiz迁移] 单词熟练度统计页
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Vocabulary · 单词熟练度统计</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  保留 quiz 旧版“当前用户维度单词卡学习成效看板”的业务语义，但不恢复已下线的统计中心入口。
                  首版直接挂到 Vocabulary 域，聚焦掌握状态、今日复习压力、评分分布与最近 7 天活跃度。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">统计范围</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{dashboard?.meta.scopeLabel ?? "当前登录用户"}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">只统计当前登录用户自己创建的单词卡与复习记录。</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">最近刷新</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {dashboard?.meta.generatedAt ? formatDateTime(dashboard.meta.generatedAt) : "-"}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">当前由 nquiz Route Handler + mock BFF 聚合，后续可平滑接真实统计接口。</p>
              </div>
              <Link
                href="/vocabulary/review"
                className="rounded-3xl border border-emerald-200 bg-emerald-600 p-4 text-white shadow-sm transition hover:bg-emerald-500 sm:col-span-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-emerald-50/85">业务闭环</p>
                    <p className="mt-2 text-lg font-semibold">去今日复习</p>
                    <p className="mt-2 text-xs leading-5 text-emerald-50/85">从统计页直达复习入口，不再做只看报表不推进学习的孤岛页面。</p>
                  </div>
                  <ArrowRight className="size-5" />
                </div>
              </Link>
            </div>
          </div>
        </header>

        {dashboardQuery.isError ? (
          <ErrorState message={dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "请求失败"} onRetry={() => dashboardQuery.refetch()} />
        ) : dashboardQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-[28px] border border-white/60 bg-white/70" />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState title="还没有单词学习数据" description="先去创建单词卡或完成一次复习，系统才会生成熟练度、评分分布与近 7 天趋势。" />
        ) : dashboard ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="单词总数"
                value={dashboard.overview.totalWords}
                hint="包含活跃与已归档单词卡总量。"
                icon={BookOpen}
                accentClassName="bg-slate-950"
                href="/vocabulary"
              />
              <StatCard
                label="活跃单词"
                value={dashboard.overview.activeWords}
                hint="未归档、仍在学习闭环中的单词卡。"
                icon={Layers3}
                accentClassName="bg-indigo-600"
                href="/vocabulary?archived=false"
              />
              <StatCard
                label="今日待复习"
                value={dashboard.overview.dueTodayWords}
                hint={dashboard.meta.dueTodayNotice}
                icon={Flame}
                accentClassName="bg-amber-500"
                href="/vocabulary/review"
              />
              <StatCard
                label="已熟练"
                value={dashboard.overview.masteredWords}
                hint="未归档且 repetition ≥ 6 的单词卡。"
                icon={TrendingUp}
                accentClassName="bg-emerald-600"
                href="/vocabulary?stage=mastered"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="grid gap-4 md:grid-cols-3">
                <MetricPanel
                  title="熟练率"
                  value={formatPercent(insights?.masteredRate ?? 0)}
                  description="前端派生指标：masteredWords / activeWords，用于快速判断活跃词卡里有多少已进入稳定掌握阶段。"
                />
                <MetricPanel
                  title="平均连续记对次数"
                  value={dashboard.overview.averageRepetition.toFixed(2)}
                  description="只统计未归档单词卡。数值越高，说明整体记忆稳定性越好。"
                />
                <MetricPanel
                  title="平均简易度因子"
                  value={dashboard.overview.averageEasinessFactor.toFixed(2)}
                  description="沿用旧 quiz 的 SM-2 语义，反映当前词卡整体复习难度与调度节奏。"
                />
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <BrainCircuit className="size-4" />
                  学习洞察
                </div>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                  <p>
                    最近 7 天共完成 <span className="font-semibold text-slate-950">{insights?.reviewCountLastSevenDays ?? 0}</span> 次复习，单日峰值为
                    <span className="font-semibold text-slate-950"> {insights?.maxReviewDayCount ?? 0} </span>次。
                  </p>
                  <p>
                    当前最大分层桶为 <span className="font-semibold text-slate-950">{insights?.biggestBucket ?? "-"}</span>，说明你的词卡主要仍集中在这个掌握阶段。
                  </p>
                  <p>
                    首版刻意保留“去今日复习 / 查看单词列表”闭环，而不是继续沿用旧版只读报表设计，避免统计页脱离真实学习动作。
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">熟练度分层</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{dashboard.meta.masteryNotice}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <HorizontalBars
                    data={proficiencyDistribution}
                    colorClassName="bg-emerald-500"
                    emptyTitle="暂无熟练度分层数据"
                    emptyDescription="还没有形成任何 repetition 分层结果，后续完成复习后会自动展示。"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">复习评分分布</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{dashboard.meta.reviewScoreNotice}</p>
                </div>
                <div className="mt-6">
                  <HorizontalBars
                    data={reviewScoreDistribution}
                    colorClassName="bg-indigo-500"
                    emptyTitle="暂无评分分布数据"
                    emptyDescription="当前还没有 review_log 评分记录；完成复习后这里会自动聚合 0~5 分桶。"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">最近 7 天复习趋势</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">观察近 7 天的复习活跃度波动，方便判断是否存在堆积式复习或断档。</p>
                </div>
                <div className="mt-6">
                  <TrendBars data={reviewTrend} />
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Link
                href="/vocabulary/review"
                className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">下一步动作</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">进入今日复习</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">优先消化今日待复习词卡，让统计页的待复习数、评分分布和趋势真实变化起来。</p>
                  </div>
                  <ArrowRight className="mt-1 size-5 text-slate-400" />
                </div>
              </Link>

              <Link
                href="/vocabulary"
                className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">查看明细</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">回到单词列表</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">结合单词列表中的 repetition、nextReviewDate 与 easinessFactor，查看哪些词卡拖累了整体掌握度。</p>
                  </div>
                  <ArrowRight className="mt-1 size-5 text-slate-400" />
                </div>
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
