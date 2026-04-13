export type ScheduleViewMode = "MONTH" | "WEEK" | "YEAR";

export type ScheduleStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type ScheduleEditableStatus = "SCHEDULED" | "IN_PROGRESS" | "CANCELLED";

export type SchedulePriority = "LOW" | "MEDIUM" | "HIGH";

export interface ScheduleEvent {
  id: string;
  title: string;
  descr: string;
  status: ScheduleStatus;
  priority: SchedulePriority;
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

export interface ScheduleListFilters {
  viewMode: ScheduleViewMode;
  rangeStart: string;
  rangeEnd: string;
}

export interface ScheduleListSummary {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  expired: number;
}

export interface ScheduleListResult {
  items: ScheduleEvent[];
  summary: ScheduleListSummary;
  rangeStart: string;
  rangeEnd: string;
}

export interface ScheduleMutationInput {
  title: string;
  descr: string;
  status: ScheduleEditableStatus;
  priority: SchedulePriority;
  startTime: string;
  endTime: string;
  expireTime?: string;
  allDay: boolean;
}
