import type {
  PriceAlertLogEntity,
  PriceAlertRuleEntity,
  PriceAlertRuleInput,
  PriceCollectInput,
  PriceCollectResult,
  PriceDirection,
  PriceMonitorItemEntity,
  PriceMonitorItemInput,
  PriceMonitorListFilters,
  PriceMonitorListItem,
  PriceMonitorListResult,
  PriceMonitorStoreSnapshot,
  PriceSnapshotEntity,
  PriceTrendResult,
} from "@/features/price-monitor/types";

const STORAGE_KEY = "nquiz.price-monitor.v1";
const LATENCY_MS = 120;

const seedSnapshot: PriceMonitorStoreSnapshot = {
  items: [
    {
      id: "price-item-001",
      platform: "京东",
      itemName: "Apple iPad Air 11 英寸 Wi‑Fi 256G",
      itemUrl: "https://item.jd.com/demo-ipad-air.html",
      externalItemId: "JD-IPAD-AIR-11-256",
      monitoringEnabled: true,
      currency: "CNY",
      lastCollectedAt: "2026-04-10T18:20:00+08:00",
      lastOriginalPrice: 4799,
      lastDiscountText: "满减 + 会员券",
      lastDiscountAmount: 420,
      lastFinalPrice: 4379,
      lastRemark: "晚间活动价",
      createDate: "2026-04-08T09:10:00+08:00",
      updateDate: "2026-04-10T18:20:00+08:00",
    },
    {
      id: "price-item-002",
      platform: "淘宝",
      itemName: "戴森 Supersonic 吹风机 HD15",
      itemUrl: "https://detail.tmall.com/demo-dyson.html",
      externalItemId: "TB-DYSON-HD15",
      monitoringEnabled: true,
      currency: "CNY",
      lastCollectedAt: "2026-04-10T12:00:00+08:00",
      lastOriginalPrice: 3299,
      lastDiscountText: "店铺券",
      lastDiscountAmount: 300,
      lastFinalPrice: 2999,
      lastRemark: "午间券后",
      createDate: "2026-04-07T11:30:00+08:00",
      updateDate: "2026-04-10T12:00:00+08:00",
    },
    {
      id: "price-item-003",
      platform: "拼多多",
      itemName: "任天堂 Switch OLED 白色",
      itemUrl: "https://mobile.yangkeduo.com/demo-switch.html",
      externalItemId: "PDD-SWITCH-OLED-W",
      monitoringEnabled: false,
      currency: "CNY",
      lastCollectedAt: "2026-04-09T21:15:00+08:00",
      lastOriginalPrice: 2399,
      lastDiscountText: "平台补贴",
      lastDiscountAmount: 180,
      lastFinalPrice: 2219,
      lastRemark: "停用前最后一次采集",
      createDate: "2026-04-05T20:40:00+08:00",
      updateDate: "2026-04-09T21:15:00+08:00",
    },
  ],
  snapshots: [
    {
      id: "snapshot-001",
      itemId: "price-item-001",
      collectedAt: "2026-04-08T10:00:00+08:00",
      originalPrice: 4999,
      discountText: "首发价",
      discountAmount: 0,
      finalPrice: 4999,
      remark: "首发观察",
      rawPayload: "首发无优惠",
    },
    {
      id: "snapshot-002",
      itemId: "price-item-001",
      collectedAt: "2026-04-09T20:00:00+08:00",
      originalPrice: 4799,
      discountText: "会员券",
      discountAmount: 200,
      finalPrice: 4599,
      remark: "会员专享",
      rawPayload: "叠加 200 元券",
    },
    {
      id: "snapshot-003",
      itemId: "price-item-001",
      collectedAt: "2026-04-10T18:20:00+08:00",
      originalPrice: 4799,
      discountText: "满减 + 会员券",
      discountAmount: 420,
      finalPrice: 4379,
      remark: "晚间活动价",
      rawPayload: "叠加大促满减",
    },
    {
      id: "snapshot-004",
      itemId: "price-item-002",
      collectedAt: "2026-04-08T19:40:00+08:00",
      originalPrice: 3399,
      discountText: "无",
      discountAmount: 0,
      finalPrice: 3399,
      remark: "初始监控",
      rawPayload: "原价陈列",
    },
    {
      id: "snapshot-005",
      itemId: "price-item-002",
      collectedAt: "2026-04-10T12:00:00+08:00",
      originalPrice: 3299,
      discountText: "店铺券",
      discountAmount: 300,
      finalPrice: 2999,
      remark: "午间券后",
      rawPayload: "店铺券叠加完成",
    },
    {
      id: "snapshot-006",
      itemId: "price-item-003",
      collectedAt: "2026-04-09T21:15:00+08:00",
      originalPrice: 2399,
      discountText: "平台补贴",
      discountAmount: 180,
      finalPrice: 2219,
      remark: "停用前最后一次采集",
      rawPayload: "百亿补贴价",
    },
  ],
  alertRules: [
    {
      id: "rule-001",
      itemId: "price-item-001",
      enabled: true,
      alertOnIncrease: false,
      alertOnDecrease: true,
      absoluteThreshold: 200,
      percentageThreshold: 0.05,
      channel: "EMAIL",
      createDate: "2026-04-08T10:10:00+08:00",
      updateDate: "2026-04-10T18:30:00+08:00",
    },
    {
      id: "rule-002",
      itemId: "price-item-002",
      enabled: true,
      alertOnIncrease: true,
      alertOnDecrease: true,
      absoluteThreshold: 150,
      percentageThreshold: undefined,
      channel: "EMAIL",
      createDate: "2026-04-08T19:50:00+08:00",
      updateDate: "2026-04-08T19:50:00+08:00",
    },
  ],
  alertLogs: [
    {
      id: "alert-log-001",
      itemId: "price-item-001",
      snapshotId: "snapshot-003",
      ruleId: "rule-001",
      triggeredAt: "2026-04-10T18:20:10+08:00",
      previousFinalPrice: 4599,
      currentFinalPrice: 4379,
      deltaAmount: -220,
      deltaRatio: -0.0478,
      direction: "DECREASE",
      messageContent: "商品价格预警：Apple iPad Air 11 英寸 Wi‑Fi 256G 晚间活动价已下降。",
      notifyResult: "已生成邮件通知任务",
    },
  ],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function wait<T>(value: T, latencyMs = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), latencyMs);
  });
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readSnapshot(): PriceMonitorStoreSnapshot {
  if (!isBrowser()) {
    return clone(seedSnapshot);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PriceMonitorStoreSnapshot>;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.snapshots) || !Array.isArray(parsed.alertRules) || !Array.isArray(parsed.alertLogs)) {
      throw new Error("invalid snapshot shape");
    }
    return {
      items: parsed.items as PriceMonitorItemEntity[],
      snapshots: parsed.snapshots as PriceSnapshotEntity[],
      alertRules: parsed.alertRules as PriceAlertRuleEntity[],
      alertLogs: parsed.alertLogs as PriceAlertLogEntity[],
    };
  } catch {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }
}

