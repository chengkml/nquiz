目标
- 将 quiz 旧版 `/frame/todo` 的 TodoManagement 迁移为 nquiz 中一个面向“当前登录用户”的待办管理闭环，保留待办创建、筛选、编辑、完成、删除、过期、与日程联动等核心业务语义。
- 在 Next.js 重构语境下，不照搬旧版 Arco + Modal CRUD 形态，而是重组为更清晰的信息架构：列表筛选区 + 详情/编辑抽屉（或页面）+ 快捷状态操作 + 与日程/思维导图的关联入口。
- 首版优先完成“待办管理主链路”闭环，再决定是否同步迁移“思维导图初始化”这种派生能力。

现状
- nquiz 当前仍是基础骨架，尚未存在 Todo 页面、Todo 数据表、Todo API 与对应 server action / route handler。可见当前仅有主页和基础 provider，如 `src/app/page.tsx`、`src/components/providers/query-provider.tsx`、`src/server/db/schema/example.ts`。
- quiz 旧版前端 Todo 页面位于 `quiz/frontend/src/pages/Todo/index.tsx`，本质是一个“我自己的待办列表”页面，不是多人协作任务看板：
  - 默认筛选 `status=SCHEDULED`。
  - 支持标题/状态/优先级筛选。
  - 支持新增、编辑、删除、完成。
  - 已完成/已过期待办点击标题进入只读详情；未完成待办点击标题直接进入编辑弹窗。
  - 支持“分析”操作：调用 `/todo/{id}/init-mindmap` 后跳转到思维导图编辑页。
- quiz 旧版前端 API 位于 `quiz/frontend/src/pages/Todo/api/index.ts`，接口为：`/todo/search`、`/todo/get/{id}`、`/todo/create`、`/todo/update`、`/todo/delete/{id}`、`/todo/{id}/complete`、`/todo/{id}/init-mindmap`。
- quiz 旧版后端实体位于 `quiz/backend/src/main/java/com/ck/quiz/todo/entity/Todo.java`：
  - 字段：`title`、`descr`、`status`、`priority`、`startTime`、`dueDate`、`expireTime`、`calendarEventId`。
  - 状态枚举：`SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED / EXPIRED`。
  - 优先级枚举：`LOW / MEDIUM / HIGH`。
- quiz 旧版服务位于 `quiz/backend/src/main/java/com/ck/quiz/todo/service/impl/TodoServiceImpl.java`，确认了几个关键业务语义：
  1. `search()` 只查当前登录用户 `create_user` 的数据，并按 `create_date desc` 排序。
  2. `create()` 默认会同步创建 calendar event，并回填 `calendarEventId`。
  3. `update()` 会同步更新关联 calendar event 的 `expireTime`。
  4. `delete()` 会级联删除关联 calendar event。
  5. `complete()` 会把 todo 置为 `COMPLETED`，并同步把关联 calendar event 标记完成。
  6. `initMindMap()` 以 todoId 作为思维导图 ID 初始化 mind map。
- 权限边界来自通用基类：`quiz/backend/src/main/java/com/ck/quiz/base/service/impl/BaseServiceImpl.java` 的 `get/update/delete` 都校验 `createUser == currentUser`；因此旧版 Todo 明确是“个人待办”。
- 自动过期是正式能力，不只是展示状态：
  - `quiz/backend/src/main/java/com/ck/quiz/cron/service/TodoScheduleExpireService.java` 会扫描 `expireTime <= now` 且状态仍为 `SCHEDULED/IN_PROGRESS` 的 todo，并置为 `EXPIRED`。
  - `quiz/backend/src/main/java/com/ck/quiz/cron/exec/TodoScheduleExpireScanTask.java` 使用 `@Scheduled(cron = "0 * * * * ?")` 每分钟扫描一次。
- Todo 还被其他模块消费：
  - `quiz/backend/src/main/java/com/ck/quiz/homework/service/impl/HomeworkServiceImpl.java` 会基于作业内容自动生成待办。
  - `quiz/backend/src/main/java/com/ck/quiz/statistics/service/impl/QuestionBankStatisticsServiceImpl.java` 将 `SCHEDULED + IN_PROGRESS` 数量计入 dashboard 的 `todoCount`。
  - `quiz/backend/src/main/java/com/ck/quiz/calendar/service/impl/CalendarEventServiceImpl.java` 与 Todo 双向同步创建/删除/完成。

