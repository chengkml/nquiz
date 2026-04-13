import type {
  ScheduleEvent,
  ScheduleListFilters,
  ScheduleListResult,
  ScheduleMutationInput,
} from "@/features/schedule/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }
  return payload as T;
}

export async function fetchScheduleEvents(filters: ScheduleListFilters): Promise<ScheduleListResult> {
  const params = new URLSearchParams({
    viewMode: filters.viewMode,
    rangeStart: filters.rangeStart,
    rangeEnd: filters.rangeEnd,
  });
  return parseResponse<ScheduleListResult>(await fetch(`/api/schedule/events?${params.toString()}`));
}

export async function fetchScheduleEvent(id: string): Promise<ScheduleEvent> {
  return parseResponse<ScheduleEvent>(await fetch(`/api/schedule/events/${id}`));
}

export async function createScheduleEvent(values: ScheduleMutationInput): Promise<ScheduleEvent> {
  return parseResponse<ScheduleEvent>(
    await fetch("/api/schedule/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function updateScheduleEvent(id: string, values: ScheduleMutationInput): Promise<ScheduleEvent> {
  return parseResponse<ScheduleEvent>(
    await fetch(`/api/schedule/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function deleteScheduleEvent(id: string): Promise<{ success: true }> {
  return parseResponse<{ success: true }>(
    await fetch(`/api/schedule/events/${id}`, {
      method: "DELETE",
    }),
  );
}

export async function completeScheduleEvent(id: string): Promise<ScheduleEvent> {
  return parseResponse<ScheduleEvent>(
    await fetch(`/api/schedule/events/${id}/complete`, {
      method: "POST",
    }),
  );
}
