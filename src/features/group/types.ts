export interface GroupEntity {
  id: string;
  name: string;
  label: string;
  type: string;
  descr: string;
  createDate: string;
  updateDate: string;
  createUserId: string;
  createUserName: string;
}

export interface GroupObjectRelationEntity {
  id: string;
  groupId: string;
  objectId: string;
  objectType: string;
  createDate: string;
  createUserId: string;
}

export interface GroupListFilters {
  keyword: string;
  type: string;
  page: number;
  pageSize: number;
}

export interface GroupListItem extends GroupEntity {
  relationCount: number;
}

export interface GroupSummary {
  totalGroups: number;
  totalTypes: number;
  totalRelations: number;
}

export interface GroupListResult {
  items: GroupListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: GroupSummary;
}

export interface GroupMutationInput {
  name: string;
  label: string;
  type?: string;
  descr?: string;
}

export interface GroupOption {
  id: string;
  name: string;
  label: string;
  type: string;
}

export interface GroupRelationMutationInput {
  groupId: string;
  objectId: string;
  objectType?: string;
}
