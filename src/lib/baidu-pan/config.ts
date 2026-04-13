import type { BaiduPanAuthStatus } from "@/lib/baidu-pan/types";

export const BAIDU_PAN_PROVIDER_NAME = "百度网盘";
export const BAIDU_PAN_CONFIG_CATEGORY = "百度网盘配置";
export const BAIDU_PAN_CALLBACK_PATH = "/open/baidu-pan/auth/callback";
export const BAIDU_PAN_CONFIG_ROUTE = "/admin/integrations/baidu-pan#config-check";

const CONFIG_MAPPINGS = [
  {
    paramKey: "quiz.baidu-pan.client_id",
    envKeys: ["QUIZ_BAIDU_PAN_CLIENT_ID", "BAIDU_PAN_CLIENT_ID"],
  },
  {
    paramKey: "quiz.baidu-pan.client_secret",
    envKeys: ["QUIZ_BAIDU_PAN_CLIENT_SECRET", "BAIDU_PAN_CLIENT_SECRET"],
  },
  {
    paramKey: "quiz.baidu-pan.redirect_uri",
    envKeys: ["QUIZ_BAIDU_PAN_REDIRECT_URI", "BAIDU_PAN_REDIRECT_URI"],
  },
] as const;

function resolveConfiguredValue(envKeys: readonly string[]) {
  for (const key of envKeys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function getBaiduPanRequiredConfigKeys() {
  return CONFIG_MAPPINGS.map((item) => item.paramKey);
}

export function getBaiduPanMissingConfigKeys() {
  return CONFIG_MAPPINGS.filter((item) => !resolveConfiguredValue(item.envKeys)).map((item) => item.paramKey);
}

export function getBaiduPanAuthStatus(): BaiduPanAuthStatus {
  const requiredConfigKeys = getBaiduPanRequiredConfigKeys();
  const missingConfigKeys = getBaiduPanMissingConfigKeys();
  const configured = missingConfigKeys.length === 0;

  return {
    configured,
    bound: false,
    mockMode: false,
    providerName: BAIDU_PAN_PROVIDER_NAME,
    accountName: null,
    message: configured
      ? "已配置百度网盘基础参数，但真实 OAuth、账号绑定与文件接口尚未接通。"
      : `缺少百度网盘配置：${missingConfigKeys.join(" / ")}`,
    authTip: configured
      ? "当前只完成接入状态页、配置检查与 OAuth 回调预留位；真实授权和文件工作区将在后续接入完成后开放。"
      : "请先补齐百度网盘开放平台配置，再进入真实 OAuth 接入阶段。",
    callbackPath: BAIDU_PAN_CALLBACK_PATH,
    authorizeUrl: null,
    configRoute: BAIDU_PAN_CONFIG_ROUTE,
    configCategory: BAIDU_PAN_CONFIG_CATEGORY,
    boundAt: null,
    requiredConfigKeys,
    missingConfigKeys,
  };
}
