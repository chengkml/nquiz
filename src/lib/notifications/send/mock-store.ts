import type {
  NotificationJobLogLine,
  NotificationJobStatusEvent,
  NotificationRecipientItem,
  NotificationRecipientsResponse,
  NotificationSendChannel,
  NotificationSendJobItem,
  NotificationSendRequest,
  NotificationSendResponse,
  NotificationSendSkippedRecipient,
} from "@/features/notifications/send/types";
import { appendNotificationExceptionLog } from "@/lib/notifications/exception-logs/mock-store";

interface NotificationJobRecord extends NotificationSendJobItem {
  senderId: string;
  content: string;
  logs: NotificationJobLogLine[];
  failureLogged: boolean;
}

const recipientStore: NotificationRecipientItem[] = [
  {
    id: "notify-user-001",
    userId: "admin",
    userName: "系统管理员",
    state: "ENABLED",
    email: "admin@nquiz.local",
    phone: "13800000001",
    canReceive: { BROWSER: true, EMAIL: true, SMS: true },
  },
  {
    id: "notify-user-002",
    userId: "teacher.demo",
    userName: "演示教师",
    state: "ENABLED",
    email: "teacher@nquiz.local",
    phone: null,
    canReceive: { BROWSER: true, EMAIL: true, SMS: false },
  },
  {
    id: "notify-user-003",
    userId: "ops.chen",
    userName: "陈运营",
    state: "ENABLED",
    email: null,
    phone: "13800000003",
    canReceive: { BROWSER: true, EMAIL: false, SMS: true },
  },
  {
    id: "notify-user-004",
    userId: "review.liu",
    userName: "刘审计",
    state: "ENABLED",
    email: "review@nquiz.local",
    phone: "13800000004",
    canReceive: { BROWSER: true, EMAIL: true, SMS: true },
  },
  {
    id: "notify-user-005",
    userId: "disabled.user",
    userName: "停用账号",
    state: "DISABLED",
    email: "disabled@nquiz.local",
    phone: "13800000005",
    canReceive: { BROWSER: false, EMAIL: false, SMS: false },
  },
];

const jobStore = new Map<string, NotificationJobRecord>();

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRecipientAddress(recipient: NotificationRecipientItem, channel: NotificationSendChannel) {
  if (channel === "EMAIL") {
    return recipient.email;
  }
  if (channel === "SMS") {
    return recipient.phone;
  }
  return recipient.userId;
}

function resolveChannelLabel(channel: NotificationSendChannel) {
  if (channel === "EMAIL") return "邮件";
  if (channel === "SMS") return "短信";
  return "站内消息";
}

function resolveSkipReason(channel: NotificationSendChannel) {
  if (channel === "EMAIL") return "未配置邮箱";
  if (channel === "SMS") return "未配置手机号";
  return "接收人不可用";
}

function selectRecipients(payload: NotificationSendRequest) {
  const enabledRecipients = recipientStore.filter((item) => item.state === "ENABLED");

  if (payload.sendScope === "ALL_USERS") {
    return enabledRecipients;
  }

  const target = new Set(payload.userIds);
  return enabledRecipients.filter((item) => target.has(item.userId));
}

function shouldFail(job: NotificationJobRecord) {
  const seed = `${job.channel}:${job.targetUserId}:${job.id}`;
  const score = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;

  if (job.channel === "SMS") return score < 30;
  if (job.channel === "EMAIL") return score < 22;
  return score < 10;
}

function appendJobLog(job: NotificationJobRecord, level: NotificationJobLogLine["level"], message: string) {
  const line: NotificationJobLogLine = {
    jobId: job.id,
    timestamp: nowIso(),
    level,
    message,
  };
  job.logs.push(line);
  return line;
}

function toStatusEvent(job: NotificationJobRecord): NotificationJobStatusEvent {
  return {
    jobId: job.id,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    failureReason: job.failureReason,
  };
}

function persistFailureLog(job: NotificationJobRecord) {
  if (job.failureLogged || job.status !== "FAILED") {
    return;
  }

  appendNotificationExceptionLog({
    channelType: job.channel,
    payload: {
      senderId: job.senderId,
      to: job.recipient,
      title: job.title,
      content: job.content,
      type: job.type,
    },
    errorMessage: job.failureReason || `${resolveChannelLabel(job.channel)}通道返回失败`,
  });

  job.failureLogged = true;
}

