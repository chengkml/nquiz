import type {
  NotificationJobDoneEvent,
  NotificationJobLogLine,
  NotificationJobStatusEvent,
  NotificationRecipientsResponse,
  NotificationSendRequest,
  NotificationSendResponse,
} from "@/features/notifications/send/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchNotificationRecipients(): Promise<NotificationRecipientsResponse> {
  return parseResponse<NotificationRecipientsResponse>(await fetch("/api/notification/recipients"));
}

export async function sendNotification(request: NotificationSendRequest): Promise<NotificationSendResponse> {
  return parseResponse<NotificationSendResponse>(
    await fetch("/api/notification/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }),
  );
}

export interface NotificationLogStreamHandlers {
  onLog: (line: NotificationJobLogLine) => void;
  onStatus: (status: NotificationJobStatusEvent) => void;
  onDone: (event: NotificationJobDoneEvent) => void;
  onError: (message: string) => void;
}

export function openNotificationJobLogStream(
  jobId: string,
  handlers: NotificationLogStreamHandlers,
): () => void {
  const source = new EventSource(`/api/notification/jobs/${jobId}/logs/stream`);

  source.addEventListener("log", (event) => {
    try {
      handlers.onLog(JSON.parse(event.data) as NotificationJobLogLine);
    } catch {
      handlers.onError("日志事件解析失败");
    }
  });

  source.addEventListener("status", (event) => {
    try {
      handlers.onStatus(JSON.parse(event.data) as NotificationJobStatusEvent);
    } catch {
      handlers.onError("状态事件解析失败");
    }
  });

  source.addEventListener("done", (event) => {
    try {
      handlers.onDone(JSON.parse(event.data) as NotificationJobDoneEvent);
    } catch {
      handlers.onDone({ jobId });
    }
    source.close();
  });

  source.addEventListener("fatal", (event) => {
    try {
      const payload = JSON.parse(event.data) as { message?: string };
      handlers.onError(payload.message || "日志流异常中断");
    } catch {
      handlers.onError("日志流异常中断");
    }
  });

  source.onerror = () => {
    handlers.onError("日志流连接失败，请稍后重试");
    source.close();
  };

  return () => {
    source.close();
  };
}
