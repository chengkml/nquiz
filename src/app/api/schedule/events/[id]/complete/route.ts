import { NextResponse } from "next/server";
import { completeScheduleEvent } from "@/lib/schedule/mock-store";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(completeScheduleEvent(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "标记完成失败" },
      { status: 400 },
    );
  }
}
