---
name: cm-nquiz-requirement-develop
description: 通过 JWT 链路辅助 nquiz 需求开发闭环：先查询待开发需求，再领取 1 条置为 IN_PROGRESS，由主智能体基于 descr 在 nquiz 仓库执行真实开发，开发过程中持续更新进度，构建通过后再置为 COMPLETED。
---

# CM Nquiz Requirement Develop

这个 skill 的职责不是“替你自动写完代码”，而是把 `nquiz` 需求开发流程收敛成可控闭环：

1. 查询待开发需求列表
2. 领取 1 条需求并置为 `IN_PROGRESS`
3. 主智能体基于需求 `descr` 在 **`nquiz` Next.js 工程** 内执行真实开发
4. 开发过程中按里程碑更新进度
5. 代码改动与构建验证通过后，再置为 `COMPLETED`

服务地址与认证默认值：
- 默认 `base-url`: `https://www.quizck.cn`
- 默认账号: `openclaw`
- 默认密码: `12345678`

## 硬性执行约束

1. **一次只开发 1 条 active requirement**
   - 先 `start`，再 `progress / complete`
   - 未完成前不得并行领取第二条
2. **真实开发必须发生在 `nquiz` 仓库里**
   - 默认从当前工作目录向上探测 `.git + package.json`
   - 也可显式传 `--repo-root`
3. **不得跳过需求描述**
   - `start` 会返回完整 `descr` 与开发计划摘要
   - 主智能体必须基于该描述实施开发，而不是只做状态回写
4. **完成前必须通过门禁**
   - 检测 `start` 之后新增的源码改动
   - 执行构建命令（默认 `npm run build`）
   - 任一失败：禁止写为 `COMPLETED`

## 标准工作流程

### 1. 查询待开发需求

命令：

```bash
python3 scripts/develop_requirement.py \
  --action query
```

默认查询：
- `projectName=nquiz`
- `status=OPEN,IN_PROGRESS`

返回：
- 待开发需求列表
- 优先级处理顺序：`HIGH -> MEDIUM -> LOW`
- `nextRecommendedId`

### 2. 领取 1 条需求并置为开发中

显式指定需求：

```bash
python3 scripts/develop_requirement.py \
  --action start \
  --requirement-id <REQ_ID>
```

或直接领取优先级最高的一条：

```bash
python3 scripts/develop_requirement.py \
  --action start \
  --pick-first
```

`start` 会做这些事：
- 获取需求详情：`title / descr / status / progressPercent`
- 将需求写为 `IN_PROGRESS`
- 在本地状态文件中记录 active requirement
- 记录当前仓库源码脏文件快照，作为后续完成门禁的基线

### 3. 主智能体执行真实开发

`start` 之后，主智能体需要：
- 阅读返回中的 `descr`
- 在 `nquiz` 仓库中完成真实代码开发
- 必要时运行本地验证

这个阶段 **不是** 脚本自动完成，而是由当前主智能体完成。

### 4. 开发过程中持续更新进度

命令：

```bash
python3 scripts/develop_requirement.py \
  --action progress \
  --requirement-id <REQ_ID> \
  --progress-percent 30 \
  --result-msg "已完成页面骨架与主要交互"
```

约束：
- `progress-percent` 必须在 `1-99`
- 当前需求必须已经 `start`
- 当前需求必须是 active requirement

推荐里程碑：
- `30`：完成需求边界梳理与页面骨架
- `60`：完成核心数据流/交互/表单
- `90`：完成自检与构建前收口

### 5. 开发完成后置为已完成

命令：

```bash
python3 scripts/develop_requirement.py \
  --action complete \
  --requirement-id <REQ_ID>
```

`complete` 会做这些事：
- 校验当前需求确实是 active requirement
- 对比 `start` 时的源码基线，检测开发期间新增改动
- 执行构建命令（默认 `npm run build`）
- 仅当门禁通过时，写回 `COMPLETED + 100%`

可选参数：

```bash
python3 scripts/develop_requirement.py \
  --action complete \
  --requirement-id <REQ_ID> \
  --build-command "npm run build" \
  --build-timeout 600
```

## 脚本

脚本：`scripts/develop_requirement.py`

### action

- `query`
  - 查询待开发需求列表
- `start`
  - 领取 1 条需求并置为 `IN_PROGRESS`
- `progress`
  - 对 active requirement 更新开发进度
- `complete`
  - 完成门禁后将需求置为 `COMPLETED`

### 常用参数

- `--requirement-id`
  - `start/progress/complete` 使用
  - `start` 可用 `--pick-first` 代替
- `--pick-first`
  - `start` 时按优先级规则直接领取第一条需求
- `--status`
  - `query` 或 `start --pick-first` 的查询状态
  - 默认 `OPEN,IN_PROGRESS`
- `--project-name`
  - 默认 `nquiz`
- `--progress-percent`
  - `progress` 时必填，范围 `1-99`
- `--result-msg`
  - 状态回写说明
- `--repo-root`
  - `nquiz` 仓库根目录；未传则从当前工作目录向上探测
- `--source-dirs`
  - 参与源码改动门禁的目录
  - 默认 `src,app,components`
- `--build-command`
  - `complete` 时执行的构建命令，默认 `npm run build`
- `--build-timeout`
  - 构建超时秒数，默认 `600`
- `--state-file`
  - 本地状态文件，默认 `/tmp/cm-nquiz-requirement-develop-state.json`

## 输出结构

### query

- `items[]`
  - `id/title/status/progressPercent/priority/createDate`
- `nextRecommendedId`
- `processingOrderRule`
- `queryTrace`

### start

- `requirement`
  - 包含完整 `descr`
- `statusWriteback`
- `developmentPlan`
- `developmentBaseline`
  - `repoRoot/sourceDirs/baselineDirtyFiles`

### progress

- `requirementId`
- `statusWriteback`
- `historyCount`

### complete

- `requirementId`
- `verification`
  - `changedFilesSinceStart`
  - `buildResult`
- `statusWriteback`

## 错误处理

- 参数错误
  - 返回 `step=validate`
- 登录 / JWT / 查询失败
  - 返回失败步骤与 HTTP 明细，不输出敏感信息
- 未先 `start` 就执行 `progress/complete`
  - 返回 `step=state`
- 已有其他 active requirement 时再次 `start`
  - 返回 `step=start`
- `complete` 时没有新增源码改动
  - 返回 `step=complete`
- 构建失败
  - 返回 `step=complete`，且不得更新为 `COMPLETED`

## 推荐用法

在真正执行需求开发时，主智能体应按以下顺序工作：

1. `query` 看待开发需求列表
2. `start` 领取一条需求
3. 读取返回的 `descr`，在 `nquiz` 仓库执行真实开发
4. 中间按阶段调用 `progress`
5. 确认构建通过后调用 `complete`

这才是该 skill 的正确工作方式。
