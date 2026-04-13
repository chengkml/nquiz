import type {
  GroupEntity,
  GroupListFilters,
  GroupListItem,
  GroupListResult,
  GroupMutationInput,
  GroupObjectRelationEntity,
  GroupOption,
  GroupRelationMutationInput,
} from "@/features/group/types";

const GROUP_STORAGE_KEY = "nquiz-groups";
const RELATION_STORAGE_KEY = "nquiz-group-object-relations";
const CURRENT_USER_ID = "mock-current-user";
const CURRENT_USER_NAME = "当前登录用户";

const defaultGroups: GroupEntity[] = [
  {
    id: "group-mindmap-product",
    name: "mindmap_product",
    label: "产品思维导图",
    type: "mindmap",
    descr: "用于归档产品方向脑图，供思维导图模块按 type=mindmap 复用。",
    createDate: "2026-04-03T08:30:00.000Z",
    updateDate: "2026-04-10T10:30:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "group-mermaid-architecture",
    name: "mermaid_architecture",
    label: "架构流程图",
    type: "mermaid",
    descr: "用于存放系统拓扑、调用链和部署流程相关的流程图资产。",
    createDate: "2026-04-02T09:00:00.000Z",
    updateDate: "2026-04-09T15:20:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "group-tag-research",
    name: "research_notes",
    label: "研究标签",
    type: "tag",
    descr: "用于知识沉淀、专题研究类对象分组。",
    createDate: "2026-04-01T12:10:00.000Z",
    updateDate: "2026-04-10T09:40:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "group-homework-urgent",
    name: "urgent_homework",
    label: "高优作业",
    type: "homework",
    descr: "用于管理需优先处理的作业与复盘任务。",
    createDate: "2026-03-31T07:50:00.000Z",
    updateDate: "2026-04-08T13:05:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
  {
    id: "group-general-backlog",
    name: "personal_backlog",
    label: "个人积压项",
    type: "",
    descr: "未显式声明 type 的通用分组示例，兼容旧系统可空 type 语义。",
    createDate: "2026-03-30T11:20:00.000Z",
    updateDate: "2026-04-06T16:45:00.000Z",
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  },
];

const defaultRelations: GroupObjectRelationEntity[] = [
  {
    id: "rela-1",
    groupId: "group-mindmap-product",
    objectId: "mindmap-101",
    objectType: "mindmap",
    createDate: "2026-04-10T10:35:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
  {
    id: "rela-2",
    groupId: "group-mindmap-product",
    objectId: "mindmap-205",
    objectType: "mindmap",
    createDate: "2026-04-10T10:36:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
  {
    id: "rela-3",
    groupId: "group-mermaid-architecture",
    objectId: "diagram-33",
    objectType: "mermaid",
    createDate: "2026-04-09T15:40:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
  {
    id: "rela-4",
    groupId: "group-tag-research",
    objectId: "tag-12",
    objectType: "tag",
    createDate: "2026-04-10T09:45:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
  {
    id: "rela-5",
    groupId: "group-tag-research",
    objectId: "tag-16",
    objectType: "tag",
    createDate: "2026-04-10T09:46:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
  {
    id: "rela-6",
    groupId: "group-homework-urgent",
    objectId: "homework-9",
    objectType: "homework",
    createDate: "2026-04-08T13:10:00.000Z",
    createUserId: CURRENT_USER_ID,
  },
];

function wait(ms = 100) {
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

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

function normalizeName(value: string) {
  return normalizeText(value).toLowerCase();
}

function normalizeType(value?: string) {
  return normalizeText(value).toLowerCase();
}

function normalizeKeyword(value: string) {
  return normalizeText(value).toLowerCase();
}

function normalizeMutationInput(input: GroupMutationInput) {
  return {
    name: normalizeName(input.name),
    label: normalizeText(input.label),
    type: normalizeType(input.type),
    descr: normalizeText(input.descr),
  };
}

function ensureGroups() {
  const existing = readJson<GroupEntity[] | null>(GROUP_STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(GROUP_STORAGE_KEY, defaultGroups);
  return defaultGroups;
}

function ensureRelations() {
  const existing = readJson<GroupObjectRelationEntity[] | null>(RELATION_STORAGE_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  writeJson(RELATION_STORAGE_KEY, defaultRelations);
  return defaultRelations;
}

function saveGroups(groups: GroupEntity[]) {
  writeJson(GROUP_STORAGE_KEY, groups);
}

function saveRelations(relations: GroupObjectRelationEntity[]) {
  writeJson(RELATION_STORAGE_KEY, relations);
}

function getVisibleGroups() {
  return ensureGroups()
    .filter((item) => item.createUserId === CURRENT_USER_ID)
    .sort((a, b) => (a.createDate < b.createDate ? 1 : -1));
}

function getVisibleRelations() {
  return ensureRelations().filter((item) => item.createUserId === CURRENT_USER_ID);
}

function createRelationMap(relations: GroupObjectRelationEntity[]) {
  const map = new Map<string, number>();
  for (const relation of relations) {
    const current = map.get(relation.groupId) ?? 0;
    map.set(relation.groupId, current + 1);
  }
  return map;
}

function toListItem(group: GroupEntity, relationCountMap: Map<string, number>): GroupListItem {
  return {
    ...group,
    relationCount: relationCountMap.get(group.id) ?? 0,
  };
}

export async function listGroups(filters: GroupListFilters): Promise<GroupListResult> {
  await wait(120);

  const groups = getVisibleGroups();
  const relations = getVisibleRelations();
  const relationCountMap = createRelationMap(relations);
  const keyword = normalizeKeyword(filters.keyword);
  const type = normalizeType(filters.type);

  const filtered = groups.filter((item) => {
    if (type && normalizeType(item.type) !== type) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = [item.name, item.label, item.type, item.descr].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(start, start + filters.pageSize).map((item) => toListItem(item, relationCountMap));
  const totalTypes = new Set(groups.map((item) => normalizeType(item.type) || "__empty__")).size;

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      totalGroups: groups.length,
      totalTypes,
      totalRelations: relations.length,
    },
  };
}

export async function listGroupOptions(type?: string): Promise<GroupOption[]> {
  await wait(60);
  const typeFilter = normalizeType(type);
  return getVisibleGroups()
    .filter((item) => {
      if (!typeFilter) return true;
      return normalizeType(item.type) === typeFilter;
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      label: item.label,
      type: item.type,
    }));
}

export async function checkGroupNameUnique(name: string, type?: string, excludeId?: string) {
  await wait(80);
  const normalizedName = normalizeName(name);
  const normalizedType = normalizeType(type);

  if (!normalizedName) {
    return true;
  }

  return !getVisibleGroups().some(
    (item) =>
      normalizeName(item.name) === normalizedName &&
      normalizeType(item.type) === normalizedType &&
      item.id !== excludeId,
  );
}

export async function createGroup(input: GroupMutationInput) {
  await wait(120);
  const payload = normalizeMutationInput(input);

  const unique = await checkGroupNameUnique(payload.name, payload.type);
  if (!unique) {
    throw new Error("同类型下该分组编码已存在");
  }

  const groups = ensureGroups();
  const timestamp = nowIso();
  const record: GroupEntity = {
    id: `group-${Date.now()}`,
    name: payload.name,
    label: payload.label,
    type: payload.type,
    descr: payload.descr,
    createDate: timestamp,
    updateDate: timestamp,
    createUserId: CURRENT_USER_ID,
    createUserName: CURRENT_USER_NAME,
  };

  saveGroups([record, ...groups]);
  return record;
}

export async function updateGroup(id: string, input: GroupMutationInput) {
  await wait(120);
  const groups = ensureGroups();
  const index = groups.findIndex((item) => item.id === id && item.createUserId === CURRENT_USER_ID);

  if (index < 0) {
    throw new Error("分组不存在或无权编辑");
  }

  const current = groups[index];
  const payload = normalizeMutationInput(input);
  if (payload.name !== normalizeName(current.name)) {
    throw new Error("分组编码创建后不可修改");
  }

  const unique = await checkGroupNameUnique(payload.name, payload.type, id);
  if (!unique) {
    throw new Error("同类型下该分组编码已存在");
  }

  const next: GroupEntity = {
    ...current,
    label: payload.label,
    type: payload.type,
    descr: payload.descr,
    updateDate: nowIso(),
  };

  groups[index] = next;
  saveGroups(groups);
  return next;
}

export async function deleteGroup(id: string) {
  await wait(100);
  const groups = ensureGroups();
  const target = groups.find((item) => item.id === id && item.createUserId === CURRENT_USER_ID);
  if (!target) {
    throw new Error("分组不存在或无权删除");
  }

  const relations = ensureRelations();
  const filteredGroups = groups.filter((item) => item.id !== id);
  const removedRelations = relations.filter((item) => item.groupId === id).length;
  const filteredRelations = relations.filter((item) => item.groupId !== id);

  saveGroups(filteredGroups);
  saveRelations(filteredRelations);

  return {
    success: true as const,
    removedRelations,
  };
}

export async function upsertGroupObjectRelation(input: GroupRelationMutationInput) {
  await wait(80);
  const groupId = normalizeText(input.groupId);
  const objectId = normalizeText(input.objectId);
  const objectType = normalizeType(input.objectType) || "unknown";

  if (!groupId || !objectId) {
    throw new Error("groupId 和 objectId 不能为空");
  }

  const group = getVisibleGroups().find((item) => item.id === groupId);
  if (!group) {
    throw new Error("分组不存在或无访问权限");
  }

  const relations = ensureRelations();
  const existing = relations.find(
    (item) =>
      item.createUserId === CURRENT_USER_ID &&
      item.groupId === groupId &&
      item.objectId === objectId &&
      item.objectType === objectType,
  );

  if (existing) {
    return existing;
  }

  const relation: GroupObjectRelationEntity = {
    id: `group-rela-${Date.now()}`,
    groupId,
    objectId,
    objectType,
    createDate: nowIso(),
    createUserId: CURRENT_USER_ID,
  };

  saveRelations([relation, ...relations]);
  return relation;
}

export async function removeGroupObjectRelation(input: GroupRelationMutationInput) {
  await wait(80);
  const groupId = normalizeText(input.groupId);
  const objectId = normalizeText(input.objectId);
  const objectType = normalizeType(input.objectType);
  const relations = ensureRelations();

  const next = relations.filter((item) => {
    if (item.createUserId !== CURRENT_USER_ID) return true;
    if (item.groupId !== groupId) return true;
    if (item.objectId !== objectId) return true;
    if (objectType && item.objectType !== objectType) return true;
    return false;
  });

  saveRelations(next);
  return { success: true as const };
}
