export type WxAppStatus = "ENABLED" | "DISABLED";

export interface WxAppEntity {
  id: string;
  appId: string;
  appName: string;
  appSecret: string;
  appDescr: string;
  status: WxAppStatus;
  createDate: string;
  updateDate: string;
}

export interface WxAppListItem extends Omit<WxAppEntity, "appSecret"> {
  boundUserCount: number;
}

export interface WxAppUser {
  userId: string;
  userName: string;
  appId: string;
  appName: string;
  openId: string;
  createTime: string;
}

export interface WxAppSummary {
  totalApps: number;
  enabledApps: number;
  totalBindings: number;
}

export interface WxAppStoreSnapshot {
  apps: WxAppEntity[];
  users: WxAppUser[];
}

export interface WxAppListFilters {
  keyword: string;
  appId: string;
  status: "ALL" | WxAppStatus;
  page: number;
  pageSize: number;
}

export interface WxAppListResult {
  items: WxAppListItem[];
  total: number;
  summary: WxAppSummary;
}

export interface WxAppMutationInput {
  appId: string;
  appName: string;
  appSecret?: string;
  appDescr: string;
  status: WxAppStatus;
}
