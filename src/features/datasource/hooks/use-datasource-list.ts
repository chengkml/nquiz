"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDatasourceList } from "@/features/datasource/api/client";
import { queryKeys } from "@/lib/query/query-keys";

export function useDatasourceList(params: {
  name: string;
  active: "" | "true" | "false";
  pageNum: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: queryKeys.datasources(params),
    queryFn: () => fetchDatasourceList(params),
  });
}
