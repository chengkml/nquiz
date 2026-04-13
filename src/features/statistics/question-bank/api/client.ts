import type { QuestionBankDashboard } from "@/features/statistics/question-bank/types";

export type QuestionBankDashboardResponse = {
  dashboard: QuestionBankDashboard;
  insights: {
    topSubject: {
      subject: string;
      count: number;
    };
    maxDayIncrease: number;
    averageDailyIncrease: number;
  };
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchQuestionBankDashboard(): Promise<QuestionBankDashboardResponse> {
  return parseResponse<QuestionBankDashboardResponse>(await fetch("/api/statistics/themes/question-bank/dashboard"));
}
