import type { BaiduPanAuthStatus, BaiduPanAuthorizeUrlResult } from "@/lib/baidu-pan/types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data?.message || "百度网盘接口请求失败");
  }
  return data;
}

export async function fetchBaiduPanAuthStatus() {
  const response = await fetch("/api/baidu-pan/auth/status", {
    method: "GET",
  });

  return parseJson<BaiduPanAuthStatus>(response);
}

export async function createBaiduPanAuthorizeUrl() {
  const response = await fetch("/api/baidu-pan/auth/authorize-url", {
    method: "POST",
  });

  return parseJson<BaiduPanAuthorizeUrlResult>(response);
}

export async function unbindBaiduPan() {
  const response = await fetch("/api/baidu-pan/auth/unbind", {
    method: "POST",
  });

  return parseJson<BaiduPanAuthStatus>(response);
}
