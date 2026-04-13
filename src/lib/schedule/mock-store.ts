import { scheduleEventMutationSchema, scheduleListFilterSchema } from "@/features/schedule/schema";
import type {
  ScheduleEditableStatus,
  ScheduleEvent,
  ScheduleListFilters,
  ScheduleListResult,
  ScheduleMutationInput,
  ScheduleStatus,
} from "@/features/schedule/types";

const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

interface ScheduleRecord {
  id: string;
  title: string;
  descr: string;
  status: ScheduleEditableStatus | "COMPLETED";
  priority: ScheduleEvent["priority"];
  startTime: string;
  endTime: string;
  expireTime?: string;
  allDay: boolean;
  completedAt?: string;
  todoId?: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

const scheduleRecords: ScheduleRecord[] = [
  {
    id: "sch-weekly-sync",
    title: "项目周会",
    descr: "同步 nquiz 菜单迁移进度、阻塞点与回归计划。",
    status: "SCHEDULED",
    priority: "MEDIUM",
    startTime: "2026-04-12T01:30:00.000Z",
    endTime: "2026-04-12T02:30:00.000Z",
    expireTime: "2026-04-12T02:30:00.000Z",
    allDay: false,
    createDate: "2026-04-10T08:20:00.000Z",
    updateDate: "2026-04-10T08:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "sch-migration-check",
    title: "迁移验收回归",
    descr: "对本周新增迁移页面执行 smoke 回归，重点关注表单和筛选链路。",
    status: "IN_PROGRESS",
    priority: "HIGH",
    startTime: "2026-04-11T05:00:00.000Z",
    endTime: "2026-04-11T07:00:00.000Z",
    expireTime: "2026-04-11T07:30:00.000Z",
    allDay: false,
    createDate: "2026-04-10T09:00:00.000Z",
    updateDate: "2026-04-11T05:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "sch-release-freeze",
    title: "发布冻结窗口",
    descr: "冻结后仅允许高优先级缺陷修复，禁止新增功能需求。",
    status: "CANCELLED",
    priority: "LOW",
    startTime: "2026-04-09T12:00:00.000Z",
    endTime: "2026-04-09T14:00:00.000Z",
    allDay: false,
    createDate: "2026-04-08T03:30:00.000Z",
    updateDate: "2026-04-09T01:10:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "sch-completed-retro",
    title: "模块复盘会",
    descr: "已完成模块回顾，整理差异说明与后续优化建议。",
    status: "COMPLETED",
    priority: "MEDIUM",
    startTime: "2026-04-08T10:00:00.000Z",
    endTime: "2026-04-08T11:00:00.000Z",
    allDay: false,
    completedAt: "2026-04-08T11:02:00.000Z",
    createDate: "2026-04-07T06:30:00.000Z",
    updateDate: "2026-04-08T11:02:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "sch-other-user",
    title: "其他用户日程（隔离测试）",
    descr: "用于验证当前用户不可见。",
    status: "SCHEDULED",
    priority: "LOW",
    startTime: "2026-04-11T02:00:00.000Z",
    endTime: "2026-04-11T03:00:00.000Z",
    allDay: false,
    createDate: "2026-04-07T06:30:00.000Z",
    updateDate: "2026-04-07T06:30:00.000Z",
    createUserId: "other-user",
    createUserName: "其他用户",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveStatus(record: ScheduleRecord): ScheduleStatus {
  if (record.status === "COMPLETED") return "COMPLETED";
  if (record.status === "CANCELLED") return "CANCELLED";

  if (record.expireTime) {
    const expireMs = new Date(record.expireTime).getTime();
    if (!Number.isNaN(expireMs) && expireMs < Date.now()) {
      return "EXPIRED";
    }
  }

  return record.status;
}

function toScheduleEvent(record: ScheduleRecord): ScheduleEvent {
  return {
    ...record,
    status: resolveStatus(record),
  };
}

function getVisibleRecords() {
  return scheduleRecords.filter((item) => item.createUserId === CURRENT_USER_ID);
}

function overlapsRange(record: ScheduleRecord, rangeStartMs: number, rangeEndMs: number) {
  const startMs = new Date(record.startTime).getTime();
  const endMs = new Date(record.endTime).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return false;
  }

  return !(endMs < rangeStartMs || startMs > rangeEndMs);
}

function sortByScheduleTime(left: ScheduleRecord, right: ScheduleRecord) {
  if (left.startTime !== right.startTime) {
    return left.startTime < right.startTime ? -1 : 1;
  }
  if (left.endTime !== right.endTime) {
    return left.endTime < right.endTime ? -1 : 1;
  }
  return left.createDate < right.createDate ? -1 : 1;
}

function buildSummary(items: ScheduleEvent[]): ScheduleListResult["summary"] {
  return {
    total: items.length,
    scheduled: items.filter((item) => item.status === "SCHEDULED").length,
    inProgress: items.filter((item) => item.status === "IN_PROGRESS").length,
    completed: items.filter((item) => item.status === "COMPLETED").length,
    cancelled: items.filter((item) => item.status === "CANCELLED").length,
    expired: items.filter((item) => item.status === "EXPIRED").length,
  };
}

export function listScheduleEvents(rawFilters: ScheduleListFilters): ScheduleListResult {
  const filters = scheduleListFilterSchema.parse(rawFilters);
  const rangeStartMs = new Date(filters.rangeStart).getTime();
  const rangeEndMs = new Date(filters.rangeEnd).getTime();

  const items = getVisibleRecords()
    .filter((record) => overlapsRange(record, rangeStartMs, rangeEndMs))
    .sort(sortByScheduleTime)
    .map(toScheduleEvent);

  return {
    items: clone(items),
    summary: buildSummary(items),
    rangeStart: filters.rangeStart,
    rangeEnd: filters.rangeEnd,
  };
}

export function getScheduleEventById(id: string): ScheduleEvent {
  const record = getVisibleRecords().find((item) => item.id === id);
  if (!record) {
    throw new Error("日程不存在或无权访问");
  }
  return clone(toScheduleEvent(record));
}

export function createScheduleEvent(rawInput: ScheduleMutationInput): ScheduleEvent {
  const input = scheduleEventMutationSchema.parse(rawInput);
  const timestamp = nowIso();

  const record: ScheduleRecord = {
    id: `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    descr: input.descr || "",
    status: input.status,
    priority: input.priority,
    startTime: new Date(input.startTime).toISOString(),
    endTime: new Date(input.endTime).toISOString(),
    expireTime: input.expireTime ? new Date(input.expireTime).toISOString() : undefined,
    allDay: input.allDay,
    todoId: undefined,
    completedAt: undefined,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  scheduleRecords.unshift(record);
  return clone(toScheduleEvent(record));
}

export function updateScheduleEvent(id: string, rawInput: ScheduleMutationInput): ScheduleEvent {
  const input = scheduleEventMutationSchema.parse(rawInput);
  const index = scheduleRecords.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);

  if (index < 0) {
    throw new Error("日程不存在或无权编辑");
  }

  const current = scheduleRecords[index];
  if (current.status === "COMPLETED") {
    throw new Error("已完成日程不支持直接编辑状态，请新建或复制一条日程");
  }

  const next: ScheduleRecord = {
    ...current,
    title: input.title,
    descr: input.descr || "",
    status: input.status,
    priority: input.priority,
    startTime: new Date(input.startTime).toISOString(),
    endTime: new Date(input.endTime).toISOString(),
    expireTime: input.expireTime ? new Date(input.expireTime).toISOString() : undefined,
    allDay: input.allDay,
    updateDate: nowIso(),
  };

  scheduleRecords[index] = next;
  return clone(toScheduleEvent(next));
}

export function deleteScheduleEvent(id: string) {
  const index = scheduleRecords.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("日程不存在或无权删除");
  }
  scheduleRecords.splice(index, 1);
}

export function completeScheduleEvent(id: string): ScheduleEvent {
  const index = scheduleRecords.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (index < 0) {
    throw new Error("日程不存在或无权操作");
  }

  const current = scheduleRecords[index];
  const computedStatus = resolveStatus(current);

  if (computedStatus === "CANCELLED") {
    throw new Error("已取消日程不能标记完成");
  }
  if (computedStatus === "EXPIRED") {
    throw new Error("已过期日程不能直接标记完成，请先调整时间后再处理");
  }
  if (computedStatus === "COMPLETED") {
    return clone(toScheduleEvent(current));
  }

  const next: ScheduleRecord = {
    ...current,
    status: "COMPLETED",
    completedAt: nowIso(),
    updateDate: nowIso(),
  };

  scheduleRecords[index] = next;
  return clone(toScheduleEvent(next));
}