function writeSnapshot(snapshot: PriceMonitorStoreSnapshot) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function nowIso() {
  return new Date().toISOString();
}

function formatDirection(direction: PriceDirection) {
  return direction === "INCREASE" ? "上涨" : "下降";
}

function roundNumber(value?: number, digits = 4) {
  if (value === undefined) return undefined;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getRule(snapshot: PriceMonitorStoreSnapshot, itemId: string) {
  return snapshot.alertRules.find((rule) => rule.itemId === itemId);
}

function getLastAlert(snapshot: PriceMonitorStoreSnapshot, itemId: string) {
  return snapshot.alertLogs
    .filter((log) => log.itemId === itemId)
    .sort((left, right) => right.triggeredAt.localeCompare(left.triggeredAt))[0];
}

function toListItem(snapshot: PriceMonitorStoreSnapshot, item: PriceMonitorItemEntity): PriceMonitorListItem {
  const rule = getRule(snapshot, item.id);
  const lastAlert = getLastAlert(snapshot, item.id);
  return {
    ...item,
    snapshotCount: snapshot.snapshots.filter((entry) => entry.itemId === item.id).length,
    alertRuleEnabled: Boolean(rule?.enabled),
    lastAlertAt: lastAlert?.triggeredAt,
  };
}

function buildSummary(snapshot: PriceMonitorStoreSnapshot) {
  return {
    totalItems: snapshot.items.length,
    enabledItems: snapshot.items.filter((item) => item.monitoringEnabled).length,
    snapshotCount: snapshot.snapshots.length,
    enabledRuleCount: snapshot.alertRules.filter((rule) => rule.enabled).length,
  };
}

function ensureItem(snapshot: PriceMonitorStoreSnapshot, itemId: string) {
  const item = snapshot.items.find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error("目标监控商品不存在，可能已被删除");
  }
  return item;
}

