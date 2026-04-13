import { NextResponse } from "next/server";
import { requirementAnalyzeSchema } from "@/features/requirements/schema";
import { analyzeRequirement } from "@/lib/requirements/mock-store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await request.json().catch(() => null);
  const parsed = requirementAnalyzeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "分析参数不合法" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(analyzeRequirement(id, parsed.data));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "分析失败" },
      { status: 400 },
    );
  }
}
