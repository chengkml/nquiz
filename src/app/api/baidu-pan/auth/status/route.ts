import { NextResponse } from "next/server";
import { getBaiduPanAuthStatus } from "@/lib/baidu-pan/config";

export async function GET() {
  return NextResponse.json(getBaiduPanAuthStatus());
}
