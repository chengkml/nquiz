目标
- 将 quiz 旧版“通知异常日志页”迁移为 nquiz 的 Next.js 页面，保留“查看通知发送失败日志 + 按关键字检索 + 单条重试发送”核心闭环。
- 在不丢失业务语义的前提下，修正旧版页面把 messageContent 放在前端临时 JSON.parse 的实现方式，改为服务端统一做结构化映射，降低页面脆弱性。
- 迁移后页面建议定位为通知中心下的异常日志子页，而不是孤立页面；建议新路由为 `/notifications/exception-logs`（或 `/notification/exception-logs`，需与最终菜单体系统一）。

现状
1. 旧版页面定位
- 路由：`quiz/frontend/src/router/index.tsx` 中存在 `path: "notification-exception"`，挂在 `/frame/notification-exception`，`requiredPath: "notification"`，说明它与通知发送页共用同一权限域，而不是独立权限模块。
- 页面文件：`quiz/frontend/src/pages/Notification/ExceptionLogPage.tsx`。

2. 旧版前端真实能力
- 页面只做一张异常日志表格，字段为：渠道类型、发送人、接收人、标题、异常信息、发送时间、操作。
- 搜索条件只有一个关键字输入框，文案是“渠道/内容/异常信息”。
- “发送人 / 接收人 / 标题”并不是后端直接返回的结构化字段，而是前端通过 `parseMsg(record.messageContent)` 从 JSON 字符串里临时解析出来。
- 操作只有“重试”单动作，触发 `retryErrorLog(record.id)`。
- 前端接口在 `quiz/frontend/src/pages/Notification/api.ts`：
  - `getErrorLogs(params)` -> `GET /notification/log/error`
  - `retryErrorLog(id)` -> `POST /notification/log/retry/{id}`

3. 旧版后端真实能力
- 控制器：`quiz/backend/src/main/java/com/ck/quiz/notification/controller/NotificationLogController.java`
  - `GET /api/notification/log/error`：分页查询 ERROR 级别日志，支持 `page`、`size`、`keyWord`
  - `POST /api/notification/log/retry/{id}`：按日志 ID 重试发送
- 日志实体：`quiz/backend/src/main/java/com/ck/quiz/notification/entity/NotificationLog.java`
  - 表名：`notification_log`
  - 字段：`id`、`channelType`、`messageContent`、`errorMessage`、`level`、`createdAt`
  - 只有 `channel_type`、`created_at` 索引，没有针对关键字检索的结构化字段
- 查询服务：`quiz/backend/src/main/java/com/ck/quiz/notification/service/NotificationLogService.java`
  - 仅查询 `level = ERROR`
  - 关键字检索直接对 `channel_type / message_content / error_message` 做 `LOWER LIKE`
  - 返回值本质还是原始日志对象，没有展开 sender/recipient/title
- 异常日志写入：`quiz/backend/src/main/java/com/ck/quiz/notification/service/NotificationDispatcher.java`
  - 找不到渠道，或渠道发送抛异常时，会把 `NotificationMessage` 序列化后写入 `notification_log`
- 重试机制：`NotificationLogService.retrySend`
  - 从 `messageContent` 反序列化出 `to/title/content/channelType/type/senderId`
  - 再重建 `NotificationMessage` 调 `notificationDispatcher.dispatch(message)`
  - 也就是说，旧版“重试”强依赖 `messageContent` JSON 结构完整可逆

4. nquiz 当前现状
- 当前 nquiz 代码库还是基础骨架，`src/app` 下只有首页与全局 provider，尚无通知模块页面、无通知日志 schema、无通知相关 route handler。
- 已有基础能力主要是：Next.js App Router、TanStack Query Provider、Drizzle 依赖已安装，但尚未建立通知模块的数据层与页面层。
- 因此本需求在 nquiz 语境下是“从 0 到 1 的迁移分析”，不是对现有通知异常日志页做局部修订。

范围
首版建议纳入以下范围：
1. 菜单与路由
- 在 nquiz 建立通知中心下的异常日志页入口。
- 保持与通知发送页同一权限域语义，避免误建成独立系统管理页。

2. 异常日志列表
- 分页查询 ERROR 级别通知日志。
- 至少展示：渠道类型、发送人、接收人、标题、异常信息、发送时间。
- 支持关键字搜索，首版兼容旧能力；如时间允许可补充渠道筛选和时间范围筛选。

3. 单条重试
- 对单条异常日志进行确认后二次发送。
- 重试完成后刷新列表，并给出成功/失败反馈。

