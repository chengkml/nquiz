import type { KnowledgeMasteryDashboard } from "@/features/statistics/knowledge-mastery/types";

export type KnowledgeMasteryDashboardResponse = {
  dashboard: KnowledgeMasteryDashboard;
  insights: {
    topSubject: {
      subject: string;
      count: number;
    };
    reviewCountLastSevenDays: number;
    maxReviewDayCount: number;
    masteredRate: number;
    biggestMasteryBucket: string;
  };
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchKnowledgeMasteryDashboard(): Promise<KnowledgeMasteryDashboardResponse> {
  return parseResponse<KnowledgeMasteryDashboardResponse>(
    await fetch("/api/statistics/themes/knowledge-mastery/dashboard"),
  );
}
