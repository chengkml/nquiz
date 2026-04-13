# [nquiz迁移] ApiTester

## 1. 目标
- 在 `nquiz`（Next.js 重构版）中新增一个面向内部研发/调试场景的 API 调试页，用于快速发起 HTTP 请求、查看响应、复制 cURL，并降低联调成本。
- 保留 `quiz` 现有的核心调试能力：HTTP 方法选择、URL/Query/Header/Body 编辑、响应查看、自动注入登录态 Token、Swagger 端点自动发现、cURL 导出。
- 在保留核心能力的前提下，按 `nquiz` 当前技术栈重构为更稳定、可维护、可扩展的实现，避免直接照搬旧页面的 Arco + 本地状态大组件写法。

## 2. 现状（基于真实代码）
### 2.1 quiz 现有页面位置与路由
- 页面组件：`/root/.openclaw/workspace/quiz/frontend/src/pages/ApiTester/index.tsx`
- 页面样式：`/root/.openclaw/workspace/quiz/frontend/src/pages/ApiTester/index.less`
- 路由注册：`/root/.openclaw/workspace/quiz/frontend/src/router/index.tsx`
  - `path: "api-tester"`
  - `requiredPath: "api-tester"`
- 原始路由语义与需求描述一致：`/frame/api-tester`

### 2.2 quiz 页面真实能力
从 `frontend/src/pages/ApiTester/index.tsx` 可确认页面并不是面向外部开放的 API 平台，而是一个“登录态下的内部 API 调试工具”，当前具备：
1. **HTTP 请求构造**
   - 支持 `GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS`
   - 支持 URL 输入
   - 支持 Query Params 动态增删改
   - 支持 Headers 动态增删改
   - 支持 Body JSON 编辑（Monaco）
2. **响应查看**
   - 展示 `status/statusText`
   - 展示耗时 `time`
   - 展示返回体大小 `size`
   - 支持响应 Body 与 Headers 分 Tab 查看
3. **认证辅助**
   - 默认从 `localStorage.getItem('token')` 读取 token，并自动补一个 `Authorization: Bearer xxx` Header
   - 同项目通用请求层也使用相同 token 机制：`/root/.openclaw/workspace/quiz/frontend/src/utils/request.js`
