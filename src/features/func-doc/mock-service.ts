import type {
  FuncDocDetail,
  FuncDocExportPayload,
  FuncDocFeatureFilters,
  FuncDocFeatureListResult,
  FuncDocFeaturePoint,
  FuncDocFeatureTreeNode,
  FuncDocHeadingNode,
  FuncDocListFilters,
  FuncDocListItem,
  FuncDocListResult,
  FuncDocParseStatus,
  FuncDocProcessNodeFilters,
  FuncDocProcessNodeListResult,
  FuncDocUploadInput,
} from "@/features/func-doc/types";

const STORAGE_KEY = "nquiz-func-doc-workbench-v1";
const CURRENT_USER_NAME = "当前登录用户";

type FeatureGenerationField = "process" | "flow" | "interface";

interface FuncDocRecord {
  id: string;
  fileName: string;
  remark: string;
  parseStatus: FuncDocParseStatus;
  parseError: string | null;
  parseStartedAt: string;
  parseEtaAt: string | null;
  parseCompletedAt: string | null;
  createDate: string;
  updateDate: string;
  createUserName: string;
  fileSize: number;
  md5: string;
  headingCount: number;
  processNodeCount: number;
  featureCount: number;
}

interface FuncDocHeadingRecord {
  id: string;
  docId: string;
  parentId: string | null;
  title: string;
  level: number;
  order: number;
}

interface FuncDocProcessNodeRecord {
  id: string;
  docId: string;
  headingId: string;
  headingTitle: string;
  stepNo: number;
  content: string;
}

type FuncDocFeatureRecord = FuncDocFeaturePoint;

interface FuncDocStore {
  docs: FuncDocRecord[];
  headings: FuncDocHeadingRecord[];
  processNodes: FuncDocProcessNodeRecord[];
  features: FuncDocFeatureRecord[];
}

