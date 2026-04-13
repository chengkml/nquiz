export type VocabularyProficiencyOverview = {
  totalWords: number;
  activeWords: number;
  archivedWords: number;
  masteredWords: number;
  dueTodayWords: number;
  averageRepetition: number;
  averageEasinessFactor: number;
};

export type DateCountMap = Record<string, number>;
export type CountMap = Record<string, number>;

export type VocabularyProficiencyDashboardMeta = {
  scope: "CURRENT_USER";
  scopeLabel: string;
  generatedAt: string;
  source: "mock-bff" | "backend";
  dueTodayNotice: string;
  masteryNotice: string;
  reviewScoreNotice: string;
};

export type VocabularyProficiencyDashboard = {
  overview: VocabularyProficiencyOverview;
  proficiencyDistribution: CountMap;
  reviewScoreDistribution: CountMap;
  reviewCountByLastSevenDays: DateCountMap;
  meta: VocabularyProficiencyDashboardMeta;
};
