import type {
  ReplaceRoleMenusResult,
  RoleFilters,
  RoleListResult,
  RoleMenuNode,
  RoleMutationInput,
  RolePermissionSnapshot,
  RoleRecord,
} from "@/features/role/types";

const STORAGE_KEY = "nquiz-system-roles";

const menuTree: RoleMenuNode[] = [
  {
    id: "sys_mgr",
    label: "系统管理",
    type: "DIRECTORY",
    children: [
      {
        id: "user_mgr",
        label: "用户管理",
        type: "MENU",
        path: "/system/users",
        children: [
          {
            id: "user:create",
            label: "新增用户",
            type: "BUTTON",
            permissionKey: "user:create",
            children: [],
          },
          {
            id: "user:update",
            label: "编辑用户",
            type: "BUTTON",
            permissionKey: "user:update",
            children: [],
          },
        ],
      },
      {
        id: "menu_mgr",
        label: "菜单管理",
        type: "MENU",
        path: "/menu",
        children: [
          {
            id: "menu:publish",
            label: "发布菜单变更",
            type: "BUTTON",
            permissionKey: "menu:publish",
            children: [],
          },
        ],
      },
      {
        id: "role_mgr",
        label: "角色管理",
        type: "MENU",
        path: "/system/roles",
        children: [
          {
            id: "role:create",
            label: "新增角色",
            type: "BUTTON",
            permissionKey: "role:create",
            children: [],
          },
          {
            id: "role:update",
            label: "编辑角色",
            type: "BUTTON",
            permissionKey: "role:update",
            children: [],
          },
          {
            id: "role:assign-menu",
            label: "分配菜单权限",
            type: "BUTTON",
            permissionKey: "role:assign-menu",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "biz_workspace",
    label: "业务工作台",
    type: "DIRECTORY",
    children: [
      {
        id: "datasource_mgr",
        label: "数据接入中心",
        type: "MENU",
        path: "/datasource",
        children: [],
      },
      {
        id: "wrong_question_mgr",
        label: "错题本",
        type: "MENU",
        path: "/wrong-question",
        children: [],
      },
      {
        id: "price_monitor_mgr",
        label: "价格监控",
        type: "MENU",
        path: "/price-monitor",
        children: [],
      },
    ],
  },
];

const defaultRoles: RoleRecord[] = [
  {
    id: "role-001",
    roleCode: "sys_mgr",
    roleName: "系统管理员",
    roleDescr: "维护系统菜单、角色与用户等系统级配置。",
    state: "ENABLED",
    createDate: "2026-04-09T08:30:00.000Z",
    updateDate: "2026-04-10T19:00:00.000Z",
    boundUserCount: 2,
    assignedMenuIds: [
      "sys_mgr",
      "user_mgr",
      "user:create",
      "user:update",
      "menu_mgr",
      "menu:publish",
      "role_mgr",
      "role:create",
      "role:update",
      "role:assign-menu",
      "biz_workspace",
      "datasource_mgr",
      "wrong_question_mgr",
      "price_monitor_mgr",
    ],
  },
  {
    id: "role-002",
    roleCode: "ops_admin",
    roleName: "运维管理员",
    roleDescr: "负责系统运行与发布配置，不直接维护业务内容。",
    state: "ENABLED",
    createDate: "2026-04-09T09:10:00.000Z",
    updateDate: "2026-04-10T10:16:00.000Z",
    boundUserCount: 3,
    assignedMenuIds: ["sys_mgr", "menu_mgr", "menu:publish", "biz_workspace", "datasource_mgr"],
  },
  {
    id: "role-003",
    roleCode: "content_editor",
    roleName: "内容运营",
    roleDescr: "主要维护错题与价格监控等业务工作台，不触碰系统域。",
    state: "DISABLED",
    createDate: "2026-04-08T16:45:00.000Z",
    updateDate: "2026-04-10T12:05:00.000Z",
    boundUserCount: 5,
    assignedMenuIds: ["biz_workspace", "wrong_question_mgr", "price_monitor_mgr"],
  },
];

function wait(ms = 120) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
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
  const existing = readJson<RoleRecord[] | null>(STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(STORAGE_KEY, defaultRoles);
  return defaultRoles;
}

function saveRoles(records: RoleRecord[]) {
  writeJson(STORAGE_KEY, records);
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function flattenMenuTree(nodes: RoleMenuNode[]) {
  const all: RoleMenuNode[] = [];
  const walk = (items: RoleMenuNode[]) => {
    items.forEach((item) => {
      all.push(item);
      if (item.children.length) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return all;
}

function menuLabelMap() {
  const map = new Map<string, string>();
  flattenMenuTree(menuTree).forEach((item) => {
    map.set(item.id, item.label);
  });
  return map;
}

export async function listRoles(filters: RoleFilters): Promise<RoleListResult> {
  await wait(100);
  const keyword = filters.keyword.trim().toLowerCase();
  const records = ensureRoles().sort((a, b) => (a.createDate < b.createDate ? 1 : -1));

  const filtered = records.filter((item) => {
    if (filters.state !== "ALL" && item.state !== filters.state) {
      return false;
    }
    if (keyword) {
      const haystack = [item.roleCode, item.roleName, item.roleDescr]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
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
      total: records.length,
      enabled: records.filter((item) => item.state === "ENABLED").length,
      disabled: records.filter((item) => item.state === "DISABLED").length,
      totalBindings: records.reduce((sum, item) => sum + item.boundUserCount, 0),
      configuredPermissions: records.reduce((sum, item) => sum + item.assignedMenuIds.length, 0),
    },
  };
}

export async function createRole(input: RoleMutationInput) {
  await wait(120);
  const records = ensureRoles();
  const roleCode = input.roleCode.trim();
  const roleName = input.roleName.trim();

  if (records.some((item) => item.roleCode === roleCode)) {
    throw new Error("角色编码已存在，请使用新的 roleCode。");
  }
  if (records.some((item) => item.roleName === roleName)) {
    throw new Error("角色名称已存在，请调整后再提交。");
  }

  const timestamp = nowIso();
  const next: RoleRecord = {
    id: `role-${Date.now()}`,
    roleCode,
    roleName,
    roleDescr: normalizeText(input.roleDescr),
    state: input.state,
    createDate: timestamp,
    updateDate: timestamp,
    boundUserCount: 0,
    assignedMenuIds: [],
  };

  saveRoles([next, ...records]);
  return next;
}

export async function updateRole(roleId: string, input: RoleMutationInput) {
  await wait(120);
  const records = ensureRoles();
  const index = records.findIndex((item) => item.id === roleId);
  if (index < 0) {
    throw new Error("角色不存在，无法编辑。");
  }

  const current = records[index];
  const roleName = input.roleName.trim();
  if (records.some((item) => item.id !== roleId && item.roleName === roleName)) {
    throw new Error("角色名称已存在，请调整后再提交。");
  }

  const next: RoleRecord = {
    ...current,
    roleName,
    roleDescr: normalizeText(input.roleDescr),
    state: input.state,
    updateDate: nowIso(),
  };

  records[index] = next;
  saveRoles(records);
  return next;
}

export async function deleteRole(roleId: string) {
  await wait(120);
  const records = ensureRoles();
  const target = records.find((item) => item.id === roleId);
  if (!target) {
    throw new Error("角色不存在，无法删除。");
  }
  if (target.boundUserCount > 0) {
    throw new Error(`该角色仍绑定 ${target.boundUserCount} 个用户，首版不允许直接删除。`);
  }

  saveRoles(records.filter((item) => item.id !== roleId));
  return { success: true as const };
}

export async function setRoleState(roleId: string, state: RoleRecord["state"]) {
  await wait(100);
  const records = ensureRoles();
  const index = records.findIndex((item) => item.id === roleId);
  if (index < 0) {
    throw new Error("角色不存在，无法切换状态。");
  }
  records[index] = {
    ...records[index],
    state,
    updateDate: nowIso(),
  };
  saveRoles(records);
  return records[index];
}

export async function getRolePermissionSnapshot(roleId: string): Promise<RolePermissionSnapshot> {
  await wait(100);
  const role = ensureRoles().find((item) => item.id === roleId);
  if (!role) {
    throw new Error("角色不存在，无法读取菜单权限。");
  }
  const labels = menuLabelMap();
  return {
    roleId,
    assignedMenuIds: role.assignedMenuIds,
    assignedMenuCount: role.assignedMenuIds.length,
    assignedMenuLabels: role.assignedMenuIds.map((id) => labels.get(id) ?? id),
  };
}

export async function listRoleMenuTree() {
  await wait(80);
  return menuTree;
}

export async function replaceRoleMenus(roleId: string, menuIds: string[]): Promise<ReplaceRoleMenusResult> {
  await wait(150);
  const records = ensureRoles();
  const index = records.findIndex((item) => item.id === roleId);
  if (index < 0) {
    throw new Error("角色不存在，无法保存菜单权限。");
  }

  const current = records[index];
  const nextAssigned = Array.from(new Set(menuIds));
  const previousSet = new Set(current.assignedMenuIds);
  const nextSet = new Set(nextAssigned);

  const addedIds = nextAssigned.filter((id) => !previousSet.has(id));
  const removedIds = current.assignedMenuIds.filter((id) => !nextSet.has(id));

  records[index] = {
    ...current,
    assignedMenuIds: nextAssigned,
    updateDate: nowIso(),
  };
  saveRoles(records);

  return {
    roleId,
    assignedMenuIds: nextAssigned,
    addedIds,
    removedIds,
  };
}
