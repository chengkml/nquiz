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

## 程凯指定迁移准则

- 按 **功能菜单粒度** 进行迁移。
- 迁移后必须尽量 **完整覆盖 `quiz` 原有功能**。
- 实现方式、样式、交互风格遵循 `Next.js` 技术栈最佳实践即可，不要求复刻旧实现。
- 每次迁移完一个功能，必须主动汇报该功能与原 `quiz` 的差异，包括已覆盖项、未覆盖项和调整原因。
- `nquiz` 新增数据库物理表名统一使用 `quiz_` 前缀，避免与原工程已有表重名。

## 执行原则

- 保留业务能力与业务语义，不盲目复制旧实现。
- 优先保证类型安全、结构清晰与可持续迭代。
- 分阶段迁移，按模块逐步形成可验证闭环。

## 部署约定

- 当前仓库已新增 GitHub Actions 自动部署工作流 `.github/workflows/main.yml`。
- 当前默认部署口径为：`push main` -> GitHub runner 执行 `npm ci && npm run build` -> 基于 `output: "standalone"` 产出可部署包 -> 通过 SSH/SCP 上传服务器 -> 解压到 `releases/<sha>` -> 切换 `current` 软链 -> `systemctl restart` 对应服务。
- 工作流默认使用仓库级 `secrets`：`SERVER_HOST`、`SERVER_USER`、`SERVER_SSH_KEY`；可选 `vars`：`DEPLOY_PATH`、`SYSTEMD_SERVICE`、`KEEP_RELEASES`。
- 当前部署目标明确为 `Nginx` 反向代理前置、`Next.js standalone server.js` 作为 Node.js Web 服务的传统单机部署。
- 当前仓库 `package.json` 的生产启动命令已切换为 `node .next/standalone/server.js`，与 `output: "standalone"` 口径保持一致。

## 技能流程约定

- `cm-nquiz-requirement-develop` 已调整为“阶段化需求开发辅助 skill”，不再把“开发执行”伪装成单脚本自动闭环。
- 正确流程固定为：`query` 待开发需求 -> `start` 领取 1 条并置 `IN_PROGRESS` -> 主智能体基于 `descr` 在 `nquiz` 仓库执行真实开发 -> 过程中调用 `progress` 更新进度 -> 构建通过后调用 `complete` 置 `COMPLETED`。
- 该 skill 查询“待开发需求”时默认且仅允许查询 `OPEN`；不再把 `IN_PROGRESS` 混入待领取列表。
- 该 skill 默认一次只允许 1 条 active requirement；`complete` 前会校验 `start` 之后新增的源码改动，并执行构建命令（默认 `npm run build`）。
- 该 skill 的本地状态文件默认使用 `/tmp/cm-nquiz-requirement-develop-state.json`，避免再依赖技能目录下不可写 runtime。
- 新增项目编排技能 `skills/nquiz-queue-dev`：固定先用 `requirement-query` 查询 `projectName=nquiz` 下的 `OPEN` 需求；若存在待处理项，再进入 `cm-nquiz-requirement-develop` 的 `start -> progress -> complete` 真实开发闭环。
- `skills/nquiz-queue-dev` 已升级为队列循环技能：不再只处理一条需求，也不再把开发职责外包给 `cm-nquiz-requirement-develop`；而是直接内嵌同等开发闭环逻辑，并持续循环处理 `OPEN` 列表直到队列清空。
- `skills/nquiz-queue-dev` 现已增加“强停止门禁”：完成单条需求后不得直接输出终态总结；在任何 final answer 之前，必须重新查询一次 `OPEN` 队列并确认 `activeRequirementId=null` 且 `OPEN=0`，否则必须继续下一条或明确报告 blocker。
- `skills/nquiz-queue-dev` 现提供本地机械门禁脚本 `python3 skills/nquiz-queue-dev/scripts/pre_final_gate.py`；脚本只有在 `activeRequirementId=null` 且 fresh `OPEN=0` 时才返回成功，可用于防止“刚完成一条就提前收尾”。
- `skills/nquiz-queue-dev` 已切换到“忽略历史半成品 active”口径：每次执行默认不续跑上次遗留 `activeRequirementId`，而是直接从最新 `OPEN` 队列领取需求开发。
- `skills/nquiz-queue-dev` 现约定使用独立状态文件 `/tmp/cm-nquiz-queue-dev/state-<RUN_ID>.json` 进行当前运行内的 `start/progress/complete` 串联；`pre_final_gate.py` 终止判定改为只看 fresh `OPEN=0`，不再以 `activeRequirementId` 作为硬阻断。
- `skills/nquiz-queue-dev` 已补齐并发安全约束：每次 run 必须创建唯一 `STATE_FILE`（如 `/tmp/cm-nquiz-queue-dev/state-<RUN_ID>.json`），禁止再使用固定共享状态文件。
- `skills/nquiz-queue-dev` 新增并发领取脚本 `skills/nquiz-queue-dev/scripts/pick_open_with_lock.py`，通过 `/tmp/cm-nquiz-queue-dev/pick.lock` 串行化 `start --pick-first`，降低并发下重复领取同一 `OPEN` 需求的风险。
- `skills/nquiz-queue-dev/scripts/pre_final_gate.py` 默认状态文件已切换到队列命名空间 `/tmp/cm-nquiz-queue-dev/state-default.json`，并继续以 fresh `OPEN=0` 作为唯一终止门禁。
- 在并发执行 `nquiz-queue-dev` 时，构建门禁建议使用独立 dist 目录：`NEXT_DIST_DIR=.next-queue-<RUN_ID> npm run build`，避免多个并发 `next build` 竞争同一 `.next` 产物导致 `_ssgManifest.js` 缺失。
- 当前仓库 `.agents` 目录为只读挂载；新增 repo 自定义技能默认先落到仓库内可写目录 `skills/`，如需全局自动发现再额外复制到 `~/.codex/skills`。