4. 结构化详情能力（建议首版一并做）
- 增加详情抽屉/弹窗，展示原始 payload、错误全文、最近重试结果。
- 这一点不是旧版强制能力，但它能明显降低只靠表格截断文本排查问题的成本，建议作为首版优化保留。

5. 最小后端闭环
- nquiz 侧必须同时具备“异常日志查询 + 单条重试”服务端能力。
- 如果通知发送主链路尚未迁移，至少要明确日志数据来源与重试能力接到哪里，否则页面只能是空壳。

非范围
- 不包含“通知发送页”完整迁移；那是相邻菜单，不是本页本体。
- 不包含成功日志/全量通知历史中心。
- 不包含批量重试、批量删除、导出、归档、统计看板。
- 不包含通知模板管理、通知渠道配置管理、附件回放、富文本重试编辑。
- 不要求首版支持对历史坏数据做自动修复；坏数据只需能识别并提示不可重试原因。

页面定位 / 信息架构 / 视觉方向
1. 页面定位
- 这是“通知链路故障排查台账”，核心任务是“快速发现失败记录并触发补发”，不是普通内容列表页。

2. 信息架构
- 顶部：页面标题 + 简介 + 刷新按钮。
- 筛选区：关键字、渠道类型（建议）、时间范围（建议）。
- 主体：异常日志表格。
- 右侧或弹层详情：查看原始 payload / 错误详情 / 重试记录。
- 行级动作：重试。

3. 视觉与样式方向
- 采用 `shadcn/ui` 的 `Card + Table + Badge + Button + AlertDialog + Sheet/Dialog` 组合。
- 渠道类型用 Badge 区分，异常信息默认单行截断，详情里完整展示。
- 失败态强调可读性与排障效率，不做复杂动画；只对抽屉/对话框使用轻量 Framer Motion 过渡即可。
- 样式统一使用 Tailwind，不再延续旧版 Arco + less 写法。

数据流 / 状态管理
1. 前端
- 查询参数放 URL search params，保证刷新可复现筛选状态。
- 列表使用 TanStack Query 管理分页与筛选缓存。
- 重试动作使用 Mutation，成功后 invalidate 列表 query。
- 简单筛选可直接受控表单；若加入时间范围/高级筛选，可用 RHF + Zod 做 schema 约束。

2. 服务端
- 建议由 nquiz 自己提供通知日志查询与重试 API/Server Action，而不是让页面直接拼装旧 Java DTO。
- 服务端统一把原始日志转换为页面 DTO：
  - `channelType`
  - `senderId`
  - `recipient`
  - `title`
  - `errorMessage`
  - `createdAt`
  - `rawPayload`
  - `retryable`
- 这样可以避免旧版“前端 JSON.parse messageContent”的脆弱实现。

实现思路
方案建议按“先兼容旧语义，再做结构化升级”推进。

一、数据模型
- 若 nquiz 直接建设新库表，遵守物理表前缀约定，建议新表为 `quiz_notification_log`。
- 首版最少字段可与旧版对齐：
  - `id`
  - `channel_type`
  - `message_payload`（推荐 `jsonb`；兼容时也可 text）
  - `error_message`
  - `level`
  - `created_at`
- 为降低页面解析成本，建议补充可检索结构化字段：
  - `sender_id`
  - `recipient`
  - `title`
  - `retry_count`
  - `last_retry_at`
  - `last_retry_result`
- 若首版时间有限，可先在服务端查询层解析 payload 生成 DTO，不强制首版马上补齐所有结构化列；但中期建议落表，避免全文 LIKE 与 JSON 反序列化成为瓶颈。

二、后端/服务端能力
- 查询：提供异常日志分页查询接口，默认只看 `ERROR`。
- 检索：首版兼容关键字检索；若已落结构化列，优先搜结构化字段，再补原始 payload。
- 重试：按日志 ID 读取原始 payload，校验必要字段完整后重新 dispatch。
- 防御：对 payload 解析失败、channel 缺失、接收人为空等情况返回明确错误原因，而不是统一“重试失败”。

三、前端页面拆分
建议目录（示意）：
- `src/app/(dashboard)/notifications/exception-logs/page.tsx`
- `src/features/notifications/components/exception-log-table.tsx`
- `src/features/notifications/components/exception-log-filters.tsx`
- `src/features/notifications/components/exception-log-detail-sheet.tsx`
- `src/features/notifications/api/get-exception-logs.ts`
- `src/features/notifications/api/retry-exception-log.ts`
- `src/server/db/schema/notification-log.ts`

