export const HOT_SEARCH_SOURCE_OPTIONS = [
  { value: "", label: "全部来源" },
  { value: "TOUTIAO", label: "头条" },
] as const;

export type HotSearchSource = Exclude<(typeof HOT_SEARCH_SOURCE_OPTIONS)[number]["value"], "">;

export interface HotSearchRecord {
  id: string;
  source: HotSearchSource;
  externalId?: string;
  title: string;
  url?: string;
  hotValue?: string;
  rankIndex: number;
  crawlTime: string;
  batchNo: string;
  detailMarkdown?: string;
  extraJson?: string;
  matchedTopics: string[];
  createDate: string;
  updateDate: string;
}

export interface HotSearchFollowTopic {
  id: string;
  topicName: string;
  keywords?: string;
  enabled: boolean;
  seq: number;
  createDate: string;
  updateDate: string;
}

export interface HotSearchFilters {
  source: "" | HotSearchSource;
  keyword: string;
  followedOnly: boolean;
  fromTime: string;
  toTime: string;
  page: number;
  pageSize: number;
  selectedId: string;
}

export interface HotSearchListItem {
  id: string;
  source: HotSearchSource;
  title: string;
  hotValue?: string;
  rankIndex: number;
  crawlTime: string;
  matchedTopics: string[];
}

export interface HotSearchListResult {
  items: HotSearchListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalRecords: number;
    matchedRecords: number;
    enabledTopicCount: number;
    latestCrawlTime?: string;
  };
}

export interface HotSearchTopicMutationInput {
  topicName: string;
  keywords?: string;
  enabled: boolean;
  seq: number;
}
