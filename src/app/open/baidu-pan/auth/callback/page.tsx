type CallbackSearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function BaiduPanAuthCallbackPage({
  searchParams,
}: {
  searchParams: CallbackSearchParams;
}) {
  const params = await searchParams;
  const state = readValue(params.state);
  const code = readValue(params.code);
  const error = readValue(params.error);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          OAuth 回调预留位
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">百度网盘授权结果</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          nquiz 已保留百度网盘开放平台回调页面，但当前仍未接入真实的 code → token 换取、token 持久化与绑定状态更新。
          这个页面的目标是把接入边界说明清楚，而不是制造“已授权成功”的假象。
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <InfoCard label="state" value={state || "未传入"} />
          <InfoCard label="code" value={code ? "已收到（已隐藏具体值）" : "未传入"} />
          <InfoCard label="error" value={error || "无"} />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">当前状态</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>已保留 Next.js App Router 回调位点：<code className="rounded bg-white px-1.5 py-0.5 text-xs">/open/baidu-pan/auth/callback</code></li>
            <li>未实现真实 OAuth 授权完成逻辑，因此不会写入绑定状态。</li>
            <li>请返回“百度网盘接入页”查看配置缺失项、授权入口状态和能力矩阵。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
