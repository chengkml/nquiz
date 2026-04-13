import { NextResponse } from "next/server";
import { listRequirementLifecycle } from "@/lib/requirements/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(listRequirementLifecycle(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "生命周期查询失败" },
      { status: 404 },
    );
  }
}
