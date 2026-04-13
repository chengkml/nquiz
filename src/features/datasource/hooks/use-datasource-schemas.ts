"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDatasourceSchemas } from "@/features/datasource/api/client";
import { queryKeys } from "@/lib/query/query-keys";

export function useDatasourceSchemas(datasourceId: string | null) {
  return useQuery({
    queryKey: queryKeys.datasourceSchemas(datasourceId),
    queryFn: () => fetchDatasourceSchemas(datasourceId as string),
    enabled: Boolean(datasourceId),
  });
}
