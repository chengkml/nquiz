import { notificationExceptionLogFilterSchema } from "@/features/notifications/exception-logs/schema";
import type {
  NotificationExceptionLogFilters,
  NotificationExceptionLogItem,
  NotificationExceptionLogListResponse,
  RetryNotificationExceptionLogResponse,
} from "@/features/notifications/exception-logs/types";

type NotificationChannel = "BROWSER" | "EMAIL" | "SMS" | "WECHAT" | "PUSH";
type NotificationLogLevel = "ERROR" | "SUCCESS";

interface NotificationLogRecord {
  id: string;
  channelType: NotificationChannel;
  messagePayload: string;
  errorMessage: string;
  level: NotificationLogLevel;
  createdAt: string;
  retryCount: number;
  lastRetryAt: string | null;
  lastRetryResult: string | null;
}

const logs: NotificationLogRecord[] = [
  {
    id: "notify-error-email-001",
    channelType: "EMAIL",
    messagePayload: JSON.stringify({
      senderId: "system-bot",
      to: "product@modo.ai",
      title: "需求评审提醒",
      content: "请在今天 18:00 前完成需求评审。",
      type: "SYSTEM_NOTICE",
    }),
    errorMessage: "SMTP 连接超时，邮件服务器 15 秒内未响应。",
    level: "ERROR",
    createdAt: "2026-04-11T07:20:00.000Z",
    retryCount: 1,
    lastRetryAt: "2026-04-11T07:24:00.000Z",
    lastRetryResult: "第一次重试仍然超时",
  },
  {
    id: "notify-error-wechat-002",
    channelType: "WECHAT",
    messagePayload: JSON.stringify({
      senderId: "ops-console",
      to: "ck-wechat",
      title: "构建结果通知",
      content: "nquiz 主分支构建失败，请查看日志。",
      type: "DEPLOY_ALERT",
      simulateRetryFailure: true,
    }),
    errorMessage: "微信模板消息接口返回 502，上游网关暂不可用。",
    level: "ERROR",
    createdAt: "2026-04-11T09:05:00.000Z",
    retryCount: 0,
    lastRetryAt: null,
    lastRetryResult: null,
  },
  {
    id: "notify-error-sms-003",
    channelType: "SMS",
    messagePayload: JSON.stringify({
      senderId: "quiz-service",
      title: "验证码发送",
      content: "您的验证码为 653281。",
      type: "OTP",
    }),
    errorMessage: "短信 payload 缺少接收手机号，无法继续投递。",
    level: "ERROR",
    createdAt: "2026-04-11T10:15:00.000Z",
    retryCount: 0,
    lastRetryAt: null,
    lastRetryResult: null,
  },
  {
    id: "notify-error-email-004",
    channelType: "EMAIL",
    messagePayload: "{\"senderId\":\"report-bot\",\"to\":\"audit@modo.ai\",\"title\":\"日报\",\"content\":\"今日构建全部通过\"",
    errorMessage: "历史坏数据：messagePayload JSON 结构损坏，无法完整反序列化。",
    level: "ERROR",
    createdAt: "2026-04-11T11:42:00.000Z",
    retryCount: 0,
    lastRetryAt: null,
    lastRetryResult: null,
  },
  {
    id: "notify-error-push-005",
    channelType: "PUSH",
    messagePayload: JSON.stringify({
      senderId: "study-reminder",
      to: "user-1024",
      title: "复习提醒",
      content: "你有 12 个待复习知识点尚未完成。",
      type: "LEARNING_NOTICE",
    }),
    errorMessage: "Push token 已失效，客户端返回 410 GONE。",
    level: "ERROR",
    createdAt: "2026-04-11T12:30:00.000Z",
    retryCount: 2,
    lastRetryAt: "2026-04-11T12:35:00.000Z",
    lastRetryResult: "Push token 仍无效",
  },
  {
    id: "notify-success-email-006",
    channelType: "EMAIL",
    messagePayload: JSON.stringify({
      senderId: "system-bot",
      to: "arch@modo.ai",
      title: "历史成功记录",
      content: "这条记录用于证明成功日志不会出现在异常页。",
      type: "SYSTEM_NOTICE",
    }),
    errorMessage: "",
    level: "SUCCESS",
    createdAt: "2026-04-10T13:20:00.000Z",
    retryCount: 0,
    lastRetryAt: null,
    lastRetryResult: null,
  },
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function safeParsePayload(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function getRetryBlockedReason(
  payload: Record<string, unknown> | null,
  channelType: NotificationChannel,
) {
  if (!payload) {
    return "原始 payload 不是有效 JSON，当前不能重试。";
  }

  const recipient = payload.to;
  const title = payload.title;
  const content = payload.content;

  if (typeof recipient !== "string" || recipient.trim().length === 0) {
    return channelType === "SMS" ? "短信缺少接收手机号，不能发起重试。" : "通知缺少接收人，不能发起重试。";
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return "通知缺少标题，不能发起重试。";
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return "通知缺少正文内容，不能发起重试。";
  }

  return null;
}

function toLogItem(record: NotificationLogRecord): NotificationExceptionLogItem {
  const payload = safeParsePayload(record.messagePayload);
  const retryBlockedReason = getRetryBlockedReason(payload, record.channelType);

  return {
    id: record.id,
    channelType: record.channelType,
    senderId: typeof payload?.senderId === "string" ? payload.senderId : "-",
    recipient: typeof payload?.to === "string" ? payload.to : "-",
    title: typeof payload?.title === "string" ? payload.title : "-",
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    rawPayloadText: record.messagePayload,
    rawPayload: payload,
    retryable: retryBlockedReason == null,
    retryBlockedReason,
    retryCount: record.retryCount,
    lastRetryAt: record.lastRetryAt,
    lastRetryResult: record.lastRetryResult,
  };
}

function matchesKeyword(item: NotificationExceptionLogItem, keyword: string) {
  if (!keyword) {
    return true;
  }

  const haystack = [
    item.channelType,
    item.senderId,
    item.recipient,
    item.title,
    item.errorMessage,
    item.rawPayloadText,
    item.lastRetryResult ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(keyword);
}

export function listNotificationExceptionLogs(
  rawFilters: NotificationExceptionLogFilters,
): NotificationExceptionLogListResponse {
  const filters = notificationExceptionLogFilterSchema.parse(rawFilters);
  const keyword = normalizeKeyword(filters.keyword);

  const errorLogs = logs
    .filter((record) => record.level === "ERROR")
    .map(toLogItem)
    .filter((item) => (filters.channelType === "ALL" ? true : item.channelType === filters.channelType))
    .filter((item) => matchesKeyword(item, keyword))
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1));

  const start = (filters.page - 1) * filters.pageSize;
  const end = start + filters.pageSize;

  return {
    items: errorLogs.slice(start, end),
    total: errorLogs.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalErrors: errorLogs.length,
      retryableCount: errorLogs.filter((item) => item.retryable).length,
      blockedCount: errorLogs.filter((item) => !item.retryable).length,
    },
  };
}

