import { NextResponse } from "next/server";
import { collectSchema } from "@/lib/datasource/mock-store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as { schema?: string };
    return NextResponse.json(collectSchema(id, payload.schema || undefined));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "采集 schema 失败" },
      { status: 404 },
    );
  }
}
