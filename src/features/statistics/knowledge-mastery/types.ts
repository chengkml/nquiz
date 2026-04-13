export type KnowledgeMasteryOverview = {
  totalKnowledges: number;
  activeKnowledges: number;
  archivedKnowledges: number;
  masteredKnowledges: number;
  dueTodayKnowledges: number;
  averageRepetition: number;
  averageEasinessFactor: number;
};

export type DateCountMap = Record<string, number>;
export type CountMap = Record<string, number>;

export type KnowledgeMasteryDashboardMeta = {
  scope: "CURRENT_USER";
  scopeLabel: string;
  generatedAt: string;
  source: "mock-bff" | "backend";
  dueTodayNotice: string;
  masteryNotice: string;
  reviewScoreNotice: string;
};

export type KnowledgeMasteryDashboard = {
  overview: KnowledgeMasteryOverview;
  masteryDistribution: CountMap;
  knowledgeCountBySubject: CountMap;
  reviewScoreDistribution: CountMap;
  reviewCountByLastSevenDays: DateCountMap;
  meta: KnowledgeMasteryDashboardMeta;
};
