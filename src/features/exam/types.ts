export const EXAM_PAPER_STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "DRAFT", label: "草稿" },
  { value: "PUBLISHED", label: "已发布" },
  { value: "ARCHIVED", label: "已归档" },
] as const;

export const EXAM_SUBJECT_OPTIONS = [
  { value: "math", label: "数学" },
  { value: "english", label: "英语" },
  { value: "chinese", label: "语文" },
  { value: "physics", label: "物理" },
] as const;

export const EXAM_QUESTION_TYPE_OPTIONS = [
  { value: "", label: "全部题型" },
  { value: "SINGLE", label: "单选题" },
  { value: "MULTIPLE", label: "多选题" },
  { value: "BLANK", label: "填空题" },
  { value: "SHORT_ANSWER", label: "简答题" },
] as const;

export type ExamPaperStatus = Exclude<(typeof EXAM_PAPER_STATUS_OPTIONS)[number]["value"], "">;
export type ExamQuestionType = Exclude<(typeof EXAM_QUESTION_TYPE_OPTIONS)[number]["value"], "">;

export interface ExamPaperEntity {
  id: string;
  name: string;
  descr: string;
  subjectId: string;
  subjectName: string;
  status: ExamPaperStatus;
  totalScore: number;
  durationMinutes: number;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface ExamQuestionBankItem {
  id: string;
  subjectId: string;
  subjectName: string;
  type: ExamQuestionType;
  stem: string;
  options: string[];
  correctAnswers: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface ExamPaperQuestionEntity {
  id: string;
  paperId: string;
  questionBankId: string;
  questionType: ExamQuestionType;
  title: string;
  options: string[];
  correctAnswers: string[];
  score: number;
  orderNo: number;
}

export interface ExamPaperListFilters {
  keyword: string;
  subjectId: string;
  status: "" | ExamPaperStatus;
  page: number;
  pageSize: number;
}

export interface ExamPaperListItem extends ExamPaperEntity {
  questionCount: number;
  questionScoreSum: number;
}

export interface ExamPaperListResult {
  items: ExamPaperListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalPapers: number;
    publishedPapers: number;
    draftPapers: number;
    archivedPapers: number;
  };
}

export interface ExamPaperMutationInput {
  name: string;
  descr?: string;
  subjectId: string;
  totalScore: number;
  durationMinutes: number;
}

export interface ExamQuickGenerateInput {
  name: string;
  subjectId: string;
  questionCount: number;
  totalScore: number;
  durationMinutes: number;
  publishNow: boolean;
}

export interface ExamQuestionBankFilters {
  keyword: string;
  type: "" | ExamQuestionType;
  page: number;
  pageSize: number;
}

export interface ExamQuestionBankResult {
  items: ExamQuestionBankItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExamPaperDetail {
  paper: ExamPaperEntity;
  questions: ExamPaperQuestionEntity[];
  scoreSummary: {
    questionCount: number;
    questionScoreSum: number;
    matchesPaperTotal: boolean;
  };
}

export interface ExamTakeQuestion {
  id: string;
  paperQuestionId: string;
  type: ExamQuestionType;
  title: string;
  options: string[];
  score: number;
  orderNo: number;
}

export interface ExamTakeSnapshot {
  paperId: string;
  paperName: string;
  durationMinutes: number;
  totalScore: number;
  questions: ExamTakeQuestion[];
}

export type ExamAnswerValue = string[];

export interface ExamResultEntity {
  id: string;
  paperId: string;
  paperName: string;
  subjectName: string;
  score: number;
  totalScore: number;
  correctCount: number;
  questionCount: number;
  submitTime: string;
  durationSeconds: number;
  createUserId: string;
  createUserName: string;
}

export interface ExamResultAnswerEntity {
  id: string;
  resultId: string;
  orderNo: number;
  questionType: ExamQuestionType;
  questionTitle: string;
  questionScore: number;
  selectedAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  obtainedScore: number;
}

export interface ExamResultListFilters {
  keyword: string;
  page: number;
  pageSize: number;
}

export interface ExamResultListResult {
  items: ExamResultEntity[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalAttempts: number;
    avgScore: number;
    highestScore: number;
  };
}

export interface ExamResultDetail {
  result: ExamResultEntity;
  answers: ExamResultAnswerEntity[];
}
