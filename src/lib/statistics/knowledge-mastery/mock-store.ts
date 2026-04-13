import type {
  CountMap,
  DateCountMap,
  KnowledgeMasteryDashboard,
} from "@/features/statistics/knowledge-mastery/types";

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

export function getKnowledgeMasteryDashboard(): KnowledgeMasteryDashboard {
  const reviewCountByLastSevenDays = [5, 7, 3, 8, 6, 4, 9];
  const masteryDistribution: CountMap = {
    "未掌握（0次连对）": 14,
    "初步掌握（1-2次连对）": 28,
    "稳定掌握（3-5次连对）": 22,
    "深度掌握（6次及以上）": 16,
  };
  const knowledgeCountBySubject: CountMap = {
    数学: 31,
    英语: 18,
    数据结构: 12,
    计算机网络: 8,
    操作系统: 7,
    未归类学科: 4,
  };
  const reviewScoreDistribution: CountMap = {
    "0分": 4,
    "1分": 1,
    "2分": 2,
    "3分": 13,
    "4分": 3,
    "5分": 19,
  };

  return {
    overview: {
      totalKnowledges: 92,
      activeKnowledges: 80,
      archivedKnowledges: 12,
      masteredKnowledges: 16,
      dueTodayKnowledges: 11,
      averageRepetition: 2.84,
      averageEasinessFactor: 2.37,
    },
    masteryDistribution,
    knowledgeCountBySubject,
    reviewScoreDistribution,
    reviewCountByLastSevenDays: buildDateSeries(7, reviewCountByLastSevenDays),
    meta: {
      scope: "CURRENT_USER",
      scopeLabel: "当前登录用户维度",
      generatedAt: new Date().toISOString(),
      source: "mock-bff",
      dueTodayNotice: "今日待复习 = 未归档且 nextReviewDate <= 当前时间的知识点。",
      masteryNotice: "已掌握 = 未归档且 repetition >= 6；掌握分层沿用旧 quiz 的 0 / 1-2 / 3-5 / 6+ 口径。",
      reviewScoreNotice: "评分分布沿用旧后端 0~5 分桶；虽然首版前端常见快捷评分是 0/3/5，但仍保留完整分桶兼容历史数据。",
    },
  };
}

export function getKnowledgeMasteryDashboardSummary() {
  const dashboard = getKnowledgeMasteryDashboard();
  const reviewCounts = Object.values(dashboard.reviewCountByLastSevenDays);
  const topSubjectEntry = Object.entries(dashboard.knowledgeCountBySubject).sort((a, b) => b[1] - a[1])[0] ?? ["-", 0];
  const masteryEntries = Object.entries(dashboard.masteryDistribution);
  const activeKnowledges = dashboard.overview.activeKnowledges;
  const masteredRate = activeKnowledges > 0 ? Number(((dashboard.overview.masteredKnowledges / activeKnowledges) * 100).toFixed(1)) : 0;

  return {
    dashboard,
    insights: {
      topSubject: {
        subject: topSubjectEntry[0],
        count: topSubjectEntry[1],
      },
      reviewCountLastSevenDays: sum(reviewCounts),
      maxReviewDayCount: Math.max(...reviewCounts, 0),
      masteredRate,
      biggestMasteryBucket: masteryEntries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-",
    },
  };
}
