结论：`JwtGenerator` 在旧 `quiz` 中不是业务功能页，而是一个**登录后内部人员使用的 JWT 调试工具页**。它的真实能力非常聚焦：输入 `userId`，调用受保护接口生成一个 Bearer Token，便于手工联调和接口测试。迁移到 `nquiz` 时，建议保留“内部调试发 token”这条能力，但不要把它当作普通业务菜单页照搬；更合适的定位是 **devtools / admin-only 工具页**，并且要补上稳定签名密钥、权限边界和审计意识。

一、目标
1. 在 `nquiz` 中保留“为指定用户快速生成测试用 JWT”的内部调试能力，服务于接口联调、手工验证、问题排查。
2. 迁移目标是 Next.js 重构版 `nquiz`，因此页面实现应符合 `App Router + Tailwind + shadcn/ui + RHF/Zod + TanStack Query` 的工程基线。
3. 在保留核心能力的前提下，提升权限控制、结果表达和环境隔离，避免旧实现的安全隐患直接继承。

二、现状
1. 旧前端页面位于：
   - `../quiz/frontend/src/pages/JwtGenerator/index.tsx`
   - `../quiz/frontend/src/pages/JwtGenerator/api/index.ts`
2. 旧路由位于：
   - `../quiz/frontend/src/router/index.tsx`
   - 路由项为 `path: "jwt-generator"`，原页面路径语义是 `/frame/jwt-generator`。
3. 旧后端接口位于：
   - `../quiz/backend/src/main/java/com/ck/quiz/jwt/controller/JwtController.java`
   - 接口为 `POST /api/jwt/generate?userId=...`，直接返回纯字符串 token。
4. 旧页面真实交互非常简单：
   - 一个 `userId` 输入框；
   - 点击“生成 Token”后调用接口；
   - 成功后展示 token 原文；
   - 支持复制 token；
   - 支持复制完整请求头 `Authorization: Bearer <token>`。
5. 旧实现没有历史记录、没有 claims 可视化、没有自定义过期时间、没有角色选择，也没有批量生成；它就是单点生成工具。
6. 旧鉴权语义不是匿名工具：
   - `../quiz/backend/src/main/java/com/ck/quiz/config/SecurityConfig.java` 中，`/api/jwt/**` 不在匿名白名单里，命中的是 `anyRequest().authenticated()`；
   - 说明该工具默认只给已登录内部用户使用，不是公开页面。
7. 旧 JWT 生成逻辑位于：
   - `../quiz/backend/src/main/java/com/ck/quiz/utils/JwtUtil.java`
   - 特征是：
     - `subject = userId`
     - 有效期 7 天
     - `HS256`
     - `SECRET_KEY = Keys.secretKeyFor(...)` 进程启动时动态生成
8. 这意味着旧系统生成的 token 在服务重启/重新部署后会整体失效，因为签名密钥不是稳定配置，而是运行时随机生成。这是旧方案最大的工程风险之一。
9. 旧 token 消费逻辑位于：
   - `../quiz/backend/src/main/java/com/ck/quiz/filter/JwtAuthenticationFilter.java`
   - 只从 `Authorization: Bearer xxx` 提取 token，解析后将 `userId` 写入 `SecurityContext`，说明 token 载荷也很轻量，主要就是“把 userId 注入上下文”。
10. `nquiz` 当前现状：
   - 只有基础 Next.js 骨架，例如 `src/app/page.tsx`、`src/components/providers/query-provider.tsx`；
   - 只有最基础的登录 schema 示例 `src/lib/forms/login-schema.ts`；
   - 还没有成型的鉴权体系、devtools 工具区或 JWT 生成页。

三、范围
本需求建议纳入的迁移范围：
1. 内部 JWT 调试页的页面承载位置与路由设计。
2. `userId` 输入、提交生成、结果展示、复制 token / header 这条完整交互链路。
3. 与 `nquiz` 当前/未来鉴权体系对齐的发 token 后端能力。
4. 页面访问权限控制（至少 internal/admin/dev 限制）。
5. 基础错误处理、空值校验、成功反馈。
6. 最低限度的结果说明，例如 subject、过期时间、使用方式。

四、非范围
本需求不建议在本次分析内扩大到以下内容：
1. 整个 `nquiz` 登录系统/会话系统的完整重构。
2. 通用 OAuth2 / OIDC / SSO 方案设计。
3. 刷新 token、撤销 token、黑名单、设备管理等完整认证中心能力。
4. 面向普通用户开放的 token 自助签发能力。
5. 高级 claims 编辑器、批量签发、可视化 JWT 解码器等增强型工具能力。
6. 全站权限模型重构（可作为后续鉴权基础建设单列需求）。

五、实现思路
1. 页面定位
   - 不建议继续作为普通业务菜单页暴露。
   - 更建议落到 `nquiz` 的受保护工具区，例如：
     - `src/app/(authenticated)/devtools/jwt-generator/page.tsx`
     - 或 `src/app/(authenticated)/admin/jwt-generator/page.tsx`
   - 如果 `nquiz` 后续并不以 JWT Bearer 作为主要调试方式，这个页面甚至可以从主菜单移除，只保留开发工具入口。
