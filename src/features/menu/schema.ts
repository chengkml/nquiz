import { z } from "zod";

export const menuTypeOptions = ["DIRECTORY", "MENU", "BUTTON"] as const;
export const menuStateOptions = ["ENABLED", "DISABLED"] as const;
export const menuIconOptions = [
  "layout-dashboard",
  "panel-left",
  "settings",
  "database",
  "users",
  "shield",
  "folder",
  "book-open",
  "file-text",
  "workflow",
  "network",
  "mouse-pointer",
] as const;

export const menuFilterSchema = z.object({
  keyword: z.string().default(""),
  state: z.enum(["ALL", ...menuStateOptions]).default("ALL"),
  menuType: z.enum(["ALL", ...menuTypeOptions]).default("ALL"),
  parentId: z.string().nullable().default(null),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const menuFormSchema = z
  .object({
    menuName: z
      .string()
      .trim()
      .min(1, "请输入菜单编码")
      .max(128, "菜单编码不能超过 128 个字符")
      .regex(/^[a-zA-Z0-9:_-]+$/, "菜单编码仅支持字母、数字、冒号、下划线和中划线"),
    menuLabel: z.string().trim().min(1, "请输入菜单名称").max(128, "菜单名称不能超过 128 个字符"),
    menuType: z.enum(menuTypeOptions, { message: "请选择菜单类型" }),
    parentId: z.string().nullable().default(null),
    url: z.string().trim().max(256, "路径或权限标识不能超过 256 个字符").default(""),
    permissionKey: z.string().trim().max(256, "权限标识不能超过 256 个字符").default(""),
    menuIcon: z.enum(menuIconOptions, { message: "请选择图标" }),
    seq: z.coerce.number().int().min(0, "排序号不能小于 0").max(9999, "排序号不能超过 9999"),
    state: z.enum(menuStateOptions, { message: "请选择状态" }),
    menuDescr: z.string().trim().max(500, "描述不能超过 500 个字符").default(""),
  })
  .superRefine((value, ctx) => {
    if (value.menuType === "MENU" && !value.url.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "MENU 节点必须提供页面路径",
      });
    }

    if (value.menuType === "BUTTON" && !value.permissionKey.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["permissionKey"],
        message: "BUTTON 节点必须提供权限标识",
      });
    }
  });

export type MenuFilterValues = z.infer<typeof menuFilterSchema>;
export type MenuFormValues = z.infer<typeof menuFormSchema>;
