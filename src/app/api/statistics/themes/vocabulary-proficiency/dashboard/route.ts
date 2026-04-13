import { NextResponse } from "next/server";
import { getVocabularyProficiencyDashboardSummary } from "@/lib/statistics/vocabulary-proficiency/mock-store";

export async function GET() {
  return NextResponse.json(getVocabularyProficiencyDashboardSummary());
}
