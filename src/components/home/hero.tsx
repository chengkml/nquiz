"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BellRing,
  BrainCircuit,
  Bug,
  CalendarDays,
  Database,
  DatabaseZap,
  FormInput,
  FileCode2,
  FileText,
  FolderTree,
  Layers3,
  ListTodo,
  PanelTop,
  Server,
  ShieldCheck,
  Sparkles,
  Tags,
  Workflow,
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
        <div className="flex flex-wrap gap-3">
          <Link
            href="/requirements"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开需求管理页
            <FileCode2 className="h-4 w-4" />
          </Link>
          <Link
            href="/notification/send"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开通知发送页
            <BellRing className="h-4 w-4" />
          </Link>
          <Link
            href="/notifications/exception-logs"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开通知异常日志页
            <Bug className="h-4 w-4" />
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开独立对话页
            <BrainCircuit className="h-4 w-4" />
          </Link>
          <Link
            href="/mcp-server"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开 MCP 服务器页
            <Server className="h-4 w-4" />
          </Link>
          <Link
            href="/agent"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开 Agent 管理页
            <Bot className="h-4 w-4" />
          </Link>
          <Link
            href="/mcp-tool"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开 MCP 工具页
            <DatabaseZap className="h-4 w-4" />
          </Link>
          <Link
            href="/orchestration"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开编排工作台
            <Workflow className="h-4 w-4" />
          </Link>
          <Link
            href="/datasource"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            打开 DatasourceManagement
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/func-docs"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开 FuncDocManagement
            <FileText className="h-4 w-4" />
          </Link>
          <Link
            href="/wrong-question"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开 WrongQuestion
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/statistics-center/question-bank"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开题库统计页
            <BarChart3 className="h-4 w-4" />
          </Link>
          <Link
            href="/life-countdown"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开生命倒计时页
            <AlarmClock className="h-4 w-4" />
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开日程管理页
            <CalendarDays className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/integrations/baidu-pan"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开百度网盘接入页
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/price-monitor"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开价格监控页
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/todo"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开 TodoManagement
            <ListTodo className="h-4 w-4" />
          </Link>
          <Link
            href="/vocabulary/proficiency"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开单词熟练度统计页
            <BookOpen className="h-4 w-4" />
          </Link>
          <Link
            href="/subjects"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开学科管理页
            <Tags className="h-4 w-4" />
          </Link>
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开分组管理页
            <FolderTree className="h-4 w-4" />
          </Link>
          <Link
            href="/hot-search"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开热搜页
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/diary"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开日记管理页
            <BookOpen className="h-4 w-4" />
          </Link>
          <Link
            href="/system/roles"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开角色管理页
            <ShieldCheck className="h-4 w-4" />
          </Link>
          <Link
            href="/knowledge/personal"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开个人知识页
            <BookOpen className="h-4 w-4" />
          </Link>
          <Link
            href="/knowledge/sets"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            打开知识集管理页
            <Database className="h-4 w-4" />
          </Link>
          <span className="inline-flex items-center rounded-xl border border-black/10 px-4 py-2.5 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
            已迁移首期：需求管理页 / 通知发送页 / 通知异常日志页 / 独立对话页 / MCP 服务器页 / Agent 管理页 / MCP 工具页 / 编排工作台 / DatasourceManagement / FuncDocManagement / WrongQuestion / 题库统计页 / 单词熟练度统计页 / 生命倒计时 / 日程管理 / 百度网盘接入页 / 价格监控页 / TodoManagement / SubjectManagement / GroupManagement / 角色管理页 / 热搜页 / 日记管理页 / 个人知识页 / 知识集管理页
          </span>
        </div>
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
