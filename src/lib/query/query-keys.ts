export const queryKeys = {
  health: ["health"] as const,
  currentUser: ["current-user"] as const,
  requirements: {
    all: ["requirements"] as const,
    list: (filters: {
      title: string;
      projectName: string;
      status: "ALL" | "PENDING_ANALYSIS" | "PENDING_REVIEW" | "PENDING_REVISION" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
      priority: "ALL" | "LOW" | "MEDIUM" | "HIGH";
      pageNum: number;
      pageSize: number;
    }) => ["requirements", "list", filters] as const,
    historyOptions: ["requirements", "history-options"] as const,
    lifecycle: (requirementId: string | null) => ["requirements", "lifecycle", requirementId] as const,
  },
  datasourcesRoot: ["datasources"] as const,
  datasources: (params: { name: string; active: "" | "true" | "false"; pageNum: number; pageSize: number }) =>
    ["datasources", "list", params] as const,
  datasourceDetail: (id: string | null) => ["datasources", "detail", id] as const,
  datasourceSchemas: (id: string | null) => ["datasources", "schemas", id] as const,
  docs: {
    all: ["docs"] as const,
    list: (filters: {
      keyword: string;
      type: "ALL" | "DOC" | "IMAGE" | "PDF" | "OTHER";
      status: "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
      page: number;
      pageSize: number;
    }) => ["docs", "list", filters] as const,
  },
  baiduPan: {
    all: ["baidu-pan"] as const,
    status: ["baidu-pan", "status"] as const,
  },
  wxApps: {
    all: ["wx-apps"] as const,
    list: ["wx-apps", "list"] as const,
    users: (appId: string) => ["wx-apps", "users", appId] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: (filters: {
      keyword: string;
      state: "ALL" | "ENABLED" | "DISABLED";
      page: number;
      pageSize: number;
    }) => ["roles", "list", filters] as const,
    menuTree: ["roles", "menu-tree"] as const,
    permissionSnapshot: (roleId: string) => ["roles", "permission-snapshot", roleId] as const,
  },
  users: {
    all: ["users"] as const,
    list: (filters: {
      keyword: string;
      status: "ALL" | "ENABLED" | "DISABLED";
      roleId: string;
      page: number;
      pageSize: number;
    }) => ["users", "list", filters] as const,
    roles: {
      active: ["users", "roles", "active"] as const,
    },
  },
  subjects: {
    all: ["subjects"] as const,
    list: (filters: {
      keyword: string;
      page: number;
      pageSize: number;
    }) => ["subjects", "list", filters] as const,
    options: ["subjects", "options"] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (filters: {
      keyword: string;
      type: string;
      page: number;
      pageSize: number;
    }) => ["groups", "list", filters] as const,
    options: (type: string) => ["groups", "options", type] as const,
  },
  schedule: {
    all: ["schedule"] as const,
    list: (filters: {
      viewMode: "MONTH" | "WEEK" | "YEAR";
      rangeStart: string;
      rangeEnd: string;
    }) => ["schedule", "list", filters] as const,
    detail: (id: string | null) => ["schedule", "detail", id] as const,
  },
  priceMonitor: {
    all: ["price-monitor"] as const,
    list: (filters: {
      platform: string;
      itemName: string;
      monitoringEnabled: "ALL" | "ENABLED" | "DISABLED";
      page: number;
      pageSize: number;
      itemId: string;
    }) => ["price-monitor", "list", filters] as const,
    detail: (itemId: string) => ["price-monitor", "detail", itemId] as const,
    trend: (itemId: string) => ["price-monitor", "trend", itemId] as const,
    snapshots: (itemId: string) => ["price-monitor", "snapshots", itemId] as const,
    alertRule: (itemId: string) => ["price-monitor", "alert-rule", itemId] as const,
    alertLogs: (itemId: string) => ["price-monitor", "alert-logs", itemId] as const,
  },
  todos: {
    all: ["todos"] as const,
    list: (filters: {
      keyword: string;
      status: "" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED";
      priority: "" | "LOW" | "MEDIUM" | "HIGH";
      page: number;
      pageSize: number;
    }) => ["todos", "list", filters] as const,
    detail: (todoId: string | null) => ["todos", "detail", todoId] as const,
  },
  wrongQuestions: {
    all: ["wrong-questions"] as const,
    list: (filters: {
      subjectId: string;
      categoryId: string;
      type: "" | "SINGLE" | "MULTIPLE" | "BLANK" | "SHORT_ANSWER";
      difficulty: "" | "EASY" | "MEDIUM" | "HARD";
      keyword: string;
      page: number;
      pageSize: number;
    }) => ["wrong-questions", "list", filters] as const,
    meta: {
      subjects: ["wrong-questions", "meta", "subjects"] as const,
      categories: (subjectId: string) => ["wrong-questions", "meta", "categories", subjectId] as const,
      ocrModels: ["wrong-questions", "meta", "ocr-models"] as const,
    },
  },
  statistics: {
    knowledgeMasteryDashboard: ["statistics", "knowledge-mastery", "dashboard"] as const,
    questionBankDashboard: ["statistics", "question-bank", "dashboard"] as const,
    vocabularyProficiencyDashboard: ["statistics", "vocabulary-proficiency", "dashboard"] as const,
  },
  lifeCountdown: {
    root: ["life-countdown"] as const,
    profile: ["life-countdown", "profile"] as const,
  },
  hotSearch: {
    all: ["hot-search"] as const,
    list: (filters: {
      source: "" | "TOUTIAO";
      keyword: string;
      followedOnly: boolean;
      fromTime: string;
      toTime: string;
      page: number;
      pageSize: number;
    }) => ["hot-search", "list", filters] as const,
    detail: (id: string) => ["hot-search", "detail", id] as const,
    topics: ["hot-search", "topics"] as const,
  },
  diary: {
    all: ["diary"] as const,
    list: (filters: {
      keyword: string;
      mood: "" | "HAPPY" | "CALM" | "SAD" | "ANGRY" | "TIRED" | "EXCITED";
      archiveState: "ALL" | "ACTIVE" | "ARCHIVED";
      startDate: string;
      endDate: string;
      page: number;
      pageSize: number;
      selectedId: string;
    }) => ["diary", "list", filters] as const,
    detail: (id: string | null) => ["diary", "detail", id] as const,
  },
  personalKnowledge: {
    all: ["personal-knowledge"] as const,
    collections: (filters: { keyword: string }) => ["personal-knowledge", "collections", filters] as const,
    detail: (knowledgeSetId: string | null) => ["personal-knowledge", "detail", knowledgeSetId] as const,
    sources: (knowledgeSetId: string | null) => ["personal-knowledge", "sources", knowledgeSetId] as const,
    chat: (knowledgeSetId: string | null) => ["personal-knowledge", "chat", knowledgeSetId] as const,
  },
  knowledgeSets: {
    all: ["knowledge-sets"] as const,
    list: (filters: {
      keyword: string;
      status: "ALL" | "ENABLED" | "DISABLED";
      visibility: "ALL" | "PRIVATE" | "PUBLIC";
      page: number;
      pageSize: number;
    }) => ["knowledge-sets", "list", filters] as const,
    sourcesAll: ["knowledge-sets", "sources"] as const,
    sources: (
      knowledgeSetId: string | null,
      filters: {
        keyword: string;
        status: "ALL" | "PENDING" | "PARSING" | "SUCCESS" | "FAILED";
        page: number;
        pageSize: number;
      },
    ) => ["knowledge-sets", "sources", knowledgeSetId, filters] as const,
    chatAll: ["knowledge-sets", "chat"] as const,
    chat: (knowledgeSetId: string | null) => ["knowledge-sets", "chat", knowledgeSetId] as const,
  },
  funcDocs: {
    all: ["func-docs"] as const,
    list: (filters: {
      keyword: string;
      status: "ALL" | "UPLOADED" | "PARSING" | "READY" | "FAILED";
      page: number;
      pageSize: number;
    }) => ["func-docs", "list", filters] as const,
    detail: (docId: string) => ["func-docs", "detail", docId] as const,
    headings: (docId: string) => ["func-docs", "headings", docId] as const,
    processNodes: (filters: {
      docId: string;
      headingId: string;
      keyword: string;
      page: number;
      pageSize: number;
    }) => ["func-docs", "process-nodes", filters] as const,
    featureTree: (docId: string) => ["func-docs", "feature-tree", docId] as const,
    featuresRoot: (docId: string) => ["func-docs", "features", docId] as const,
    features: (filters: {
      docId: string;
      level2Id: string;
      keyword: string;
      page: number;
      pageSize: number;
    }) => ["func-docs", "features", filters] as const,
  },
  chat: {
    all: ["chat"] as const,
    list: ["chat", "sessions"] as const,
    models: ["chat", "models"] as const,
    scopes: ["chat", "scopes"] as const,
    messages: (sessionId: string | null) => ["chat", "messages", sessionId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    exceptionLogsRoot: ["notifications", "exception-logs"] as const,
    exceptionLogs: (filters: {
      keyword: string;
      channelType: "ALL" | "BROWSER" | "EMAIL" | "SMS" | "WECHAT" | "PUSH";
      page: number;
      pageSize: number;
    }) => ["notifications", "exception-logs", filters] as const,
    recipients: ["notifications", "send", "recipients"] as const,
  },
  mcpTools: {
    all: ["mcp-tools"] as const,
    list: (filters: {
      keyword: string;
      env: "" | "dev" | "test" | "stage" | "prod";
      status: "ALL" | "REGISTERED" | "ENABLED" | "DISABLED" | "GRAY_RELEASE" | "SOURCE_REMOVED";
      serverId: string;
      category: string;
      page: number;
      pageSize: number;
      selectedId: string;
    }) => ["mcp-tools", "list", filters] as const,
    detail: (id: string | null) => ["mcp-tools", "detail", id] as const,
    meta: ["mcp-tools", "meta"] as const,
  },
  mcpServers: {
    all: ["mcp-servers"] as const,
    list: (filters: {
      keyword: string;
      env: "" | "dev" | "test" | "stage" | "prod";
      status: "ALL" | "CREATED" | "ACTIVE" | "DEGRADED" | "INACTIVE";
      page: number;
      pageSize: number;
      selectedId: string;
    }) => ["mcp-servers", "list", filters] as const,
    detail: (id: string | null) => ["mcp-servers", "detail", id] as const,
  },
  agents: {
    all: ["agents"] as const,
    list: (filters: {
      keyword: string;
      status: "ALL" | "DRAFT" | "ENABLED" | "DISABLED";
      category: string;
      modelId: string;
      page: number;
      pageSize: number;
      selectedId: string;
    }) => ["agents", "list", filters] as const,
    detail: (id: string | null) => ["agents", "detail", id] as const,
    meta: ["agents", "meta"] as const,
    toolOptions: ["agents", "tool-options"] as const,
  },
  orchestration: {
    all: ["orchestration"] as const,
    list: (filters: {
      keyword: string;
      status: "ALL" | "DRAFT" | "PENDING" | "PUBLISHED" | "DISABLED";
      page: number;
      pageSize: number;
    }) => ["orchestration", "list", filters] as const,
    detail: (workflowId: string | null) => ["orchestration", "detail", workflowId] as const,
    versions: (workflowId: string | null) => ["orchestration", "versions", workflowId] as const,
    runs: (workflowId: string | null) => ["orchestration", "runs", workflowId] as const,
  },
};
