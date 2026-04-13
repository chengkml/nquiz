import { NextResponse } from "next/server";
import { requirementFormSchema } from "@/features/requirements/schema";
import { createRequirement } from "@/lib/requirements/mock-store";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = requirementFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  return NextResponse.json(createRequirement(parsed.data), { status: 201 });
}
