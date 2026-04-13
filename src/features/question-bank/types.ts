export type QuestionType = "SINGLE" | "MULTIPLE" | "BLANK" | "SHORT_ANSWER";

export interface QuestionRecord {
  id: string;
  type: QuestionType;
  content: string;
  options: string[];
  answers: string[];
  explanation: string;
  subjectId: string;
  subjectName: string;
  categoryId: string;
  categoryName: string;
  knowledgePoints: string[];
  createUserId: string;
  createUserName: string;
  createDate: string;
  updateDate: string;
}

export interface QuestionListFilters {
  keyword: string;
  type: "" | QuestionType;
  subjectId: string;
  categoryId: string;
  knowledgeKeyword: string;
  page: number;
  pageSize: number;
  selectedId: string;
}

export interface QuestionListItem extends QuestionRecord {
  contentPreview: string;
}

export interface QuestionListSummary {
  totalQuestions: number;
  byType: Record<QuestionType, number>;
  linkedKnowledgePoints: number;
}

export interface QuestionListResult {
  items: QuestionListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: QuestionListSummary;
}

export interface QuestionMutationInput {
  type: QuestionType;
  content: string;
  options: string[];
  answers: string[];
  explanation?: string;
  subjectId: string;
  categoryId: string;
  knowledgePoints: string[];
}

export interface QuestionCategoryOption {
  id: string;
  subjectId: string;
  name: string;
}

export interface QuestionSubjectOption {
  id: string;
  name: string;
  label: string;
}

export interface QuestionGenerateInput {
  subjectId: string;
  categoryId: string;
  knowledgeTitle: string;
  knowledgeContent: string;
  questionCount: number;
  model: string;
  types: QuestionType[];
}

export interface GeneratedQuestionCandidate {
  id: string;
  type: QuestionType;
  content: string;
  options: string[];
  answers: string[];
  explanation: string;
  knowledgePoints: string[];
}

export interface QuestionGenerateResult {
  generatedAt: string;
  model: string;
  logs: string[];
  candidates: GeneratedQuestionCandidate[];
}

export interface BatchCreateFromCandidatesInput {
  subjectId: string;
  categoryId: string;
  candidates: GeneratedQuestionCandidate[];
}

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: "SINGLE", label: "单选题" },
  { value: "MULTIPLE", label: "多选题" },
  { value: "BLANK", label: "填空题" },
  { value: "SHORT_ANSWER", label: "简答题" },
];
