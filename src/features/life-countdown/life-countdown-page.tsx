"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarDays, LoaderCircle, RefreshCcw, Save, Sparkles } from "lucide-react";
import { generateLifeCountdownWarning, fetchLifeCountdownProfile, saveLifeCountdownProfile } from "@/features/life-countdown/api/client";
import { lifeCountdownSaveSchema, type LifeCountdownSaveValues } from "@/features/life-countdown/schema";
import type { CountdownSnapshot, LifeCountdownProfile } from "@/features/life-countdown/types";
import { queryKeys } from "@/lib/query/query-keys";

function todayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function calculateCountdown(deathDate?: string, nowMs?: number): CountdownSnapshot | null {
  if (!deathDate || !nowMs) return null;
  const target = new Date(`${deathDate}T23:59:59+08:00`);
  const diffMs = target.getTime() - nowMs;

  if (diffMs <= 0) {
    return { expired: true, totalDays: 0, years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);
  return {
    expired: false,
    totalDays,
    years: Math.floor(totalDays / 365),
    days: totalDays % 365,
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background/80 p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-border bg-card px-5 py-6 text-center shadow-sm">
      <div className="text-4xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

function WarningMeta({ profile }: { profile: LifeCountdownProfile }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="文案日期" value={formatDate(profile.todayWarningDate)} hint="按天缓存，同一天默认复用。" />
      <StatCard label="生成时间" value={formatDateTime(profile.todayWarningGeneratedAt)} hint="重新生成会覆盖今天内容。" />
      <StatCard label="使用模型" value={profile.todayWarningModel || "默认模型"} hint="首版用 mock 数据模拟模型回写。" />
      <StatCard label="适用目标日" value={formatDate(profile.deathDate)} hint="修改目标日会清空今日缓存。" />
    </div>
  );
}

export function LifeCountdownPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const form = useForm<LifeCountdownSaveValues>({
    resolver: zodResolver(lifeCountdownSaveSchema),
    defaultValues: { deathDate: "" },
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.lifeCountdown.profile,
    queryFn: fetchLifeCountdownProfile,
  });

  useEffect(() => {
    form.reset({ deathDate: profileQuery.data?.deathDate ?? "" });
  }, [form, profileQuery.data?.deathDate]);

  const countdown = useMemo(() => calculateCountdown(profileQuery.data?.deathDate, nowMs), [profileQuery.data?.deathDate, nowMs]);
  const expired = Boolean(countdown?.expired);

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.lifeCountdown.profile });
  };

  const saveMutation = useMutation({
    mutationFn: saveLifeCountdownProfile,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "死亡日期已保存，今日警示语缓存已按规则同步清空。" });
      await refreshProfile();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "保存失败" });
    },
  });

  const warningMutation = useMutation({
    mutationFn: generateLifeCountdownWarning,
    onSuccess: async (result, variables) => {
      setFeedback({
        type: "success",
        message: result.cached
          ? "已返回今日缓存警示语。"
          : variables.forceRefresh
            ? "已重新生成今日警示语。"
            : "已生成今日警示语。",
      });
      await refreshProfile();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "生成今日警示语失败" });
    },
  });

  const profile = profileQuery.data;
  const hasDeathDate = Boolean(profile?.deathDate);
  const canGenerate = hasDeathDate && !expired && !warningMutation.isPending;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.14),_transparent_34%),linear-gradient(180deg,#fff7ed_0%,#ffffff_42%,#f8fafc_100%)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-border bg-background/85 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                <Sparkles className="size-4" />
                [nquiz迁移] 生命倒计时页
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">个人生命倒计时工具页</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  保留 quiz 旧版三条主链路：用户唯一死亡日期配置、按秒刷新倒计时、按天缓存的今日警示语。
                  本版不复刻旧 Arco 结构，改成更清晰的个人状态面板。
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="当前状态" value={hasDeathDate ? (expired ? "已过期" : "倒计时中") : "未设定"} hint="未设定或已过期时，警示语生成会被禁用。" />
              <StatCard label="目标日期" value={formatDate(profile?.deathDate)} hint="倒计时到目标日 23:59:59 截止。" />
              <StatCard label="今日缓存" value={profile?.todayWarningDate === todayString() ? "已命中" : "未生成"} hint="重新生成会覆盖今天缓存。" />
            </div>
          </div>
        </header>

        {feedback ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {feedback.message}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-border bg-background/90 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">目标日期设置</h2>
                <p className="mt-1 text-sm text-muted-foreground">保持“一个用户一份死亡日期配置”的旧业务语义。</p>
              </div>
              <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">用户唯一配置</div>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                await saveMutation.mutateAsync(values);
              })}
            >
              <div>
                <label className="mb-2 block text-sm font-medium">死亡日期</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    min={todayString()}
                    className="w-full rounded-2xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                    {...form.register("deathDate")}
                  />
                </div>
                {form.formState.errors.deathDate ? <p className="mt-1 text-xs text-red-600">{form.formState.errors.deathDate.message}</p> : null}
                <p className="mt-2 text-xs leading-6 text-muted-foreground">后端语义保持一致：不能选择今天之前的日期；修改目标日会清空今日警示语缓存。</p>
              </div>

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存日期
              </button>
            </form>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
                <div className="text-xs text-muted-foreground">当前设定</div>
                <div className="mt-1 text-sm font-medium">{formatDate(profile?.deathDate)}</div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
                <div className="text-xs text-muted-foreground">最后更新</div>
                <div className="mt-1 text-sm font-medium">{formatDateTime(profile?.updateDate)}</div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
                <div className="text-xs text-muted-foreground">今日文案缓存</div>
                <div className="mt-1 text-sm font-medium">{formatDate(profile?.todayWarningDate)}</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-[2rem] border border-border bg-background/90 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">剩余时间</h2>
                <p className="mt-1 text-sm text-muted-foreground">高频秒级刷新只放在局部客户端组件里，避免整页状态抖动。</p>
              </div>
            </div>

            {profileQuery.isLoading ? (
              <div className="flex min-h-[360px] items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                正在加载生命倒计时...
              </div>
            ) : !hasDeathDate ? (
              <div className="mt-6"><EmptyState title="先设定死亡日期，再开始倒数" description="旧版就是先配置、后展示的个人工具页；nquiz 首版继续保持这个进入路径。" /></div>
            ) : expired ? (
              <div className="mt-6 rounded-[28px] border border-red-200 bg-red-50 px-6 py-8 text-red-800">
                <div className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5" />设定日期已到</div>
                <p className="mt-3 max-w-2xl text-sm leading-7">这一天已经过去。页面会保留重新设定新日期的入口，但不再允许基于已过期目标日生成今日警示语。</p>
              </div>
            ) : countdown ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 lg:grid-cols-3">
                  <StatCard label="目标日期" value={formatDate(profile?.deathDate)} hint="业务语义：目标日整天都计入剩余生命。" />
                  <StatCard label="剩余总天数" value={String(countdown.totalDays)} hint="按秒刷新，但总天数按整天差值显示。" />
                  <StatCard label="今天状态" value={formatDate(todayString())} hint="今天结束后，剩余时间会继续减少。" />
                </div>
                <div className="grid gap-4 md:grid-cols-5">
                  <MetricTile label="年" value={String(countdown.years)} />
                  <MetricTile label="天" value={String(countdown.days)} />
                  <MetricTile label="小时" value={pad(countdown.hours)} />
                  <MetricTile label="分钟" value={pad(countdown.minutes)} />
                  <MetricTile label="秒" value={pad(countdown.seconds)} />
                </div>
              </div>
            ) : null}
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-[2rem] border border-border bg-background/90 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">今日警示语</h2>
              <p className="mt-1 text-sm text-muted-foreground">保留“默认读缓存”和“强制重新生成”两种动作，显式呈现旧系统的按日缓存策略。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => warningMutation.mutate({ forceRefresh: false })}
                className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {warningMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                生成今日警示语
              </button>
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => warningMutation.mutate({ forceRefresh: true })}
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                重新生成
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {!profile?.todayWarningText ? (
              <EmptyState title="今天还没有警示语" description="未设定日期、目标日期已过、或还没点击生成时，都保持空态；不做假文案预置。" />
            ) : (
              <>
                <div className="rounded-[28px] border border-amber-200 bg-amber-50/70 px-6 py-6">
                  <p className="text-lg leading-8 text-slate-900">{profile.todayWarningText}</p>
                </div>
                <WarningMeta profile={profile} />
              </>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
