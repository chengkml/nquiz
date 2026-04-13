export type DiaryMood = "HAPPY" | "CALM" | "SAD" | "ANGRY" | "TIRED" | "EXCITED";
export type DiaryArchiveFilter = "ALL" | "ACTIVE" | "ARCHIVED";

export interface DiaryEntity {
  id: string;
  title: string;
  content: string;
  diaryDate: string;
  mood: DiaryMood;
  weather: string;
  archived: boolean;
  createUserId: string;
  createUserName: string;
  createDate: string;
  updateDate: string;
}

export interface DiaryListFilters {
  keyword: string;
  mood: "" | DiaryMood;
  archiveState: DiaryArchiveFilter;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  selectedId: string;
}

export interface DiaryListItem extends DiaryEntity {
  contentPreview: string;
}

export interface DiaryMoodSummaryItem {
  mood: DiaryMood;
  count: number;
}

export interface DiarySummary {
  totalDiaries: number;
  archivedDiaries: number;
  activeDiaries: number;
  todayDiaryCount: number;
  moodBreakdown: DiaryMoodSummaryItem[];
}

export interface DiaryListResult {
  items: DiaryListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: DiarySummary;
}

export interface DiaryMutationInput {
  title: string;
  content: string;
  diaryDate: string;
  mood: DiaryMood;
  weather?: string;
}

export const DIARY_MOOD_OPTIONS: Array<{ value: DiaryMood; label: string }> = [
  { value: "HAPPY", label: "开心" },
  { value: "CALM", label: "平静" },
  { value: "SAD", label: "难过" },
  { value: "ANGRY", label: "愤怒" },
  { value: "TIRED", label: "疲惫" },
  { value: "EXCITED", label: "兴奋" },
];
