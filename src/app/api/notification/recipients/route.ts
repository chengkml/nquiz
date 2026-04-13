import { NextResponse } from "next/server";
import { listNotificationRecipients } from "@/lib/notifications/send/mock-store";

export function GET() {
  return NextResponse.json(listNotificationRecipients());
}
