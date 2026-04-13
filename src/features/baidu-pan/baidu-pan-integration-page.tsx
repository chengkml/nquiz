"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  FolderKanban,
  KeyRound,
  Link2,
  LoaderCircle,
  Lock,
  RefreshCcw,
  ShieldAlert,
  Unplug,
  XCircle,
} from "lucide-react";
import { createBaiduPanAuthorizeUrl, fetchBaiduPanAuthStatus, unbindBaiduPan } from "@/features/baidu-pan/api/client";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";
import type { BaiduPanAuthStatus } from "@/lib/baidu-pan/types";

type FeedbackState = { type: "success" | "error"; message: string } | null;

type CapabilityItem = {
  label: string;
  detail: string;
  status: "ready" | "planned" | "blocked";
};

function statusTone(configured: boolean, bound: boolean) {
  if (configured && bound) return "success" as const;
  if (configured) return "info" as const;
  return "warning" as const;
}

function buildCapabilities(status: BaiduPanAuthStatus): CapabilityItem[] {
  const configured = Boolean(status.configured);
  const bound = Boolean(status.bound);

  return [
    {
      label: "配置完整性检查",
      detail: configured ? "已可判断 client_id / client_secret / redirect_uri 是否齐全。" : "尚缺关键开放平台参数。",
      status: configured ? "ready" : "blocked",
    },
    {
      label: "OAuth 授权入口",
      detail: configured ? "入口已保留，但真实授权 URL 生成逻辑尚未接通。" : "配置未补齐前不允许发起授权。",
      status: configured ? "planned" : "blocked",
    },
    {
      label: "账号绑定状态",
      detail: bound ? "已绑定账号，可继续扩展文件工作区。" : "当前仍未形成真实绑定关系。",
      status: bound ? "ready" : "planned",
    },
    {
      label: "目录浏览 / 文件工作区",
      detail: "本次迁移明确不做伪文件树，不返回 mock 文件列表，等待真实后端接通后再启用。",
      status: "blocked",
    },
    {
      label: "上传 / 下载 / 重命名 / 移动 / 删除",
      detail: "所有文件操作统一维持禁用，避免制造“看起来能用”的错觉。",
      status: "blocked",
    },
  ];
}

function getCapabilityBadge(status: CapabilityItem["status"]) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "planned":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function FieldChip({ item, missing }: { item: string; missing: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        missing ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {item}
    </span>
  );
}

