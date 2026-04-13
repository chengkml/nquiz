import { NextResponse } from "next/server";
import { listRequirementHistoryOptions } from "@/lib/requirements/mock-store";

export async function GET() {
  return NextResponse.json(listRequirementHistoryOptions());
}
