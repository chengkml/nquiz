# [nquiz迁移] QuestionManagement 分析结论

## 1. 目标
将 `quiz` 的 `QuestionManagement` 从旧 React + Arco + Spring 单体实现，迁移为 `nquiz` 中按 Next.js App Router + Tailwind CSS + shadcn/ui + React Hook Form + Zod + TanStack Query + Drizzle ORM 组织的题库工作台。

迁移目标不是照搬旧页面，而是在 **保留题目检索、题目查看/编辑/删除、题目生成、题库分类筛选、知识点关联** 等核心业务语义的前提下，拆掉旧页面里“题目管理 + 学科管理 + 分类管理 + AI 生成日志面板”全塞在一个页面的历史包袱，重构成更清晰、更可维护的题库域模块。

---

## 2. 页面定位（基于真实代码）
### 2.1 quiz 现有代码定位
- 前端路由挂载：`/root/.openclaw/workspace/quiz/frontend/src/router/index.tsx`
  - 菜单路由：`/frame/question`
  - 组件：`QuestionManagement -> @/pages/Question`
- 前端主页面：`/root/.openclaw/workspace/quiz/frontend/src/pages/Question/index.tsx`
- 前端 API：`/root/.openclaw/workspace/quiz/frontend/src/pages/Question/api/index.ts`
- 动态题型表单：`/root/.openclaw/workspace/quiz/frontend/src/components/DynamicQuestionForm/index.tsx`
- 后端控制器：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/question/controller/QuestionController.java`
- 后端核心服务：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/question/service/impl/QuestionServiceImpl.java`
- 后端实体：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/question/entity/Question.java`
- DTO：
  - `QuestionDto.java`
  - `QuestionCreateDto.java`
  - `QuestionUpdateDto.java`
  - `QuestionQueryDto.java`
- 依赖域接口：
  - 分类：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/category/controller/CategoryController.java`
  - 学科：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/subject/controller/SubjectController.java`
  - 知识点：`/root/.openclaw/workspace/quiz/backend/src/main/java/com/ck/quiz/knowledge/controller/KnowledgeController.java`

### 2.2 nquiz 当前现状
`nquiz` 当前仍是很早期的 Next.js 骨架：
- 页面只有 `src/app/page.tsx`
- Query Provider 已搭好：`src/components/providers/query-provider.tsx`
- Query Key 只有少量基础项：`src/lib/query/query-keys.ts`
- 数据库 schema 只有示例：`src/server/db/schema/example.ts`

也就是说，`QuestionManagement` 在 `nquiz` 中不是“修旧页”，而是 **按题库域从 0 到 1 设计**。

---

## 3. 现状（真实功能、数据结构、交互链路、依赖接口与业务语义）

### 3.1 旧页面真实功能边界
`quiz/frontend/src/pages/Question/index.tsx` 实际承担了 4 组能力：
1. **题目列表管理**：分页、关键字搜索、按学科/分类树过滤、查看详情、编辑、删除。
2. **题目生成与批量入库**：通过知识点标题/内容 + 大模型流式生成题目，勾选后批量保存。
3. **学科管理**：页面左侧树里可直接新增/编辑/删除学科。
4. **分类管理**：同一棵树里可直接新增/编辑/删除分类。

这说明旧页面并不是一个纯“题目 CRUD 页”，而是一个 **题库工作台 + taxonomy 管理入口 + AI 生成入口** 的混合体。

### 3.2 页面当前交互链路
#### A. 列表与筛选
- 进入页面后会同时拉：
  - `POST /api/question`：题目分页
  - `GET /api/subject/list`：学科列表
  - `GET /api/category/subject-category-tree`：学科分类树
  - `GET /api/llm-model/list-by-type/TEXT`：文本模型
- 页面主视图为：
  - 左侧学科/分类树
  - 右侧题目表格
  - 顶部仅一个“题干关键字”搜索框
- 点击树节点时，会把节点下所有子分类 `categoryIds` 收集出来，再作为查询条件传给题目列表接口。

#### B. 查看 / 编辑 / 删除
- 点击题目标题进入详情弹窗。
- 编辑走弹窗表单，提交 `PUT /api/question/update`。
- 删除走确认弹窗，调用 `DELETE /api/question/{id}`。

#### C. AI 生成题目
- “新增”按钮实际不是手动创建，而是直接打开“AI 生成题目”弹窗。
- 必填输入：
  - 学科
  - 分类
  - 知识点标题
  - 知识点内容（CKEditor）
  - 生成数量
  - 可选模型
- 通过 `GET /api/question/generate/stream` 建立 SSE，前端实时展示 token 流日志。
- 流结束后解析 `[QUESTION]...` 数据，用户勾选题目并批量调用 `POST /api/question/batch/create` 入库。

#### D. 学科 / 分类维护
- 左树节点右侧菜单可直接对学科/分类增删改。
- 学科用 `/api/subject/create|update|delete`。
- 分类用 `/api/category/create|update|delete`。
- 学科唯一名检查接口被页面使用；分类唯一名检查接口存在，但该页未接入校验闭环。

### 3.3 旧后端真实数据结构与业务语义
#### A. 题目实体本身
`Question.java` 字段核心是：
- `id`
- `type`：`SINGLE / MULTIPLE / BLANK / SHORT_ANSWER`
- `content`
- `options`：TEXT，JSON 字符串
- `answer`：TEXT，JSON 字符串
- `explanation`
- `createDate / createUser / updateDate / updateUser`
- `knowledgePoints`：与 `Knowledge` 多对多

#### B. 题目与学科/分类的关系不是直存，而是“通过知识点间接推导”
这是旧实现最关键的业务语义之一：
- `Question` 表本身 **没有** `subjectId`、`categoryId` 列。
- 前端创建题目时传了 `subjectId/categoryId`，但后端 `createQuestion(...)` 没把它们存入题目实体，而是：
  1. 根据 `knowledgeTitle/knowledgeContent` 或 `knowledge` 创建知识点；
  2. 再把题目与知识点建立关联。
- 题目列表的学科/分类信息是在 `searchQuestions(...)` 里通过：
  - `question_knowledge_rela`
  - `knowledge`
  - `category`
  - `subject`
  联表推导出来的。

也就是说，旧系统里“题目属于哪个学科/分类”，本质上是 **由其关联知识点反推**，而不是题目自己的主属性。

#### C. 查询语义
`QuestionQueryDto` 支持：
- `type`
- `content`
- `pageNum/pageSize`
- `sortColumn/sortType`
- `subjectId`
- `categoryIds`

`QuestionServiceImpl.searchQuestions(...)` 的关键行为：
1. 如果传了 `subjectId/categoryIds`，才 join 知识点表筛选。
2. 默认按当前登录用户 `create_user` 过滤。
3. 这意味着题目库是 **当前用户私有视角**，不是全局公共题库。
4. 当一个题目关联多个知识点时，列表回填学科/分类只取第一条关系，语义并不稳定。

### 3.4 当前实现里的明显历史包袱 / 不一致点
#### 1）前后端题型能力不一致
- 后端实体和 `DynamicQuestionForm` 支持：
  - `SINGLE`
  - `MULTIPLE`
  - `BLANK`
  - `SHORT_ANSWER`
- 但 `Question/index.tsx` 页面里的题型选项只给了：
  - `SINGLE`
  - `MULTIPLE`

这说明旧页面 UI 与领域模型不完全一致，nquiz 迁移时不能简单照搬页面现状，要重新确认题型范围。

#### 2）“新增题目”被 AI 生成完全替代，缺少清晰的手动创建入口
- API 明明有 `POST /api/question/create`
- 但页面 `onAdd` 直接绑定 `handleGenerate`
- 结果是题目新增在 UI 上几乎等于“只能 AI 生成后批量保存”

这不符合通用题库管理预期，属于典型的交互重载。

#### 3）编辑时 subject/category 不是真正更新题目主属性
编辑提交流程是：
1. `PUT /api/question/update` 只更新题目内容本身；
2. 然后前端再额外调用 `associateKnowledge(...)`，给题目补新的知识点关联；
3. 但前端没有显式移除旧知识点关联。

结果可能导致：
- 一个题目累积多个知识点关联；
- 列表展示的 subject/category 可能漂移；
- 用户以为自己改了分类，实际上只是“多挂了一个知识点”。

#### 4）批量保存生成题目时存在重复创建知识点风险
`batchCreateQuestion(...)` 里的每个 `QuestionCreateDto` 已带 `knowledgeTitle/knowledgeContent`，后端 `createQuestion(...)` 会尝试自动创建/复用知识点并关联。

但前端 `handleSaveSelectedQuestions()` 在批量保存成功后，又额外调用一次 `createKnowledge(...)`，且没有把这个新知识点再关联到题目，存在：
- 重复知识点创建风险
- 前后端责任重复
- 数据语义混乱

#### 5）题目页承担了不该在本页承担的 taxonomy 管理能力
学科和分类的增删改直接塞进题目页左树，会导致：
- 题目管理页面过重
- 心智模型不清晰
- taxonomy 维护与题目维护职责耦合

nquiz 不建议继续这样设计。

#### 6）页面存在陈旧字段痕迹
编辑弹窗里还试图设置 `difficultyLevel`，但当前实体 / DTO 并没有稳定承接这一字段，说明旧页存在历史残留。

---

## 4. 目标（nquiz 迁移后应保留的核心业务能力）
1. **题目列表检索**：按关键字、题型、学科、分类、知识点等条件查看题库。
2. **题目详情查看**：完整查看题干、选项、答案、解析、知识点关联、基础元数据。
3. **题目创建/编辑/删除**：至少提供清晰的手动录入链路。
4. **AI 生成题目**：保留生成能力，但作为明确的创建子流程，而不是唯一新增入口。
5. **知识点关联**：题目与知识点的关系保留，但语义要更清晰。
6. **题库分层过滤**：保留学科 / 分类视角筛选。
7. **用户私有题库或权限边界**：保留“按用户可见范围查询”的能力，但在 nquiz 中应显式定义，不要隐式埋在 SQL 里。

---

## 5. 范围
建议把本次 `QuestionManagement` 迁移范围定义为：
1. **题库列表页**：筛选、分页、详情入口、批量操作入口。
2. **题目编辑能力**：新建、编辑、删除、查看详情。
3. **AI 生成子流程**：输入知识点上下文 -> 流式生成 -> 勾选入库。
4. **知识点关联管理**：创建题目时设置主分类与关联知识点；编辑时可调整关联关系。
5. **题型支持**：至少保证单选/多选稳定可用；领域模型保留对填空/简答的扩展支持。
6. **题库域基础元数据**：题目类型、创建时间、创建人、关联知识点、分类路径。

---

## 6. 非范围
1. 不在本需求首版里做题目审核流、题目共享市场、题目版本历史、题目收藏、题目导入导出。
2. 不在本需求里顺带迁移学科管理、分类管理完整后台；这些建议独立到 Subject / Category 模块。
3. 不在首版里做复杂 AI 题目质检（重复题检测、难度评估、质量评分、人工审核工作流）。
4. 不在首版里做富文本公式编辑、图片题识别、附件题干等更重形态。
5. 不在首版里把“按用户私有”扩展成团队协同题库，除非产品明确要求。

---

## 7. 信息架构建议（nquiz 语境）
建议不要继续沿用旧 `/frame/question` 单页超载模式，而是拆成更清晰的题库域结构：

- `/question-bank/questions`
  - 题目列表页
  - 左侧可选 filter rail（学科/分类树）或顶部高级筛选
- `/question-bank/questions/new`
  - 手动创建题目
- `/question-bank/questions/generate`
  - AI 生成题目工作流
- `/question-bank/questions/[id]`
  - 题目详情 / 编辑页（可 Tab 化：基本信息 / 知识点 / 操作记录）

若想减少路由，也可以保留列表页 + Sheet/Drawer 方案，但建议至少把 AI 生成独立成专门流程，而不是塞在一个超大 Modal 里。

另外建议把：
- 学科管理 -> 独立到 Subject 模块
- 分类管理 -> 独立到 Category / Taxonomy 模块

题目页只保留“筛选题库”的树，不承担 taxonomy 增删改。

---

## 8. 视觉设计方向 / 样式体系 / 交互方式
### 8.1 视觉设计方向
建议采用 **题库工作台 + 详情编辑器** 风格：
- 列表页偏信息管理台
- 详情页偏内容编辑页
- AI 生成页偏流程型工作台

不要继续使用旧页那种“多个 Modal 叠加、树上塞操作菜单、生成日志和结果列表混在一个弹窗里”的密集式交互。

### 8.2 样式体系
遵循 `nquiz` 项目约定：
- `Tailwind CSS` 负责布局与视觉层级
- `shadcn/ui` 负责基础组件（Table、Dialog、Sheet、Form、Tabs、Badge、Popover、ScrollArea）
- `Lucide React` 负责图标
- 有需要的微交互再引入 `Framer Motion`

不建议再复制 Arco 风格和大量内联 style。

### 8.3 交互方式建议
1. **列表页**：
   - 顶部筛选栏：关键字、题型、学科、分类、创建时间等
   - 主区表格：题干摘要、题型、分类路径、知识点数量、创建时间、操作
   - 支持 row click 进详情
2. **详情/编辑页**：
   - 采用表单页或右侧 Sheet
   - 显式展示：题干、题型、选项、答案、解析、主分类、关联知识点
3. **AI 生成页**：
   - 左侧输入知识点上下文
   - 中间显示生成日志/状态
   - 右侧显示候选题目列表，可批量勾选入库
4. **知识点关联**：
   - 不要隐式“保存时顺带 createKnowledge + associateKnowledge”
   - 应改成显式表单项：主分类、主知识点、附加知识点

---

## 9. 实现思路（nquiz 最佳实践）
### 9.1 领域建模建议
为了避免旧系统“subject/category 只能从知识点反推”的不稳定语义，nquiz 建议把 **题目主分类** 直接建模为题目自己的字段，再额外保留知识点关联：

建议新增（遵守 `quiz_` 前缀）：
- `quiz_question`
  - `id`
  - `type`
  - `content`
  - `options_json`
  - `answer_json`
  - `explanation`
  - `subject_id`
  - `category_id`
  - `created_by`
  - `created_at`
  - `updated_at`
- `quiz_question_knowledge_rela`
  - `question_id`
  - `knowledge_id`
  - 如需区分主知识点，可加 `is_primary`

这样做的好处：
1. 列表筛选与展示不再依赖“取第一条知识点关系”；
2. 题目自己的主学科/主分类稳定；
3. 知识点关联仍可保留多对多能力；
4. 后续考试、错题、知识点统计都更好做。

### 9.2 页面与数据流建议
#### 列表页
- 首屏可走 Server Component 输出框架壳；
- 筛选、分页、排序走 TanStack Query；
- Query Key 建议新增：
  - `questionBank.questions.list`
  - `questionBank.questions.detail`
  - `questionBank.meta.subjectTree`
  - `questionBank.meta.categoryTree`
  - `questionBank.meta.knowledgeSearch`

#### 表单页
- 使用 `React Hook Form + Zod`
- 根据题型动态切换 schema：
  - 单选 / 多选：校验 options 与 answer
  - 填空 / 简答：校验答案结构
- 不再让 `options` / `answer` 在页面里到处手动 `JSON.stringify/parse`
- 在前端统一转成类型安全对象，提交时由服务层/BFF 统一序列化

#### AI 生成
- 单独 mutation / stream flow：
  1. 提交知识点标题 + 内容 + 目标题量 + 可选模型
  2. 监听 SSE / stream
  3. 解析候选题目列表
  4. 人工勾选确认
  5. 批量创建题目
- 生成日志与结果展示分区，不再混成一个 modal 内的临时 UI 状态大杂烩。

### 9.3 服务端/BFF 建议
建议把旧后端能力拆成更明确的 API 语义：
1. `searchQuestions`
   - 查询条件显式包含 `subjectId/categoryId/knowledgeId/type/keyword`
2. `createQuestion`
   - 直接写入 question 主表主分类字段
   - 再单独处理 knowledge relation
3. `updateQuestion`
   - 同步更新主分类与知识点关联
   - 需要明确“替换关联”而不是“只追加关联”
4. `generateQuestionCandidates`
   - 专门返回候选题，不直接混杂入库逻辑
5. `batchCreateQuestions`
   - 明确支持批量创建 + 指定知识点关联策略

### 9.4 题型策略建议
旧领域模型支持 4 种题型，但旧页只稳定暴露 2 种。nquiz 建议：
- **领域模型**：保留 `SINGLE / MULTIPLE / BLANK / SHORT_ANSWER`
- **首版 UI**：
  - 若考试/错题链路近期要接入，建议 4 种一次性打通
  - 若当前迭代要控范围，可先稳定单选/多选，但表结构和 schema 预留完整题型扩展

---

## 10. 能力范围（保留 / 优化 / 重组 / 延后）
### 10.1 保留
1. 题目列表查询与分页
2. 按学科/分类筛选
3. 题目详情查看
4. 编辑与删除
5. AI 生成题目并人工确认后入库
6. 题目与知识点关联

### 10.2 优化
1. 把“新增题目”恢复为清晰的手动创建入口
2. 主分类不要再靠知识点反推
3. 编辑知识点关联改为“替换式更新”，不要只追加
4. 统一 4 种题型的领域语义与 UI 暴露策略
5. 去掉页面里对学科/分类的重管理操作，降低页面复杂度
6. 统一前端对象模型，减少 `options/answer` 的字符串 JSON 手工处理

### 10.3 可以重组
1. 学科/分类维护从题目页剥离到独立模块
2. AI 生成从“新增按钮弹窗”重组为单独流程页或独立 Sheet
3. 详情、编辑、知识点关联可合并成一个资源详情页，而非多个分散弹窗

### 10.4 可延后
1. 重复题检测
2. 题目质量评分 / 审核流
3. 导入导出
4. 富文本图片/公式题增强
5. 团队共享题库 / 协同编辑

---

## 11. 影响点
1. **路由层**：从旧 `/frame/question` 转为 App Router 下的题库域路由。
2. **数据库层**：新增 `quiz_question`、`quiz_question_knowledge_rela` 等表；并与 subject/category/knowledge 域打通。
3. **表单层**：题型表单、答案结构、知识点关联表单都要重做。
4. **查询层**：需要新的 query key、分页/筛选 URL state、缓存失效策略。
5. **AI 集成层**：需要明确生成候选与正式入库的边界。
6. **权限层**：要明确题库是“个人题库”还是“共享题库”，不要继续把权限隐式写死在 SQL 中。
7. **下游模块**：考试、错题、知识点学习等都可能消费题目数据，题型与主分类建模要一次定准。

---

## 12. 风险 / 疑问
1. **题库权限边界**：nquiz 仍然是个人私有题库，还是会演进为团队共享题库？这会直接影响查询过滤和表设计。
2. **题型范围是否一次打满**：是否本需求就必须把填空/简答完整暴露到 UI？
3. **主分类 vs 多知识点**：题目是否允许一个主分类 + 多知识点，还是完全多标签化？建议前者优先。
4. **AI 生成结果质量**：是否需要首版就做候选题去重、格式兜底、答案合法性校验？
5. **taxonomy 管理归属**：学科/分类是否在本阶段必须保留“从题目页直接维护”的能力？我建议不要，但需产品拍板。
6. **知识点创建策略**：创建题目时是否允许自动创建新知识点，还是必须先选已有知识点？旧实现混用了两种方式，nquiz 需要定一个主策略。

---

## 13. 建议验收标准
1. 能在 `nquiz` 中进入独立题库页面，完成题目列表浏览、搜索、分页与筛选。
2. 能手动新建题目，并正确保存题型、题干、选项、答案、解析、主学科、主分类、知识点关联。
3. 能编辑题目，且主分类与知识点关联变更后不会残留脏关联或展示漂移。
4. 能删除题目，并在列表刷新后正确消失。
5. 能查看题目详情，完整展示题干、选项、答案、解析、知识点与元信息。
6. 能通过 AI 生成流程输入知识点上下文，流式看到生成过程，勾选候选题目并批量入库。
7. 批量入库后不会重复创建无意义知识点，不会出现“创建成功但未关联”的脏数据。
8. 列表筛选结果与主学科/主分类字段一致，不再依赖“第一条知识点关系”的偶然结果。
9. 页面实现符合 `nquiz` 既定技术栈：App Router + Tailwind + shadcn/ui + RHF + Zod + TanStack Query + Drizzle ORM。
10. 不再残留旧 `frame` 路由、Arco 组件耦合和超重弹窗交互模型。

---

## 14. 结论
### 结论一：这个需求应当按“题库域重构”做，不应按旧页面原样搬运
旧 `QuestionManagement` 表面上是题目管理，实际上混入了 taxonomy 管理、AI 题目生成、知识点半隐式创建等多种职责，已经不适合作为 nquiz 的直接蓝本。

### 结论二：核心业务能力要保留，但领域建模必须纠偏
最需要纠偏的是：
- 题目主分类不能继续靠知识点反推
- 编辑知识点关系不能只追加不替换
- 新增入口不能只剩 AI 生成
- 题型领域与页面能力要重新对齐

### 结论三：建议分两层推进
- **第一层（本需求首版）**：题库列表、手动创建/编辑/删除、详情、AI 生成入库、知识点关联
- **第二层（后续增强）**：题目审核、导入导出、重复题检测、共享题库、题目质量评分
