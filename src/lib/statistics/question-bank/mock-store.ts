import type { DateCountMap, QuestionBankDashboard, SubjectCountMap } from "@/features/statistics/question-bank/types";

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

export function getQuestionBankDashboard(): QuestionBankDashboard {
  const lastSevenDayCounts = [3, 5, 2, 6, 4, 7, 5];
  const lastMonthCounts = [
    1, 0, 2, 1, 3, 2, 0, 4, 2, 1,
    3, 5, 2, 1, 4, 6, 3, 2, 5, 4,
    2, 3, 1, 4, 6, 5, 3, 7, 4, 5,
  ];

  const questionCountBySubject: SubjectCountMap = {
    数学: 48,
    英语: 41,
    计算机基础: 36,
    数据结构: 27,
    操作系统: 19,
    数据库: 16,
  };

  return {
    overview: {
      todoCount: 9,
      questionCount: 152,
      yesterdayQuestionCount: lastSevenDayCounts[lastSevenDayCounts.length - 2] ?? 0,
      subjectCount: 6,
    },
    questionCountByLastSevenDays: buildDateSeries(7, lastSevenDayCounts),
    questionCountBySubject,
    questionCountByLastMonth: buildDateSeries(30, lastMonthCounts),
    meta: {
      scope: "CURRENT_USER",
      scopeLabel: "当前登录用户维度",
      generatedAt: new Date().toISOString(),
      todoNotice: "待办数口径为当前用户待处理 + 进行中的 Todo，总量不局限于题目录入任务。",
      subjectDistributionNotice:
        "学科分布只统计已通过知识点/分类链路建立学科关联的题目；单题命中多个学科时，分学科总和可能大于题目总数。",
      source: "mock-bff",
    },
  };
}

export function getQuestionBankDashboardSummary() {
  const dashboard = getQuestionBankDashboard();
  const monthCounts = Object.values(dashboard.questionCountByLastMonth);
  const maxDayIncrease = Math.max(...monthCounts, 0);
  const averageDailyIncrease = Number((sum(monthCounts) / Math.max(monthCounts.length, 1)).toFixed(1));
  const topSubjectEntry = Object.entries(dashboard.questionCountBySubject).sort((a, b) => b[1] - a[1])[0] ?? ["-", 0];

  return {
    dashboard,
    insights: {
      topSubject: {
        subject: topSubjectEntry[0],
        count: topSubjectEntry[1],
      },
      maxDayIncrease,
      averageDailyIncrease,
    },
  };
}
