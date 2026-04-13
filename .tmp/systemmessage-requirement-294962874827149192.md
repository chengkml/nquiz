目标需求：[nquiz迁移] SystemMessagePage
需求 ID：294962874827149192

一、目标
在 nquiz（Next.js 重构版）中迁移 quiz 的 SystemMessagePage，形成“当前登录用户的系统消息中心”闭环，并与全局 Header 未读消息入口保持一致的数据语义。迁移目标不是照搬旧 Arco 页面，而是在保留核心业务能力的前提下，用 Next.js App Router + Tailwind CSS + shadcn/ui + TanStack Query 重构为更清晰、可维护、可扩展的消息中心页面。

二、代码定位与现状
1. 旧 quiz 页面入口与路由
- 页面文件：/root/.openclaw/workspace/quiz/frontend/src/pages/SystemMessage/index.tsx
- 页面样式：/root/.openclaw/workspace/quiz/frontend/src/pages/SystemMessage/style/index.less
- 页面 API：/root/.openclaw/workspace/quiz/frontend/src/pages/SystemMessage/api/index.ts
- 前端路由：/root/.openclaw/workspace/quiz/frontend/src/router/index.tsx（/frame/systemmessage）

2. 旧 quiz 顶栏未读消息入口
- 文件：/root/.openclaw/workspace/quiz/frontend/src/components/Layout/index.tsx
- 能力：顶部消息 icon 展示未读数、点击下拉展示最近 10 条未读消息、点击消息弹 Modal、自动标记已读、点击“查看全部”进入 /frame/systemmessage。

3. 旧 quiz 后端接口与数据结构
- Controller：/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/notification/controller/SystemMessageController.java
- Service：/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/notification/service/impl/SystemMessageServiceImpl.java
- DTO：/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/notification/dto/SystemMessageDto.java
- Entity：/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/notification/entity/SystemMessage.java
- Repository：/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/notification/repository/SystemMessageRepository.java
- 浏览器通知通道：/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/notification/service/impl/BrowserChannel.java

4. nquiz 当前基线
- 目前仅有 Next.js 骨架，尚未落地后台布局、消息模块与业务页面：
  - /root/.openclaw/workspace/nquiz/src/app/layout.tsx
  - /root/.openclaw/workspace/nquiz/src/components/providers/app-providers.tsx
  - /root/.openclaw/workspace/nquiz/src/components/providers/query-provider.tsx
- 说明该需求本质上不是“补页面”，而是要定义消息中心在 nquiz 新架构中的页面形态、数据流和与全局 Layout 的协作边界。

三、旧页面真实功能理解
旧 SystemMessagePage 的真实定位是“当前用户消息中心”，不是完整的通知管理后台。

已存在能力：
1. 分页查看当前用户消息列表
- /api/system-message/list
- 支持按状态筛选：all/read/unread
- 后端按 create_date DESC 排序

2. 筛选维度
- 按已读/未读筛选
- 按消息类型筛选（NOTIFICATION / WARNING / SYSTEM / SUCCESS / ERROR / INFO）

3. 查看详情
- 列表点击查看详情弹窗
- 未读消息进入详情时自动标记已读
- 展示标题、内容、类型、创建时间、已读状态、已读时间

4. 已读能力
- 单条标记已读：PUT /api/system-message/{messageId}/read
- 全部标记已读：PUT /api/system-message/read-all

5. 删除能力
- 单条逻辑删除：DELETE /api/system-message/{messageId}
- 全部逻辑删除：DELETE /api/system-message/delete-all

6. 顶栏未读入口与实时更新
- 顶栏通过 /api/system-message/unread/count 拉取未读数
- 顶栏通过 /api/system-message/unread?page=0&size=10 拉取最近未读消息
- WebSocket 订阅 /user/queue/sys_msg，收到 SYS_MSG_NEW 事件后刷新未读数
- BrowserChannel 发送系统消息时写库并推送 WebSocket 事件

四、业务语义与数据结构
SystemMessageDto 关键字段：
- id：消息主键
- userId：接收用户
- title：标题
- content：内容
- type：消息类型
- isRead/readDate：已读状态与已读时间
- priority：优先级（旧页未充分利用）
- status：ACTIVE / DELETED
- senderId：发送人
- linkUrl：关联链接（后端有字段，但旧页基本未消费）
- createDate / expireDate：创建/过期时间

语义判断：
1. 这是“用户个人收件箱”模型，不是公告发布管理模型。
2. 删除是用户侧逻辑删除视角，不是物理删除。
3. 顶栏未读下拉与消息中心页面应共享同一查询语义、已读语义与计数语义。
4. linkUrl 是可扩展字段，说明消息未来可跳转业务详情，但旧版页面尚未完成此交互闭环。

