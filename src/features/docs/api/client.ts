import type { DocListFilters, DocListItem, DocListResult, DocMutationInput } from "@/features/docs/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchDocList(filters: DocListFilters): Promise<DocListResult> {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.type !== "ALL") params.set("type", filters.type);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 8) params.set("pageSize", String(filters.pageSize));

  const suffix = params.toString();
  return parseResponse<DocListResult>(await fetch(`/api/docs${suffix ? `?${suffix}` : ""}`));
}

export async function createDoc(values: DocMutationInput): Promise<DocListItem> {
  return parseResponse<DocListItem>(
    await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function updateDoc(id: string, values: DocMutationInput): Promise<DocListItem> {
  return parseResponse<DocListItem>(
    await fetch(`/api/docs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function deleteDoc(id: string): Promise<{ success: true }> {
  return parseResponse<{ success: true }>(
    await fetch(`/api/docs/${id}`, {
      method: "DELETE",
    }),
  );
}