四、交互细节
- 表格行点击打开详情抽屉，避免旧版只能看截断内容。
- 重试按钮弹出确认框，防止误触。
- 重试成功后，若该条不再是 ERROR，可从当前列表消失；这是合理行为，需要在交互提示里说明。
- 对不可重试日志（payload 缺字段 / 渠道已下线）置灰按钮并给出原因提示，会比旧版直接尝试后失败更友好。

保留 / 优化 / 可延后能力
1. 保留
- 异常日志分页查询
- 关键字搜索
- 单条重试
- 基于通知模块权限访问

2. 优化
- 由服务端统一解析 payload，前端不再直接 JSON.parse `messageContent`
- 增加详情抽屉，支持查看原始 payload 与完整错误信息
- 更清晰的错误提示与不可重试状态
- 视情况补充渠道筛选、时间范围筛选

3. 可延后
- 批量重试
- 导出日志
- 成功/失败统计图表
- 重试审计历史
- 全量通知日志中心整合

影响点
1. 页面层
- 新增通知异常日志页、表格组件、详情组件、查询/重试 hooks。

2. 服务端层
- 新增通知日志查询与重试接口/服务。
- 若通知发送链路尚未迁移，需要同步补上 dispatch/logging 接口，至少保证本页不是死页面。

3. 数据层
- 新增 `quiz_notification_log`（或兼容映射旧结构）。
- 若做结构化升级，还会影响索引设计与查询 DTO。

4. 权限与导航
- 菜单应挂在通知中心下，并沿用“notification”权限语义。
- 需要确认 nquiz 最终权限系统如何表达这一菜单，不要把异常日志误放到系统配置域。

风险 / 疑问
1. 当前 nquiz 尚未迁移通知主链路
- 如果没有新的 dispatch/logging 机制，这个页面会缺少真实数据来源，重试也无从执行。
- 需要确认本需求是否允许首版先接旧服务，还是必须在 nquiz 内自建完整通知链路。

2. 旧版重试强依赖 `messageContent` JSON 可逆
- 历史日志如果 payload 缺字段、字段名变更、序列化失败，旧逻辑就无法可靠重试。
- nquiz 首版应把“不可重试原因”显式暴露出来，而不是继续黑盒失败。

3. 搜索性能与可维护性
- 旧版对 `message_content` 做全文 LIKE，数据量上来后会比较弱。
- 如果该模块未来日志量大，建议尽早结构化字段 + 建索引。

4. 权限边界未完全明确
- 旧版只是复用 `requiredPath: notification`，但 nquiz 新权限模型是否仍按菜单 path 控制，需要确认。

5. 渠道枚举与 payload 结构可能继续演进
- 邮件、短信、浏览器通知字段并不完全对称，页面 DTO 需要做兼容转换，而不是把底层结构直接泄漏到 UI。

建议验收标准
1. 路由与页面
- 能通过 nquiz 菜单进入通知异常日志页，页面归属通知中心，权限语义正确。

2. 列表查询
- 默认仅展示异常通知日志。
- 支持分页与关键字搜索。
- 列表至少正确展示：渠道类型、发送人、接收人、标题、异常信息、发送时间。

3. 详情查看
- 能查看完整错误信息与原始消息 payload。
- 对 payload 解析异常的历史数据有清晰兜底显示，不出现页面崩溃。

4. 重试闭环
- 对可重试日志点击“重试”后，能够成功触发重新发送。
- 重试成功时给出成功提示，并刷新列表。
- 重试失败时能展示明确失败原因。

5. 工程实现
- 前端采用 Next.js App Router + Tailwind + shadcn/ui。
- 列表状态与重试状态通过 TanStack Query 管理。
- 不再在前端直接解析原始日志 JSON 作为唯一展示来源，结构化映射放到服务端完成。

结论
- 该需求不是复杂业务重构，核心是“异常日志排障 + 单条补发”闭环，但它依赖通知发送链路本身，不能被当成纯前端列表页处理。
- nquiz 首版应优先完成“异常日志查询 + 结构化展示 + 单条重试 + 详情抽屉”最小闭环；成功日志中心、批量操作、统计看板可以后续扩展。
- 从迁移价值看，最关键的重构点不是 UI，而是把旧版前端对 `messageContent` 的临时 JSON.parse，收敛为服务端稳定 DTO，这样后续通知模块才更可持续。