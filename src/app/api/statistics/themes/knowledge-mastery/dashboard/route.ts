import { NextResponse } from "next/server";
import { getKnowledgeMasteryDashboardSummary } from "@/lib/statistics/knowledge-mastery/mock-store";

export async function GET() {
  return NextResponse.json(getKnowledgeMasteryDashboardSummary());
}
