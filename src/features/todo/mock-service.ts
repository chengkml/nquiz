import { todoFilterSchema } from "@/features/todo/schema";
import type { TodoEntity, TodoFilters, TodoListResult, TodoMutationInput, TodoPriority, TodoStatus } from "@/features/todo/types";

interface CalendarEvent {
  id: string;
  todoId: string;
  status: TodoStatus;
  startTime: string;
  dueDate: string;
  expireTime: string;
  completedAt?: string;
  updateDate: string;
}

const TODO_STORAGE_KEY = "nquiz-todos";
const TODO_CALENDAR_STORAGE_KEY = "nquiz-calendar-events";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

const seedTodos: TodoEntity[] = [
  {
    id: "todo-001",
    title: "完成错题本模块字段梳理",
    descr: "先对齐 quiz 的错误题状态枚举和题型定义，再拆分 nquiz 迁移任务。",
    status: "SCHEDULED",
    priority: "HIGH",
    startTime: "2026-04-11T08:30:00.000Z",
    dueDate: "2026-04-12T10:00:00.000Z",
    expireTime: "2026-04-12T23:59:00.000Z",
    calendarEventId: "calendar-todo-001",
    createDate: "2026-04-11T08:28:00.000Z",
    updateDate: "2026-04-11T08:28:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "todo-002",
    title: "Review MCP Tool 页面字段映射",
    descr: "核对状态枚举、环境枚举、策略 JSON 校验规则，避免迁移语义漂移。",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    startTime: "2026-04-11T06:00:00.000Z",
    dueDate: "2026-04-11T15:00:00.000Z",
    expireTime: "2026-04-11T18:00:00.000Z",
    calendarEventId: "calendar-todo-002",
    createDate: "2026-04-11T05:45:00.000Z",
    updateDate: "2026-04-11T09:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "todo-003",
    title: "同步通知异常日志重试说明",
    descr: "补齐重试成功后日志移除语义，和运维台账预期保持一致。",
    status: "COMPLETED",
    priority: "LOW",
    startTime: "2026-04-10T03:00:00.000Z",
    dueDate: "2026-04-10T09:00:00.000Z",
    expireTime: "2026-04-10T11:00:00.000Z",
    calendarEventId: "calendar-todo-003",
    createDate: "2026-04-10T02:55:00.000Z",
    updateDate: "2026-04-10T08:45:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "todo-004",
    title: "验证旧版 Todo 过期规则",
    descr: "检查定时任务扫描条件，确认仅扫描 SCHEDULED/IN_PROGRESS。",
    status: "SCHEDULED",
    priority: "MEDIUM",
    startTime: "2026-04-09T02:00:00.000Z",
    dueDate: "2026-04-09T09:00:00.000Z",
    expireTime: "2026-04-10T00:00:00.000Z",
    calendarEventId: "calendar-todo-004",
    createDate: "2026-04-09T01:58:00.000Z",
    updateDate: "2026-04-09T01:58:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "todo-005",
    title: "拆分 Todo 与日程联动边界",
    descr: "先保留 calendarEventId 与 adapter 边界，后续接真实 Calendar 模块。",
    status: "CANCELLED",
    priority: "LOW",
    startTime: "2026-04-11T01:30:00.000Z",
    dueDate: "2026-04-11T05:30:00.000Z",
    expireTime: "2026-04-11T20:00:00.000Z",
    calendarEventId: "calendar-todo-005",
    createDate: "2026-04-11T01:00:00.000Z",
    updateDate: "2026-04-11T03:00:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
];

const seedCalendarEvents: CalendarEvent[] = seedTodos
  .filter((todo) => todo.calendarEventId)
  .map((todo) => ({
    id: todo.calendarEventId as string,
    todoId: todo.id,
    status: todo.status,
    startTime: todo.startTime,
    dueDate: todo.dueDate,
    expireTime: todo.expireTime,
    completedAt: todo.status === "COMPLETED" ? todo.updateDate : undefined,
    updateDate: todo.updateDate,
  }));

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

function toIso(value?: string) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function ensureTodos() {
  const existing = readJson<TodoEntity[] | null>(TODO_STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }
  writeJson(TODO_STORAGE_KEY, seedTodos);
  return seedTodos;
}

function ensureCalendarEvents() {
  const existing = readJson<CalendarEvent[] | null>(TODO_CALENDAR_STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }
  writeJson(TODO_CALENDAR_STORAGE_KEY, seedCalendarEvents);
  return seedCalendarEvents;
}

function saveTodos(todos: TodoEntity[]) {
  writeJson(TODO_STORAGE_KEY, todos);
}

function saveCalendarEvents(events: CalendarEvent[]) {
  writeJson(TODO_CALENDAR_STORAGE_KEY, events);
}

function isActiveStatus(status: TodoStatus) {
  return status === "SCHEDULED" || status === "IN_PROGRESS";
}

function isMutableStatus(status: TodoStatus) {
  return status !== "COMPLETED" && status !== "EXPIRED";
}

function getVisibleTodos() {
  return ensureTodos()
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .sort((a, b) => (a.createDate < b.createDate ? 1 : -1));
}

function syncCalendarEventByTodo(todo: TodoEntity) {
  if (!todo.calendarEventId) return;

  const events = ensureCalendarEvents();
  const target = events.find((item) => item.id === todo.calendarEventId);
  if (target) {
    target.status = todo.status;
    target.startTime = todo.startTime;
    target.dueDate = todo.dueDate;
    target.expireTime = todo.expireTime;
    target.updateDate = todo.updateDate;
    if (todo.status === "COMPLETED") {
      target.completedAt = todo.updateDate;
    }
    saveCalendarEvents(events);
    return;
  }

  events.push({
    id: todo.calendarEventId,
    todoId: todo.id,
    status: todo.status,
    startTime: todo.startTime,
    dueDate: todo.dueDate,
    expireTime: todo.expireTime,
    completedAt: todo.status === "COMPLETED" ? todo.updateDate : undefined,
    updateDate: todo.updateDate,
  });
  saveCalendarEvents(events);
}

function resolveStartTime(startTime: string, dueDate: string) {
  return startTime || dueDate || nowIso();
}

function normalizeMutationInput(input: TodoMutationInput) {
  const title = normalizeText(input.title);
  const descr = normalizeText(input.descr);
  const startTime = toIso(input.startTime);
  const dueDate = toIso(input.dueDate);
  const expireTime = toIso(input.expireTime);

  const resolvedStartTime = resolveStartTime(startTime, dueDate);

  return {
    title,
    descr,
    status: input.status,
    priority: input.priority,
    startTime: resolvedStartTime,
    dueDate,
    expireTime,
  };
}

function runExpireSweep() {
  const todos = ensureTodos();
  const events = ensureCalendarEvents();
  const nowMs = Date.now();
  const timestamp = nowIso();
  let changed = false;

  for (const todo of todos) {
    if (todo.createUserId !== CURRENT_USER_ID) continue;
    if (!isActiveStatus(todo.status)) continue;
    if (!todo.expireTime) continue;

    const expireMs = new Date(todo.expireTime).getTime();
    if (Number.isNaN(expireMs)) continue;
    if (expireMs > nowMs) continue;

    todo.status = "EXPIRED";
    todo.updateDate = timestamp;
    changed = true;

    if (todo.calendarEventId) {
      const event = events.find((item) => item.id === todo.calendarEventId);
      if (event) {
        event.status = "EXPIRED";
        event.updateDate = timestamp;
      }
    }
  }

  if (changed) {
    saveTodos(todos);
    saveCalendarEvents(events);
  }
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listTodos(rawFilters: TodoFilters): Promise<TodoListResult> {
  await delay(140);
  const filters = todoFilterSchema.parse(rawFilters);
  runExpireSweep();

  const todos = getVisibleTodos();
  const keyword = normalizeText(filters.keyword).toLowerCase();

  const filtered = todos.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (!keyword) return true;

    const haystack = `${item.title} ${item.descr}`.toLowerCase();
    return haystack.includes(keyword);
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(start, start + filters.pageSize);

  const activeTodos = todos.filter((item) => isActiveStatus(item.status)).length;
  const completedTodos = todos.filter((item) => item.status === "COMPLETED").length;
  const expiredTodos = todos.filter((item) => item.status === "EXPIRED").length;

  const next48Hours = Date.now() + 48 * 60 * 60 * 1000;
  const dueSoonTodos = todos.filter((item) => {
    if (!isActiveStatus(item.status) || !item.dueDate) return false;
    const dueMs = new Date(item.dueDate).getTime();
    if (Number.isNaN(dueMs)) return false;
    return dueMs >= Date.now() && dueMs <= next48Hours;
  }).length;

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalTodos: todos.length,
      activeTodos,
      completedTodos,
      expiredTodos,
      dueSoonTodos,
    },
  };
}

