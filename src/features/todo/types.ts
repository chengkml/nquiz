export const TODO_STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "SCHEDULED", label: "待处理" },
  { value: "IN_PROGRESS", label: "进行中" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
  { value: "EXPIRED", label: "已过期" },
] as const;

export const TODO_EDITABLE_STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "待处理" },
  { value: "IN_PROGRESS", label: "进行中" },
  { value: "CANCELLED", label: "已取消" },
] as const;

export const TODO_PRIORITY_OPTIONS = [
  { value: "", label: "全部优先级" },
  { value: "LOW", label: "低" },
  { value: "MEDIUM", label: "中" },
  { value: "HIGH", label: "高" },
] as const;

export type TodoStatus = Exclude<(typeof TODO_STATUS_OPTIONS)[number]["value"], "">;
export type TodoEditableStatus = (typeof TODO_EDITABLE_STATUS_OPTIONS)[number]["value"];
export type TodoPriority = Exclude<(typeof TODO_PRIORITY_OPTIONS)[number]["value"], "">;

export interface TodoEntity {
  id: string;
  title: string;
  descr: string;
  status: TodoStatus;
  priority: TodoPriority;
  startTime: string;
  dueDate: string;
  expireTime: string;
  calendarEventId?: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface TodoFilters {
  keyword: string;
  status: "" | TodoStatus;
  priority: "" | TodoPriority;
  page: number;
  pageSize: number;
}

export interface TodoListResult {
  items: TodoEntity[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalTodos: number;
    activeTodos: number;
    completedTodos: number;
    expiredTodos: number;
    dueSoonTodos: number;
  };
}

export interface TodoMutationInput {
  title: string;
  descr?: string;
  status: TodoEditableStatus;
  priority: TodoPriority;
  startTime?: string;
  dueDate?: string;
  expireTime?: string;
}
