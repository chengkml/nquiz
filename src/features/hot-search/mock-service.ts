import { hotSearchFilterSchema } from "@/features/hot-search/schema";
import type {
  HotSearchFilters,
  HotSearchFollowTopic,
  HotSearchListItem,
  HotSearchListResult,
  HotSearchRecord,
  HotSearchTopicMutationInput,
} from "@/features/hot-search/types";

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

const hotSearchRecordsSeed: Omit<HotSearchRecord, "matchedTopics">[] = [
  {
    id: "hot-001",
    source: "TOUTIAO",
    externalId: "toutiao-1001",
    title: "AI Agent 创业潮持续升温，热搜讨论聚焦自动化落地",
    url: "https://example.com/hot/ai-agent",
    hotValue: "982.1万",
    rankIndex: 1,
    crawlTime: "2026-04-11T09:18:00+08:00",
    batchNo: "batch-20260411-am-1",
    detailMarkdown: "# AI Agent 创业潮持续升温\n\n- 讨论集中在 **企业自动化**、**多智能体协作**、**垂直业务落地**。\n- 相关公司在招聘、融资和产品发布上同步升温。\n\n> 这条内容适合测试 AI / Agent / 自动化 等关注主题命中。",
    extraJson: '{"channel":"头条","category":"科技"}',
    createDate: "2026-04-11T09:18:10+08:00",
    updateDate: "2026-04-11T09:18:10+08:00",
  },
  {
    id: "hot-002",
    source: "TOUTIAO",
    externalId: "toutiao-1002",
    title: "北京楼市新政后，刚需与学区房热度同步回升",
    url: "https://example.com/hot/house-policy",
    hotValue: "756.4万",
    rankIndex: 2,
    crawlTime: "2026-04-11T09:18:00+08:00",
    batchNo: "batch-20260411-am-1",
    detailMarkdown: "# 北京楼市新政\n\n政策调整后，房价、刚需、学区房成为讨论核心。\n\n- 购房资格\n- 首付比例\n- 学区房议价空间",
    extraJson: '{"channel":"头条","category":"房产"}',
    createDate: "2026-04-11T09:18:10+08:00",
    updateDate: "2026-04-11T09:18:10+08:00",
  },
  {
    id: "hot-003",
    source: "TOUTIAO",
    externalId: "toutiao-1003",
    title: "高考志愿填报季将近，教育专家热议专业选择与城市机会",
    url: "https://example.com/hot/education-major",
    hotValue: "612.9万",
    rankIndex: 3,
    crawlTime: "2026-04-11T09:18:00+08:00",
    batchNo: "batch-20260411-am-1",
    detailMarkdown: "# 高考志愿填报\n\n教育赛道讨论点：\n\n1. 城市发展机会\n2. 专业冷热变化\n3. AI 对教育行业的影响",
    extraJson: '{"channel":"头条","category":"教育"}',
    createDate: "2026-04-11T09:18:10+08:00",
    updateDate: "2026-04-11T09:18:10+08:00",
  },
  {
    id: "hot-004",
    source: "TOUTIAO",
    externalId: "toutiao-1004",
    title: "新能源车价格战继续，车企开始强化智能驾驶宣传",
    url: "https://example.com/hot/ev-price-war",
    hotValue: "488.7万",
    rankIndex: 4,
    crawlTime: "2026-04-11T09:18:00+08:00",
    batchNo: "batch-20260411-am-1",
    detailMarkdown: "# 新能源车价格战\n\n价格战仍在继续，但传播焦点已经从纯降价转向智驾能力和交付速度。",
    extraJson: '{"channel":"头条","category":"汽车"}',
    createDate: "2026-04-11T09:18:10+08:00",
    updateDate: "2026-04-11T09:18:10+08:00",
  },
  {
    id: "hot-005",
    source: "TOUTIAO",
    externalId: "toutiao-1005",
    title: "大模型进校园再起讨论，教师关注教学辅助与作业批改边界",
    url: "https://example.com/hot/llm-school",
    hotValue: "455.2万",
    rankIndex: 5,
    crawlTime: "2026-04-10T21:06:00+08:00",
    batchNo: "batch-20260410-pm-2",
    detailMarkdown: "# 大模型进校园\n\n教育行业对于 AI 的接受度在提升，但仍强调隐私、准确率与责任边界。",
    extraJson: '{"channel":"头条","category":"教育"}',
    createDate: "2026-04-10T21:06:20+08:00",
    updateDate: "2026-04-10T21:06:20+08:00",
  },
  {
    id: "hot-006",
    source: "TOUTIAO",
    externalId: "toutiao-1006",
    title: "租房市场进入毕业季预热，部分城市房租出现结构性上涨",
    url: "https://example.com/hot/rent-market",
    hotValue: "321.8万",
    rankIndex: 6,
    crawlTime: "2026-04-10T21:06:00+08:00",
    batchNo: "batch-20260410-pm-2",
    detailMarkdown: "# 租房市场毕业季预热\n\n关注点：房租上涨、毕业生通勤、合租安全。",
    extraJson: '{"channel":"头条","category":"房产"}',
    createDate: "2026-04-10T21:06:20+08:00",
    updateDate: "2026-04-10T21:06:20+08:00",
  },
];

