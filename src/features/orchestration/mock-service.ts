import type {
  OrchestrationNodeConfig,
  OrchestrationNodeType,
  OrchestrationRunMutationInput,
  OrchestrationRunStatus,
  OrchestrationRunStep,
  OrchestrationVersionMutationInput,
  OrchestrationWorkflowDetail,
  OrchestrationWorkflowEdge,
  OrchestrationWorkflowEntity,
  OrchestrationWorkflowFilters,
  OrchestrationWorkflowGraph,
  OrchestrationWorkflowListItem,
  OrchestrationWorkflowListResult,
  OrchestrationWorkflowMutationInput,
  OrchestrationWorkflowNode,
  OrchestrationWorkflowRunEntity,
  OrchestrationWorkflowVersionEntity,
} from "@/features/orchestration/types";

const STORAGE_KEY = "nquiz-orchestration-workbench-v1";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

interface OrchestrationStore {
  workflows: OrchestrationWorkflowEntity[];
  versions: OrchestrationWorkflowVersionEntity[];
  runs: OrchestrationWorkflowRunEntity[];
}

function wait(ms = 120) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function excerpt(value: string, limit = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}...`;
}

function cloneGraph(graph: OrchestrationWorkflowGraph): OrchestrationWorkflowGraph {
  return JSON.parse(JSON.stringify(graph)) as OrchestrationWorkflowGraph;
}

function createNode(
  id: string,
  type: OrchestrationNodeType,
  name: string,
  x: number,
  y: number,
  config: OrchestrationNodeConfig,
): OrchestrationWorkflowNode {
  return {
    id,
    type,
    name,
    position: { x, y },
    config,
  };
}

function createEdge(id: string, source: string, target: string): OrchestrationWorkflowEdge {
  return { id, source, target };
}

export function createStarterWorkflowGraph(workflowName = "知识问答工作流"): OrchestrationWorkflowGraph {
  return {
    version: 1,
    nodes: [
      createNode("start-node", "start", "开始", 64, 168, {
        inputSchema: "userMessage:string, scene?:string",
      }),
      createNode("knowledge-node", "knowledge", "检索知识", 312, 136, {
        knowledgeBase: `${workflowName}知识库`,
        retrievalQuery: "{{inputText}}",
        topK: "3",
        outputKey: "knowledgeContext",
      }),
      createNode("llm-node", "llm", "生成回答", 572, 168, {
        modelName: "gpt-5.4-mini",
        prompt: "请结合上下文回答用户问题：{{inputText}}\n\n上下文：{{knowledgeContext}}",
        outputKey: "modelOutput",
      }),
      createNode("end-node", "end", "输出结果", 836, 168, {
        responseTemplate: "{{modelOutput}}",
      }),
    ],
    edges: [
      createEdge("edge-start-knowledge", "start-node", "knowledge-node"),
      createEdge("edge-knowledge-llm", "knowledge-node", "llm-node"),
      createEdge("edge-llm-end", "llm-node", "end-node"),
    ],
  };
}

function buildDigestGraph(): OrchestrationWorkflowGraph {
  return {
    version: 1,
    nodes: [
      createNode("start-digest", "start", "开始", 64, 168, {
        inputSchema: "topic:string, audience?:string",
      }),
      createNode("skill-digest", "skill", "抓取素材", 312, 168, {
        skillName: "hot-topics",
        action: "collect",
        payloadTemplate: "{\"topic\":\"{{inputText}}\"}",
        outputKey: "topicPackets",
      }),
      createNode("llm-digest", "llm", "生成摘要", 572, 168, {
        modelName: "gpt-5.4-mini",
        prompt: "请把这些素材整理成一段 briefing：{{topicPackets}}",
        outputKey: "briefing",
      }),
      createNode("end-digest", "end", "输出结果", 836, 168, {
        responseTemplate: "{{briefing}}",
      }),
    ],
    edges: [
      createEdge("edge-digest-1", "start-digest", "skill-digest"),
      createEdge("edge-digest-2", "skill-digest", "llm-digest"),
      createEdge("edge-digest-3", "llm-digest", "end-digest"),
    ],
  };
}

function buildInterviewGraph(): OrchestrationWorkflowGraph {
  return {
    version: 1,
    nodes: [
      createNode("start-interview", "start", "开始", 64, 168, {
        inputSchema: "resume:string, position:string",
      }),
      createNode("llm-interview", "llm", "生成问题", 356, 168, {
        modelName: "gpt-5.4-mini",
        prompt: "基于岗位 {{position}} 与简历 {{resume}}，生成 5 个追问点。",
        outputKey: "interviewQuestions",
      }),
      createNode("end-interview", "end", "输出结果", 664, 168, {
        responseTemplate: "{{interviewQuestions}}",
      }),
    ],
    edges: [
      createEdge("edge-interview-1", "start-interview", "llm-interview"),
      createEdge("edge-interview-2", "llm-interview", "end-interview"),
    ],
  };
}

function buildDefaultStore(): OrchestrationStore {
  const workflowStudy: OrchestrationWorkflowEntity = {
    id: "workflow-study-coach",
    code: "study-coach",
    name: "学习助教编排",
    description: "围绕知识检索 + 大模型回答的最小 AI 工作流，用于演示编排工作台的主链路。",
    status: "PUBLISHED",
    currentVersionId: "version-study-2",
    currentVersionNumber: 2,
    createDate: "2026-04-08T09:20:00.000Z",
    updateDate: "2026-04-11T08:45:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  const workflowDigest: OrchestrationWorkflowEntity = {
    id: "workflow-digest-lab",
    code: "digest-lab",
    name: "资讯简报实验流",
    description: "把抓取、摘要、输出拆成独立节点，验证版本管理与试运行反馈。",
    status: "PENDING",
    createDate: "2026-04-09T10:10:00.000Z",
    updateDate: "2026-04-10T18:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  const workflowInterview: OrchestrationWorkflowEntity = {
    id: "workflow-interview-coach",
    code: "interview-coach",
    name: "面试教练编排",
    description: "用于生成岗位追问与反馈建议，当前保留为停用样例。",
    status: "DISABLED",
    currentVersionId: "version-interview-1",
    currentVersionNumber: 1,
    createDate: "2026-04-07T13:00:00.000Z",
    updateDate: "2026-04-09T21:00:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  const studyGraphV1 = createStarterWorkflowGraph("学习助教");
  const studyGraphV2 = createStarterWorkflowGraph("学习助教");
  studyGraphV2.nodes[1] = {
    ...studyGraphV2.nodes[1],
    name: "检索错题知识",
    config: {
      ...studyGraphV2.nodes[1].config,
      knowledgeBase: "错题本 + 个人知识集",
      topK: "5",
    },
  };
  studyGraphV2.nodes[2] = {
    ...studyGraphV2.nodes[2],
    config: {
      ...studyGraphV2.nodes[2].config,
      prompt: "请根据用户问题 {{inputText}} 与知识上下文 {{knowledgeContext}}，先给结论，再给 3 条复习建议。",
    },
  };

  const versions: OrchestrationWorkflowVersionEntity[] = [
    {
      id: "version-study-1",
      workflowId: workflowStudy.id,
      versionNumber: 1,
      remark: "首版知识问答流",
      definitionGraph: studyGraphV1,
      createDate: "2026-04-08T11:00:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "version-study-2",
      workflowId: workflowStudy.id,
      versionNumber: 2,
      remark: "补齐复习建议输出",
      definitionGraph: studyGraphV2,
      createDate: "2026-04-10T09:20:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "version-digest-1",
      workflowId: workflowDigest.id,
      versionNumber: 1,
      remark: "抓取 + 摘要草稿",
      definitionGraph: buildDigestGraph(),
      createDate: "2026-04-09T17:10:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
    {
      id: "version-interview-1",
      workflowId: workflowInterview.id,
      versionNumber: 1,
      remark: "生成追问 MVP",
      definitionGraph: buildInterviewGraph(),
      createDate: "2026-04-08T20:00:00.000Z",
      createUserId: CURRENT_USER_ID,
      createUserName: CURRENT_USER_NAME,
    },
  ];

  const runs: OrchestrationWorkflowRunEntity[] = [
    {
      id: "run-study-1",
      workflowId: workflowStudy.id,
      workflowVersionId: "version-study-2",
      workflowVersionNumber: 2,
      status: "SUCCESS",
      triggerType: "MANUAL",
      triggerParams: {
        inputText: "帮我总结导数链式法则的复习重点",
      },
      startTime: "2026-04-11T07:10:00.000Z",
      endTime: "2026-04-11T07:10:08.000Z",
      durationMs: 8200,
      outputSummary: "先回顾复合函数结构，再做 3 组链式法则变形题，最后检查符号与内外层求导顺序。",
      steps: [
        {
          id: "step-study-1",
          nodeId: "start-node",
          nodeName: "开始",
          nodeType: "start",
          status: "SUCCESS",
          startedAt: "2026-04-11T07:10:00.000Z",
          endedAt: "2026-04-11T07:10:00.500Z",
          inputSummary: "收到手动输入",
          outputSummary: "导入用户输入作为上下文变量。",
        },
        {
          id: "step-study-2",
          nodeId: "knowledge-node",
          nodeName: "检索错题知识",
          nodeType: "knowledge",
          status: "SUCCESS",
          startedAt: "2026-04-11T07:10:00.500Z",
          endedAt: "2026-04-11T07:10:02.000Z",
          inputSummary: "根据用户问题检索知识库。",
          outputSummary: "从错题本 + 个人知识集中提取 5 条候选片段。",
        },
        {
          id: "step-study-3",
          nodeId: "llm-node",
          nodeName: "生成回答",
          nodeType: "llm",
          status: "SUCCESS",
          startedAt: "2026-04-11T07:10:02.000Z",
          endedAt: "2026-04-11T07:10:07.000Z",
          inputSummary: "把知识上下文交给模型生成复习建议。",
          outputSummary: "生成结论 + 3 条复习建议。",
        },
        {
          id: "step-study-4",
          nodeId: "end-node",
          nodeName: "输出结果",
          nodeType: "end",
          status: "SUCCESS",
          startedAt: "2026-04-11T07:10:07.000Z",
          endedAt: "2026-04-11T07:10:08.000Z",
          inputSummary: "汇总模型输出。",
          outputSummary: "返回最终响应。",
        },
      ],
    },
    {
      id: "run-digest-1",
      workflowId: workflowDigest.id,
      workflowVersionId: "version-digest-1",
      workflowVersionNumber: 1,
      status: "FAILED",
      triggerType: "MANUAL",
      triggerParams: {
        inputText: "今天的 AI Agent 趋势",
      },
      startTime: "2026-04-10T16:00:00.000Z",
      endTime: "2026-04-10T16:00:04.000Z",
      durationMs: 4100,
      errorSummary: "抓取节点返回空素材，摘要环节没有可用输入。",
      steps: [
        {
          id: "step-digest-1",
          nodeId: "start-digest",
          nodeName: "开始",
          nodeType: "start",
          status: "SUCCESS",
          startedAt: "2026-04-10T16:00:00.000Z",
          endedAt: "2026-04-10T16:00:00.300Z",
          inputSummary: "收到手动主题。",
          outputSummary: "准备进入抓取节点。",
        },
        {
          id: "step-digest-2",
          nodeId: "skill-digest",
          nodeName: "抓取素材",
          nodeType: "skill",
          status: "FAILED",
          startedAt: "2026-04-10T16:00:00.300Z",
          endedAt: "2026-04-10T16:00:04.000Z",
          inputSummary: "执行抓取技能。",
          outputSummary: "未抓到可用素材。",
        },
      ],
    },
  ];

  return {
    workflows: [workflowStudy, workflowDigest, workflowInterview],
    versions,
    runs,
  };
}

function normalizeStore(store: OrchestrationStore | null): OrchestrationStore | null {
  if (!store) {
    return null;
  }

  if (!Array.isArray(store.workflows) || !Array.isArray(store.versions) || !Array.isArray(store.runs)) {
    return null;
  }

  return store;
}

function ensureStore() {
  const existing = normalizeStore(readJson<OrchestrationStore | null>(STORAGE_KEY, null));
  if (existing) {
    return existing;
  }

  const seeded = buildDefaultStore();
  writeJson(STORAGE_KEY, seeded);
  return seeded;
}

function saveStore(store: OrchestrationStore) {
  writeJson(STORAGE_KEY, store);
}

function getOwnedWorkflows(store: OrchestrationStore) {
  return store.workflows
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .sort((a, b) => (a.createDate < b.createDate ? 1 : -1));
}

function getWorkflowOrThrow(store: OrchestrationStore, workflowId: string) {
  const workflow = store.workflows.find((item) => item.id === workflowId && item.createUserId === CURRENT_USER_ID);
  if (!workflow) {
    throw new Error("工作流不存在或无权访问");
  }
  return workflow;
}

function listVersionsForWorkflow(store: OrchestrationStore, workflowId: string) {
  return store.versions
    .filter((item) => item.workflowId === workflowId)
    .sort((a, b) => b.versionNumber - a.versionNumber || (a.createDate < b.createDate ? 1 : -1));
}

function listRunsForWorkflow(store: OrchestrationStore, workflowId: string, limit?: number) {
  const runs = store.runs
    .filter((item) => item.workflowId === workflowId)
    .sort((a, b) => (a.startTime < b.startTime ? 1 : -1));

  return typeof limit === "number" ? runs.slice(0, limit) : runs;
}

function toWorkflowListItem(store: OrchestrationStore, workflow: OrchestrationWorkflowEntity): OrchestrationWorkflowListItem {
  const versions = listVersionsForWorkflow(store, workflow.id);
  const lastRun = listRunsForWorkflow(store, workflow.id, 1)[0];
  const latestVersion = versions[0];

  return {
    ...workflow,
    versionCount: versions.length,
    runCount: store.runs.filter((item) => item.workflowId === workflow.id).length,
    latestVersionId: latestVersion?.id,
    latestVersionNumber: latestVersion?.versionNumber,
    lastRunStatus: lastRun?.status,
    lastRunEndedAt: lastRun?.endTime,
    lastRunOutputSummary: lastRun?.outputSummary ?? lastRun?.errorSummary,
  };
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function validateGraph(graph: OrchestrationWorkflowGraph) {
  const issues: string[] = [];

  if (!graph.nodes.length) {
    issues.push("至少需要一个节点");
  }

  const startNodes = graph.nodes.filter((node) => node.type === "start");
  if (startNodes.length !== 1) {
    issues.push("首版编排必须且只能包含 1 个开始节点");
  }

  const endNodes = graph.nodes.filter((node) => node.type === "end");
  if (endNodes.length < 1) {
    issues.push("至少需要 1 个结束节点");
  }

  const nodeIdSet = new Set<string>();
  graph.nodes.forEach((node) => {
    if (nodeIdSet.has(node.id)) {
      issues.push(`节点 ID 重复：${node.id}`);
    }
    nodeIdSet.add(node.id);
    if (!node.name.trim()) {
      issues.push("节点名称不能为空");
    }
  });

  const edgeIdSet = new Set<string>();
  graph.edges.forEach((edge) => {
    if (edgeIdSet.has(edge.id)) {
      issues.push(`连线 ID 重复：${edge.id}`);
    }
    edgeIdSet.add(edge.id);
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) {
      issues.push("存在指向无效节点的连线");
    }
  });

  return issues;
}

function interpolateTemplate(template: string, context: Record<string, unknown>) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, token: string) => {
    const key = token.trim();
    const value = context[key];
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
}

function readVariables(variablesJson?: string) {
  if (!variablesJson?.trim()) {
    return {};
  }

  const parsed = JSON.parse(variablesJson) as Record<string, unknown>;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("运行变量必须是 JSON 对象");
  }

  return parsed;
}

function executeNode(node: OrchestrationWorkflowNode, context: Record<string, unknown>) {
  switch (node.type) {
    case "start": {
      return {
        output: context.inputText ?? "",
        outputKey: "inputText",
        summary: "已将用户输入注入到工作流上下文。",
      };
    }
    case "knowledge": {
      const knowledgeBase = node.config.knowledgeBase || "默认知识集";
      const query = interpolateTemplate(node.config.retrievalQuery || "{{inputText}}", context);
      const topK = node.config.topK || "3";
      return {
        output: `从 ${knowledgeBase} 检索 ${topK} 条候选片段，查询语句：${query}`,
        outputKey: node.config.outputKey || "knowledgeContext",
        summary: `已从 ${knowledgeBase} 检索到 ${topK} 条上下文。`,
      };
    }
    case "llm": {
      const modelName = node.config.modelName || "gpt-5.4-mini";
      const prompt = interpolateTemplate(node.config.prompt || "{{inputText}}", context);
      const response = `模型 ${modelName} 输出：${prompt}`;
      return {
        output: response,
        outputKey: node.config.outputKey || "modelOutput",
        summary: `模型 ${modelName} 已生成结果。`,
      };
    }
    case "skill": {
      const skillName = node.config.skillName || "custom-skill";
      const action = node.config.action || "run";
      const payload = interpolateTemplate(node.config.payloadTemplate || "{}", context);
      return {
        output: `技能 ${skillName}.${action} 已执行，payload=${payload}`,
        outputKey: node.config.outputKey || "skillResult",
        summary: `已调用技能 ${skillName}.${action}。`,
      };
    }
    case "end": {
      const result = interpolateTemplate(node.config.responseTemplate || "{{modelOutput}}", context) || String(context.lastOutput || "");
      return {
        output: result,
        outputKey: "finalOutput",
        summary: "已汇总最终输出。",
      };
    }
  }
}

function executeGraph(version: OrchestrationWorkflowVersionEntity, input: OrchestrationRunMutationInput) {
  const issues = validateGraph(version.definitionGraph);
  if (issues.length > 0) {
    throw new Error(issues[0]);
  }

  const nodeMap = new Map(version.definitionGraph.nodes.map((node) => [node.id, node]));
  const edgesBySource = new Map<string, OrchestrationWorkflowEdge[]>();
  version.definitionGraph.edges.forEach((edge) => {
    const list = edgesBySource.get(edge.source) ?? [];
    list.push(edge);
    edgesBySource.set(edge.source, list);
  });

  const startNode = version.definitionGraph.nodes.find((node) => node.type === "start");
  if (!startNode) {
    throw new Error("未找到开始节点");
  }

  const context: Record<string, unknown> = {
    inputText: input.inputText,
    ...readVariables(input.variablesJson),
  };

  const steps: OrchestrationRunStep[] = [];
  let currentNode: OrchestrationWorkflowNode | undefined = startNode;
  let safetyCounter = 0;

  while (currentNode && safetyCounter < 50) {
    safetyCounter += 1;
    const startedAt = nowIso();

    try {
      const result = executeNode(currentNode, context);
      context[currentNode.id] = result.output;
      context[result.outputKey] = result.output;
      context.lastOutput = result.output;

      const endedAt = nowIso();
      steps.push({
        id: createId("run-step"),
        nodeId: currentNode.id,
        nodeName: currentNode.name,
        nodeType: currentNode.type,
        status: "SUCCESS",
        startedAt,
        endedAt,
        inputSummary: excerpt(JSON.stringify(context)),
        outputSummary: excerpt(String(result.output)),
      });

      if (currentNode.type === "end") {
        return {
          status: "SUCCESS" as OrchestrationRunStatus,
          outputSummary: excerpt(String(context.finalOutput ?? context.lastOutput ?? "")),
          steps,
        };
      }

      const nextEdge = (edgesBySource.get(currentNode.id) ?? [])[0];
      if (!nextEdge) {
        throw new Error(`节点 ${currentNode.name} 缺少后续连线`);
      }

      const nextNode = nodeMap.get(nextEdge.target);
      if (!nextNode) {
        throw new Error(`连线目标节点不存在：${nextEdge.target}`);
      }
      currentNode = nextNode;
    } catch (error) {
      const message = error instanceof Error ? error.message : "工作流执行失败";
      const endedAt = nowIso();
      steps.push({
        id: createId("run-step"),
        nodeId: currentNode.id,
        nodeName: currentNode.name,
        nodeType: currentNode.type,
        status: "FAILED",
        startedAt,
        endedAt,
        inputSummary: excerpt(JSON.stringify(context)),
        outputSummary: excerpt(message),
      });
      return {
        status: "FAILED" as OrchestrationRunStatus,
        errorSummary: message,
        steps,
      };
    }
  }

  throw new Error("检测到可能的循环或异常分支，已中止运行");
}

export async function listOrchestrationWorkflows(filters: OrchestrationWorkflowFilters): Promise<OrchestrationWorkflowListResult> {
  await wait();
  const store = ensureStore();
  const workflows = getOwnedWorkflows(store);
  const keyword = normalizeKeyword(filters.keyword);

  const filtered = workflows.filter((item) => {
    if (filters.status !== "ALL" && item.status !== filters.status) {
      return false;
    }
    if (!keyword) {
      return true;
    }

    const haystack = [item.code, item.name, item.description].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  const startIndex = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(startIndex, startIndex + filters.pageSize).map((item) => toWorkflowListItem(store, item));

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalWorkflows: workflows.length,
      draftWorkflows: workflows.filter((item) => item.status === "DRAFT").length,
      pendingWorkflows: workflows.filter((item) => item.status === "PENDING").length,
      publishedWorkflows: workflows.filter((item) => item.status === "PUBLISHED").length,
      disabledWorkflows: workflows.filter((item) => item.status === "DISABLED").length,
      totalRuns: store.runs.length,
    },
  };
}

export async function getOrchestrationWorkflowDetail(workflowId: string): Promise<OrchestrationWorkflowDetail> {
  await wait(80);
  const store = ensureStore();
  const workflow = getWorkflowOrThrow(store, workflowId);
  const versions = listVersionsForWorkflow(store, workflowId);
  const currentVersion = workflow.currentVersionId ? versions.find((item) => item.id === workflow.currentVersionId) || null : null;

  return {
    workflow: toWorkflowListItem(store, workflow),
    currentVersion,
    latestVersion: versions[0] ?? null,
    recentVersions: versions.slice(0, 5),
    recentRuns: listRunsForWorkflow(store, workflowId, 5),
  };
}

export async function listOrchestrationWorkflowVersions(workflowId: string) {
  await wait(80);
  const store = ensureStore();
  getWorkflowOrThrow(store, workflowId);
  return listVersionsForWorkflow(store, workflowId);
}

export async function listOrchestrationWorkflowRuns(workflowId: string, limit = 12) {
  await wait(80);
  const store = ensureStore();
  getWorkflowOrThrow(store, workflowId);
  return listRunsForWorkflow(store, workflowId, limit);
}

export async function createOrchestrationWorkflow(input: OrchestrationWorkflowMutationInput) {
  await wait();
  const store = ensureStore();
  const code = input.code.trim();

  const duplicated = store.workflows.some((item) => item.createUserId === CURRENT_USER_ID && item.code === code);
  if (duplicated) {
    throw new Error("工作流编码已存在");
  }

  const timestamp = nowIso();
  const record: OrchestrationWorkflowEntity = {
    id: createId("workflow"),
    code,
    name: input.name.trim(),
    description: input.description.trim(),
    status: "DRAFT",
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  store.workflows.unshift(record);
  saveStore(store);
  return record;
}

export async function updateOrchestrationWorkflow(workflowId: string, input: OrchestrationWorkflowMutationInput) {
  await wait();
  const store = ensureStore();
  const workflow = getWorkflowOrThrow(store, workflowId);
  const code = input.code.trim();

  const duplicated = store.workflows.some(
    (item) => item.createUserId === CURRENT_USER_ID && item.code === code && item.id !== workflowId,
  );
  if (duplicated) {
    throw new Error("工作流编码已存在");
  }

  workflow.code = code;
  workflow.name = input.name.trim();
  workflow.description = input.description.trim();
  workflow.updateDate = nowIso();
  saveStore(store);
  return workflow;
}

export async function deleteOrchestrationWorkflow(workflowId: string) {
  await wait();
  const store = ensureStore();
  getWorkflowOrThrow(store, workflowId);

  store.workflows = store.workflows.filter((item) => item.id !== workflowId);
  store.versions = store.versions.filter((item) => item.workflowId !== workflowId);
  store.runs = store.runs.filter((item) => item.workflowId !== workflowId);
  saveStore(store);
  return { success: true as const };
}

export async function createOrchestrationWorkflowVersion(workflowId: string, input: OrchestrationVersionMutationInput) {
  await wait();
  const store = ensureStore();
  const workflow = getWorkflowOrThrow(store, workflowId);
  const issues = validateGraph(input.definitionGraph);
  if (issues.length > 0) {
    throw new Error(issues[0]);
  }

  const existingVersions = listVersionsForWorkflow(store, workflowId);
  const versionNumber = (existingVersions[0]?.versionNumber ?? 0) + 1;
  const record: OrchestrationWorkflowVersionEntity = {
    id: createId("workflow-version"),
    workflowId,
    versionNumber,
    remark: input.remark.trim(),
    definitionGraph: cloneGraph(input.definitionGraph),
    createDate: nowIso(),
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  store.versions.unshift(record);
  workflow.status = "PENDING";
  workflow.updateDate = nowIso();
  saveStore(store);
  return record;
}

export async function publishOrchestrationWorkflowVersion(workflowId: string, versionId: string) {
  await wait();
  const store = ensureStore();
  const workflow = getWorkflowOrThrow(store, workflowId);
  const version = store.versions.find((item) => item.id === versionId && item.workflowId === workflowId);
  if (!version) {
    throw new Error("版本不存在");
  }

  workflow.currentVersionId = version.id;
  workflow.currentVersionNumber = version.versionNumber;
  workflow.status = "PUBLISHED";
  workflow.updateDate = nowIso();
  saveStore(store);
  return workflow;
}

export async function runOrchestrationWorkflow(workflowId: string, input: OrchestrationRunMutationInput) {
  await wait(140);
  const store = ensureStore();
  const workflow = getWorkflowOrThrow(store, workflowId);
  const versions = listVersionsForWorkflow(store, workflowId);
  const version =
    versions.find((item) => item.id === input.versionId) ||
    versions.find((item) => item.id === workflow.currentVersionId) ||
    versions[0];

  if (!version) {
    throw new Error("请先保存至少一个工作流版本");
  }

  const startTimestamp = Date.now();
  const startedAt = new Date(startTimestamp).toISOString();
  const result = executeGraph(version, input);
  const endTimestamp = Date.now();

  const record: OrchestrationWorkflowRunEntity = {
    id: createId("workflow-run"),
    workflowId,
    workflowVersionId: version.id,
    workflowVersionNumber: version.versionNumber,
    status: result.status,
    triggerType: "MANUAL",
    triggerParams: {
      inputText: input.inputText.trim(),
      variablesJson: input.variablesJson?.trim() || undefined,
    },
    startTime: startedAt,
    endTime: new Date(endTimestamp).toISOString(),
    durationMs: endTimestamp - startTimestamp,
    outputSummary: result.outputSummary,
    errorSummary: result.errorSummary,
    steps: result.steps,
  };

  store.runs.unshift(record);
  workflow.updateDate = nowIso();
  saveStore(store);
  return record;
}
