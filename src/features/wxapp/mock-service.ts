import type {
  WxAppEntity,
  WxAppListFilters,
  WxAppListItem,
  WxAppListResult,
  WxAppMutationInput,
  WxAppStoreSnapshot,
  WxAppSummary,
  WxAppUser,
} from "@/features/wxapp/types";

const STORAGE_KEY = "nquiz.wx-app-manager.v1";
const LATENCY_MS = 120;

const seedSnapshot: WxAppStoreSnapshot = {
  apps: [
    {
      id: "wxapp-001",
      appId: "wx8f1c-demo-edu",
      appName: "题库学习助手",
      appSecret: "demo-secret-edu-001",
      appDescr: "面向刷题与知识复习的学习型小程序。",
      status: "ENABLED",
      createDate: "2026-04-08T09:30:00+08:00",
      updateDate: "2026-04-10T15:45:00+08:00",
    },
    {
      id: "wxapp-002",
      appId: "wx7ab2-demo-admin",
      appName: "运营后台小程序",
      appSecret: "demo-secret-admin-002",
      appDescr: "承接运营消息、课程通知与活动配置。",
      status: "DISABLED",
      createDate: "2026-04-06T13:20:00+08:00",
      updateDate: "2026-04-09T18:10:00+08:00",
    },
  ],
  users: [
    {
      userId: "chengkai",
      userName: "程凯",
      appId: "wx8f1c-demo-edu",
      appName: "题库学习助手",
      openId: "o_openid_demo_001",
      createTime: "2026-04-09T10:00:00+08:00",
    },
    {
      userId: "xiaolongxia",
      userName: "小龙虾",
      appId: "wx8f1c-demo-edu",
      appName: "题库学习助手",
      openId: "o_openid_demo_002",
      createTime: "2026-04-09T11:30:00+08:00",
    },
    {
      userId: "ops-01",
      userName: "运营同学",
      appId: "wx7ab2-demo-admin",
      appName: "运营后台小程序",
      openId: "o_openid_demo_003",
      createTime: "2026-04-08T17:20:00+08:00",
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

function readSnapshot(): WxAppStoreSnapshot {
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
    const parsed = JSON.parse(raw) as Partial<WxAppStoreSnapshot>;
    if (!Array.isArray(parsed.apps) || !Array.isArray(parsed.users)) {
      throw new Error("invalid snapshot shape");
    }
    return {
      apps: parsed.apps as WxAppEntity[],
      users: parsed.users as WxAppUser[],
    };
  } catch {
    const snapshot = clone(seedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  }
}

function writeSnapshot(snapshot: WxAppStoreSnapshot) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function nowIso() {
  return new Date().toISOString();
}

function toListItem(app: WxAppEntity, users: WxAppUser[]): WxAppListItem {
  return {
    id: app.id,
    appId: app.appId,
    appName: app.appName,
    appDescr: app.appDescr,
    status: app.status,
    createDate: app.createDate,
    updateDate: app.updateDate,
    boundUserCount: users.filter((user) => user.appId === app.appId).length,
  };
}

function buildSummary(snapshot: WxAppStoreSnapshot): WxAppSummary {
  return {
    totalApps: snapshot.apps.length,
    enabledApps: snapshot.apps.filter((app) => app.status === "ENABLED").length,
    totalBindings: snapshot.users.length,
  };
}

export async function listWxApps(filters: WxAppListFilters): Promise<WxAppListResult> {
  const snapshot = readSnapshot();
  const keyword = filters.keyword.trim().toLowerCase();
  const appId = filters.appId.trim().toLowerCase();

  const filtered = snapshot.apps
    .filter((app) => {
      const matchKeyword =
        !keyword ||
        app.appName.toLowerCase().includes(keyword) ||
        app.appDescr.toLowerCase().includes(keyword);
      const matchAppId = !appId || app.appId.toLowerCase().includes(appId);
      const matchStatus = filters.status === "ALL" || app.status === filters.status;
      return matchKeyword && matchAppId && matchStatus;
    })
    .sort((left, right) => right.updateDate.localeCompare(left.updateDate));

  const enriched = filtered.map((app) => toListItem(app, snapshot.users));
  const start = (filters.page - 1) * filters.pageSize;
  const end = start + filters.pageSize;

  return wait({
    items: enriched.slice(start, end),
    total: enriched.length,
    summary: buildSummary(snapshot),
  });
}

export async function listWxAppUsers(appId: string): Promise<WxAppUser[]> {
  const snapshot = readSnapshot();
  const users = snapshot.users
    .filter((user) => user.appId === appId)
    .sort((left, right) => right.createTime.localeCompare(left.createTime));
  return wait(users);
}

export async function createWxApp(input: WxAppMutationInput): Promise<WxAppEntity> {
  const snapshot = readSnapshot();
  const duplicated = snapshot.apps.some((app) => app.appId.toLowerCase() === input.appId.trim().toLowerCase());
  if (duplicated) {
    throw new Error(`AppID 已存在：${input.appId}`);
  }

  const timestamp = nowIso();
  const entity: WxAppEntity = {
    id: crypto.randomUUID(),
    appId: input.appId.trim(),
    appName: input.appName.trim(),
    appSecret: (input.appSecret ?? "").trim(),
    appDescr: input.appDescr.trim(),
    status: input.status,
    createDate: timestamp,
    updateDate: timestamp,
  };

  snapshot.apps.unshift(entity);
  writeSnapshot(snapshot);
  return wait(entity);
}

export async function updateWxApp(id: string, input: WxAppMutationInput): Promise<WxAppEntity> {
  const snapshot = readSnapshot();
  const app = snapshot.apps.find((item) => item.id === id);
  if (!app) {
    throw new Error("目标小程序不存在，可能已被删除");
  }

  app.appName = input.appName.trim();
  app.appDescr = input.appDescr.trim();
  app.status = input.status;
  app.updateDate = nowIso();
  if (input.appSecret?.trim()) {
    app.appSecret = input.appSecret.trim();
  }

  snapshot.users = snapshot.users.map((user) =>
    user.appId === app.appId
      ? {
          ...user,
          appName: app.appName,
        }
      : user,
  );

  writeSnapshot(snapshot);
  return wait(clone(app));
}

export async function deleteWxApp(id: string): Promise<void> {
  const snapshot = readSnapshot();
  const app = snapshot.apps.find((item) => item.id === id);
  if (!app) {
    throw new Error("目标小程序不存在，可能已被删除");
  }

  snapshot.apps = snapshot.apps.filter((item) => item.id !== id);
  snapshot.users = snapshot.users.filter((user) => user.appId !== app.appId);
  writeSnapshot(snapshot);
  return wait(undefined);
}