function normalizeMoney(value?: number) {
  if (value === undefined) return undefined;
  return roundNumber(value, 2);
}

export async function listPriceMonitorItems(filters: PriceMonitorListFilters): Promise<PriceMonitorListResult> {
  const snapshot = readSnapshot();
  const platformKeyword = filters.platform.trim().toLowerCase();
  const itemKeyword = filters.itemName.trim().toLowerCase();

  const filtered = snapshot.items
    .filter((item) => {
      const matchPlatform = !platformKeyword || item.platform.toLowerCase().includes(platformKeyword);
      const matchName = !itemKeyword || item.itemName.toLowerCase().includes(itemKeyword);
      const matchEnabled =
        filters.monitoringEnabled === "ALL" ||
        (filters.monitoringEnabled === "ENABLED" ? item.monitoringEnabled : !item.monitoringEnabled);
      return matchPlatform && matchName && matchEnabled;
    })
    .sort((left, right) => right.updateDate.localeCompare(left.updateDate));

  const enriched = filtered.map((item) => toListItem(snapshot, item));
  const start = (filters.page - 1) * filters.pageSize;
  const end = start + filters.pageSize;

  return wait({
    items: enriched.slice(start, end),
    total: enriched.length,
    summary: buildSummary(snapshot),
  });
}

export async function getPriceMonitorItem(itemId: string): Promise<PriceMonitorListItem> {
  const snapshot = readSnapshot();
  const item = ensureItem(snapshot, itemId);
  return wait(toListItem(snapshot, item));
}

export async function getPriceSnapshots(itemId: string): Promise<PriceSnapshotEntity[]> {
  const snapshot = readSnapshot();
  ensureItem(snapshot, itemId);
  return wait(
    snapshot.snapshots
      .filter((entry) => entry.itemId === itemId)
      .sort((left, right) => right.collectedAt.localeCompare(left.collectedAt)),
  );
}

export async function getPriceTrend(itemId: string): Promise<PriceTrendResult> {
  const snapshot = readSnapshot();
  const item = ensureItem(snapshot, itemId);
  const points = snapshot.snapshots
    .filter((entry) => entry.itemId === itemId)
    .sort((left, right) => left.collectedAt.localeCompare(right.collectedAt))
    .map((entry) => ({
      collectedAt: entry.collectedAt,
      originalPrice: entry.originalPrice,
      finalPrice: entry.finalPrice,
      discountAmount: entry.discountAmount,
    }));

  return wait({
    itemId: item.id,
    itemName: item.itemName,
    platform: item.platform,
    currency: item.currency,
    points,
  });
}

export async function getPriceAlertRule(itemId: string): Promise<PriceAlertRuleEntity | null> {
  const snapshot = readSnapshot();
  ensureItem(snapshot, itemId);
  return wait(snapshot.alertRules.find((entry) => entry.itemId === itemId) ?? null);
}

