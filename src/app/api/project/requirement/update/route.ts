import { NextResponse } from "next/server";
import { requirementUpdateSchema } from "@/features/requirements/schema";
import { updateRequirement } from "@/lib/requirements/mock-store";

export async function PUT(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = requirementUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(updateRequirement(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "更新失败" },
      { status: 404 },
    );
  }
}
