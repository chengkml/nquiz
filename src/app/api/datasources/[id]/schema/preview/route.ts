import { NextRequest, NextResponse } from "next/server";
import { previewSchema } from "@/lib/datasource/mock-store";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    return NextResponse.json(previewSchema(id, searchParams.get("schema") || undefined));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "预览 schema 失败" },
      { status: 404 },
    );
  }
}