五、范围（本次迁移建议纳入）
建议本需求按“一个完整菜单闭环”落地以下范围：
1. 新建 SystemMessagePage（消息中心页面）
2. 新建消息列表查询、详情展示、单条已读、全部已读、单条删除、全部删除能力
3. 新建消息筛选：已读状态 + 类型
4. 接入 Header 未读 badge / 下拉预览 / 查看全部跳转同一页面
5. 接入统一数据层：Query Keys、Query Hooks、Mutation 后缓存失效或局部更新
6. 预留 linkUrl 跳转能力的前端结构位，但可先做降级策略

六、非范围（本次不建议强行纳入）
1. 管理员发送系统消息后台
- 旧页面并不承担发送职责
- 旧前端 page api 中存在 sendMessage 到 /system-message/send 的历史残留，但当前后端真正管理员发送入口在 /api/notification/send，且属于另一个通知发送场景
- 因此“发送消息后台”不应混入本页面迁移范围

2. 多渠道通知统一管理（EMAIL / SMS / BROWSER）
- 旧后端 NotificationServiceImpl 支持多 channel，但 SystemMessagePage 只消费 BROWSER 写入后的站内消息结果
- 不建议在本需求内上升为通知中心总控台

3. 复杂消息模板、消息分组、全文搜索、批量恢复
- 旧实现无此能力，当前无必要扩 scope

4. 过期消息自动归档/展示策略
- DTO 有 expireDate，但旧页未实现到期态处理
- 可作为后续增强项

七、信息架构与页面设计方向
建议在 nquiz 中将其定义为“消息中心 / Notification Inbox”页面，而不是单纯照搬旧版列表 + 弹窗。

推荐信息架构：
1. 页面头部
- 标题：系统消息
- 摘要区：全部消息数、未读数
- 全局操作：全部标为已读、清空全部（高风险二次确认）

2. 筛选栏
- 状态 Tabs 或 Select：全部 / 未读 / 已读
- 类型 Filter：全部类型 / 信息 / 警告 / 错误 / 成功 / 系统 / 通知
- 可选：仅展示未读快捷切换

3. 主体内容
- 桌面端推荐两种可选方案：
  a. 列表 + 右侧详情双栏（优先）
  b. 单列表 + Sheet/Dialog 详情（实现更快）
- 相比旧版弹 Modal，双栏更适合消息中心语义，也更利于连续处理消息

4. 空态 / 错误态 / 加载态
- 必须单独设计，避免只保留表格空壳

视觉设计方向：
- 使用 shadcn/ui Card、Tabs、Badge、DropdownMenu、AlertDialog、ScrollArea
- Tailwind 统一表达间距、边框、层级
- 类型颜色沿用语义色，但整体风格从旧 Arco 管理台式表格感，升级为更轻量的消息中心样式
- 未读项通过左侧强调条、粗体标题、浅色背景或 dot 提示，不建议仅靠 Tag 区分

八、交互方式建议
1. 消息列表项点击即选中详情
2. 未读消息首次打开详情时自动标记已读
3. 提供显式“标记已读”按钮，兼容用户只浏览列表不点开全文的场景
4. “全部标为已读”直接保留
5. “删除全部消息”保留，但必须提升风险提示等级，避免误触
6. 若消息存在 linkUrl：
- 优先提供“前往相关页面”按钮
- 若 linkUrl 不可识别或页面未迁移，则只展示消息内容并禁用跳转按钮

九、实现思路（nquiz 语境）
1. 路由与页面组织
- 推荐页面路径：src/app/(dashboard)/system-message/page.tsx 或与菜单体系一致的 dashboard 子路由
- 保持页面与 Header 未读入口共用同一消息域模块，不要各自手写请求

2. 前端模块分层
建议拆分：
- src/features/system-message/types.ts
- src/features/system-message/api.ts
- src/features/system-message/query.ts
- src/features/system-message/components/message-list.tsx
- src/features/system-message/components/message-detail.tsx
- src/features/system-message/components/message-filters.tsx
- src/app/(dashboard)/system-message/page.tsx

3. 数据层
- 使用 TanStack Query 管理：
  - message list
  - unread count
  - unread preview list
  - markAsRead / markAllAsRead / delete / deleteAll mutation
- Query Key 统一，保证页面与 Header badge 同步失效更新
- 避免像旧版那样页面和 Layout 分散维护状态

4. 状态管理
- 页面级 UI 状态：当前筛选条件、当前选中消息、详情区开合
- 远端状态：列表、计数、未读预览全部交给 Query
- 如果后续接入 WebSocket，可在事件到来后只 invalidate 对应 query keys

5. WebSocket / 实时能力
- 保留旧语义：收到 SYS_MSG_NEW 后刷新 unreadCount 和 unread preview；若当前页面处于消息中心，可按成本选择：
  a. 先只刷新 badge / preview / 列表
  b. 后续增强为增量插入最新消息
- 第一期优先做 a，减少复杂性

