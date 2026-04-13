import { NextResponse } from "next/server";
import { deleteRequirement } from "@/lib/requirements/mock-store";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(deleteRequirement(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除失败" },
      { status: 404 },
    );
  }
}
