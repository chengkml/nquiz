import { NextRequest, NextResponse } from "next/server";
import { docFilterSchema, docFormSchema } from "@/features/docs/schema";
import { createDoc, listDocs } from "@/lib/docs/mock-store";

export async function GET(request: NextRequest) {
  const filters = docFilterSchema.parse({
    keyword: request.nextUrl.searchParams.get("keyword") ?? "",
    type: request.nextUrl.searchParams.get("type") ?? "ALL",
    status: request.nextUrl.searchParams.get("status") ?? "ALL",
    page: request.nextUrl.searchParams.get("page") ?? 1,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? 8,
  });

  return NextResponse.json(listDocs(filters));
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = docFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "表单校验失败" },
      { status: 400 },
    );
  }

  return NextResponse.json(createDoc(parsed.data), { status: 201 });
}

