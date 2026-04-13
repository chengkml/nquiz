import { NextResponse } from "next/server";
import { requirementReviewSchema } from "@/features/requirements/schema";
import { reviewRequirement } from "@/lib/requirements/mock-store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await request.json().catch(() => null);
  const parsed = requirementReviewSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "评审参数不合法" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(reviewRequirement(id, parsed.data));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "评审失败" },
      { status: 400 },
    );
  }
}
