import { NextResponse } from "next/server";
import { testDatasource } from "@/lib/datasource/mock-store";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(testDatasource(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "测试连接失败" },
      { status: 404 },
    );
  }
}