export function retryNotificationExceptionLog(id: string): RetryNotificationExceptionLogResponse {
  const index = logs.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error("异常日志不存在");
  }

  const current = logs[index];
  if (current.level !== "ERROR") {
    throw new Error("当前记录已不在异常列表中，不能重复重试");
  }

  const detail = toLogItem(current);
  if (!detail.retryable) {
    throw new Error(detail.retryBlockedReason || "当前日志不可重试");
  }

  const payload = safeParsePayload(current.messagePayload);
  const shouldFail = Boolean(payload?.simulateRetryFailure);
  const now = new Date().toISOString();

  const nextRecord: NotificationLogRecord = {
    ...current,
    retryCount: current.retryCount + 1,
    lastRetryAt: now,
    lastRetryResult: shouldFail
      ? "重试失败：上游渠道仍返回临时错误，请稍后再试。"
      : "重试成功：已重新投递到通知渠道。",
    level: shouldFail ? "ERROR" : "SUCCESS",
    errorMessage: shouldFail ? current.errorMessage : "已成功重试",
  };

  logs[index] = nextRecord;

  return {
    success: !shouldFail,
    resolved: !shouldFail,
    message: shouldFail ? "重试失败：渠道仍不可用，请稍后再试。" : "重试成功，该异常日志已从列表移除。",
    log: toLogItem(nextRecord),
  };
}

export function appendNotificationExceptionLog(input: {
  channelType: NotificationChannel;
  payload?: Record<string, unknown>;
  messagePayload?: Record<string, unknown>;
  errorMessage: string;
}) {
  const payload = input.payload ?? input.messagePayload ?? {};
  logs.unshift({
    id: createId("notify-error"),
    channelType: input.channelType,
    messagePayload: JSON.stringify(payload),
    errorMessage: input.errorMessage,
    level: "ERROR",
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastRetryAt: null,
    lastRetryResult: null,
  });
}