范围
- 首批迁移建议纳入以下范围：
  1. Todo 列表页：支持标题、状态、优先级筛选，默认展示待处理（`SCHEDULED`）数据。
  2. Todo 新增/编辑：字段覆盖标题、描述、状态、优先级、开始时间、截止时间、过期时间。
  3. Todo 完成操作：支持列表快捷完成，并同步状态流转。
  4. Todo 删除操作：仅允许删除本人待办，并处理关联日程清理。
  5. Todo 详情查看：已完成/已过期记录只读查看。
  6. 个人数据隔离：所有查询与读写都只面向当前登录用户。
  7. 基础过期机制：保留 `expireTime` 语义，并在 nquiz 中提供等价的自动过期处理方案。
  8. 与日程的最小闭环联动：至少保证 Todo 与 CalendarEvent 的关联字段与状态同步策略可落地，不把 Todo 做成孤立模块。
- 如果 nquiz 当前尚未迁移 Calendar 模块，可先在 Todo 侧预留关联字段与服务接口边界，但要明确这是“有条件完整联动”，不是永久省略。

非范围
- 首版不要求迁移为多成员协作、指派、评论、附件、提醒通知、看板拖拽等项目管理工具能力；旧版本来也没有这些语义。
- 首版不强制迁移“分析生成思维导图”到同一阶段。该能力可作为二期增强，前提是 nquiz 已有稳定的 mind map 模块承接；否则先保留入口规划即可。
- 首版不要求补齐作业自动拆待办、统计面板汇总、日程反向创建 Todo 的所有外围集成，但需要在设计中预留兼容点，避免后续返工。
- 首版不需要还原旧版基于 Arco Modal 的交互细节，也不需要沿用 `/frame/todo` 路由结构。

实现思路
- 路由与页面结构
  - 建议在 nquiz 中落为 App Router 路由：`src/app/(dashboard)/todo/page.tsx`（列表页），必要时补 `src/app/(dashboard)/todo/[id]/page.tsx` 或右侧抽屉详情。
  - 交互上优先使用 Shadcn UI：筛选区 + Data Table + Sheet/Dialog 表单，而不是一个页面里堆三个 Modal。
- 数据建模
  - 新表建议命名为 `quiz_todo`，遵守 nquiz 新增物理表统一 `quiz_` 前缀约定。
  - 建议字段：`id`、`title`、`descr`、`status`、`priority`、`start_at`、`due_at`、`expire_at`、`calendar_event_id`、`created_by`、`updated_by`、`created_at`、`updated_at`。
  - 状态与优先级枚举保持与旧版兼容，避免外围统计/联动语义漂移。
- 服务端实现
  - 使用 Next.js server route / server action + Drizzle ORM。
  - 查询接口应默认附带当前用户条件，禁止客户端传 userId 决定数据归属。
  - 将“完成待办”设计为独立 mutation，而不是依赖通用 update，以便封装状态流转和 calendar 同步。
  - 将“删除待办”的级联逻辑集中在 service 层，避免前端多次串行调用。
- 前端状态与表单
  - 列表查询与变更建议用 TanStack Query 管理缓存失效。
  - 新增/编辑表单建议用 React Hook Form + Zod，统一处理时间字段、标题必填、枚举合法性校验。
  - 默认筛选值沿用旧版：首次进入展示 `SCHEDULED`，但可增加“全部 / 活跃 / 已结束”快捷筛选，优化可用性。
- 时间与过期策略
  - 旧版创建时若未传 `startTime`，会回退到 `dueDate`，再回退到 `now` 用于生成关联日程；nquiz 也应保留这个兜底规则，避免空时间导致联动失败。
  - 自动过期建议不要只依赖页面读取时临时计算，而应保留后端任务或统一扫描机制，确保统计、列表、联动状态一致。
- MindMap 能力迁移建议
  - 旧版 `initMindMap(todoId)` 使用 todoId 直接作为 mindMapId，这种强耦合在 nquiz 中可保留兼容，也可改成单独 relation 表；建议先不要在 Todo 首版里硬绑定实现，除非 MindMap 模块已稳定迁移。