2. 页面结构
   - 使用 `shadcn/ui` 的 `Card + Input + Button + Alert/Description` 组合即可。
   - 使用 `React Hook Form + Zod` 约束 `userId` 非空。
   - 页面信息架构建议分为三块：
     1) 输入区：`userId`
     2) 结果区：token、subject、expiresAt
     3) 使用区：`Authorization: Bearer ...` 与复制动作
3. 数据流
   - 该页本质是一次“生成型 mutation”，不属于列表查询。
   - 前端可使用 TanStack Query `useMutation`，也可以直接用 server action / route handler；若保持客户端交互页，建议用 mutation，方便 loading / success / error 状态统一管理。
4. API 设计
   - 不建议继续返回“纯字符串”。
   - 更建议返回结构化 JSON，例如：
     - `token`
     - `tokenType: "Bearer"`
     - `subject`
     - `expiresAt`
     - `issuedAt`
   - 这样页面不需要猜测 token 语义，后续也便于扩展和测试。
5. 后端实现原则
   - 不建议照搬旧 `JwtUtil` 的随机运行时密钥写法。
   - 新实现必须使用**稳定配置的签名密钥**，来自环境变量或统一配置中心。
   - 生成出的 token 必须与 `nquiz` 实际鉴权链路兼容，否则这个工具页没有真实价值。
6. 权限控制
   - 旧系统虽未细分角色，但至少是“登录后才能用”。
   - `nquiz` 建议进一步收紧到：`admin / developer / internal-tool` 之类的角色范围。
   - 最少要做到：未授权用户不可见、不可调用、接口返回 403/401 明确。
7. 安全与审计
   - 建议记录谁在什么时间为哪个 `userId` 生成过测试 token（至少写日志）。
   - 结果页应明显提示“仅用于内部测试，不可外泄”。
   - 如存在生产环境，建议默认禁用或只允许极少数管理员访问。
8. 能力分层建议
   - 第一阶段：先完成最小闭环（输入 userId -> 生成 -> 展示 -> 复制）。
   - 第二阶段：再补 subject/expiry 展示、审计日志、环境限制。
   - 第三阶段：如果确有价值，再考虑自定义 claims、不同过期时长、解码预览等增强功能。

六、影响点
1. 前端影响
   - 新增受保护页面与路由。
   - 新增 `userId` 表单 schema。
   - 新增生成 token mutation 封装。
   - 新增复制 header/token 的交互组件。
2. 后端影响
   - 需要有与 `nquiz` 鉴权体系一致的 token 生成服务。
   - 需要稳定 JWT secret 配置。
   - 需要明确哪些角色可调用。
3. 配置影响
   - 新增环境变量（JWT secret、过期时间、是否允许在当前环境启用）。
4. 测试影响
   - 需要验证生成 token 可被目标鉴权链路真实识别。
   - 需要验证未授权访问拦截是否正确。
5. 运维影响
   - 若继续沿用旧的“进程启动时随机密钥”方式，会导致重启后 token 全部失效，影响联调与排障体验，因此必须作为迁移时的重点修正项。

七、风险 / 疑问
1. `nquiz` 最终是否仍然采用 Bearer JWT 作为主要接口认证方式？
   - 如果不是，这个页面价值会下降，可能应降级为开发辅助脚本而不是常驻页面。
2. `userId` 是否仍是 `nquiz` 的统一主体标识？
   - 旧实现只关心 `userId`，没有 username/role/tenant 等 claims；新系统可能需要更完整的主体模型。
3. 生成的 token 是否应该严格模拟真实生产 token？
   - 如果需要，claims 结构、签名方式、过期策略都必须与正式鉴权保持一致。
4. 是否允许在生产环境使用？
   - 若允许，必须额外收紧权限并保留审计；
   - 若不允许，应在生产环境显式关闭。
5. 旧实现没有角色边界和使用记录，迁移时若仍然“登录即可生成任何用户 token”，风险偏高。

八、建议验收标准
1. 页面仅对授权内部用户可见，未登录或无权限用户不能访问。
2. `userId` 必填校验生效，空值不可提交。
3. 成功生成后能展示 token，并能一键复制 token 与 `Authorization: Bearer ...` 完整请求头。
4. 返回结构包含至少：token、subject、expiresAt，前端不再依赖“纯字符串”弱契约。
5. 生成出来的 token 可被 `nquiz` 当前目标鉴权链路真实识别，不是脱离实际体系的假 token。
6. 服务重启/部署后，不会因为随机密钥导致全部历史测试 token 立即失效（除非产品明确接受这种行为并有说明）。
7. 接口调用与页面访问具备明确权限边界，并至少保留基础审计日志。
8. 页面实现符合 `nquiz` 技术栈基线，不沿用旧 `Arco` 页面写法。

九、能力保留 / 优化 / 可延后
1. 建议保留
   - 输入 `userId` 生成 token
   - 展示 token
   - 复制 token
   - 复制 Bearer Header
2. 建议优化
   - 从普通菜单页调整为 internal devtools 页面
   - 从字符串返回升级为结构化响应
   - 从随机密钥升级为稳定配置密钥
   - 补权限和审计
3. 建议延后
   - claims 自定义
   - 批量签发
   - token 解码预览
   - 自定义过期时间

综合判断：该需求适合迁移，但应按“**内部调试工具重构**”而不是“**普通业务页面迁移**”来处理。核心不是把旧页面 1:1 搬过来，而是把 `quiz` 中那条真实存在的内部联调能力，在 `nquiz` 中以更安全、更工程化的方式重组落地。