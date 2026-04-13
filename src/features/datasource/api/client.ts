import type {
  ConnectionCheckResult,
  DatabaseSchemaSummary,
  DatasourceDetail,
  DatasourceFormValues,
  DatasourceListResponse,
} from "@/lib/datasource/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchDatasourceList(params: {
  name?: string;
  active?: "" | "true" | "false";
  pageNum?: number;
  pageSize?: number;
}): Promise<DatasourceListResponse> {
  const search = new URLSearchParams();

  if (params.name) {
    search.set("name", params.name);
  }
  if (params.active) {
    search.set("active", params.active);
  }
  search.set("pageNum", String(params.pageNum ?? 0));
  search.set("pageSize", String(params.pageSize ?? 10));

  return parseResponse<DatasourceListResponse>(await fetch(`/api/datasources?${search.toString()}`));
}

export async function fetchDatasourceDetail(id: string): Promise<DatasourceDetail> {
  return parseResponse<DatasourceDetail>(await fetch(`/api/datasources/${id}`));
}

export async function createDatasource(values: DatasourceFormValues): Promise<DatasourceDetail> {
  return parseResponse<DatasourceDetail>(
    await fetch(`/api/datasources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function updateDatasource(values: DatasourceFormValues): Promise<DatasourceDetail> {
  if (!values.id) {
    throw new Error("缺少数据源 ID");
  }

  return parseResponse<DatasourceDetail>(
    await fetch(`/api/datasources/${values.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function deleteDatasource(id: string): Promise<{ success: true }> {
  return parseResponse<{ success: true }>(
    await fetch(`/api/datasources/${id}`, {
      method: "DELETE",
    }),
  );
}

export async function validateDatasourceConnection(
  values: DatasourceFormValues,
): Promise<ConnectionCheckResult> {
  return parseResponse<ConnectionCheckResult>(
    await fetch(`/api/datasources/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function testDatasourceConnection(id: string): Promise<ConnectionCheckResult> {
  return parseResponse<ConnectionCheckResult>(
    await fetch(`/api/datasources/${id}/test`, {
      method: "POST",
    }),
  );
}

export async function fetchDatasourceSchemas(id: string): Promise<string[]> {
  return parseResponse<string[]>(await fetch(`/api/datasources/${id}/schemas`));
}

export async function previewDatasourceSchema(id: string, schema: string): Promise<DatabaseSchemaSummary> {
  const search = new URLSearchParams();
  if (schema) {
    search.set("schema", schema);
  }

  return parseResponse<DatabaseSchemaSummary>(
    await fetch(`/api/datasources/${id}/schema/preview?${search.toString()}`),
  );
}

export async function collectDatasourceSchema(id: string, schema: string): Promise<DatabaseSchemaSummary> {
  return parseResponse<DatabaseSchemaSummary>(
    await fetch(`/api/datasources/${id}/schema/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema }),
    }),
  );
}