export function listNotificationRecipients(): NotificationRecipientsResponse {
  return {
    items: clone(recipientStore),
    total: recipientStore.length,
  };
}

export function createNotificationSendRequest(payload: NotificationSendRequest): NotificationSendResponse {
  const selected = selectRecipients(payload);
  if (selected.length === 0) {
    throw new Error("没有可发送的目标用户，请检查发送范围与接收人选择");
  }

  const jobs: NotificationSendJobItem[] = [];
  const skippedRecipients: NotificationSendSkippedRecipient[] = [];

  for (const recipient of selected) {
    const address = resolveRecipientAddress(recipient, payload.channel);
    const canReceive = recipient.canReceive[payload.channel];

    if (!canReceive || !address) {
      skippedRecipients.push({
        userId: recipient.userId,
        userName: recipient.userName,
        reason: resolveSkipReason(payload.channel),
      });
      continue;
    }

    const job: NotificationJobRecord = {
      id: createId("notify-job"),
      channel: payload.channel,
      status: "PENDING",
      targetUserId: recipient.userId,
      targetUserName: recipient.userName,
      recipient: address,
      title: payload.title,
      type: payload.type,
      createdAt: nowIso(),
      startedAt: null,
      completedAt: null,
      failureReason: null,
      senderId: "nquiz-admin",
      content: payload.content,
      logs: [],
      failureLogged: false,
    };

    jobStore.set(job.id, job);
    jobs.push(clone(job));
  }

  if (jobs.length === 0) {
    throw new Error("当前渠道没有可发送目标，请检查接收人联系方式后重试");
  }

  return {
    requestId: createId("notify-request"),
    channel: payload.channel,
    sendScope: payload.sendScope,
    totalRecipients: selected.length,
    createdJobCount: jobs.length,
    skippedCount: skippedRecipients.length,
    skippedRecipients,
    jobs,
  };
}

export function getNotificationJobById(jobId: string): NotificationSendJobItem | null {
  const job = jobStore.get(jobId);
  return job ? clone(job) : null;
}

export async function replayOrRunNotificationJob(
  jobId: string,
  handlers: {
    onStatus: (status: NotificationJobStatusEvent) => Promise<void> | void;
    onLog: (line: NotificationJobLogLine) => Promise<void> | void;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const job = jobStore.get(jobId);
  if (!job) {
    return { ok: false, message: "任务不存在或已过期" };
  }

  for (const line of job.logs) {
    await handlers.onLog(clone(line));
  }

  if (job.status === "PENDING") {
    job.status = "RUNNING";
    job.startedAt = nowIso();
    await handlers.onStatus(toStatusEvent(job));

    const channelLabel = resolveChannelLabel(job.channel);
    const taskPrefix = `[${channelLabel}]`;

    await sleep(260);
    await handlers.onLog(appendJobLog(job, "INFO", `${taskPrefix} 任务已入队，准备开始发送`));

    await sleep(320);
    await handlers.onLog(appendJobLog(job, "INFO", `${taskPrefix} 已解析接收人：${job.recipient}`));

    await sleep(360);
    await handlers.onLog(appendJobLog(job, "INFO", `${taskPrefix} 正在下发消息：${job.title}`));

    await sleep(340);
    if (shouldFail(job)) {
      job.status = "FAILED";
      job.failureReason = `${channelLabel}通道调用失败，模拟上游服务暂不可用`;
      job.completedAt = nowIso();
      await handlers.onLog(appendJobLog(job, "ERROR", `${taskPrefix} ${job.failureReason}`));
      persistFailureLog(job);
      await handlers.onStatus(toStatusEvent(job));
      return { ok: true };
    }

    job.status = "SUCCESS";
    job.failureReason = null;
    job.completedAt = nowIso();
    await handlers.onLog(appendJobLog(job, "SUCCESS", `${taskPrefix} 发送成功并完成任务`));
    await handlers.onStatus(toStatusEvent(job));
    return { ok: true };
  }

  await handlers.onStatus(toStatusEvent(job));
  return { ok: true };
}
