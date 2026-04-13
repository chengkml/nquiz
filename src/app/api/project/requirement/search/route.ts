import { NextResponse } from "next/server";
import { requirementFilterSchema } from "@/features/requirements/schema";
import { searchRequirements } from "@/lib/requirements/mock-store";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = requirementFilterSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "查询参数不合法" },
      { status: 400 },
    );
  }

  return NextResponse.json(searchRequirements(parsed.data));
}
