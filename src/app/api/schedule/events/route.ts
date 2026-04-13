import { NextRequest, NextResponse } from "next/server";
import { scheduleEventMutationSchema, scheduleListFilterSchema } from "@/features/schedule/schema";
import { createScheduleEvent, listScheduleEvents } from "@/lib/schedule/mock-store";

export async function GET(request: NextRequest) {
  const parsed = scheduleListFilterSchema.safeParse({
    viewMode: request.nextUrl.searchParams.get("viewMode") ?? "MONTH",
    rangeStart: request.nextUrl.searchParams.get("rangeStart") ?? "",
    rangeEnd: request.nextUrl.searchParams.get("rangeEnd") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "查询参数不合法" },
      { status: 400 },
    );
  }

  return NextResponse.json(listScheduleEvents(parsed.data));
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = scheduleEventMutationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  return NextResponse.json(createScheduleEvent(parsed.data), { status: 201 });
}
