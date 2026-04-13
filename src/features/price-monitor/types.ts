export type PriceMonitorChannel = "EMAIL";
export type PriceDirection = "INCREASE" | "DECREASE";
export type PriceMonitorEnabledFilter = "ALL" | "ENABLED" | "DISABLED";

export interface PriceMonitorItemEntity {
  id: string;
  platform: string;
  itemName: string;
  itemUrl: string;
  externalItemId: string;
  monitoringEnabled: boolean;
  currency: string;
  lastCollectedAt?: string;
  lastOriginalPrice?: number;
  lastDiscountText?: string;
  lastDiscountAmount?: number;
  lastFinalPrice?: number;
  lastRemark?: string;
  createDate: string;
  updateDate: string;
}

export interface PriceSnapshotEntity {
  id: string;
  itemId: string;
  collectedAt: string;
  originalPrice?: number;
  discountText?: string;
  discountAmount?: number;
  finalPrice: number;
  remark?: string;
  rawPayload?: string;
}

export interface PriceAlertRuleEntity {
  id: string;
  itemId: string;
  enabled: boolean;
  alertOnIncrease: boolean;
  alertOnDecrease: boolean;
  absoluteThreshold?: number;
  percentageThreshold?: number;
  channel: PriceMonitorChannel;
  createDate: string;
  updateDate: string;
}

export interface PriceAlertLogEntity {
  id: string;
  itemId: string;
  snapshotId: string;
  ruleId: string;
  triggeredAt: string;
  previousFinalPrice?: number;
  currentFinalPrice: number;
  deltaAmount?: number;
  deltaRatio?: number;
  direction: PriceDirection;
  messageContent: string;
  notifyResult: string;
}

export interface PriceMonitorStoreSnapshot {
  items: PriceMonitorItemEntity[];
  snapshots: PriceSnapshotEntity[];
  alertRules: PriceAlertRuleEntity[];
  alertLogs: PriceAlertLogEntity[];
}

export interface PriceMonitorListFilters {
  platform: string;
  itemName: string;
  monitoringEnabled: PriceMonitorEnabledFilter;
  page: number;
  pageSize: number;
  itemId: string;
}

export interface PriceMonitorListItem extends PriceMonitorItemEntity {
  snapshotCount: number;
  alertRuleEnabled: boolean;
  lastAlertAt?: string;
}

export interface PriceMonitorSummary {
  totalItems: number;
  enabledItems: number;
  snapshotCount: number;
  enabledRuleCount: number;
}

export interface PriceMonitorListResult {
  items: PriceMonitorListItem[];
  total: number;
  summary: PriceMonitorSummary;
}

export interface PricePoint {
  collectedAt: string;
  originalPrice?: number;
  finalPrice: number;
  discountAmount?: number;
}

export interface PriceTrendResult {
  itemId: string;
  itemName: string;
  platform: string;
  currency: string;
  points: PricePoint[];
}

export interface PriceCollectInput {
  collectedAt?: string;
  originalPrice?: number;
  discountText?: string;
  discountAmount?: number;
  finalPrice: number;
  remark?: string;
  rawPayload?: string;
}

export interface PriceCollectResult {
  itemId: string;
  itemName: string;
  snapshot: PriceSnapshotEntity;
  previousFinalPrice?: number;
  currentFinalPrice: number;
  deltaAmount?: number;
  deltaRatio?: number;
  triggeredRules: string[];
  notifyResult: string;
}

export interface PriceMonitorItemInput {
  platform: string;
  itemName: string;
  itemUrl?: string;
  externalItemId?: string;
  monitoringEnabled: boolean;
  currency: string;
}

export interface PriceAlertRuleInput {
  enabled: boolean;
  alertOnIncrease: boolean;
  alertOnDecrease: boolean;
  absoluteThreshold?: number;
  percentageThreshold?: number;
  channel: PriceMonitorChannel;
}
