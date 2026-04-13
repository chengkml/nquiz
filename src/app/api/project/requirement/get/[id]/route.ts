import { NextResponse } from "next/server";
import { getRequirementById } from "@/lib/requirements/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(getRequirementById(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "需求不存在" },
      { status: 404 },
    );
  }
}
