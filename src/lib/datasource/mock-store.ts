import { datasourceTypes, type ConnectionCheckResult, type DatabaseSchemaSummary, type DatasourceDetail, type DatasourceFormValues, type DatasourceListResponse, type TableSchemaItem } from "@/lib/datasource/types";

const now = () => new Date().toISOString();

function buildSchemaTables(schemaName: string): TableSchemaItem[] {
  return [
    {
      tableCat: schemaName === "analytics" ? "数据接入" : "系统管理",
      tableSchem: schemaName,
      tableName: "quiz_datasource",
      tableType: "TABLE",
      remarks: "数据源主表",
      group: "基础设施",
      columns: [
        {
          columnName: "id",
          dataType: "varchar",
          columnSize: 32,
          decimalDigits: null,
          nullable: false,
          defaultValue: null,
          primaryKey: true,
          remarks: "主键",
        },
        {
          columnName: "name",
          dataType: "varchar",
          columnSize: 100,
          decimalDigits: null,
          nullable: false,
          defaultValue: null,
          primaryKey: false,
          remarks: "数据源名称",
        },
        {
          columnName: "jdbc_url",
          dataType: "varchar",
          columnSize: 500,
          decimalDigits: null,
          nullable: false,
          defaultValue: null,
          primaryKey: false,
          remarks: "连接串",
        },
      ],
    },
    {
      tableCat: schemaName === "analytics" ? "数据接入" : "字典缓存",
      tableSchem: schemaName,
      tableName: "quiz_column_schema",
      tableType: "TABLE",
      remarks: "采集后的字段缓存表",
      group: "数据字典",
      columns: [
        {
          columnName: "column_name",
          dataType: "varchar",
          columnSize: 100,
          decimalDigits: null,
          nullable: false,
          defaultValue: null,
          primaryKey: false,
          remarks: "字段名",
        },
        {
          columnName: "data_type",
          dataType: "varchar",
          columnSize: 50,
          decimalDigits: null,
          nullable: false,
          defaultValue: null,
          primaryKey: false,
          remarks: "字段类型",
        },
        {
          columnName: "primary_key",
          dataType: "boolean",
          columnSize: null,
          decimalDigits: null,
          nullable: false,
          defaultValue: "false",
          primaryKey: false,
          remarks: "是否主键",
        },
      ],
    },
  ];
}

let datasourceStore: DatasourceDetail[] = [
  {
    id: "ds-main-mysql",
    name: "nquiz-main-mysql",
    type: "MYSQL",
    driver: datasourceTypes.find((item) => item.value === "MYSQL")?.driver || "com.mysql.cj.jdbc.Driver",
    jdbcUrl: "jdbc:mysql://db.internal:3306/nquiz?useSSL=false&serverTimezone=UTC",
    username: "nquiz_rw",
    description: "主业务库，供 Datasource / DataQuery 首阶段联调使用",
    active: true,
    createDate: "2026-04-10T21:08:00.000Z",
    updateDate: "2026-04-11T00:10:00.000Z",
    lastTestedAt: "2026-04-11T00:10:00.000Z",
    lastTestSuccess: true,
    lastCollectedAt: "2026-04-11T00:12:00.000Z",
    lastCollectedSchema: "nquiz",
    collectedSchemaCount: 2,
    hasPassword: true,
    schemaOptions: ["nquiz", "analytics"],
  },
  {
    id: "ds-analytics-pg",
    name: "nquiz-analytics-pg",
    type: "POSTGRESQL",
    driver: datasourceTypes.find((item) => item.value === "POSTGRESQL")?.driver || "org.postgresql.Driver",
    jdbcUrl: "jdbc:postgresql://analytics.internal:5432/nquiz_analytics",
    username: "analytics_ro",
    description: "分析库，只读接入",
    active: false,
    createDate: "2026-04-10T22:00:00.000Z",
    updateDate: null,
    lastTestedAt: "2026-04-10T22:30:00.000Z",
    lastTestSuccess: false,
    lastCollectedAt: null,
    lastCollectedSchema: null,
    collectedSchemaCount: 0,
    hasPassword: true,
    schemaOptions: ["public", "analytics"],
  },
];

const schemaPreviewStore = new Map<string, DatabaseSchemaSummary>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeConnectionResult(input: DatasourceFormValues | DatasourceDetail): ConnectionCheckResult {
  const databaseType = datasourceTypes.find((item) => item.value === input.type)?.label || input.type;
  const success = Boolean(input.jdbcUrl?.startsWith("jdbc:")) && Boolean(input.username?.trim());

  return {
    success,
    message: success ? "连接配置通过基础校验，可进入保存/测试阶段" : "连接配置不完整，请检查 JDBC URL 与用户名",
    databaseType,
    normalizedSchemaHint: input.type === "MYSQL" || input.type === "MARIADB" ? "catalog" : "schema",
    checkedAt: now(),
  };
}

