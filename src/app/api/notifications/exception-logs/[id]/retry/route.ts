import { NextResponse } from "next/server";
import { retryNotificationExceptionLog } from "@/lib/notifications/exception-logs/mock-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    return NextResponse.json(retryNotificationExceptionLog(id));
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "重试失败",
      },
      {
        status: 400,
      },
    );
  }
}