export function BaiduPanIntegrationPage() {
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const statusQuery = useQuery({
    queryKey: queryKeys.baiduPan.status,
    queryFn: fetchBaiduPanAuthStatus,
  });

  const authorizeMutation = useMutation({
    mutationFn: createBaiduPanAuthorizeUrl,
    onSuccess: (result) => {
      if (result.authorizeUrl) {
        window.open(result.authorizeUrl, "_blank", "noopener,noreferrer");
        setFeedback({ type: "success", message: "已打开百度网盘授权窗口。" });
        return;
      }

      setFeedback({
        type: "error",
        message: result.message || "百度网盘授权 URL 尚未接通，当前不能发起授权。",
      });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "获取授权入口失败" });
    },
  });

  const unbindMutation = useMutation({
    mutationFn: unbindBaiduPan,
    onSuccess: (result) => {
      statusQuery.refetch();
      setFeedback({ type: "success", message: result.message || "已刷新绑定状态。" });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "解绑失败" });
    },
  });

  const status = statusQuery.data;
  const requiredConfigKeys = status?.requiredConfigKeys ?? [];
  const missingConfigKeys = status?.missingConfigKeys ?? [];
  const configured = Boolean(status?.configured);
  const bound = Boolean(status?.bound);
  const capabilities = useMemo(() => (status ? buildCapabilities(status) : []), [status]);
  const tone = statusTone(configured, bound);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                <Cloud className="size-4" />
                [nquiz迁移] 百度网盘页
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  百度网盘接入页 · 首版只做接入状态，不做伪文件工作区
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  基于 quiz 真实代码，这个菜单当前的业务语义不是“已可用网盘客户端”，而是“百度网盘开放平台接入预留位”。
                  所以 nquiz 首版聚焦配置检查、授权入口、OAuth 回调位点和能力边界说明，避免继续扩散旧页里那套看起来很完整、实际上全部不可用的伪工作台。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <TopMetric label="配置状态" value={configured ? "已配置" : "待补齐"} hint="以三项开放平台参数为准" />
              <TopMetric label="绑定状态" value={bound ? "已绑定" : "未绑定"} hint="当前默认未形成真实绑定" />
              <TopMetric label="权限语义" value="sys_mgr" hint="保留旧 quiz 的管理员语义" />
            </div>
          </div>
        </header>

        {feedback ? <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} /> : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_420px]">
          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">接入总览</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    这里统一展示 provider、配置完整性、绑定状态、回调位点和当前不可用原因。
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => statusQuery.refetch()}
                  disabled={statusQuery.isFetching}
                >
                  {statusQuery.isFetching ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                  刷新状态
                </button>
              </div>

              {statusQuery.isLoading ? (
                <LoadingPanel text="正在加载百度网盘接入状态…" />
              ) : statusQuery.isError || !status ? (
                <ErrorPanel text="加载百度网盘接入状态失败，请稍后重试。" />
              ) : (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <OverviewCard
                    icon={<Cloud className="size-5" />}
                    title={status.providerName || "百度网盘"}
                    badge={
                      tone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : tone === "info"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                    badgeText={configured ? "已配置待接通" : "未配置"}
                    description={status.message || "当前暂无状态说明"}
                  />
                  <OverviewCard
                    icon={<Link2 className="size-5" />}
                    title="OAuth / 绑定状态"
                    badge={bound ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}
                    badgeText={bound ? "已绑定" : "未绑定"}
                    description={status.authTip || "当前暂无绑定说明"}
                  />
                </div>
              )}
            </motion.section>

            <motion.section
              id="config-check"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.03 }}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">配置检查</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    首版仍保留 quiz 旧系统的三项关键配置语义：client_id / client_secret / redirect_uri。
                  </p>
                </div>
                <Link
                  href="/open/baidu-pan/auth/callback"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  查看回调位点
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <KeyRound className="size-4" />
                    必填配置项
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {requiredConfigKeys.length === 0 ? (
                      <span className="text-sm text-slate-500">当前未声明配置项。</span>
                    ) : (
                      requiredConfigKeys.map((item) => (
                        <FieldChip key={item} item={item} missing={missingConfigKeys.includes(item)} />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <Lock className="size-4" />
                    回调与配置入口
                  </div>
                  <dl className="mt-4 space-y-3 text-sm text-slate-600">
                    <div>
                      <dt className="font-medium text-slate-900">回调位点</dt>
                      <dd className="mt-1 break-all font-mono text-xs">{status?.callbackPath || "/open/baidu-pan/auth/callback"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">配置分类</dt>
                      <dd className="mt-1">{status?.configCategory || "百度网盘配置"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">nquiz 配置入口</dt>
                      <dd className="mt-1 break-all font-mono text-xs">{status?.configRoute || "/admin/integrations/baidu-pan#config-check"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.06 }}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm"
            >
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">能力矩阵</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  首版只交付“接入状态页”。文件工作区相关能力全部明确列为 planned / blocked，而不是回退到旧 quiz 那种伪可用交互。
                </p>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {capabilities.map((item) => (
                  <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FolderKanban className="size-4" />
                        {item.label}
                      </div>
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getCapabilityBadge(item.status))}>
                        {item.status === "ready" ? "ready" : item.status === "planned" ? "planned" : "blocked"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>

          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26 }}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-950">授权与操作</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                所有动作都显式反映当前真实接入状态；不会伪造授权成功，也不会返回伪目录树。
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={() => authorizeMutation.mutate()}
                  disabled={authorizeMutation.isPending}
                >
                  {authorizeMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                  立即授权
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  onClick={() => unbindMutation.mutate()}
                  disabled={unbindMutation.isPending || !bound}
                >
                  {unbindMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Unplug className="size-4" />}
                  解绑当前账号
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                当前没有真实 OAuth 与文件 API，按钮的目标是把失败原因说清楚，而不是制造“点了就成功”的错觉。
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-950">管理员边界说明</h2>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 size-5 text-slate-600" />
                  <div className="space-y-3 text-sm leading-7 text-slate-600">
                    <p>
                      quiz 旧系统里，百度网盘菜单默认只授权给 <code className="rounded bg-white px-1.5 py-0.5 text-xs">sys_mgr</code>。
                      nquiz 当前还没有完整登录态与权限中台，所以本次先把这条权限语义明确写进页面和文案，不伪造一个假的 RBAC。
                    </p>
                    <p>
                      后续接真实鉴权体系时，应把这个页面挂到管理员域，并在服务端校验角色，而不是只靠前端隐藏入口。
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
        </section>
      </div>
    </div>
  );
}

function TopMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function LoadingPanel({ text }: { text: string }) {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
      <LoaderCircle className="size-4 animate-spin" />
      {text}
    </div>
  );
}

function ErrorPanel({ text }: { text: string }) {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
      <XCircle className="size-4" />
      {text}
    </div>
  );
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  const error = feedback?.type === "error";
  if (!feedback) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {error ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      <div className="flex-1">{feedback.message}</div>
      <button type="button" className="text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function OverviewCard({
  icon,
  title,
  badge,
  badgeText,
  description,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  badgeText: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">{icon}</div>
        <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", badge)}>{badgeText}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}
