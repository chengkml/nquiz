export type NotificationSendChannel = "BROWSER" | "EMAIL" | "SMS";
export type NotificationMessageType = "INFO" | "WARNING" | "ERROR" | "SUCCESS";
export type NotificationSendScope = "SPECIFIC_USERS" | "ALL_USERS";

export type NotificationRecipientState = "ENABLED" | "DISABLED";

export interface NotificationRecipientItem {
  id: string;
  userId: string;
  userName: string;
  state: NotificationRecipientState;
  email: string | null;
  phone: string | null;
  canReceive: {
    BROWSER: boolean;
    EMAIL: boolean;
    SMS: boolean;
  };
}

export interface NotificationRecipientsResponse {
  items: NotificationRecipientItem[];
  total: number;
}

export interface NotificationSendRequest {
  channel: NotificationSendChannel;
  sendScope: NotificationSendScope;
  userIds: string[];
  title: string;
  content: string;
  type: NotificationMessageType;
}

export interface NotificationSendSkippedRecipient {
  userId: string;
  userName: string;
  reason: string;
}

export type NotificationJobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface NotificationSendJobItem {
  id: string;
  channel: NotificationSendChannel;
  status: NotificationJobStatus;
  targetUserId: string;
  targetUserName: string;
  recipient: string;
  title: string;
  type: NotificationMessageType;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface NotificationSendResponse {
  requestId: string;
  channel: NotificationSendChannel;
  sendScope: NotificationSendScope;
  totalRecipients: number;
  createdJobCount: number;
  skippedCount: number;
  skippedRecipients: NotificationSendSkippedRecipient[];
  jobs: NotificationSendJobItem[];
}

export type NotificationLogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

export interface NotificationJobLogLine {
  jobId: string;
  timestamp: string;
  level: NotificationLogLevel;
  message: string;
}

export interface NotificationJobStatusEvent {
  jobId: string;
  status: NotificationJobStatus;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface NotificationJobDoneEvent {
  jobId: string;
}