function wait(ms = 120) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildMd5(name: string) {
  const seed = `${name}-${Date.now()}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function buildSampleStructure(docId: string, fileName: string) {
  const short = fileName.replace(/\.docx$/i, "");

  const headingL1A = createId("heading");
  const headingL2A1 = createId("heading");
  const headingL2A2 = createId("heading");
  const headingL1B = createId("heading");
  const headingL2B1 = createId("heading");

  const headings: FuncDocHeadingRecord[] = [
    { id: headingL1A, docId, parentId: null, title: `1. ${short} 总览`, level: 1, order: 1 },
    { id: headingL2A1, docId, parentId: headingL1A, title: "1.1 业务目标与范围", level: 2, order: 2 },
    { id: headingL2A2, docId, parentId: headingL1A, title: "1.2 关键流程", level: 2, order: 3 },
    { id: headingL1B, docId, parentId: null, title: `2. ${short} 设计`, level: 1, order: 4 },
    { id: headingL2B1, docId, parentId: headingL1B, title: "2.1 接口与边界", level: 2, order: 5 },
  ];

  const processNodes: FuncDocProcessNodeRecord[] = [
    {
      id: createId("process"),
      docId,
      headingId: headingL2A1,
      headingTitle: "1.1 业务目标与范围",
      stepNo: 1,
      content: "用户进入功能文档工作台，选择目标文档并查看解析摘要。",
    },
    {
      id: createId("process"),
      docId,
      headingId: headingL2A1,
      headingTitle: "1.1 业务目标与范围",
      stepNo: 2,
      content: "系统按标题层级提取流程节点并生成三级功能点草稿。",
    },
    {
      id: createId("process"),
      docId,
      headingId: headingL2A2,
      headingTitle: "1.2 关键流程",
      stepNo: 1,
      content: "产品经理确认流程节点后触发 AI 生成流程说明与接口描述。",
    },
    {
      id: createId("process"),
      docId,
      headingId: headingL2A2,
      headingTitle: "1.2 关键流程",
      stepNo: 2,
      content: "系统回写功能点字段并允许人工编辑后再导出台账。",
    },
    {
      id: createId("process"),
      docId,
      headingId: headingL2B1,
      headingTitle: "2.1 接口与边界",
      stepNo: 1,
      content: "导出接口台账时只包含三级功能点且需具备接口说明。",
    },
  ];

  const level1A = createId("feat-l1");
  const level1B = createId("feat-l1");
  const level2A1 = createId("feat-l2");
  const level2A2 = createId("feat-l2");
  const level2B1 = createId("feat-l2");

  const features: FuncDocFeatureRecord[] = [
    {
      id: createId("feature"),
      docId,
      level1Id: level1A,
      level1Name: "文档管理",
      level2Id: level2A1,
      level2Name: "上传与解析",
      level3Name: "上传 docx 并触发解析",
      processDetail: "上传文档 -> 创建解析任务 -> 展示解析状态 -> 生成标题与流程节点",
      businessDesc: "",
      processSummary: "",
      functionDesc: "",
      mermaidCode: "",
      infDesc: "",
      infDetail: "",
      processGenStatus: "IDLE",
      flowGenStatus: "IDLE",
      infGenStatus: "IDLE",
      updateDate: nowIso(),
    },
    {
      id: createId("feature"),
      docId,
      level1Id: level1A,
      level1Name: "文档管理",
      level2Id: level2A2,
      level2Name: "详情查看",
      level3Name: "标题树与流程节点联动浏览",
      processDetail: "左侧标题树选择 -> 右侧流程节点过滤 -> 详情回看",
      businessDesc: "",
      processSummary: "",
      functionDesc: "",
      mermaidCode: "",
      infDesc: "",
      infDetail: "",
      processGenStatus: "IDLE",
      flowGenStatus: "IDLE",
      infGenStatus: "IDLE",
      updateDate: nowIso(),
    },
    {
      id: createId("feature"),
      docId,
      level1Id: level1B,
      level1Name: "功能点治理",
      level2Id: level2B1,
      level2Name: "AI 辅助补全",
      level3Name: "生成流程说明与接口台账",
      processDetail: "选择三级功能点 -> 触发 AI 生成 -> 人工校订 -> 导出台账",
      businessDesc: "",
      processSummary: "",
      functionDesc: "",
      mermaidCode: "",
      infDesc: "",
      infDetail: "",
      processGenStatus: "IDLE",
      flowGenStatus: "IDLE",
      infGenStatus: "IDLE",
      updateDate: nowIso(),
    },
  ];

  return { headings, processNodes, features };
}

function buildDefaultStore(): FuncDocStore {
  const baseNow = nowIso();

  const docReady: FuncDocRecord = {
    id: "funcdoc-demo-ready",
    fileName: "需求平台一期功能文档.docx",
    remark: "用于演示标题树、流程节点与功能点生成链路",
    parseStatus: "READY",
    parseError: null,
    parseStartedAt: "2026-04-10T09:30:00.000Z",
    parseEtaAt: null,
    parseCompletedAt: "2026-04-10T09:31:40.000Z",
    createDate: "2026-04-10T09:30:00.000Z",
    updateDate: "2026-04-10T09:31:40.000Z",
    createUserName: CURRENT_USER_NAME,
    fileSize: 1024 * 530,
    md5: "f31c72aa",
    headingCount: 0,
    processNodeCount: 0,
    featureCount: 0,
  };

  const readyStructure = buildSampleStructure(docReady.id, docReady.fileName);
  docReady.headingCount = readyStructure.headings.length;
  docReady.processNodeCount = readyStructure.processNodes.length;
  docReady.featureCount = readyStructure.features.length;

  const docParsing: FuncDocRecord = {
    id: "funcdoc-demo-parsing",
    fileName: "题库升级改造功能说明.docx",
    remark: "演示解析中状态",
    parseStatus: "PARSING",
    parseError: null,
    parseStartedAt: baseNow,
    parseEtaAt: new Date(Date.now() + 90 * 1000).toISOString(),
    parseCompletedAt: null,
    createDate: baseNow,
    updateDate: baseNow,
    createUserName: CURRENT_USER_NAME,
    fileSize: 1024 * 420,
    md5: buildMd5("题库升级改造功能说明.docx"),
    headingCount: 0,
    processNodeCount: 0,
    featureCount: 0,
  };

  const docFailed: FuncDocRecord = {
    id: "funcdoc-demo-failed",
    fileName: "legacy-template.docx",
    remark: "历史模板不规范，解析失败样例",
    parseStatus: "FAILED",
    parseError: "未匹配到三级标题结构，建议按模板重新导入。",
    parseStartedAt: "2026-04-09T08:20:00.000Z",
    parseEtaAt: null,
    parseCompletedAt: "2026-04-09T08:21:32.000Z",
    createDate: "2026-04-09T08:20:00.000Z",
    updateDate: "2026-04-09T08:21:32.000Z",
    createUserName: CURRENT_USER_NAME,
    fileSize: 1024 * 160,
    md5: "a8d4d2cb",
    headingCount: 0,
    processNodeCount: 0,
    featureCount: 0,
  };

  return {
    docs: [docReady, docParsing, docFailed],
    headings: readyStructure.headings,
    processNodes: readyStructure.processNodes,
    features: readyStructure.features,
  };
}

function ensureStore(): FuncDocStore {
  const existing = readJson<FuncDocStore | null>(STORAGE_KEY, null);
  if (existing && Array.isArray(existing.docs)) {
    return refreshParsingDocs(existing);
  }

  const initial = buildDefaultStore();
  writeJson(STORAGE_KEY, initial);
  return initial;
}

function saveStore(store: FuncDocStore) {
  writeJson(STORAGE_KEY, store);
}

function refreshParsingDocs(store: FuncDocStore) {
  let changed = false;

  for (const doc of store.docs) {
    if (doc.parseStatus !== "PARSING" || !doc.parseEtaAt) {
      continue;
    }

    if (Date.now() < new Date(doc.parseEtaAt).getTime()) {
      continue;
    }

    changed = true;
    const shouldFail = doc.fileName.toLowerCase().includes("fail");

    if (shouldFail) {
      doc.parseStatus = "FAILED";
      doc.parseError = "文档结构不符合模板，未提取到有效标题层级。";
      doc.parseCompletedAt = nowIso();
      doc.parseEtaAt = null;
      doc.updateDate = nowIso();
      continue;
    }

    const generated = buildSampleStructure(doc.id, doc.fileName);
    store.headings = store.headings.filter((item) => item.docId !== doc.id).concat(generated.headings);
    store.processNodes = store.processNodes.filter((item) => item.docId !== doc.id).concat(generated.processNodes);
    store.features = store.features.filter((item) => item.docId !== doc.id).concat(generated.features);

    doc.parseStatus = "READY";
    doc.parseError = null;
    doc.parseCompletedAt = nowIso();
    doc.parseEtaAt = null;
    doc.updateDate = nowIso();
    doc.headingCount = generated.headings.length;
    doc.processNodeCount = generated.processNodes.length;
    doc.featureCount = generated.features.length;
  }

  if (changed) {
    saveStore(store);
  }

  return store;
}

function mapDocListItem(doc: FuncDocRecord): FuncDocListItem {
  return {
    id: doc.id,
    fileName: doc.fileName,
    remark: doc.remark,
    parseStatus: doc.parseStatus,
    parseError: doc.parseError,
    createDate: doc.createDate,
    updateDate: doc.updateDate,
    parseCompletedAt: doc.parseCompletedAt,
    fileSize: doc.fileSize,
    md5: doc.md5,
    headingCount: doc.headingCount,
    processNodeCount: doc.processNodeCount,
    featureCount: doc.featureCount,
  };
}

function getDocOrThrow(store: FuncDocStore, docId: string) {
  const doc = store.docs.find((item) => item.id === docId);
  if (!doc) {
    throw new Error("文档不存在或已删除");
  }
  return doc;
}

function requireDocReady(doc: FuncDocRecord) {
  if (doc.parseStatus === "READY") {
    return;
  }
  if (doc.parseStatus === "FAILED") {
    throw new Error(doc.parseError || "当前文档解析失败，暂不可查看详情");
  }
  throw new Error("文档仍在解析中，请稍后刷新");
}

export async function listFuncDocs(filters: FuncDocListFilters): Promise<FuncDocListResult> {
  await wait(120);
  const store = ensureStore();

  const keyword = filters.keyword.trim().toLowerCase();

  const ordered = [...store.docs].sort((left, right) => (left.createDate < right.createDate ? 1 : -1));
  const filtered = ordered.filter((doc) => {
    if (filters.status !== "ALL" && doc.parseStatus !== filters.status) {
      return false;
    }
    if (keyword) {
      const haystack = `${doc.fileName} ${doc.remark}`.toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
    }
    return true;
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(start, start + filters.pageSize).map(mapDocListItem);

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      total: store.docs.length,
      ready: store.docs.filter((doc) => doc.parseStatus === "READY").length,
      parsing: store.docs.filter((doc) => doc.parseStatus === "PARSING").length,
      failed: store.docs.filter((doc) => doc.parseStatus === "FAILED").length,
    },
  };
}

export async function uploadFuncDoc(input: FuncDocUploadInput): Promise<FuncDocDetail> {
  await wait(220);
  const store = ensureStore();

  const now = nowIso();
  const doc: FuncDocRecord = {
    id: createId("funcdoc"),
    fileName: input.fileName,
    remark: input.remark.trim(),
    parseStatus: "PARSING",
    parseError: null,
    parseStartedAt: now,
    parseEtaAt: new Date(Date.now() + 18 * 1000).toISOString(),
    parseCompletedAt: null,
    createDate: now,
    updateDate: now,
    createUserName: CURRENT_USER_NAME,
    fileSize: input.fileSize,
    md5: buildMd5(input.fileName),
    headingCount: 0,
    processNodeCount: 0,
    featureCount: 0,
  };

  store.docs.unshift(doc);
  saveStore(store);

  return {
    ...mapDocListItem(doc),
    createUserName: doc.createUserName,
    parseStartedAt: doc.parseStartedAt,
  };
}

export async function deleteFuncDoc(docId: string) {
  await wait(100);
  const store = ensureStore();

  store.docs = store.docs.filter((doc) => doc.id !== docId);
  store.headings = store.headings.filter((item) => item.docId !== docId);
  store.processNodes = store.processNodes.filter((item) => item.docId !== docId);
  store.features = store.features.filter((item) => item.docId !== docId);

  saveStore(store);
  return { success: true as const };
}

export async function getFuncDocDetail(docId: string): Promise<FuncDocDetail> {
  await wait(90);
  const store = ensureStore();
  const doc = getDocOrThrow(store, docId);

  return {
    ...mapDocListItem(doc),
    createUserName: doc.createUserName,
    parseStartedAt: doc.parseStartedAt,
  };
}

export async function listFuncDocHeadingTree(docId: string): Promise<FuncDocHeadingNode[]> {
  await wait(120);
  const store = ensureStore();
  const doc = getDocOrThrow(store, docId);
  requireDocReady(doc);

  const nodes = store.headings
    .filter((item) => item.docId === docId)
    .sort((left, right) => left.order - right.order);

  const grouped = new Map<string | null, FuncDocHeadingRecord[]>();
  for (const node of nodes) {
    const list = grouped.get(node.parentId) ?? [];
    list.push(node);
    grouped.set(node.parentId, list);
  }

  const build = (parentId: string | null): FuncDocHeadingNode[] => {
    return (grouped.get(parentId) ?? []).map((node) => ({
      id: node.id,
      title: node.title,
      level: node.level,
      order: node.order,
      children: build(node.id),
    }));
  };

  return build(null);
}

export async function listFuncDocProcessNodes(
  filters: FuncDocProcessNodeFilters,
): Promise<FuncDocProcessNodeListResult> {
  await wait(120);
  const store = ensureStore();
  const doc = getDocOrThrow(store, filters.docId);
  requireDocReady(doc);

  const keyword = filters.keyword.trim().toLowerCase();

  const items = store.processNodes
    .filter((item) => item.docId === filters.docId)
    .filter((item) => (filters.headingId ? item.headingId === filters.headingId : true))
    .filter((item) => {
      if (!keyword) return true;
      return `${item.headingTitle} ${item.content}`.toLowerCase().includes(keyword);
    })
    .sort((left, right) => {
      if (left.headingTitle === right.headingTitle) {
        return left.stepNo - right.stepNo;
      }
      return left.headingTitle.localeCompare(right.headingTitle);
    });

  const start = (filters.page - 1) * filters.pageSize;

  return {
    items: clone(items.slice(start, start + filters.pageSize)),
    total: items.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function listFuncDocFeatureTree(docId: string): Promise<FuncDocFeatureTreeNode[]> {
  await wait(120);
  const store = ensureStore();
  const doc = getDocOrThrow(store, docId);
  requireDocReady(doc);

  const features = store.features.filter((item) => item.docId === docId);

  const level1Map = new Map<string, FuncDocFeatureTreeNode>();
  const level2Map = new Map<string, FuncDocFeatureTreeNode>();

  for (const item of features) {
    if (!level1Map.has(item.level1Id)) {
      level1Map.set(item.level1Id, {
        id: item.level1Id,
        name: item.level1Name,
        level: 1,
        count: 0,
        children: [],
      });
    }

    const level1Node = level1Map.get(item.level1Id);
    if (!level1Node) continue;
    level1Node.count += 1;

    if (!level2Map.has(item.level2Id)) {
      const level2Node: FuncDocFeatureTreeNode = {
        id: item.level2Id,
        name: item.level2Name,
        level: 2,
        count: 0,
        children: [],
      };
      level2Map.set(item.level2Id, level2Node);
      level1Node.children.push(level2Node);
    }

    const level2Node = level2Map.get(item.level2Id);
    if (level2Node) {
      level2Node.count += 1;
    }
  }

  return Array.from(level1Map.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export async function listFuncDocFeatures(filters: FuncDocFeatureFilters): Promise<FuncDocFeatureListResult> {
  await wait(140);
  const store = ensureStore();
  const doc = getDocOrThrow(store, filters.docId);
  requireDocReady(doc);

  const keyword = filters.keyword.trim().toLowerCase();

  const items = store.features
    .filter((item) => item.docId === filters.docId)
    .filter((item) => (filters.level2Id ? item.level2Id === filters.level2Id : true))
    .filter((item) => {
      if (!keyword) return true;
      return `${item.level1Name} ${item.level2Name} ${item.level3Name} ${item.processDetail}`
        .toLowerCase()
        .includes(keyword);
    })
    .sort((left, right) => (left.updateDate < right.updateDate ? 1 : -1));

  const start = (filters.page - 1) * filters.pageSize;

  return {
    items: clone(items.slice(start, start + filters.pageSize)),
    total: items.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

function applyFeatureGeneration(record: FuncDocFeatureRecord, field: FeatureGenerationField) {
  const now = nowIso();
  if (field === "process") {
    record.businessDesc = `该功能点围绕“${record.level3Name}”沉淀需求背景与业务目标，重点保障文档结构化沉淀能力。`;
    record.processSummary = `先读取流程节点“${record.processDetail}”，再生成可执行的业务步骤摘要并回写。`;
    record.functionDesc = `为三级功能点提供可复用的业务说明模板，减少人工整理时间。`;
    record.processGenStatus = "READY";
  }

  if (field === "flow") {
    record.mermaidCode = [
      "flowchart TD",
      `  A[选择功能点: ${record.level3Name}] --> B[读取流程节点]`,
      "  B --> C[调用 AI 生成流程图]",
      "  C --> D[人工校订并保存]",
      "  D --> E[导出文档台账]",
    ].join("\n");
    record.flowGenStatus = "READY";
  }

  if (field === "interface") {
    record.infDesc = `围绕功能点“${record.level3Name}”补全接口契约，明确输入输出与错误码。`;
    record.infDetail = JSON.stringify(
      {
        endpoint: `/api/func-docs/${record.docId}/features/${record.id}`,
        method: "POST",
        request: {
          featureId: record.id,
          mode: "generate",
        },
        response: {
          success: true,
          message: "接口说明已生成",
        },
      },
      null,
      2,
    );
    record.infGenStatus = "READY";
  }

  record.updateDate = now;
}

export async function generateFuncDocFeatureField(featureId: string, field: FeatureGenerationField) {
  await wait(240);
  const store = ensureStore();
  const record = store.features.find((item) => item.id === featureId);
  if (!record) {
    throw new Error("功能点不存在，可能已被删除");
  }

  applyFeatureGeneration(record, field);
  saveStore(store);
  return clone(record);
}

export async function exportFuncDocHeadings(docId: string): Promise<FuncDocExportPayload> {
  await wait(120);
  const store = ensureStore();
  const doc = getDocOrThrow(store, docId);
  requireDocReady(doc);

  const headings = store.headings
    .filter((item) => item.docId === docId)
    .sort((left, right) => left.order - right.order)
    .map((item) => `${"  ".repeat(Math.max(0, item.level - 1))}- ${item.title}`)
    .join("\n");

  return {
    fileName: `${doc.fileName.replace(/\.docx$/i, "")}-headings.docx`,
    content: `# ${doc.fileName} 标题导出\n\n${headings}`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

export async function exportFuncDocInterfaces(docId: string): Promise<FuncDocExportPayload> {
  await wait(120);
  const store = ensureStore();
  const doc = getDocOrThrow(store, docId);
  requireDocReady(doc);

  const features = store.features.filter((item) => item.docId === docId);

  const header = ["一级功能", "二级功能", "三级功能", "接口说明", "接口详情"];
  const rows = features.map((item) => [
    item.level1Name,
    item.level2Name,
    item.level3Name,
    item.infDesc || "",
    (item.infDetail || "").replace(/\s+/g, " "),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return {
    fileName: `${doc.fileName.replace(/\.docx$/i, "")}-interfaces.csv`,
    content: `\uFEFF${csv}`,
    mimeType: "text/csv;charset=utf-8",
  };
}
