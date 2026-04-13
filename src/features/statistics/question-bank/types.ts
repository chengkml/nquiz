export type StatisticsOverview = {
  todoCount: number;
  subjectCount: number;
  questionCount: number;
  yesterdayQuestionCount: number;
};

export type DateCountMap = Record<string, number>;
export type SubjectCountMap = Record<string, number>;

export type QuestionBankDashboardMeta = {
  scope: "CURRENT_USER";
  scopeLabel: string;
  generatedAt: string;
  todoNotice: string;
  subjectDistributionNotice: string;
  source: "mock-bff" | "backend";
};

export type QuestionBankDashboard = {
  overview: StatisticsOverview;
  questionCountByLastSevenDays: DateCountMap;
  questionCountBySubject: SubjectCountMap;
  questionCountByLastMonth: DateCountMap;
  meta: QuestionBankDashboardMeta;
};
