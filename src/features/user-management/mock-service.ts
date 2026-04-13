import type {
  CreateUserInput,
  RoleState,
  UpdateUserInput,
  UserListItem,
  UserManagementFilters,
  UserManagementListResult,
  UserRoleOption,
  UserStatus,
} from "@/features/user-management/types";

const STORAGE_KEY = "nquiz-user-management-records";
const ROLE_STORAGE_KEY = "nquiz-user-management-roles";

const defaultRoles: UserRoleOption[] = [
  { id: "admin", name: "管理员", descr: "系统管理与敏感配置维护", state: "ENABLED" },
  { id: "teacher", name: "教师", descr: "内容维护、题目与考试管理", state: "ENABLED" },
  { id: "operator", name: "运营", descr: "运营活动与资源维护", state: "ENABLED" },
  { id: "auditor", name: "审计", descr: "只读审计与核对", state: "DISABLED" },
];

const defaultUsers: UserListItem[] = [
  {
    id: "u-001",
    userId: "admin",
    userName: "系统管理员",
    email: "admin@nquiz.local",
    phone: "13800000001",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Admin",
    state: "ENABLED",
    createDate: "2026-04-10T09:00:00.000Z",
    updateDate: "2026-04-11T00:20:00.000Z",
    passwordUpdatedAt: "2026-04-11T00:20:00.000Z",
    roles: [defaultRoles[0], defaultRoles[1]],
  },
  {
    id: "u-002",
    userId: "teacher.demo",
    userName: "演示教师",
    email: "teacher@nquiz.local",
    phone: "13800000002",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Teacher",
    state: "ENABLED",
    createDate: "2026-04-10T10:30:00.000Z",
    updateDate: "2026-04-11T01:05:00.000Z",
    passwordUpdatedAt: "2026-04-10T10:30:00.000Z",
    roles: [defaultRoles[1]],
  },
  {
    id: "u-003",
    userId: "ops.chen",
    userName: "陈运营",
    email: "ops@nquiz.local",
    phone: "13800000003",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Ops",
    state: "DISABLED",
    createDate: "2026-04-09T15:00:00.000Z",
    updateDate: "2026-04-10T11:20:00.000Z",
    passwordUpdatedAt: "2026-04-09T15:00:00.000Z",
    roles: [defaultRoles[2]],
  },
  {
    id: "u-004",
    userId: "review.liu",
    userName: "刘审计",
    email: "review@nquiz.local",
    phone: "13800000004",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Audit",
    state: "ENABLED",
    createDate: "2026-04-08T08:20:00.000Z",
    updateDate: "2026-04-10T18:00:00.000Z",
    passwordUpdatedAt: "2026-04-08T08:20:00.000Z",
    roles: [],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function wait(ms = 120) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureRoles() {
  const existing = readJson<UserRoleOption[] | null>(ROLE_STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }
  writeJson(ROLE_STORAGE_KEY, defaultRoles);
  return defaultRoles;
}

function ensureUsers() {
  const existing = readJson<UserListItem[] | null>(STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }
  writeJson(STORAGE_KEY, defaultUsers);
  return defaultUsers;
}

function saveUsers(users: UserListItem[]) {
  writeJson(STORAGE_KEY, users);
}

function getRoleMap() {
  return new Map(ensureRoles().map((role) => [role.id, role]));
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sortUsers(users: UserListItem[]) {
  return [...users].sort((a, b) => (a.createDate < b.createDate ? 1 : -1));
}

export async function listAssignableRoles(state?: RoleState) {
  await wait(80);
  const roles = ensureRoles();
  return state ? roles.filter((role) => role.state === state) : roles;
}

export async function listUsers(filters: UserManagementFilters): Promise<UserManagementListResult> {
  await wait(120);
  const records = sortUsers(ensureUsers());
  const keyword = filters.keyword.trim().toLowerCase();

  const filtered = records.filter((item) => {
    if (filters.status !== "ALL" && item.state !== filters.status) return false;
    if (filters.roleId && !item.roles.some((role) => role.id === filters.roleId)) return false;
    if (keyword) {
      const haystack = [item.userId, item.userName, item.email, item.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(start, start + filters.pageSize);

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalUsers: records.length,
      enabledUsers: records.filter((item) => item.state === "ENABLED").length,
      disabledUsers: records.filter((item) => item.state === "DISABLED").length,
      assignedUsers: records.filter((item) => item.roles.length > 0).length,
    },
  };
}

export async function createUser(input: CreateUserInput) {
  await wait(120);
  const users = ensureUsers();
  const duplicated = users.find((item) => item.userId.toLowerCase() === input.userId.trim().toLowerCase());
  if (duplicated) {
    throw new Error(`用户 ID 已存在：${input.userId}`);
  }

  const timestamp = nowIso();
  const record: UserListItem = {
    id: `u-${Date.now()}`,
    userId: input.userId.trim(),
    userName: input.userName.trim(),
    email: normalizeText(input.email),
    phone: normalizeText(input.phone),
    logo: normalizeText(input.logo),
    state: "ENABLED",
    createDate: timestamp,
    updateDate: timestamp,
    passwordUpdatedAt: timestamp,
    roles: [],
  };

  saveUsers([record, ...users]);
  return record;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  await wait(120);
  const users = ensureUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error("用户不存在，无法更新");
  }

  const next: UserListItem = {
    ...users[index],
    userName: input.userName.trim(),
    email: normalizeText(input.email),
    phone: normalizeText(input.phone),
    logo: normalizeText(input.logo),
    updateDate: nowIso(),
  };

  users[index] = next;
  saveUsers(users);
  return next;
}

export async function deleteUser(id: string) {
  await wait(100);
  const users = ensureUsers();
  const next = users.filter((item) => item.id !== id);
  saveUsers(next);
  return { success: true as const };
}

export async function resetUserPassword(id: string, newPassword: string) {
  await wait(100);
  if (!newPassword.trim()) {
    throw new Error("新密码不能为空");
  }
  const users = ensureUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error("用户不存在，无法重置密码");
  }

  const next: UserListItem = {
    ...users[index],
    passwordUpdatedAt: nowIso(),
    updateDate: nowIso(),
  };
  users[index] = next;
  saveUsers(users);
  return { success: true as const };
}

export async function updateUserStatus(id: string, status: UserStatus) {
  await wait(100);
  const users = ensureUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error("用户不存在，无法切换状态");
  }

  const next: UserListItem = {
    ...users[index],
    state: status,
    updateDate: nowIso(),
  };
  users[index] = next;
  saveUsers(users);
  return next;
}

export async function replaceUserRoles(userId: string, roleIds: string[]) {
  await wait(120);
  const users = ensureUsers();
  const index = users.findIndex((item) => item.userId === userId);
  if (index < 0) {
    throw new Error("用户不存在，无法分配角色");
  }

  const roleMap = getRoleMap();
  const nextRoles = roleIds
    .map((roleId) => roleMap.get(roleId))
    .filter((role): role is UserRoleOption => Boolean(role));

  const next: UserListItem = {
    ...users[index],
    roles: nextRoles,
    updateDate: nowIso(),
  };
  users[index] = next;
  saveUsers(users);
  return nextRoles;
}