6. API 兼容策略
若 nquiz 仍复用 quiz 后端接口，则第一期直接兼容：
- GET /api/system-message/list
- GET /api/system-message/unread
- GET /api/system-message/unread/count
- GET /api/system-message/{messageId}
- PUT /api/system-message/{messageId}/read
- PUT /api/system-message/read-all
- DELETE /api/system-message/{messageId}
- DELETE /api/system-message/delete-all

十、保留、优化、可延后能力判断
1. 必须保留
- 当前用户消息分页列表
- 未读/已读筛选
- 类型筛选
- 单条已读 / 全部已读
- 单条删除 / 全部删除
- 顶栏未读 badge 与“查看全部”跳转
- WebSocket 驱动的未读数刷新语义

2. 建议优化
- 页面展示从旧 DataManager 表格 + Modal，升级为消息中心式布局
- 页面与 Header 共用 query hooks，去掉重复请求与局部状态分裂
- 更好利用 linkUrl 做业务跳转预留
- 对删除全部做更谨慎的交互确认
- 增加空态、加载态、错误态和可访问性提示

3. 可以延后
- linkUrl 的完整路由映射和跨模块跳转协议
- expireDate 展示与过期逻辑
- 消息优先级可视化
- 消息搜索、分组、批量操作增强
- 实时增量插入而非简单刷新

十一、影响点
1. 页面层
- 新增 system-message 页面与配套组件
- 需要 dashboard/layout/header 结构先具备稳定承载位

2. 全局布局层
- Header 的消息 icon、badge、下拉预览要与新消息中心页面打通
- 需要统一消息域 query keys，避免 Header 与 page 各自维护一套逻辑

3. 网络层/鉴权层
- 需要 nquiz 具备可复用的 fetch/HTTP client 与鉴权注入方案
- 若后续接 WebSocket，需要统一用户级连接与订阅封装

4. 设计系统层
- 需要 shadcn/ui 基础组件：Card、Badge、Button、Tabs、DropdownMenu、ScrollArea、AlertDialog、Skeleton

5. 后端兼容层
- 需要确认 nquiz 是否继续直连 quiz 后端
- 若未来拆分后端，SystemMessage DTO 与接口契约需保持兼容

十二、风险与疑问
1. nquiz 当前尚无后台菜单/布局基座
- 本页面依赖 dashboard layout、header 区、导航体系；若基座未先落，会影响该需求闭环方式

2. linkUrl 语义未闭环
- 后端有 linkUrl 字段，但旧页未真正消费；新页面是否需要支持内部路由跳转，需明确链接规范

3. 实时链路在 nquiz 侧尚未搭建
- 旧 quiz 使用 /user/queue/sys_msg + SYS_MSG_NEW 事件；nquiz 是否继续沿用 STOMP/WebSocket，需先定协议

4. “删除全部”是否继续保留
- 旧页有此能力，但在新体验中较高风险；若保留，必须做强确认与明确文案

5. 页面命名需要统一
- 旧菜单叫 systemmessage，页面标题叫 SystemMessagePage，路由是 /frame/systemmessage，命名风格不一致
- nquiz 建议统一为 system-message（路由/目录）+ SystemMessagePage（组件名）

6. 顶栏未读预览数量策略
- 旧版固定 10 条，nquiz 是否保持一致可继续沿用，暂不必额外设计

十三、建议验收标准
1. 页面可在 nquiz 新路由中正常访问，且菜单入口与 Header“查看全部”都能到达同一页面
2. 能正确分页展示当前登录用户消息，默认按创建时间倒序
3. 能按“全部/未读/已读”筛选，能按消息类型筛选
4. 点击消息可查看详情，未读消息首次查看后自动变为已读
5. “标记全部已读”后，页面列表、Header badge、未读预览同步更新
6. 支持单条删除与全部删除，且有明确二次确认
7. Header 能显示未读数，点击可看到最近未读消息预览
8. 收到 SYS_MSG_NEW 实时事件后，Header 未读数至少能刷新；若消息中心页面打开中，列表可刷新或重新拉取
9. 页面样式采用 nquiz 新栈（Tailwind + shadcn/ui），不再沿用旧 Arco DataManager 实现
10. Query 层具备统一 key 设计，消息页面与 Header 不出现请求逻辑重复散落

十四、建议实施顺序
1. 先补 dashboard layout / header / menu 基座
2. 再落消息域 API + query hooks
3. 先做 Header badge + 下拉预览 + 页面列表闭环
4. 再补详情区、删除能力、linkUrl 跳转预留
5. 最后接入 WebSocket 刷新

十五、摘要
该需求应被定义为“nquiz 的用户消息中心迁移”，核心不是照搬旧表格页，而是把 quiz 中分散在 SystemMessagePage 与 Header Dropdown 的消息能力整合为一个统一消息域。建议保留列表/筛选/已读/删除/未读 badge/实时刷新等核心语义，优化为 Next.js + TanStack Query + shadcn/ui 的消息中心结构，并把管理员发送、多渠道通知管理、过期策略等能力明确排除或延后。