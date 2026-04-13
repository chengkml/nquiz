import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";

export default function VocabularyIndexPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <Sparkles className="size-4" />
          Vocabulary 域占位入口
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">单词列表页待迁移</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          本次需求先完成“单词熟练度统计页”迁移。为了让统计页中的业务闭环链接可落地，先补上 Vocabulary 列表入口占位页，
          后续迁移 Vocabulary 主模块时可直接替换这里的实现。
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
            href="/vocabulary/review"
            className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="size-4" />
              前往今日复习占位页
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