影响点
- 数据层：需新增 `quiz_todo` 表；若同步落 Calendar，需要同时考虑 `quiz_calendar_event` 与双向关联字段。
- 服务层：需新增 Todo repository / service / DTO(schema)，并把“本人数据权限校验”内建进查询与读写逻辑。
- 页面层：需新增 Todo 列表页、表单组件、详情展示组件、筛选模型、状态 tag 映射。
- 集成层：后续会影响 Dashboard 待办计数、作业提取待办、日程模块双向同步、MindMap 初始化入口。
- 状态语义：旧版有从 `PENDING` 对齐到 `SCHEDULED` 的 migration（`V202602082245__align_todo_status.sql`），nquiz 不应重新引入旧状态名，避免语义分叉。

风险/疑问
- 风险1：Calendar 模块尚未迁移时，Todo 是否要先独立上线？
  - 建议：可以先独立上线，但必须保留 `calendarEventId` 字段和 service adapter 边界，避免后续接 Calendar 时大改表结构。
- 风险2：自动过期依赖后端定时任务。nquiz 部署形态若以 serverless 为主，定时扫描实现方式需要重新选型（平台 cron / queue worker / 定时触发 route）。
- 风险3：旧版 `initMindMap` 未显式校验 todo 所属人，只是直接按 id 查 todo 再建 mind map；nquiz 迁移时应补足本人权限校验，避免越权初始化关联资源。
- 风险4：旧版列表筛选只支持标题/状态/优先级，未支持日期维度；如果首版扩展太多筛选条件，容易偏离“菜单粒度闭环优先”的目标。
- 风险5：旧版完成/删除存在与 Calendar 的双向联动，若 nquiz 两边同时迁移但缺少事务/幂等设计，容易出现一边成功一边失败的脏数据。
- 疑问1：Todo 在 nquiz 信息架构中是独立一级菜单，还是归入个人工作台/效率工具分组？这会影响路由分组与导航设计。
- 疑问2：MindMap 是否已确定纳入 nquiz 的迁移范围？若未确定，Todo 页面中的“分析”按钮应先降级为占位入口或隐藏。

建议验收标准
- 功能验收
  1. 当前用户可创建待办，必填标题，默认状态为 `SCHEDULED`、默认优先级为 `MEDIUM`。
  2. 列表默认按创建时间倒序展示，并默认筛出 `SCHEDULED` 数据。
  3. 可按标题关键字、状态、优先级筛选本人待办。
  4. 可编辑未完成待办的标题、描述、状态、优先级、开始时间、截止时间、过期时间。
  5. 可将 `SCHEDULED/IN_PROGRESS/CANCELLED` 待办显式改为完成；完成后列表与详情状态一致。
  6. 已完成和已过期待办可只读查看详情，不允许误编辑核心状态字段（若产品决定允许二次编辑，需单独说明）。
  7. 删除待办后，本人列表中不再出现；若存在关联日程，联动删除或明确进入补偿流程。
  8. 到达 `expireTime` 后，待办会被系统自动标记为 `EXPIRED`，且不会再计入活跃待办统计。
- 权限验收
  9. 用户 A 不能查询、查看、修改、删除用户 B 的待办。
  10. 所有 Todo API/Server Action 不接受前端直接指定归属用户作为权限依据。
- 兼容验收
  11. 状态枚举与优先级枚举与 quiz 旧版保持兼容，不引入新的语义分叉。
  12. 若启用 Calendar 联动，Todo 创建/完成/删除后，关联日程状态与关联关系保持一致。
- 体验验收
  13. 列表与表单交互符合 nquiz 技术栈：Tailwind + Shadcn UI + RHF + Zod + TanStack Query，无遗留旧版 Arco 交互范式。
  14. 页面需明确区分“编辑态”和“只读详情态”，避免旧版通过标题点击隐式切换造成理解成本。

结论
- 该需求本质是“个人待办管理模块迁移”，核心不是复杂任务协作，而是围绕 Todo 实体完成个人任务记录、状态流转、过期治理、与日程的轻量联动。
- nquiz 首版建议优先交付“个人 Todo 列表 + 新增编辑 + 完成删除 + 本人权限隔离 + 过期机制 + Calendar 预留联动”闭环；思维导图初始化、作业自动拆待办、统计面板接入可作为后续增量。
- 保留能力：待办 CRUD、状态/优先级、时间字段、本人数据隔离、完成/过期语义、与日程关联字段。
- 优化能力：页面信息架构、表单体验、默认筛选方式、状态操作清晰度、服务端权限与幂等设计。
- 可重组/延后能力：MindMap 初始化、Homework 自动建待办、Dashboard 统计接入、Calendar 双向全量联动。