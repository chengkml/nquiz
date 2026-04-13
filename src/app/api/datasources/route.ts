import { NextRequest, NextResponse } from "next/server";
import { datasourceFormSchema } from "@/features/datasource/schemas/datasource-form-schema";
import { createDatasourceEntry, listDatasources } from "@/lib/datasource/mock-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json(
    listDatasources({
      name: searchParams.get("name") || undefined,
      active: (searchParams.get("active") as "" | "true" | "false" | null) || undefined,
      pageNum: Number(searchParams.get("pageNum") || 0),
      pageSize: Number(searchParams.get("pageSize") || 10),
    }),
  );
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = datasourceFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  return NextResponse.json(createDatasourceEntry(parsed.data), { status: 201 });
}
