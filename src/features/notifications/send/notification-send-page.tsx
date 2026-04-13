"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  MessageSquareText,
  Radio,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  notificationSendFormSchema,
  type NotificationSendFormInput,
  type NotificationSendFormValues,
} from "@/features/notifications/send/schema";
import {
  fetchNotificationRecipients,
  openNotificationJobLogStream,
  sendNotification,
} from "@/features/notifications/send/api/client";
import type {
  NotificationJobLogLine,
  NotificationJobStatus,
  NotificationRecipientItem,
  NotificationSendChannel,
  NotificationSendJobItem,
} from "@/features/notifications/send/types";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

const channelOptions: { value: NotificationSendChannel; label: string; hint: string }[] = [
  {
    value: "BROWSER",
    label: "站内消息",
    hint: "写入消息中心并更新未读徽标",
  },
  {
    value: "EMAIL",
    label: "邮件",
    hint: "发送到用户邮箱",
  },
  {
    value: "SMS",
    label: "短信",
    hint: "发送到用户手机号",
  },
];

const messageTypeOptions = [
  { value: "INFO", label: "普通通知" },
  { value: "SUCCESS", label: "成功提醒" },
  { value: "WARNING", label: "预警提醒" },
  { value: "ERROR", label: "故障告警" },
] as const;

type FeedbackState = { type: "success" | "error"; message: string } | null;
type JobLogState = { lines: NotificationJobLogLine[]; error: string | null; done: boolean };

