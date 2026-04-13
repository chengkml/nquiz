import { z } from "zod";

export const wxAppStatusOptions = ["ENABLED", "DISABLED"] as const;

export const wxAppFilterSchema = z.object({
  keyword: z.string().default(""),
  appId: z.string().default(""),
  status: z.enum(["ALL", ...wxAppStatusOptions]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(5),
});

export const createWxAppSchema = z.object({
  appId: z.string().trim().min(1, "请输入 AppID").max(64, "AppID 不能超过 64 个字符"),
  appName: z.string().trim().min(1, "请输入小程序名称").max(128, "名称不能超过 128 个字符"),
  appSecret: z.string().trim().min(1, "新增时必须填写 AppSecret").max(128, "AppSecret 不能超过 128 个字符"),
  appDescr: z.string().trim().max(500, "描述不能超过 500 个字符").default(""),
  status: z.enum(wxAppStatusOptions, { message: "请选择状态" }),
});

export const updateWxAppSchema = z.object({
  appId: z.string().trim().min(1, "请输入 AppID").max(64, "AppID 不能超过 64 个字符"),
  appName: z.string().trim().min(1, "请输入小程序名称").max(128, "名称不能超过 128 个字符"),
  appSecret: z.string().trim().max(128, "AppSecret 不能超过 128 个字符").optional().or(z.literal("")),
  appDescr: z.string().trim().max(500, "描述不能超过 500 个字符").default(""),
  status: z.enum(wxAppStatusOptions, { message: "请选择状态" }),
});

export type WxAppFilterInput = z.input<typeof wxAppFilterSchema>;
export type WxAppFilterValues = z.output<typeof wxAppFilterSchema>;
export type CreateWxAppInput = z.input<typeof createWxAppSchema>;
export type CreateWxAppValues = z.output<typeof createWxAppSchema>;
export type UpdateWxAppInput = z.input<typeof updateWxAppSchema>;
export type UpdateWxAppValues = z.output<typeof updateWxAppSchema>;
