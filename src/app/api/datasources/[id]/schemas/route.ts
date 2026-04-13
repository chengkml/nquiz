import { NextResponse } from "next/server";
import { getSchemas } from "@/lib/datasource/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(getSchemas(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "获取 schema 列表失败" },
      { status: 404 },
    );
  }
}