let topicStore: HotSearchFollowTopic[] = [
  {
    id: "topic-001",
    topicName: "AI",
    keywords: "AI, Agent, 大模型, 人工智能",
    enabled: true,
    seq: 0,
    createDate: "2026-04-10T19:20:00+08:00",
    updateDate: "2026-04-10T19:20:00+08:00",
  },
  {
    id: "topic-002",
    topicName: "房价",
    keywords: "楼市, 房价, 学区房, 租房",
    enabled: true,
    seq: 1,
    createDate: "2026-04-10T19:21:00+08:00",
    updateDate: "2026-04-10T19:21:00+08:00",
  },
  {
    id: "topic-003",
    topicName: "教育",
    keywords: "教育, 高考, 志愿填报, 校园",
    enabled: false,
    seq: 2,
    createDate: "2026-04-10T19:22:00+08:00",
    updateDate: "2026-04-10T19:22:00+08:00",
  },
];

function normalizeKeywordList(value?: string) {
  if (!value?.trim()) return [] as string[];
  const items = value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
}

function topicKeywords(topic: HotSearchFollowTopic) {
  const normalized = normalizeKeywordList(topic.keywords);
  if (normalized.length > 0) return normalized;
  return topic.topicName.trim() ? [topic.topicName.trim()] : [];
}

function normalizeForMatch(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function attachMatchedTopics(record: Omit<HotSearchRecord, "matchedTopics">): HotSearchRecord {
  const title = normalizeForMatch(record.title);
  const matchedTopics = topicStore
    .filter((topic) => topic.enabled)
    .filter((topic) => topicKeywords(topic).some((keyword) => title.includes(normalizeForMatch(keyword))))
    .map((topic) => topic.topicName);

  return {
    ...record,
    matchedTopics,
  };
}

function getRecordsWithTopics() {
  return hotSearchRecordsSeed.map(attachMatchedTopics);
}

function compareBySearchOrder(a: HotSearchRecord, b: HotSearchRecord) {
  const crawl = new Date(b.crawlTime).getTime() - new Date(a.crawlTime).getTime();
  if (crawl !== 0) return crawl;
  const rank = a.rankIndex - b.rankIndex;
  if (rank !== 0) return rank;
  return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
}

export async function listHotSearchTopics() {
  await delay();
  return [...topicStore].sort((a, b) => a.seq - b.seq || new Date(b.createDate).getTime() - new Date(a.createDate).getTime());
}

export async function searchHotSearchRecords(rawFilters: HotSearchFilters): Promise<HotSearchListResult> {
  await delay();
  const filters = hotSearchFilterSchema.parse(rawFilters);
  const records = getRecordsWithTopics().sort(compareBySearchOrder);
  const enabledTopicCount = topicStore.filter((topic) => topic.enabled).length;

  const filtered = records.filter((record) => {
    if (filters.source && record.source !== filters.source) return false;
    if (filters.keyword && !normalizeForMatch(record.title).includes(normalizeForMatch(filters.keyword))) return false;
    if (filters.fromTime && new Date(record.crawlTime).getTime() < new Date(filters.fromTime).getTime()) return false;
    if (filters.toTime && new Date(record.crawlTime).getTime() > new Date(filters.toTime).getTime()) return false;
    if (filters.followedOnly && record.matchedTopics.length === 0) return false;
    return true;
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items: HotSearchListItem[] = filtered.slice(start, start + filters.pageSize).map((record) => ({
    id: record.id,
    source: record.source,
    title: record.title,
    hotValue: record.hotValue,
    rankIndex: record.rankIndex,
    crawlTime: record.crawlTime,
    matchedTopics: record.matchedTopics,
  }));

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalRecords: records.length,
      matchedRecords: records.filter((record) => record.matchedTopics.length > 0).length,
      enabledTopicCount,
      latestCrawlTime: records[0]?.crawlTime,
    },
  };
}

export async function getHotSearchDetail(id: string) {
  await delay(120);
  return getRecordsWithTopics().find((record) => record.id === id) ?? null;
}

export async function createHotSearchTopic(input: HotSearchTopicMutationInput) {
  await delay();
  const topicName = input.topicName.trim();
  const duplicate = topicStore.find((item) => item.topicName.toLowerCase() === topicName.toLowerCase());
  if (duplicate) {
    throw new Error(`主题名称已存在：${topicName}`);
  }

  const now = new Date().toISOString();
  const topic: HotSearchFollowTopic = {
    id: `topic-${Math.random().toString(36).slice(2, 10)}`,
    topicName,
    keywords: normalizeKeywordList(input.keywords).join(", "),
    enabled: input.enabled,
    seq: input.seq,
    createDate: now,
    updateDate: now,
  };

  topicStore = [...topicStore, topic];
  return topic;
}

export async function updateHotSearchTopic(id: string, input: HotSearchTopicMutationInput) {
  await delay();
  const topic = topicStore.find((item) => item.id === id);
  if (!topic) throw new Error("关注主题不存在");

  const topicName = input.topicName.trim();
  const duplicate = topicStore.find((item) => item.id !== id && item.topicName.toLowerCase() === topicName.toLowerCase());
  if (duplicate) {
    throw new Error(`主题名称已存在：${topicName}`);
  }

  topic.topicName = topicName;
  topic.keywords = normalizeKeywordList(input.keywords).join(", ");
  topic.enabled = input.enabled;
  topic.seq = input.seq;
  topic.updateDate = new Date().toISOString();
  return topic;
}

export async function deleteHotSearchTopic(id: string) {
  await delay();
  topicStore = topicStore.filter((item) => item.id !== id);
}
