import { NextResponse } from "next/server";
import { getBaiduPanAuthStatus } from "@/lib/baidu-pan/config";

export async function POST() {
  return NextResponse.json(getBaiduPanAuthStatus());
}
