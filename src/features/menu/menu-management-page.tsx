export function MenuManagementPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-12">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-border bg-background p-8 shadow-sm">
        <div className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          占位页
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">MenuManagement 暂未迁移</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          这个入口文件之前已经存在，但对应 feature 组件缺失，导致整个 nquiz 工程无法通过 build。
          当前先补最小占位页，确保不因为悬空 import 阻塞其他需求开发闭环。
        </p>
      </div>
    </div>
  );
}
