import type {
  CountMap,
  DateCountMap,
  VocabularyProficiencyDashboard,
} from "@/features/statistics/vocabulary-proficiency/types";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateSeries(days: number, counts: number[]): DateCountMap {
  const result: DateCountMap = {};
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    result[formatDate(date)] = counts[index] ?? 0;
  }

  return result;
}

function sum(values: number[]) {
  return values.reduce((total, current) => total + current, 0);
}

export function getVocabularyProficiencyDashboard(): VocabularyProficiencyDashboard {
  const reviewCountByLastSevenDays = [6, 8, 5, 9, 7, 11, 10];
  const proficiencyDistribution: CountMap = {
    "新词（0次连对）": 18,
    "入门（1-2次连对）": 26,
    "进阶（3-5次连对）": 21,
    "熟练（6次及以上）": 15,
  };
  const reviewScoreDistribution: CountMap = {
    "0分": 5,
    "1分": 0,
    "2分": 0,
    "3分": 18,
    "4分": 0,
    "5分": 24,
  };

  return {
    overview: {
      totalWords: 92,
      activeWords: 80,
      archivedWords: 12,
      masteredWords: 15,
      dueTodayWords: 13,
      averageRepetition: 2.96,
      averageEasinessFactor: 2.41,
    },
    proficiencyDistribution,
    reviewScoreDistribution,
    reviewCountByLastSevenDays: buildDateSeries(7, reviewCountByLastSevenDays),
    meta: {
      scope: "CURRENT_USER",
      scopeLabel: "当前登录用户维度",
      generatedAt: new Date().toISOString(),
      source: "mock-bff",
      dueTodayNotice: "今日待复习 = 未归档且 nextReviewDate <= 当前时间的单词卡。",
      masteryNotice: "熟练 = 未归档且 repetition >= 6；分层沿用旧 quiz 的 0 / 1-2 / 3-5 / 6+ 口径。",
      reviewScoreNotice: "评分分布保留旧后端 0~5 分桶；即使首版复习页常见快捷评分是 0/3/5，也继续兼容历史数据。",
    },
  };
}

export function getVocabularyProficiencyDashboardSummary() {
  const dashboard = getVocabularyProficiencyDashboard();
  const reviewCounts = Object.values(dashboard.reviewCountByLastSevenDays);
  const buckets = Object.entries(dashboard.proficiencyDistribution).sort((a, b) => b[1] - a[1]);
  const activeWords = dashboard.overview.activeWords;
  const masteredRate = activeWords > 0 ? Number(((dashboard.overview.masteredWords / activeWords) * 100).toFixed(1)) : 0;

  return {
    dashboard,
    insights: {
      reviewCountLastSevenDays: sum(reviewCounts),
      maxReviewDayCount: Math.max(...reviewCounts, 0),
      masteredRate,
      biggestBucket: buckets[0]?.[0] ?? "-",
    },
  };
}
