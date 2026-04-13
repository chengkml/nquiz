import { z } from "zod";

const priceNumber = z
  .union([z.coerce.number(), z.literal("")])
  .transform((value) => (value === "" ? undefined : value))
  .refine((value) => value === undefined || value >= 0, "金额必须大于等于 0");

export const priceMonitorFilterSchema = z.object({
  platform: z.string().default(""),
  itemName: z.string().default(""),
  monitoringEnabled: z.enum(["ALL", "ENABLED", "DISABLED"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
  itemId: z.string().default(""),
});

export const priceMonitorItemSchema = z.object({
  platform: z.string().trim().min(1, "请输入平台").max(64, "平台不能超过 64 个字符"),
  itemName: z.string().trim().min(1, "请输入商品名称").max(128, "商品名称不能超过 128 个字符"),
  itemUrl: z.string().trim().max(500, "商品链接不能超过 500 个字符").optional().default(""),
  externalItemId: z.string().trim().max(128, "商品标识不能超过 128 个字符").optional().default(""),
  monitoringEnabled: z.boolean().default(true),
  currency: z.string().trim().min(1, "请输入币种").max(16, "币种不能超过 16 个字符").default("CNY"),
});

export const priceCollectSchema = z.object({
  collectedAt: z.string().default(""),
  originalPrice: priceNumber,
  discountText: z.string().trim().max(120, "优惠描述不能超过 120 个字符").optional().default(""),
  discountAmount: priceNumber,
  finalPrice: z.coerce.number().min(0, "请输入最终到手价"),
  remark: z.string().trim().max(500, "备注不能超过 500 个字符").optional().default(""),
  rawPayload: z.string().trim().max(2000, "原始响应摘要不能超过 2000 个字符").optional().default(""),
});

export const priceAlertRuleSchema = z
  .object({
    enabled: z.boolean().default(true),
    alertOnIncrease: z.boolean().default(false),
    alertOnDecrease: z.boolean().default(true),
    absoluteThreshold: priceNumber,
    percentageThreshold: priceNumber,
    channel: z.enum(["EMAIL"]).default("EMAIL"),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) {
      return;
    }

    if (!value.alertOnIncrease && !value.alertOnDecrease) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alertOnIncrease"],
        message: "至少选择一个预警方向",
      });
    }

    if (value.absoluteThreshold === undefined && value.percentageThreshold === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["absoluteThreshold"],
        message: "绝对值阈值和比例阈值至少填写一个",
      });
    }
  });

export type PriceMonitorFilterInput = z.input<typeof priceMonitorFilterSchema>;
export type PriceMonitorFilterValues = z.output<typeof priceMonitorFilterSchema>;
export type PriceMonitorItemInput = z.input<typeof priceMonitorItemSchema>;
export type PriceMonitorItemValues = z.output<typeof priceMonitorItemSchema>;
export type PriceCollectInput = z.input<typeof priceCollectSchema>;
export type PriceCollectValues = z.output<typeof priceCollectSchema>;
export type PriceAlertRuleInput = z.input<typeof priceAlertRuleSchema>;
export type PriceAlertRuleValues = z.output<typeof priceAlertRuleSchema>;