export async function createPriceMonitorItem(input: PriceMonitorItemInput): Promise<PriceMonitorItemEntity> {
  const snapshot = readSnapshot();
  const timestamp = nowIso();
  const item: PriceMonitorItemEntity = {
    id: crypto.randomUUID(),
    platform: input.platform.trim(),
    itemName: input.itemName.trim(),
    itemUrl: input.itemUrl?.trim() ?? "",
    externalItemId: input.externalItemId?.trim() ?? "",
    monitoringEnabled: input.monitoringEnabled,
    currency: input.currency.trim().toUpperCase() || "CNY",
    createDate: timestamp,
    updateDate: timestamp,
  };

  snapshot.items.unshift(item);
  writeSnapshot(snapshot);
  return wait(item);
}

export async function updatePriceMonitorItem(itemId: string, input: PriceMonitorItemInput): Promise<PriceMonitorItemEntity> {
  const snapshot = readSnapshot();
  const item = ensureItem(snapshot, itemId);

  item.platform = input.platform.trim();
  item.itemName = input.itemName.trim();
  item.itemUrl = input.itemUrl?.trim() ?? "";
  item.externalItemId = input.externalItemId?.trim() ?? "";
  item.monitoringEnabled = input.monitoringEnabled;
  item.currency = input.currency.trim().toUpperCase() || "CNY";
  item.updateDate = nowIso();

  writeSnapshot(snapshot);
  return wait(clone(item));
}

export async function deletePriceMonitorItem(itemId: string): Promise<void> {
  const snapshot = readSnapshot();
  ensureItem(snapshot, itemId);

  snapshot.items = snapshot.items.filter((entry) => entry.id !== itemId);
  snapshot.snapshots = snapshot.snapshots.filter((entry) => entry.itemId !== itemId);
  const ruleIds = snapshot.alertRules.filter((entry) => entry.itemId === itemId).map((entry) => entry.id);
  snapshot.alertRules = snapshot.alertRules.filter((entry) => entry.itemId !== itemId);
  snapshot.alertLogs = snapshot.alertLogs.filter((entry) => entry.itemId !== itemId && !ruleIds.includes(entry.ruleId));

  writeSnapshot(snapshot);
  return wait(undefined);
}

