import { NextResponse } from "next/server";
import { getLifeCountdownProfile } from "@/lib/life-countdown/mock-store";

export async function GET() {
  return NextResponse.json(getLifeCountdownProfile());
}