function sortStore(items: DatasourceDetail[]) {
  items.sort((a, b) => (a.createDate < b.createDate ? 1 : -1));
}

export function listDatasources(params: {
  name?: string;
  active?: "" | "true" | "false";
  pageNum?: number;
  pageSize?: number;
}): DatasourceListResponse {
  const pageNum = params.pageNum ?? 0;
  const pageSize = params.pageSize ?? 10;
  const keyword = params.name?.trim().toLowerCase();

  let filtered = [...datasourceStore];
  if (keyword) {
    filtered = filtered.filter((item) => item.name.toLowerCase().includes(keyword));
  }
  if (params.active === "true") {
    filtered = filtered.filter((item) => item.active);
  }
  if (params.active === "false") {
    filtered = filtered.filter((item) => !item.active);
  }

  const start = pageNum * pageSize;
  const content = filtered.slice(start, start + pageSize).map((item) => clone(item));

  return {
    content,
    totalElements: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    number: pageNum,
    size: pageSize,
  };
}

export function getDatasource(id: string): DatasourceDetail {
  const item = datasourceStore.find((entry) => entry.id === id);
  if (!item) {
    throw new Error("数据源不存在");
  }
  return clone(item);
}

export function createDatasourceEntry(values: DatasourceFormValues): DatasourceDetail {
  const id = `ds-${Date.now()}`;
  const entry: DatasourceDetail = {
    id,
    name: values.name,
    type: values.type,
    driver: values.driver,
    jdbcUrl: values.jdbcUrl,
    username: values.username,
    description: values.description || "",
    active: values.active,
    createDate: now(),
    updateDate: null,
    lastTestedAt: null,
    lastTestSuccess: null,
    lastCollectedAt: null,
    lastCollectedSchema: null,
    collectedSchemaCount: 0,
    hasPassword: Boolean(values.password),
    schemaOptions: values.type === "MYSQL" || values.type === "MARIADB" ? ["nquiz", "analytics"] : ["public", "analytics"],
  };

  datasourceStore.unshift(entry);
  sortStore(datasourceStore);
  return clone(entry);
}

export function updateDatasourceEntry(id: string, values: DatasourceFormValues): DatasourceDetail {
  const index = datasourceStore.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new Error("数据源不存在");
  }

  const current = datasourceStore[index];
  datasourceStore[index] = {
    ...current,
    name: values.name,
    type: values.type,
    driver: values.driver,
    jdbcUrl: values.jdbcUrl,
    username: values.username,
    description: values.description || "",
    active: values.active,
    hasPassword: values.password ? true : current.hasPassword,
    updateDate: now(),
    schemaOptions: values.type === "MYSQL" || values.type === "MARIADB" ? ["nquiz", "analytics"] : ["public", "analytics"],
  };

  return clone(datasourceStore[index]);
}

export function deleteDatasourceEntry(id: string) {
  datasourceStore = datasourceStore.filter((entry) => entry.id !== id);
  schemaPreviewStore.delete(id);
}

export function validateDatasource(values: DatasourceFormValues): ConnectionCheckResult {
  return normalizeConnectionResult(values);
}

export function testDatasource(id: string): ConnectionCheckResult {
  const item = datasourceStore.find((entry) => entry.id === id);
  if (!item) {
    throw new Error("数据源不存在");
  }

  const result = normalizeConnectionResult(item);
  item.lastTestedAt = result.checkedAt;
  item.lastTestSuccess = result.success;
  return clone(result);
}

export function getSchemas(id: string): string[] {
  return getDatasource(id).schemaOptions;
}

export function previewSchema(id: string, schema?: string): DatabaseSchemaSummary {
  const datasource = getDatasource(id);
  const schemaName = schema || datasource.schemaOptions[0] || "default";
  const result: DatabaseSchemaSummary = {
    productName: datasource.type === "POSTGRESQL" ? "PostgreSQL" : datasource.type === "MYSQL" ? "MySQL" : datasource.type,
    productVersion: "16.x",
    driverName: datasource.driver,
    driverVersion: "mock-driver-1.0",
    databaseType: datasource.type,
    schemaName,
    previewMode: true,
    collected: false,
    collectedAt: null,
    tables: buildSchemaTables(schemaName),
  };

  schemaPreviewStore.set(`${id}:${schemaName}`, clone(result));
  return result;
}

export function collectSchema(id: string, schema?: string): DatabaseSchemaSummary {
  const datasource = datasourceStore.find((entry) => entry.id === id);
  if (!datasource) {
    throw new Error("数据源不存在");
  }

  const preview = previewSchema(id, schema);
  const collectedAt = now();
  const result: DatabaseSchemaSummary = {
    ...preview,
    previewMode: false,
    collected: true,
    collectedAt,
  };

  datasource.lastCollectedAt = collectedAt;
  datasource.lastCollectedSchema = result.schemaName;
  datasource.collectedSchemaCount = result.tables.length;
  schemaPreviewStore.set(`${id}:${result.schemaName}`, clone(result));
  return result;
}
