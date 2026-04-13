export interface BaiduPanAuthStatus {
  configured?: boolean;
  bound: boolean;
  mockMode: boolean;
  providerName?: string;
  accountName?: string | null;
  message?: string;
  authTip?: string;
  callbackPath?: string;
  authorizeUrl?: string | null;
  configRoute?: string;
  configCategory?: string;
  boundAt?: string | null;
  requiredConfigKeys?: string[];
  missingConfigKeys?: string[];
}

export interface BaiduPanAuthorizeUrlResult {
  authorizeUrl: string | null;
  state: string;
  expiresInSeconds?: number;
  message?: string;
}
