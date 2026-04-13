import { NextResponse } from "next/server";
import { getQuestionBankDashboardSummary } from "@/lib/statistics/question-bank/mock-store";

export async function GET() {
  return NextResponse.json(getQuestionBankDashboardSummary());
}
