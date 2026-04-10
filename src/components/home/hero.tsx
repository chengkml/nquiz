"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  FormInput,
  Layers3,
  PanelTop,
  Sparkles,
} from "lucide-react";

const stack = [
  { label: "Next.js App Router", icon: PanelTop },
  { label: "Tailwind CSS + Shadcn UI", icon: Layers3 },
  { label: "TanStack Query", icon: Sparkles },
  { label: "React Hook Form + Zod", icon: FormInput },
  { label: "Drizzle ORM", icon: Database },
];

export function Hero() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col justify-center gap-10 px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-sm text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          <Sparkles className="h-4 w-4" />
          nquiz · quiz 的 Next.js 重构工程
        </span>

        <div className="space-y-4">
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            一个面向重构的 Next.js 骨架，已经把核心技术栈先铺好了。
          </h1>
          <p className="max-w-3xl text-base leading-7 text-black/65 sm:text-lg dark:text-white/65">
            目标不是复制旧工程，而是在保留业务语义的前提下，用更清晰的结构、类型安全和现代前端模式重建 quiz。
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08 }}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {stack.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{label}</p>
              <ArrowRight className="h-4 w-4 text-black/35 dark:text-white/35" />
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
