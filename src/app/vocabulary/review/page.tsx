import Link from "next/link";
import { ArrowLeft, BrainCircuit, Sparkles } from "lucide-react";

export default function VocabularyReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
          <Sparkles className="size-4" />
          Vocabulary Review 占位入口
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">今日复习页待迁移</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          quiz 旧版的 Vocabulary/Review 仍未整体迁移到 nquiz。当前先提供可达的占位入口，确保“单词熟练度统计页”上的业务闭环链接不是空跳转。
          后续真正迁移单词模块时，这里应接入 dueToday 词卡流与 0 / 3 / 5 评分复习链路。
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/vocabulary/proficiency"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              返回单词熟练度统计页
            </span>
          </Link>
          <Link
            href="/vocabulary"
            className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              <BrainCircuit className="size-4" />
              查看单词列表占位页
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
