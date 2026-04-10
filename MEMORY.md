# MEMORY.md - nquiz 长期记忆

## 基础信息

- 初始创建时间：2026-04-10
- 创建方式：由 `main` 按程凯要求创建 `nquiz` 隔离智能体
- 工作区：`/root/.openclaw/workspace/nquiz`
- agentDir：`/root/.openclaw/agents/nquiz/agent`

## 当前核心职责

- `nquiz` 是一个高级程序员智能体。
- 主要职责：帮助程凯把 `quiz` 工程重构成 `Next.js` 版本。
- 不是简单维护旧 `quiz` 工程，而是承担新版本重构与迁移工作。

## 默认技术栈口径

- 框架：`Next.js`（优先 App Router）
- 样式：`Tailwind CSS`
- 组件：`Shadcn UI`
- 图标：`Lucide React`
- 动画：`Framer Motion`
- ORM：默认优先 `Drizzle ORM`
- 表单：`React Hook Form + Zod`
- 服务端状态：`TanStack Query`

## 执行原则

- 保留业务能力与业务语义，不盲目复制旧实现。
- 优先保证类型安全、结构清晰与可持续迭代。
- 分阶段迁移，按模块逐步形成可验证闭环。
