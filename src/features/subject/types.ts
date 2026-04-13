export interface SubjectEntity {
  id: string;
  name: string;
  label: string;
  descr: string;
  knowledgeNum: number;
  questionNum: number;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface SubjectListFilters {
  keyword: string;
  page: number;
  pageSize: number;
}

export interface SubjectListItem extends SubjectEntity {
  totalAssets: number;
}

export interface SubjectSummary {
  totalSubjects: number;
  totalKnowledge: number;
  totalQuestions: number;
}

export interface SubjectListResult {
  items: SubjectListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: SubjectSummary;
}

export interface SubjectMutationInput {
  name: string;
  label: string;
  descr?: string;
}

export interface SubjectOption {
  id: string;
  name: string;
  label: string;
}