export async function getTodoDetail(id: string) {
  await delay(80);
  runExpireSweep();
  return getVisibleTodos().find((item) => item.id === id) ?? null;
}

export async function createTodo(input: TodoMutationInput) {
  await delay(120);
  const payload = normalizeMutationInput(input);
  const todos = ensureTodos();
  const timestamp = nowIso();
  const todoId = createId("todo");
  const calendarEventId = createId("calendar");

  const next: TodoEntity = {
    id: todoId,
    title: payload.title,
    descr: payload.descr,
    status: payload.status,
    priority: payload.priority as TodoPriority,
    startTime: payload.startTime,
    dueDate: payload.dueDate,
    expireTime: payload.expireTime,
    calendarEventId,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  todos.unshift(next);
  saveTodos(todos);
  syncCalendarEventByTodo(next);
  return next;
}

export async function updateTodo(id: string, input: TodoMutationInput) {
  await delay(120);
  runExpireSweep();
  const todos = ensureTodos();
  const target = todos.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!target) {
    throw new Error("待办不存在或无权限访问");
  }

  if (!isMutableStatus(target.status)) {
    throw new Error("已完成或已过期待办仅支持只读查看");
  }

  const payload = normalizeMutationInput(input);
  const timestamp = nowIso();

  target.title = payload.title;
  target.descr = payload.descr;
  target.status = payload.status;
  target.priority = payload.priority as TodoPriority;
  target.startTime = payload.startTime;
  target.dueDate = payload.dueDate;
  target.expireTime = payload.expireTime;
  target.updateDate = timestamp;

  if (!target.calendarEventId) {
    target.calendarEventId = createId("calendar");
  }

  saveTodos(todos);
  syncCalendarEventByTodo(target);
  return target;
}

export async function completeTodo(id: string) {
  await delay(100);
  runExpireSweep();
  const todos = ensureTodos();
  const target = todos.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!target) {
    throw new Error("待办不存在或无权限访问");
  }

  if (target.status === "EXPIRED") {
    throw new Error("已过期待办不能直接置为完成");
  }

  if (target.status === "COMPLETED") {
    return target;
  }

  target.status = "COMPLETED";
  target.updateDate = nowIso();
  saveTodos(todos);
  syncCalendarEventByTodo(target);
  return target;
}

export async function deleteTodo(id: string) {
  await delay(100);
  const todos = ensureTodos();
  const target = todos.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!target) {
    throw new Error("待办不存在或无权限访问");
  }

  const nextTodos = todos.filter((item) => item.id !== id);
  saveTodos(nextTodos);

  if (target.calendarEventId) {
    const events = ensureCalendarEvents();
    const nextEvents = events.filter((item) => item.id !== target.calendarEventId);
    saveCalendarEvents(nextEvents);
  }
}
