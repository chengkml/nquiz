export const datasourceTypes = [
  {
    label: "MySQL",
    value: "MYSQL",
    driver: "com.mysql.cj.jdbc.Driver",
    urlTemplate: "jdbc:mysql://localhost:3306/nquiz?useSSL=false&serverTimezone=UTC",
  },
  {
    label: "PostgreSQL",
    value: "POSTGRESQL",
    driver: "org.postgresql.Driver",
    urlTemplate: "jdbc:postgresql://localhost:5432/nquiz",
  },
  {
    label: "Oracle",
    value: "ORACLE",
    driver: "oracle.jdbc.OracleDriver",
    urlTemplate: "jdbc:oracle:thin:@localhost:1521:xe",
  },
  {
    label: "SQL Server",
    value: "SQLSERVER",
    driver: "com.microsoft.sqlserver.jdbc.SQLServerDriver",
    urlTemplate: "jdbc:sqlserver://localhost:1433;databaseName=nquiz",
  },
  {
    label: "ClickHouse",
    value: "CLICKHOUSE",
    driver: "com.clickhouse.jdbc.ClickHouseDriver",
    urlTemplate: "jdbc:clickhouse://localhost:8123/default",
  },
  {
    label: "MariaDB",
    value: "MARIADB",
    driver: "org.mariadb.jdbc.Driver",
    urlTemplate: "jdbc:mariadb://localhost:3306/nquiz",
  },
  {
    label: "SQLite",
    value: "SQLITE",
    driver: "org.sqlite.JDBC",
    urlTemplate: "jdbc:sqlite:nquiz.db",
  },
  {
    label: "达梦",
    value: "DM",
    driver: "dm.jdbc.driver.DmDriver",
    urlTemplate: "jdbc:dm://localhost:5236",
  },
] as const;

export type DatasourceType = (typeof datasourceTypes)[number]["value"];

export type DatasourceSummary = {
  id: string;
  name: string;
  type: DatasourceType;
  driver: string;
  jdbcUrl: string;
  username: string;
  description: string;
  active: boolean;
  createDate: string;
  updateDate: string | null;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  lastCollectedAt: string | null;
  lastCollectedSchema: string | null;
  collectedSchemaCount: number;
  hasPassword: boolean;
};

export type DatasourceDetail = DatasourceSummary & {
  schemaOptions: string[];
};

export type DatasourceListResponse = {
  content: DatasourceSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type ConnectionCheckResult = {
  success: boolean;
  message: string;
  databaseType: string;
  normalizedSchemaHint?: string;
  checkedAt: string;
};

export type ColumnSchemaItem = {
  columnName: string;
  dataType: string;
  columnSize: number | null;
  decimalDigits: number | null;
  nullable: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
  remarks: string | null;
};

export type TableSchemaItem = {
  tableCat: string | null;
  tableSchem: string | null;
  tableName: string;
  tableType: string;
  remarks: string | null;
  group: string;
  columns: ColumnSchemaItem[];
};

export type DatabaseSchemaSummary = {
  productName: string;
  productVersion: string;
  driverName: string;
  driverVersion: string;
  databaseType: string;
  schemaName: string;
  previewMode: boolean;
  collected: boolean;
  collectedAt: string | null;
  tables: TableSchemaItem[];
};

export type DatasourceFormValues = {
  id?: string;
  name: string;
  type: DatasourceType;
  driver: string;
  jdbcUrl: string;
  username: string;
  password?: string;
  description?: string;
  active: boolean;
};

export type DatasourceFilterValues = {
  name: string;
  active: "" | "true" | "false";
};
