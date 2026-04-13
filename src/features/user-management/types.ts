export type UserStatus = "ENABLED" | "DISABLED";
export type RoleState = "ENABLED" | "DISABLED";

export type UserRoleOption = {
  id: string;
  name: string;
  descr: string;
  state: RoleState;
};

export type UserListItem = {
  id: string;
  userId: string;
  userName: string;
  email?: string;
  phone?: string;
  logo?: string;
  state: UserStatus;
  createDate: string;
  updateDate: string;
  passwordUpdatedAt?: string;
  roles: UserRoleOption[];
};

export type UserManagementFilters = {
  keyword: string;
  status: "ALL" | UserStatus;
  roleId: string;
  page: number;
  pageSize: number;
};

export type UserManagementSummary = {
  totalUsers: number;
  enabledUsers: number;
  disabledUsers: number;
  assignedUsers: number;
};

export type UserManagementListResult = {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: UserManagementSummary;
};

export type CreateUserInput = {
  userId: string;
  userName: string;
  password: string;
  email?: string;
  phone?: string;
  logo?: string;
};

export type UpdateUserInput = {
  userName: string;
  email?: string;
  phone?: string;
  logo?: string;
};

export type UserMutationInput = CreateUserInput | UpdateUserInput;