## 已落地迁移模块约定

- `DatasourceManagement` 已在 `nquiz` 首期落地为 `/datasource` 数据接入中心页面。
- 首期已覆盖：数据源列表筛选/分页、CRUD、输入态连接校验、已保存连接测试、schema 列表获取、结构只读预览、确认采集缓存、首页入口跳转。
- 当前实现采用 Next.js App Router + React Hook Form + Zod + TanStack Query；服务端先用本地 Route Handler + mock store 承接交互闭环。
- 为修正旧版副作用语义，前端显式区分“只读预览 schema”与“确认采集并缓存”。
- 真实后端、密码加密存储、导出能力、AI 备注/分组增强暂未接入，作为后续迭代项。
- `BaiduPan` 已在 `nquiz` 首期落地为 `/admin/integrations/baidu-pan` 接入状态页，而非伪文件工作区。
- 首期已覆盖：接入总览、配置完整性检查、授权入口占位、解绑占位、OAuth callback 位点、能力矩阵、管理员边界说明、首页入口跳转。
- 当前实现刻意不提供 mock 目录树/文件列表/上传下载，避免延续旧 quiz“页面很完整但真实接口全未接通”的伪完成感；真实 OAuth、绑定关系、文件操作待后续接入。
- `PriceMonitor` 已在 `nquiz` 首期落地为 `/price-monitor` 个人价格监控工作台。
- 首期已覆盖：商品列表筛选/分页、商品 CRUD、手动采集价格、趋势图、快照历史、预警规则配置、最近预警结果、首页入口跳转。
- 当前实现继续保留 quiz 的“手动采集快照 + 阈值预警”业务语义，不扩张为自动抓价平台；数据层先以 localStorage mock store 承接闭环。
- 与 quiz 的关键收敛：前端明确按“单商品单规则配置”建模；删除商品时联动删除快照、规则、预警日志，避免潜在孤儿数据延续。
- `SubjectManagement` 已在 `nquiz` 首期落地为 `/subjects` 学科管理页。
- 首期已覆盖：统一关键词检索、分页卡片列表、学科 CRUD、英文名用户域唯一性校验、知识点/题目聚合展示、安全删除阻断、首页入口跳转、学科 options 查询键预留。
- 当前实现保留 quiz 的“当前登录用户域内学科主数据”语义，不错误提升为全局唯一；数据层先以 localStorage mock store 承接交互闭环。
- 与 quiz 的关键收敛：修复旧页搜索表单与后端过滤条件错位问题，显式改成一个匹配 `name/label/descr` 的统一关键词；删除时若仍有关联知识点/题目则首版直接阻断，不做静默级联删除。
- `HotSearch` 已在 `nquiz` 首期落地为 `/hot-search` 热搜页。
- 首期已覆盖：来源/标题/时间/只看关注筛选、分页热搜列表、右侧详情区、命中关注主题展示、关注主题新增/编辑/删除/启停/排序、首页入口跳转。
- 当前实现保留 quiz 的“热搜浏览 + 个人关注主题管理”业务语义，数据层先以本地 mock 数据承接闭环，便于后续替换成真实接口。
- 与 quiz 的关键收敛：筛选条件 URL 化；列表与详情负载拆开；关注主题管理改成独立侧边 Sheet，而不是继续堆在旧版单页状态里。
- `PersonalKnowledge` 已在 `nquiz` 首期落地为 `/knowledge/personal` 个人知识工作台。
- 首期已覆盖：我创建的/共享可访问知识集导航、知识集 CRUD、Markdown/文件来源管理、来源处理状态可见、知识集维度问答、首页入口跳转。
- 当前实现明确不复刻旧 quiz 那个只有侧栏和静态输入框的空壳页，而是基于 localStorage mock 数据层把 `KnowledgeSet + KnowledgeSource + KnowledgeScoped Chat` 收敛成单工作台闭环。
- 与 quiz 的关键收敛：把“我加入的”重命名为“共享可访问”，避免误导成真实成员关系；共享知识集首版保持只读；DB 深度处理、向量同步检查、检索测试等高级工具延后，不挤占主路径。
- `KnowledgeSetManagement` 已在 `nquiz` 首期落地为 `/knowledge/sets` 知识集管理页。
- 首期已覆盖：知识集列表筛选/分页、知识集 CRUD、系统内置只读约束、来源 CRUD（FILE/DB/MARKDOWN）、DB 连接测试、检索测试（VECTOR/TEXT）、向量同步检查、知识集问答、首页入口跳转。
- 当前实现通过 localStorage mock store 承接闭环；DB 来源首版仅保留连接配置与测试，不做自动切片向量化；真实向量引擎与跨知识集聚合问答待后续接入。
- `Chat` 已在 `nquiz` 首期落地为 `/chat` + `/chat/[sessionId]` 独立对话工作台。
- 首期已覆盖：会话列表、会话深链、新建/删除会话、模型切换、知识范围切换、流式回复、Markdown 消息展示、参考来源展示、移动端抽屉会话列表、首页入口跳转。
- 当前实现保留 quiz 的“默认按知识范围问答”语义，不把该页扩成无限制自由聊天；数据层先以 localStorage mock store 承接闭环，并直接复用 `PersonalKnowledge` 的可访问知识集/来源数据生成范围与引用。
- 与 quiz 的关键收敛：显式区分“全部可访问知识集”和“单知识集定向问答”；补上 `/chat/[sessionId]` 深链；流式内容按局部状态管理，不再把会话、消息、流式状态和 UI 控制挤进一个巨型页面组件。
- `NotificationSend` 已在 `nquiz` 首期落地为 `/notification/send` 通知发送工作台。
- 首期已覆盖：渠道选择（站内消息/邮件/短信）、发送范围（指定用户/全员）、接收人可用性校验、发送任务创建、任务列表、SSE 日志流、异常日志补偿入口、首页入口跳转。
- 当前实现保留 quiz 的“提交后异步任务执行 + 日志可观测”语义，首版通过 Next.js Route Handlers + 服务端 mock store 承接闭环，并把“全员发送”从旧版隐式语义收敛为显式确认。
- 与 quiz 的关键收敛：统一把 `BROWSER` 渠道文案改成“站内消息”；接收人缺邮箱/手机号时前置阻断并展示跳过原因；失败任务会自动写入 `NotificationExceptionLogs` 数据源，形成发送与补偿联动。
- `NotificationExceptionLogs` 已在 `nquiz` 首期落地为 `/notifications/exception-logs` 通知异常日志页。
- 首期已覆盖：关键字检索、渠道筛选、分页列表、详情抽屉、单条重试、服务端结构化 DTO、首页入口跳转。
- 当前实现不再延续 quiz 旧版“前端直接 JSON.parse messageContent”的脆弱模式；页面只消费 route handler 返回的结构化字段，服务端 mock store 统一处理 payload 解析、不可重试原因和重试结果。
- 与 quiz 的关键收敛：新增原始 payload / 最近重试结果详情视图；不可重试日志会显式说明阻断原因；重试成功后日志会从 ERROR 列表中移除，贴近真实运维台账语义。
- `OrchestrationManagement` 已在 `nquiz` 首期落地为 `/orchestration` 工作台 + `/orchestration/[workflowId]` 编辑器双路由。
- 首期已覆盖：工作流列表筛选、基础信息 CRUD、版本保存、版本发布、轻量画布节点拖拽、连线维护、手动运行、最近运行记录、首页入口跳转。
- 当前实现刻意不照搬 quiz 旧版 `reactflow` 原始图结构，而是统一收敛为标准 graph schema：`nodes[{id,type,name,position,config}] + edges[{id,source,target,condition?}]`，并用 localStorage mock store 承接 workflow/version/run 三层闭环。
- 与 quiz 的关键收敛：首版只暴露并实现真正可运行的一组节点 `start / knowledge / llm / skill / end`，不继续保留旧系统里“界面可拖但后端无执行实现”的节点错配；运行反馈从 toast 升级为可回看的 run summary + step trace。
- `McpToolManagement` 已在 `nquiz` 首期落地为 `/mcp-tool` MCP 工具治理页。
- 首期已覆盖：按关键字/环境/状态/server/分类筛选、详情侧栏、工具 CRUD、Schema/Strategy/Visibility JSON 校验与展示、首页入口跳转。
- 当前实现明确把职责收敛在“已入库工具治理台账”，不负责工具发现；MCP Server 发现/导入能力继续留给后续独立页面迁移。
- 与 quiz 的关键收敛：首版不再暴露旧前端里无真实后端支撑的 enable/disable/clone/metrics/runtime 假能力，只保留真实 CRUD + 状态治理 + 配置维护闭环。
- `AgentManagement` 已在 `nquiz` 首期落地为 `/agent` Agent 配置中心页。
- 首期已覆盖：列表筛选、详情侧栏、Agent CRUD、启用/禁用、复制、Prompt 直写/模板引用、模型绑定与 JSON 参数、MCP 工具选择与排序、首页入口跳转。
- 当前实现明确把该页定位为“配置资产中心”，不承担聊天运行、日志监控、Prompt/模型本体维护；Prompt 模板、模型、工具选项首版通过 mock 引用数据承接闭环。
- 与 quiz 的关键收敛：不再使用旧版单页大 Modal + Tabs 平铺四类配置，而是重构为列表工作台 + 详情侧栏 + 配置弹窗；同时补齐工具排序能力，对齐旧数据层的 `priority` 语义。
- `McpServerManagement` 已在 `nquiz` 首期落地为 `/mcp-server` MCP 服务器管理页。
- 首期已覆盖：按关键字/环境/状态筛选、Server CRUD、健康检查、发现工具、详情侧栏、认证脱敏展示、首页入口跳转。
- 当前实现明确把职责收敛在“Server 接入台账 + 健康检查 + 工具发现入口”，不再把工具治理直接耦合在同一抽屉里；发现动作会同步更新 MCP Tool mock store，并刷新 Agent 工具选项引用链路。
- 与 quiz 的关键收敛：不再沿用旧版“点击名称打开工具抽屉 + 加载工具”耦合交互，而是改成显式动作按钮；同时修正旧系统里“加载工具文案与真实落库行为不一致”的认知偏差。

## 全局构建约定

- `src/app/layout.tsx` 已移除对 `next/font/google` 的 Geist / Geist Mono 远程依赖；当前全局字体改为 `globals.css` 中定义的本地系统字体栈，避免 `next build` 因环境无法访问 Google Fonts 而失败。

## 调度并发配置（供 check-to-dispatcher 读取）

- targetAgent: `nquiz`
- dispatchProjectName: `nquiz`
- maxConcurrency: `10`
