import type {
  CountdownSnapshot,
  LifeCountdownGenerateInput,
  LifeCountdownProfile,
  LifeCountdownWarningResult,
} from "@/features/life-countdown/types";

const TIME_ZONE = "Asia/Shanghai";
const DEFAULT_MODEL_NAME = "nquiz-mock-calm";

let currentProfile: LifeCountdownProfile = {};
let warningCursor = 0;

const warningTemplates = [
  "剩余 {remainingDays} 天，不要把今天再让给犹豫。",
  "目标日还剩 {remainingDays} 天，真正该推进的事现在就开工。",
  "你不是在等待未来，你是在消耗剩余的 {remainingDays} 天。",
  "离 {deathDate} 还有 {remainingDays} 天，别把行动继续外包给明天。",
  "今天结束后，剩余寿命又少了一格，先完成最重要的那件事。",
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  } as const;
}

function getTodayDateString() {
  const { year, month, day } = getDateParts();
  return `${year}-${month}-${day}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("请选择合法的死亡日期");
  }
  return trimmed;
}

function assertFutureOrToday(date: string) {
  const today = getTodayDateString();
  if (date < today) {
    throw new Error("死亡日期不能早于今天");
  }
}

function dateDiffInDays(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00+08:00`);
  const to = new Date(`${toDate}T00:00:00+08:00`);
  const diff = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function normalizeWarningText(content: string) {
  const normalized = content.replace(/\s+/g, " ").replace(/^[\"“”'`]+/, "").replace(/[\"“”'`]+$/, "").trim();
  if (!normalized) {
    return "今天别再拿未来下注，你剩下的时间正在按秒结算。";
  }
  return normalized.slice(0, 80).trim();
}

function buildWarningText(deathDate: string) {
  const remainingDays = dateDiffInDays(getTodayDateString(), deathDate);
  const template = warningTemplates[warningCursor % warningTemplates.length];
  warningCursor += 1;
  return normalizeWarningText(
    template
      .replaceAll("{remainingDays}", String(remainingDays))
      .replaceAll("{deathDate}", deathDate),
  );
}

export function getLifeCountdownProfile() {
  return clone(currentProfile);
}

export function saveLifeCountdownProfile(input: { deathDate: string }) {
  const deathDate = normalizeDate(input.deathDate);
  assertFutureOrToday(deathDate);
  const changed = currentProfile.deathDate !== deathDate;

  currentProfile = {
    ...currentProfile,
    deathDate,
    updateDate: nowIso(),
    ...(changed
      ? {
          todayWarningDate: undefined,
          todayWarningText: undefined,
          todayWarningGeneratedAt: undefined,
          todayWarningModel: undefined,
        }
      : {}),
  };

  return clone(currentProfile);
}

export function generateTodayWarning(input: LifeCountdownGenerateInput): LifeCountdownWarningResult {
  if (!currentProfile.deathDate) {
    throw new Error("请先设置死亡日期");
  }

  assertFutureOrToday(currentProfile.deathDate);
  const today = getTodayDateString();

  if (!input.forceRefresh && currentProfile.todayWarningDate === today && currentProfile.todayWarningText) {
    return {
      warningText: currentProfile.todayWarningText,
      warningDate: currentProfile.todayWarningDate,
      generatedAt: currentProfile.todayWarningGeneratedAt,
      modelName: currentProfile.todayWarningModel,
      cached: true,
    };
  }

  const warningText = buildWarningText(currentProfile.deathDate);
  const generatedAt = nowIso();
  const modelName = input.modelName?.trim() || DEFAULT_MODEL_NAME;

  currentProfile = {
    ...currentProfile,
    todayWarningDate: today,
    todayWarningText: warningText,
    todayWarningGeneratedAt: generatedAt,
    todayWarningModel: modelName,
    updateDate: currentProfile.updateDate ?? generatedAt,
  };

  return {
    warningText,
    warningDate: today,
    generatedAt,
    modelName,
    cached: false,
  };
}

export function calculateCountdownSnapshot(deathDate?: string): CountdownSnapshot | null {
  if (!deathDate) {
    return null;
  }

  const target = new Date(`${deathDate}T23:59:59+08:00`);
  const diffMs = target.getTime() - Date.now();

  if (diffMs <= 0) {
    return {
      expired: true,
      totalDays: 0,
      years: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);

  return {
    expired: false,
    totalDays,
    years: Math.floor(totalDays / 365),
    days: totalDays % 365,
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
