import { NextRequest, NextResponse } from "next/server";
import { notificationExceptionLogFilterSchema } from "@/features/notifications/exception-logs/schema";
import { listNotificationExceptionLogs } from "@/lib/notifications/exception-logs/mock-store";

export async function GET(request: NextRequest) {
  const filters = notificationExceptionLogFilterSchema.parse({
    keyword: request.nextUrl.searchParams.get("keyword") ?? "",
    channelType: request.nextUrl.searchParams.get("channelType") ?? "ALL",
    page: request.nextUrl.searchParams.get("page") ?? 1,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? 10,
  });

  return NextResponse.json(listNotificationExceptionLogs(filters));
}