4. **Swagger 端点自动发现**
   - 前端会尝试请求 `/v3/api-docs`、`/api/v3/api-docs`、`/quiz/v3/api-docs`
   - 成功后把 `paths` 解析为 AutoComplete 候选项
   - 后端真实配置：`/root/.openclaw/workspace/quiz/backend/src/main/resources/application.yml`
     - `springdoc.api-docs.path: /api/v3/api-docs`
   - 后端安全放行：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/config/SecurityConfig.java`
     - 放行 `/swagger-ui/**`、`/v3/api-docs/**`、`/swagger-ui.html`
5. **cURL 导出**
   - 可根据当前 method/url/header/body 生成 cURL 命令并复制
6. **超时控制**
   - 前端通过 `AbortController` + `setTimeout` 实现请求超时
7. **面向编排模块的 datasetContext 注入（定制增强）**
   - 启用后，会把 `datasetIds` 和 `variables` 注入到请求体的 `triggerParams` / `datasetContext`
   - 页面提示语已明确该能力面向“编排/原子组件测试”
   - 对应前端类型：`/root/.openclaw/workspace/quiz/frontend/src/types/orchestration.ts`
   - 对应后端 DTO：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/orchestration/dto/OrchestrationStartRequest.java`
   - 对应后端消费逻辑：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/orchestration/service/impl/OrchestrationWorkflowServiceImpl.java`
   - 说明该页不只是“纯 Postman 替代品”，还承担了编排工作流调试入口的一部分职责

### 2.3 现有实现方式的特点与问题
1. **单文件过大**
   - `ApiTester/index.tsx` 集中处理表单状态、Swagger 拉取、请求构造、JSON 处理、响应展示、datasetContext 注入，后续扩展成本高。
2. **几乎全量 useState 驱动**
   - 缺少统一 schema 与表单抽象，URL/Header/Params/Body 的状态边界不清晰。
3. **直接浏览器 fetch 任意 URL**
   - 当前方案虽然简单，但会受到浏览器 CORS、Cookie/凭证隔离、跨域预检等限制；对“内部联调”够用，但并不是稳定的服务端代理方案。
4. **Swagger 路径兜底较粗糙**
   - 通过多路径猜测获取 OpenAPI 文档，缺少环境级配置收敛。
5. **datasetContext 能力埋在通用 HTTP 调试里**
   - 这是有业务语义的能力，但当前交互表达不够清晰，容易让普通接口调试与“编排触发调试”混在一起。

## 3. nquiz 当前可承接现状
当前 `nquiz` 仍处于 Next.js 骨架阶段，尚无现成业务页可直接复用：
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/providers/app-providers.tsx`
- `src/components/providers/query-provider.tsx`
- `src/lib/query/query-keys.ts`
- `src/lib/forms/login-schema.ts`

已确认 `nquiz` 已具备的基础能力：
- Next.js App Router
- React Query Provider 已接入
- RHF + Zod / Tailwind / Framer Motion / Lucide 已在依赖中具备落地条件（见 `package.json`）

结论：**该需求在 nquiz 里属于“从 0 到 1 的迁移分析”，不是已有页面微调。**

## 4. 范围
### 4.1 本次迁移建议纳入范围
1. 新增一个内部使用的 API 调试页（建议路由：`/tools/api-tester`）
2. 请求构造能力
   - Method / URL
   - Query Params
   - Headers
   - Body（优先 JSON，保留原始文本模式扩展位）
3. 响应展示能力
   - 状态码
   - 耗时
   - 响应大小
   - Response Body / Headers
4. 登录态注入能力
   - 自动携带当前用户 token（可开关）
5. Swagger/OpenAPI 端点发现能力
   - 拉取配置好的 api-docs 地址
   - 生成接口候选列表
6. cURL 复制能力
7. datasetContext 调试增强能力
   - 但建议重构为“高级调试选项”或“编排调试扩展区”，不要和普通请求配置完全混在一起
8. 基础错误态/空态/加载态

### 4.2 可延后范围
1. 请求历史记录 / 收藏夹 / 最近使用
2. 多环境切换（dev/test/prod）
3. 多 Body 类型（form-data / x-www-form-urlencoded / binary）
4. 服务端代理执行请求
5. 批量请求 / 场景串联 / 断言测试
6. 响应 diff / 快照保存
7. WebSocket / SSE 专项调试

## 5. 非范围
- 不把它升级成完整 Postman / Apifox 替代品
- 不在本次迁移中顺带建设 API 文档中心
- 不做接口自动化测试平台
- 不做通用鉴权管理后台
- 不把编排调试、JWT 生成、OpenAPI 浏览器等全部混成一个超大“开发者中心”页面

## 6. 信息架构与页面定位建议
建议在 `nquiz` 中将其明确归类为 **开发/工具类页面**，而非普通业务菜单页。

建议页面结构：
1. **顶部请求栏**
   - Method Select
   - URL Input / Endpoint Combobox
   - 刷新接口列表按钮
   - Copy cURL 按钮
   - Send 按钮
2. **中部配置区（Tabs）**
   - Params
   - Headers
   - Body
   - cURL Preview
   - Advanced（放 datasetContext、超时、鉴权开关）
3. **底部响应区**
   - 状态摘要条（status / time / size）
   - Response Body
   - Response Headers
4. **高级调试区**
   - `autoAddAuth`
   - `timeout`
   - `datasetContext`（仅当调试编排/工作流接口时启用）

这样比旧版更清晰：**普通 HTTP 调试是默认主路径，编排调试增强是高级能力，不再默认挤在主界面中心。**

## 7. 视觉设计方向与样式体系建议
- 使用 `Tailwind CSS` + `shadcn/ui` 重构，不复用旧 Arco 风格。
- 页面建议采用左右/上下分区的工具台风格：
  - 上：请求构造
  - 下：响应结果
- 保持“开发工具感”，但避免过深色编辑器风格霸屏。
- Monaco 可保留为增强型 JSON 编辑器，但如果当前 nquiz 迁移阶段想先降低依赖复杂度，也可以第一版先用 textarea + JSON 格式化按钮，第二版再换 Monaco。
- 图标统一用 `Lucide React`，避免旧系统图标风格混入。
- 动画仅用于面板切换、请求中状态、响应结果进入反馈。

## 8. 实现思路（nquiz 语境）
### 8.1 页面分层建议
建议拆成以下结构，而不是一个大文件：
- `src/app/tools/api-tester/page.tsx`
- `src/components/api-tester/request-builder.tsx`
- `src/components/api-tester/endpoint-autocomplete.tsx`
- `src/components/api-tester/params-editor.tsx`
- `src/components/api-tester/headers-editor.tsx`
- `src/components/api-tester/body-editor.tsx`
- `src/components/api-tester/advanced-options.tsx`
- `src/components/api-tester/response-panel.tsx`
- `src/lib/api-tester/build-request.ts`
- `src/lib/api-tester/build-curl.ts`
- `src/lib/api-tester/swagger.ts`
- `src/lib/api-tester/dataset-context.ts`
- `src/lib/query/query-keys.ts` 中补充 `apiDocs` 等 query key

### 8.2 状态管理建议
- **表单状态**：使用 `React Hook Form + Zod`
  - 统一约束 method/url/timeout/header/param/body/datasetContext 输入结构
- **服务端状态**：使用 `TanStack Query`
  - OpenAPI 文档拉取、接口候选缓存
- **请求发送**：保留显式点击发送，不走 query 自动请求
  - 因为这是命令式行为，适合用 mutation / action handler

### 8.3 请求执行方案建议
优先建议两阶段：
1. **第一阶段：浏览器端直连方案**
   - 行为与 quiz 保持一致，迁移成本低
   - 快速完成功能闭环
2. **第二阶段：按需要增加服务端代理模式**
   - 解决跨域与敏感头控制问题
   - 可引入更稳定的内部联调能力

也就是说，本次分析建议：**先保留“浏览器直发”为默认行为，不在第一版硬塞服务端代理。**

### 8.4 鉴权方案建议
- 保留“自动注入 Bearer Token”的核心体验。
- 但不要在组件里直接散落读取 `localStorage`。
- 建议统一封装 `auth client store / token getter`，由 ApiTester 调用。
- 这样后续若 `nquiz` 切换到 cookie-session、server action、BFF token relay，不需要重写页面主体。

### 8.5 OpenAPI 端点发现建议
- 不再前端写死多组猜测路径。
- 建议在 `nquiz` 里通过配置统一声明：
  - `NEXT_PUBLIC_API_DOCS_URL` 或环境配置映射
- 页面只消费配置后的最终地址。
- 若配置缺失，则降级为手动 URL 输入，不阻塞页面使用。

### 8.6 datasetContext 能力重构建议
这是本页面最需要保留但也最需要“重新表达”的部分。

保留原因：
- 旧代码明确说明它服务于“编排/原子组件测试”场景；
- 后端 `OrchestrationStartRequest` 和 `OrchestrationWorkflowServiceImpl` 已真实消费该结构，不是伪功能。

重构建议：
- 将其放入 `Advanced > Dataset Context` 折叠区
- 明确提示仅对特定接口有效（尤其是工作流启动类接口）
- 注入逻辑封装为纯函数，避免散在页面事件里
- 如果 Body 非合法 JSON，明确阻止注入并提示原因

## 9. 影响点
### 9.1 前端影响
- 新增 App Router 页面与一组调试组件
- 新增开发工具类 UI 组件组合
- 新增 token 读取封装/请求组装工具
- 新增 OpenAPI 拉取逻辑与 query key

### 9.2 配置影响
- 需要在 nquiz 明确 API base URL 与 api-docs URL 配置方式
- 若未来支持服务端代理，需要额外补环境变量与代理路由

### 9.3 权限与菜单影响
- 旧系统通过 `requiredPath: "api-tester"` 进行菜单权限控制
- nquiz 迁移时需确认：
  1. 是否仍需要菜单级权限控制
  2. 该页面是否只对管理员/研发角色可见
- 若不做权限约束，会把内部联调工具暴露给普通业务用户，存在安全与误用风险

### 9.4 技术债影响
- 若直接复制旧实现，会把“大组件 + useState 堆积 + 环境路径猜测”一并迁入 nquiz
- 建议本次迁移直接完成结构升级

## 10. 风险 / 疑问
1. **跨域风险**
   - 若 nquiz 与目标 API 域不一致，浏览器直发会受 CORS 限制。
2. **认证来源未最终确定**
   - 当前 nquiz 还未形成完整登录态存储方案；需确认 token 存储方式是否延续旧逻辑。
3. **OpenAPI 地址是否稳定**
   - quiz 现状同时兼容多个路径猜测，但 nquiz 最好统一成单一配置源。
4. **datasetContext 适用边界需确认**
   - 当前看主要用于编排启动类接口，但是否还有其他接口依赖这套注入语义，需要业务再确认。
5. **是否需要请求历史**
   - 对真实使用体验影响较大，但不是首版必需；需确认是否纳入后续阶段。
6. **Body 编辑器选型**
   - Monaco 体验更好，但接入成本更高；首版若要追求迁移效率，可先用简化版 JSON 编辑体验。

## 11. 建议验收标准
### 11.1 核心功能验收
1. 可选择 `GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS`
2. 可输入或选择接口路径并发起请求
3. 可编辑 Query Params / Headers / Body
4. 可查看响应状态码、耗时、响应大小、响应头、响应体
5. 可一键复制当前请求对应的 cURL
6. 可手动开关“自动注入 Token”
7. 可从配置好的 OpenAPI 文档成功加载接口候选列表
8. datasetContext 开启后，可正确注入到目标请求体，并对非法 JSON 给出明确报错

### 11.2 工程质量验收
1. 页面采用 App Router 组织，不落回旧式页面堆砌
2. 表单输入结构有 Zod schema 约束
3. OpenAPI 拉取使用 Query 缓存，不靠散落 `useEffect` 手搓状态
4. 请求构造、cURL 生成、datasetContext 注入都有独立纯函数封装
5. 页面组件拆分清晰，无单个超大业务组件

### 11.3 交互体验验收
1. 普通 HTTP 调试路径清晰，用户无需理解 datasetContext 也能直接使用
2. 高级调试能力可发现但不打扰普通联调
3. 请求失败、超时、JSON 非法、OpenAPI 拉取失败时都有明确提示
4. 页面在桌面宽屏下具备良好的左右/上下布局，在窄屏下可折叠/换行

## 12. 保留 / 优化 / 延后结论
### 12.1 保留的能力
- HTTP 请求调试
- 自动带登录态 Token
- Swagger/OpenAPI 端点自动发现
- cURL 导出
- datasetContext 注入（编排调试增强）

### 12.2 优化的能力
- 组件拆分与状态建模
- 页面信息架构
- 高级调试项表达方式
- OpenAPI 地址配置方式
- token 读取封装方式

### 12.3 可延后的能力
- 请求历史/收藏
- 多环境切换
- 服务端代理模式
- 多 Body 类型扩展
- 自动化断言与测试场景

## 13. 建议结论
`ApiTester` 在 `nquiz` 中应被定义为 **内部开发调试工具页**，不是普通业务 CRUD 页面。迁移时不建议照搬旧 Arco 大组件实现，而应保留其核心调试语义后，按 Next.js + RHF + Zod + TanStack Query 的分层方式重构。

首版建议以“浏览器直发 + OpenAPI 端点发现 + Token 自动注入 + datasetContext 高级调试”形成闭环，先把 `quiz` 当前真实可用能力迁入 `nquiz`；请求历史、服务端代理、多环境、多协议支持等能力放到后续迭代。