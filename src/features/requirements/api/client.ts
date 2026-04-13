import type {
  RequirementAnalyzeInput,
  RequirementHistoryOptionsResult,
  RequirementLifecycleItem,
  RequirementListFilters,
  RequirementListItem,
  RequirementMutationInput,
  RequirementReviewInput,
  RequirementSearchResult,
  RequirementUpdateInput,
} from "@/features/requirements/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (response.ok === false) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function searchRequirements(filters: RequirementListFilters): Promise<RequirementSearchResult> {
  return parseResponse<RequirementSearchResult>(
    await fetch("/api/project/requirement/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    }),
  );
}

export async function fetchRequirementHistoryOptions(): Promise<RequirementHistoryOptionsResult> {
  return parseResponse<RequirementHistoryOptionsResult>(await fetch("/api/project/requirement/history-options"));
}

export async function createRequirement(payload: RequirementMutationInput): Promise<RequirementListItem> {
  return parseResponse<RequirementListItem>(
    await fetch("/api/project/requirement/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateRequirement(payload: RequirementUpdateInput): Promise<RequirementListItem> {
  return parseResponse<RequirementListItem>(
    await fetch("/api/project/requirement/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteRequirement(id: string): Promise<{ success: true }> {
  return parseResponse<{ success: true }>(await fetch(`/api/project/requirement/delete/${id}`, { method: "DELETE" }));
}

export async function analyzeRequirement(id: string, payload: RequirementAnalyzeInput): Promise<RequirementListItem> {
  return parseResponse<RequirementListItem>(
    await fetch(`/api/project/requirement/${id}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function reviewRequirement(id: string, payload: RequirementReviewInput): Promise<RequirementListItem> {
  return parseResponse<RequirementListItem>(
    await fetch(`/api/project/requirement/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchRequirementLifecycle(id: string): Promise<RequirementLifecycleItem[]> {
  return parseResponse<RequirementLifecycleItem[]>(await fetch(`/api/project/requirement/${id}/lifecycle`));
}
