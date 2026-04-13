export type MenuType = "DIRECTORY" | "MENU" | "BUTTON";
export type MenuState = "ENABLED" | "DISABLED";

export interface MenuItem {
  menuId: string;
  menuName: string;
  menuLabel: string;
  menuType: MenuType;
  parentId: string | null;
  url: string;
  permissionKey: string;
  menuIcon: MenuIconKey;
  seq: number;
  state: MenuState;
  menuDescr: string;
  createDate: string;
  updateDate: string;
  createUser: string;
  updateUser: string;
}

export interface MenuTreeNode extends MenuItem {
  children: MenuTreeNode[];
  depth: number;
}

export interface MenuFilters {
  keyword: string;
  state: "ALL" | MenuState;
  menuType: "ALL" | MenuType;
  parentId: string | null;
  page: number;
  pageSize: number;
}

export interface MenuListItem extends MenuItem {
  parentLabel: string | null;
  childCount: number;
}

export interface MenuListResult {
  items: MenuListItem[];
  total: number;
  summary: {
    total: number;
    enabled: number;
    directories: number;
    buttons: number;
  };
}

export interface MenuMutationInput {
  menuName: string;
  menuLabel: string;
  menuType: MenuType;
  parentId: string | null;
  url: string;
  permissionKey: string;
  menuIcon: MenuIconKey;
  seq: number;
  state: MenuState;
  menuDescr: string;
}

export type MenuIconKey =
  | "layout-dashboard"
  | "panel-left"
  | "settings"
  | "database"
  | "users"
  | "shield"
  | "folder"
  | "book-open"
  | "file-text"
  | "workflow"
  | "network"
  | "mouse-pointer";
