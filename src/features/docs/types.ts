export type DocType = "DOC" | "IMAGE" | "PDF" | "OTHER";

export type DocStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface DocListFilters {
  keyword: string;
  type: "ALL" | DocType;
  status: "ALL" | DocStatus;
  page: number;
  pageSize: number;
}

export interface DocListItem {
  id: string;
  title: string;
  type: DocType;
  status: DocStatus;
  description: string;
  content: string;
  contentPreview: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
}

export interface DocListSummary {
  total: number;
  draft: number;
  published: number;
  archived: number;
}

export interface DocListResult {
  items: DocListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: DocListSummary;
}

export interface DocMutationInput {
  title: string;
  type: DocType;
  status: DocStatus;
  description: string;
  content: string;
}