export async function collectPrice(itemId: string, input: PriceCollectInput): Promise<PriceCollectResult> {
  const snapshot = readSnapshot();
  const item = ensureItem(snapshot, itemId);

  const previousSnapshot = snapshot.snapshots
    .filter((entry) => entry.itemId === itemId)
    .sort((left, right) => right.collectedAt.localeCompare(left.collectedAt))[0];

  const savedSnapshot: PriceSnapshotEntity = {
    id: crypto.randomUUID(),
    itemId,
    collectedAt: input.collectedAt?.trim() || nowIso(),
    originalPrice: normalizeMoney(input.originalPrice),
    discountText: input.discountText?.trim() || undefined,
    discountAmount: normalizeMoney(input.discountAmount),
    finalPrice: normalizeMoney(input.finalPrice) ?? 0,
    remark: input.remark?.trim() || undefined,
    rawPayload: input.rawPayload?.trim() || undefined,
  };

  snapshot.snapshots.push(savedSnapshot);
  item.lastCollectedAt = savedSnapshot.collectedAt;
  item.lastOriginalPrice = savedSnapshot.originalPrice;
  item.lastDiscountText = savedSnapshot.discountText;
  item.lastDiscountAmount = savedSnapshot.discountAmount;
  item.lastFinalPrice = savedSnapshot.finalPrice;
  item.lastRemark = savedSnapshot.remark;
  item.updateDate = nowIso();

  const previousFinalPrice = previousSnapshot?.finalPrice;
  const currentFinalPrice = savedSnapshot.finalPrice;
  const deltaAmount = previousFinalPrice === undefined ? undefined : roundNumber(currentFinalPrice - previousFinalPrice, 2);
  const deltaRatio =
    previousFinalPrice === undefined || previousFinalPrice === 0
      ? undefined
      : roundNumber((currentFinalPrice - previousFinalPrice) / previousFinalPrice, 4);

  const rule = getRule(snapshot, itemId);
  const triggeredRules: string[] = [];
  let notifyResult = "未触发通知";

  if (rule?.enabled && previousFinalPrice !== undefined && deltaAmount !== undefined) {
    const direction: PriceDirection = deltaAmount >= 0 ? "INCREASE" : "DECREASE";
    const directionMatched =
      (direction === "INCREASE" && rule.alertOnIncrease) ||
      (direction === "DECREASE" && rule.alertOnDecrease);
    const absoluteMatched =
      rule.absoluteThreshold !== undefined && Math.abs(deltaAmount) >= rule.absoluteThreshold;
    const ratioMatched =
      rule.percentageThreshold !== undefined && deltaRatio !== undefined && Math.abs(deltaRatio) >= rule.percentageThreshold;

    if (directionMatched && (absoluteMatched || ratioMatched)) {
      const label = `${formatDirection(direction)}预警`;
      triggeredRules.push(label);
      notifyResult = "已生成邮件通知任务";

      const alertLog: PriceAlertLogEntity = {
        id: crypto.randomUUID(),
        itemId,
        snapshotId: savedSnapshot.id,
        ruleId: rule.id,
        triggeredAt: nowIso(),
        previousFinalPrice,
        currentFinalPrice,
        deltaAmount,
        deltaRatio,
        direction,
        messageContent: `${item.itemName} ${formatDirection(direction)}，当前价格 ${item.currency} ${currentFinalPrice.toFixed(2)}。`,
        notifyResult,
      };
      snapshot.alertLogs.push(alertLog);
    }
  }

  writeSnapshot(snapshot);
  return wait({
    itemId,
    itemName: item.itemName,
    snapshot: savedSnapshot,
    previousFinalPrice,
    currentFinalPrice,
    deltaAmount,
    deltaRatio,
    triggeredRules,
    notifyResult,
  });
}

export async function savePriceAlertRule(itemId: string, input: PriceAlertRuleInput): Promise<PriceAlertRuleEntity> {
  const snapshot = readSnapshot();
  ensureItem(snapshot, itemId);
  const timestamp = nowIso();
  const existing = snapshot.alertRules.find((entry) => entry.itemId === itemId);

  if (existing) {
    existing.enabled = input.enabled;
    existing.alertOnIncrease = input.alertOnIncrease;
    existing.alertOnDecrease = input.alertOnDecrease;
    existing.absoluteThreshold = normalizeMoney(input.absoluteThreshold);
    existing.percentageThreshold = roundNumber(input.percentageThreshold, 4);
    existing.channel = input.channel;
    existing.updateDate = timestamp;
    writeSnapshot(snapshot);
    return wait(clone(existing));
  }

  const created: PriceAlertRuleEntity = {
    id: crypto.randomUUID(),
    itemId,
    enabled: input.enabled,
    alertOnIncrease: input.alertOnIncrease,
    alertOnDecrease: input.alertOnDecrease,
    absoluteThreshold: normalizeMoney(input.absoluteThreshold),
    percentageThreshold: roundNumber(input.percentageThreshold, 4),
    channel: input.channel,
    createDate: timestamp,
    updateDate: timestamp,
  };
  snapshot.alertRules.push(created);
  writeSnapshot(snapshot);
  return wait(created);
}

export async function listPriceAlertLogs(itemId: string): Promise<PriceAlertLogEntity[]> {
  const snapshot = readSnapshot();
  ensureItem(snapshot, itemId);
  return wait(
    snapshot.alertLogs
      .filter((entry) => entry.itemId === itemId)
      .sort((left, right) => right.triggeredAt.localeCompare(left.triggeredAt)),
  );
}
