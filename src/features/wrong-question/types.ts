export const QUESTION_TYPE_OPTIONS = [
  { label: "单选题", value: "SINGLE" },
  { label: "多选题", value: "MULTIPLE" },
  { label: "填空题", value: "BLANK" },
  { label: "简答题", value: "SHORT_ANSWER" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { label: "简单", value: "EASY" },
  { label: "中等", value: "MEDIUM" },
  { label: "困难", value: "HARD" },
] as const;

export type QuestionType = (typeof QUESTION_TYPE_OPTIONS)[number]["value"];
export type DifficultyLevel = (typeof DIFFICULTY_OPTIONS)[number]["value"];

export type WrongQuestionSubject = {
  id: string;
  name: string;
};

export type WrongQuestionCategory = {
  id: string;
  subjectId: string;
  name: string;
};

export type WrongQuestionImageMeta = {
  id: string;
  originalName: string;
  url: string;
  uploadedAt: string;
  size: number;
};

export type WrongQuestionRecord = {
  id: string;
  subjectId: string;
  subjectName: string;
  categoryId?: string;
  categoryName?: string;
  type: QuestionType;
  content: string;
  answer?: string;
  difficulty?: DifficultyLevel;
  remark?: string;
  originalImageFileId?: string;
  originalImageName?: string;
  originalImageUrl?: string;
  ocrText?: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
};

export type WrongQuestionFilters = {
  subjectId: string;
  categoryId: string;
  type: "" | QuestionType;
  difficulty: "" | DifficultyLevel;
  keyword: string;
  page: number;
  pageSize: number;
};

export type WrongQuestionListResult = {
  items: WrongQuestionRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    total: number;
    withImage: number;
    withOcr: number;
  };
};

export type WrongQuestionMutationInput = {
  subjectId: string;
  categoryId?: string;
  type: QuestionType;
  content: string;
  answer?: string;
  difficulty?: DifficultyLevel;
  remark?: string;
  originalImageFileId?: string;
  originalImageName?: string;
  originalImageUrl?: string;
  ocrText?: string;
};

export type WrongQuestionOcrModel = {
  id: string;
  name: string;
  provider: string;
  isDefault?: boolean;
};
