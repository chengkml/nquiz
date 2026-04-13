import type {
  NotificationExceptionLogFilters,
  NotificationExceptionLogListResponse,
  RetryNotificationExceptionLogResponse,
} from "@/features/notifications/exception-logs/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchNotificationExceptionLogs(
  filters: NotificationExceptionLogFilters,
): Promise<NotificationExceptionLogListResponse> {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.channelType !== "ALL") params.set("channelType", filters.channelType);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));

  const suffix = params.toString();
  return parseResponse<NotificationExceptionLogListResponse>(
    await fetch(`/api/notifications/exception-logs${suffix ? `?${suffix}` : ""}`),
  );
}

export async function retryNotificationExceptionLog(
  id: string,
): Promise<RetryNotificationExceptionLogResponse> {
  return parseResponse<RetryNotificationExceptionLogResponse>(
    await fetch(`/api/notifications/exception-logs/${id}/retry`, {
      method: "POST",
    }),
  );
}
