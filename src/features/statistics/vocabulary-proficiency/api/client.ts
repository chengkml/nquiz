import type { VocabularyProficiencyDashboard } from "@/features/statistics/vocabulary-proficiency/types";

export type VocabularyProficiencyDashboardResponse = {
  dashboard: VocabularyProficiencyDashboard;
  insights: {
    reviewCountLastSevenDays: number;
    maxReviewDayCount: number;
    masteredRate: number;
    biggestBucket: string;
  };
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchVocabularyProficiencyDashboard(): Promise<VocabularyProficiencyDashboardResponse> {
  return parseResponse<VocabularyProficiencyDashboardResponse>(
    await fetch("/api/statistics/themes/vocabulary-proficiency/dashboard"),
  );
}
