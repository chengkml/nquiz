# nquiz

`quiz` 工程的 Next.js 重构版本骨架。

## 当前技术栈

- Next.js (App Router)
- Tailwind CSS
- Shadcn UI（已完成基础配置）
- Lucide React
- Framer Motion
- TanStack Query
- React Hook Form + Zod
- Drizzle ORM

## 启动

```bash
npm install
npm run dev
```

## 当前目录约定

- `src/app`：App Router 页面与布局
- `src/components`：组件层
- `src/features`：按业务域组织的功能模块
- `src/lib`：工具、表单 schema、query key 等
- `src/server/db`：数据库 schema / 数据访问层

## 说明

当前仓库已完成“可持续开发的前端骨架初始化”。
后续可以在此基础上按模块逐步把 `quiz` 迁移过来。
