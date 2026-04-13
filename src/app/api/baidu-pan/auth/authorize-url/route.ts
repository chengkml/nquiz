import { NextResponse } from "next/server";
import { getBaiduPanAuthStatus } from "@/lib/baidu-pan/config";
import type { BaiduPanAuthorizeUrlResult } from "@/lib/baidu-pan/types";

export async function POST() {
  const status = getBaiduPanAuthStatus();

  if (!status.configured) {
    return NextResponse.json(
      {
        authorizeUrl: null,
        state: "missing-config",
        message: `未配置百度网盘开放平台参数：${status.missingConfigKeys?.join(" / ")}。请先补齐配置。`,
      } satisfies BaiduPanAuthorizeUrlResult,
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      authorizeUrl: null,
      state: "oauth-not-connected",
      message: "百度网盘开放平台参数已配置，但真实 OAuth 授权 URL 生成逻辑尚未接入，当前不能发起授权。",
    } satisfies BaiduPanAuthorizeUrlResult,
    { status: 503 },
  );
}
