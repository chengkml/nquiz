import { z } from "zod";
import { datasourceTypes, type DatasourceType } from "@/lib/datasource/types";

const datasourceTypeValues = datasourceTypes.map((item) => item.value) as [DatasourceType, ...DatasourceType[]];
const datasourceTypeEnum = z.enum(datasourceTypeValues);

export const datasourceFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "名称至少 2 个字符").max(100, "名称最多 100 个字符"),
  type: datasourceTypeEnum,
  driver: z.string().trim().min(2, "驱动不能为空"),
  jdbcUrl: z
    .string()
    .trim()
    .min(5, "JDBC URL 不能为空")
    .regex(/^jdbc:/i, "JDBC URL 必须以 jdbc: 开头"),
  username: z.string().trim().min(1, "用户名不能为空").max(100, "用户名最多 100 个字符"),
  password: z.string().max(200, "密码最多 200 个字符").optional(),
  description: z.string().max(500, "描述最多 500 个字符").optional().default(""),
  active: z.boolean().default(true),
});

export type DatasourceFormSchemaValues = z.input<typeof datasourceFormSchema>;
export type DatasourceFormSchemaOutput = z.output<typeof datasourceFormSchema>;
