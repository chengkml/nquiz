import { NextResponse } from "next/server";
import { lifeCountdownSaveSchema } from "@/features/life-countdown/schema";
import { saveLifeCountdownProfile } from "@/lib/life-countdown/mock-store";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = lifeCountdownSaveSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "表单校验失败" }, { status: 400 });
  }

  try {
    return NextResponse.json(saveLifeCountdownProfile(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存生命倒计时配置失败" },
      { status: 400 },
    );
  }
}
