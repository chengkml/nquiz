import { NextResponse } from "next/server";
import { lifeCountdownGenerateSchema } from "@/features/life-countdown/schema";
import { generateTodayWarning } from "@/lib/life-countdown/mock-store";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = lifeCountdownGenerateSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "请求参数不合法" }, { status: 400 });
  }

  try {
    return NextResponse.json(generateTodayWarning(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "生成今日警示语失败" },
      { status: 400 },
    );
  }
}