function inputClassName(hasError = false) {
  return cn(
    "w-full rounded-2xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5",
    hasError && "border-red-300 focus:border-red-400 focus:ring-red-100",
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function resolveRecipientLabel(recipient: NotificationRecipientItem, channel: NotificationSendChannel) {
  if (channel === "EMAIL") {
    return recipient.email || "未配置邮箱";
  }
  if (channel === "SMS") {
    return recipient.phone || "未配置手机号";
  }
  return recipient.userId;
}

function getStatusBadgeClass(status: NotificationJobStatus) {
  if (status === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "RUNNING") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function getLogTone(level: NotificationJobLogLine["level"]) {
  if (level === "ERROR") return "text-red-400";
  if (level === "WARN") return "text-amber-300";
  if (level === "SUCCESS") return "text-emerald-300";
  return "text-sky-300";
}

function FeedbackBanner({ feedback, onClose }: { feedback: FeedbackState; onClose: () => void }) {
  if (!feedback) return null;

  const toneClassName =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", toneClassName)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{feedback.message}</div>
      <button type="button" className="text-xs opacity-80" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-[26px] border border-border bg-card p-4 shadow-sm"
    >
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

export function NotificationSendPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRoutePending, startRouteTransition] = useTransition();

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [recipientKeyword, setRecipientKeyword] = useState("");
  const [jobs, setJobs] = useState<NotificationSendJobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobLogStateMap, setJobLogStateMap] = useState<Record<string, JobLogState>>({});
  const [lastRequestSummary, setLastRequestSummary] = useState<{
    requestId: string;
    totalRecipients: number;
    createdJobCount: number;
    skippedCount: number;
  } | null>(null);

  const form = useForm<NotificationSendFormInput, undefined, NotificationSendFormValues>({
    resolver: zodResolver(notificationSendFormSchema),
    defaultValues: {
      channel: "BROWSER",
      sendScope: "SPECIFIC_USERS",
      userIds: [],
      title: "",
      content: "",
      type: "INFO",
      confirmSendAll: false,
    },
  });

  const selectedChannel = useWatch({ control: form.control, name: "channel" }) ?? "BROWSER";
  const selectedScope = useWatch({ control: form.control, name: "sendScope" }) ?? "SPECIFIC_USERS";
  const selectedUserIds = useWatch({ control: form.control, name: "userIds" }) ?? [];

  const recipientsQuery = useQuery({
    queryKey: queryKeys.notifications.recipients,
    queryFn: fetchNotificationRecipients,
  });

  const sendMutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: async (result) => {
      setFeedback({
        type: "success",
        message: `发送请求已创建 ${result.createdJobCount} 个任务${
          result.skippedCount > 0 ? `，跳过 ${result.skippedCount} 位无可用联系方式用户` : ""
        }。`,
      });

      setJobs(result.jobs);
      setSelectedJobId(result.jobs[0]?.id ?? null);
      setJobLogStateMap(
        Object.fromEntries(
          result.jobs.map((job) => [
            job.id,
            {
              lines: [],
              error: null,
              done: false,
            } satisfies JobLogState,
          ]),
        ),
      );
      setLastRequestSummary({
        requestId: result.requestId,
        totalRecipients: result.totalRecipients,
        createdJobCount: result.createdJobCount,
        skippedCount: result.skippedCount,
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.exceptionLogsRoot });

      if (result.sendScope === "SPECIFIC_USERS") {
        form.resetField("userIds");
      }
      form.resetField("confirmSendAll");
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "发送失败，请稍后重试",
      });
    },
  });

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }

    const jobId = selectedJobId;

    return openNotificationJobLogStream(jobId, {
      onLog: (line) => {
        setJobLogStateMap((current) => {
          const next = current[jobId] ?? { lines: [], error: null, done: false };
          return {
            ...current,
            [jobId]: {
              ...next,
              lines: [...next.lines, line],
              error: null,
            },
          };
        });
      },
      onStatus: (status) => {
        setJobs((current) =>
          current.map((job) =>
            job.id === status.jobId
              ? {
                  ...job,
                  status: status.status,
                  startedAt: status.startedAt,
                  completedAt: status.completedAt,
                  failureReason: status.failureReason,
                }
              : job,
          ),
        );
      },
      onDone: () => {
        setJobLogStateMap((current) => {
          const next = current[jobId] ?? { lines: [], error: null, done: false };
          return {
            ...current,
            [jobId]: {
              ...next,
              done: true,
            },
          };
        });
      },
      onError: (message) => {
        setJobLogStateMap((current) => {
          const next = current[jobId] ?? { lines: [], error: null, done: false };
          return {
            ...current,
            [jobId]: {
              ...next,
              error: message,
            },
          };
        });
      },
    });
  }, [selectedJobId]);

  useEffect(() => {
    if (selectedScope !== "SPECIFIC_USERS") {
      form.clearErrors("userIds");
    }
  }, [selectedScope, form]);

  const recipients = useMemo(() => recipientsQuery.data?.items ?? [], [recipientsQuery.data?.items]);

  const visibleRecipients = useMemo(() => {
    const keyword = recipientKeyword.trim().toLowerCase();
    return recipients
      .filter((item) => {
        const haystack = [item.userId, item.userName, item.email || "", item.phone || ""].join(" ").toLowerCase();
        return keyword ? haystack.includes(keyword) : true;
      })
      .sort((left, right) => {
        if (left.state !== right.state) {
          return left.state === "ENABLED" ? -1 : 1;
        }
        return left.userId.localeCompare(right.userId);
      });
  }, [recipientKeyword, recipients]);

  const enabledRecipients = useMemo(() => recipients.filter((item) => item.state === "ENABLED"), [recipients]);

  const availableCountByChannel = useMemo(() => {
    return {
      BROWSER: enabledRecipients.filter((item) => item.canReceive.BROWSER).length,
      EMAIL: enabledRecipients.filter((item) => item.canReceive.EMAIL).length,
      SMS: enabledRecipients.filter((item) => item.canReceive.SMS).length,
    };
  }, [enabledRecipients]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );
  const selectedJobLogs = selectedJobId ? jobLogStateMap[selectedJobId] : null;
  const logLines = selectedJobLogs?.lines ?? [];
  const streamError = selectedJobLogs?.error ?? null;
  const streamDone = selectedJobLogs?.done ?? false;

  async function handleSubmit(values: NotificationSendFormValues) {
    const payload = {
      channel: values.channel,
      sendScope: values.sendScope,
      userIds: values.sendScope === "ALL_USERS" ? [] : values.userIds,
      title: values.title.trim(),
      content: values.content.trim(),
      type: values.type,
    };

    await sendMutation.mutateAsync(payload);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[30px] border border-border bg-background/90 px-6 py-6 shadow-sm backdrop-blur"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Notification Workbench</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">通知发送页</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                保留 quiz 的“多渠道发送 + 异步任务 + 日志流 + 异常补偿”核心语义，首版聚焦最小可验证闭环。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/notifications/exception-logs"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                查看异常日志
                <ChevronRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() =>
                  startRouteTransition(() => {
                    router.push("/");
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                {isRoutePending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
                返回首页
              </button>
            </div>
          </div>
        </motion.header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <section className="space-y-5 rounded-[30px] border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">发送配置</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <Radio className="h-3.5 w-3.5" />
                异步任务模式
              </span>
            </div>

            <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

            <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">通知渠道</label>
                  <select className={inputClassName(Boolean(form.formState.errors.channel?.message))} {...form.register("channel")}>
                    {channelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {channelOptions.find((option) => option.value === selectedChannel)?.hint}
                  </p>
                  <FieldError message={form.formState.errors.channel?.message} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">消息类型</label>
                  <select className={inputClassName(Boolean(form.formState.errors.type?.message))} {...form.register("type")}>
                    {messageTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={form.formState.errors.type?.message} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">发送范围</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background p-3 text-sm">
                    <input
                      type="radio"
                      value="SPECIFIC_USERS"
                      className="mt-0.5"
                      checked={selectedScope === "SPECIFIC_USERS"}
                      onChange={() => form.setValue("sendScope", "SPECIFIC_USERS", { shouldValidate: true })}
                    />
                    <span>
                      指定用户
                      <span className="mt-1 block text-xs text-muted-foreground">由你选择接收人，适合定向通知。</span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background p-3 text-sm">
                    <input
                      type="radio"
                      value="ALL_USERS"
                      className="mt-0.5"
                      checked={selectedScope === "ALL_USERS"}
                      onChange={() => form.setValue("sendScope", "ALL_USERS", { shouldValidate: true })}
                    />
                    <span>
                      全员发送
                      <span className="mt-1 block text-xs text-muted-foreground">会对所有启用用户批量创建发送任务。</span>
                    </span>
                  </label>
                </div>
              </div>

              {selectedScope === "SPECIFIC_USERS" ? (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">接收人选择</p>
                    <span className="text-xs text-muted-foreground">
                      当前渠道可发送 {availableCountByChannel[selectedChannel]} / {enabledRecipients.length} 位启用用户
                    </span>
                  </div>
                  <input
                    className={inputClassName(false)}
                    placeholder="搜索 userId / 用户名 / 邮箱 / 手机号"
                    value={recipientKeyword}
                    onChange={(event) => setRecipientKeyword(event.target.value)}
                  />

                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-2">
                    {recipientsQuery.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        正在加载接收人列表...
                      </div>
                    ) : visibleRecipients.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">没有匹配的用户</div>
                    ) : (
                      visibleRecipients.map((recipient) => {
                        const enabled = recipient.state === "ENABLED" && recipient.canReceive[selectedChannel];
                        const checked = selectedUserIds.includes(recipient.userId);
                        const contactLabel = resolveRecipientLabel(recipient, selectedChannel);

                        return (
                          <label
                            key={recipient.id}
                            className={cn(
                              "flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 text-sm transition",
                              enabled ? "border-border hover:bg-muted/40" : "border-border/70 bg-muted/30 text-muted-foreground",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                disabled={!enabled}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    form.setValue("userIds", Array.from(new Set([...selectedUserIds, recipient.userId])), {
                                      shouldValidate: true,
                                    });
                                    return;
                                  }
                                  form.setValue(
                                    "userIds",
                                    selectedUserIds.filter((item) => item !== recipient.userId),
                                    {
                                      shouldValidate: true,
                                    },
                                  );
                                }}
                              />
                              <div>
                                <p className="font-medium text-foreground">
                                  {recipient.userName}
                                  <span className="ml-2 text-xs text-muted-foreground">{recipient.userId}</span>
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{contactLabel}</p>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[11px]",
                                enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {enabled ? "可发送" : "不可发送"}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <FieldError message={form.formState.errors.userIds?.message} />
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50/60 p-4">
                  <div className="flex items-start gap-2 text-amber-700">
                    <ShieldAlert className="mt-0.5 h-4 w-4" />
                    <p className="text-sm">全员发送将对所有可用接收人创建异步任务，请确认这次通知是必要的。</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register("confirmSendAll")} />
                    我已确认执行全员发送
                  </label>
                  <FieldError message={form.formState.errors.confirmSendAll?.message} />
                </div>
              )}

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">通知标题</label>
                  <input className={inputClassName(Boolean(form.formState.errors.title?.message))} {...form.register("title")} />
                  <FieldError message={form.formState.errors.title?.message} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">通知内容</label>
                  <textarea
                    className={cn(inputClassName(Boolean(form.formState.errors.content?.message)), "min-h-32 resize-y")}
                    placeholder="请输入通知正文"
                    {...form.register("content")}
                  />
                  <FieldError message={form.formState.errors.content?.message} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  提交后系统会为每个接收人创建异步任务，并在右侧实时查看执行日志。
                </p>
                <button
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  发起发送
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-5 rounded-[30px] border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">执行结果与日志</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <MessageSquareText className="h-3.5 w-3.5" />
                SSE 实时日志
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="已创建任务"
                value={String(lastRequestSummary?.createdJobCount ?? 0)}
                hint={lastRequestSummary ? `请求 ID：${lastRequestSummary.requestId}` : "尚未发起发送请求"}
              />
              <StatCard
                label="跳过用户"
                value={String(lastRequestSummary?.skippedCount ?? 0)}
                hint={lastRequestSummary ? `总候选：${lastRequestSummary.totalRecipients}` : "等待发送结果"}
              />
            </div>

            {jobs.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm">
                  <BellRing className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">还没有发送任务</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  在左侧提交通知后，这里会展示本次任务列表，并可逐条查看日志流和最终状态。
                </p>
              </div>
            ) : (
              <>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-2xl border border-border bg-muted/20 p-2">
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => {
                        setJobLogStateMap((current) => ({
                          ...current,
                          [job.id]: { lines: [], error: null, done: false },
                        }));
                        setSelectedJobId(job.id);
                      }}
                      className={cn(
                        "w-full rounded-xl border bg-background p-3 text-left transition",
                        selectedJobId === job.id ? "border-foreground/30 shadow-sm" : "border-border hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{job.targetUserName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {job.targetUserId} · {job.recipient}
                          </p>
                        </div>
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px]", getStatusBadgeClass(job.status))}>
                          {job.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-black px-4 py-4 text-xs text-white">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div>
                      <p className="font-medium text-white">{selectedJob ? `任务日志 · ${selectedJob.targetUserName}` : "任务日志"}</p>
                      <p className="text-[11px] text-white/60">
                        {selectedJob
                          ? `${selectedJob.id} · ${selectedJob.channel} · 创建于 ${formatDateTime(selectedJob.createdAt)}`
                          : "请选择任务查看日志"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      {selectedJob?.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          已完成
                        </span>
                      ) : null}
                      {selectedJob?.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 text-red-300">
                          <XCircle className="h-3.5 w-3.5" />
                          失败
                        </span>
                      ) : null}
                      {selectedJob?.status === "RUNNING" ? (
                        <span className="inline-flex items-center gap-1 text-sky-300">
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          执行中
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {!selectedJob ? (
                    <p className="text-white/60">请从上方选择任务。</p>
                  ) : (
                    <div className="space-y-2">
                      {logLines.length === 0 ? (
                        <p className="text-white/60">正在等待日志流...</p>
                      ) : (
                        logLines.map((line, index) => (
                          <p key={`${line.timestamp}-${index}`} className="leading-5">
                            <span className="text-white/45">[{formatDateTime(line.timestamp)}]</span>{" "}
                            <span className={getLogTone(line.level)}>[{line.level}]</span> {line.message}
                          </p>
                        ))
                      )}

                      {streamError ? <p className="text-red-300">{streamError}</p> : null}
                      {streamDone ? <p className="text-emerald-300">日志流结束。</p> : null}
                      {selectedJob.failureReason ? <p className="text-red-300">失败原因：{selectedJob.failureReason}</p> : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
