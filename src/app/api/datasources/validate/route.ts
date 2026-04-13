import { NextResponse } from "next/server";
import { datasourceFormSchema } from "@/features/datasource/schemas/datasource-form-schema";
import { validateDatasource } from "@/lib/datasource/mock-store";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = datasourceFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  return NextResponse.json(validateDatasource(parsed.data));
}
