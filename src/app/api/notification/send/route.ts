import { NextResponse } from "next/server";
import { notificationSendRequestSchema } from "@/features/notifications/send/schema";
import { createNotificationSendRequest } from "@/lib/notifications/send/mock-store";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = notificationSendRequestSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "请求参数不合法" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(createNotificationSendRequest(parsed.data), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "发送任务创建失败" },
      { status: 400 },
    );
  }
}
