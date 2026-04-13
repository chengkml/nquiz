import { NextResponse } from "next/server";
import { docFormSchema } from "@/features/docs/schema";
import { deleteDoc, getDocById, updateDoc } from "@/lib/docs/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(getDocById(id));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "文档不存在" },
      { status: 404 },
    );
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await request.json().catch(() => null);
  const parsed = docFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(updateDoc(id, parsed.data));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "更新失败" },
      { status: 404 },
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    deleteDoc(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除失败" },
      { status: 404 },
    );
  }
}

