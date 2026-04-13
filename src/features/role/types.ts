export type RoleState = "ENABLED" | "DISABLED";
export type RoleMenuNodeType = "DIRECTORY" | "MENU" | "BUTTON";

export interface RoleRecord {
  id: string;
  roleCode: string;
  roleName: string;
  roleDescr?: string;
  state: RoleState;
  createDate: string;
  updateDate: string;
  boundUserCount: number;
  assignedMenuIds: string[];
}

export interface RoleFilters {
  keyword: string;
  state: "ALL" | RoleState;
  page: number;
  pageSize: number;
}

export interface RoleListResult {
  items: RoleRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    totalBindings: number;
    configuredPermissions: number;
  };
}

export interface RoleMutationInput {
  roleCode: string;
  roleName: string;
  roleDescr?: string;
  state: RoleState;
}

export interface RoleMenuNode {
  id: string;
  label: string;
  type: RoleMenuNodeType;
  path?: string;
  permissionKey?: string;
  children: RoleMenuNode[];
}

export interface RolePermissionSnapshot {
  roleId: string;
  assignedMenuIds: string[];
  assignedMenuCount: number;
  assignedMenuLabels: string[];
}

export interface ReplaceRoleMenusResult {
  roleId: string;
  assignedMenuIds: string[];
  addedIds: string[];
  removedIds: string[];
}
