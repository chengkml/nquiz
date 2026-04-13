export type NotificationChannelType = "ALL" | "BROWSER" | "EMAIL" | "SMS" | "WECHAT" | "PUSH";

export interface NotificationExceptionLogFilters {
  keyword: string;
  channelType: NotificationChannelType;
  page: number;
  pageSize: number;
}

export interface NotificationExceptionLogItem {
  id: string;
  channelType: Exclude<NotificationChannelType, "ALL">;
  senderId: string;
  recipient: string;
  title: string;
  errorMessage: string;
  createdAt: string;
  rawPayloadText: string;
  rawPayload: Record<string, unknown> | null;
  retryable: boolean;
  retryBlockedReason: string | null;
  retryCount: number;
  lastRetryAt: string | null;
  lastRetryResult: string | null;
}

export interface NotificationExceptionLogSummary {
  totalErrors: number;
  retryableCount: number;
  blockedCount: number;
}

export interface NotificationExceptionLogListResponse {
  items: NotificationExceptionLogItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: NotificationExceptionLogSummary;
}

export interface RetryNotificationExceptionLogResponse {
  success: boolean;
  resolved: boolean;
  message: string;
  log: NotificationExceptionLogItem;
}
