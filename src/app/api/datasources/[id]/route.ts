import { NextResponse } from "next/server";
import { datasourceFormSchema } from "@/features/datasource/schemas/datasource-form-schema";
import { deleteDatasourceEntry, getDatasource, updateDatasourceEntry } from "@/lib/datasource/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(getDatasource(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "数据源不存在" },
      { status: 404 },
    );
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await request.json();
  const parsed = datasourceFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(updateDatasourceEntry(id, parsed.data));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "更新失败" },
      { status: 404 },
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  deleteDatasourceEntry(id);
  return NextResponse.json({ success: true });
}
