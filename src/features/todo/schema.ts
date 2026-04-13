import { z } from "zod";

const statusEnum = z.enum(["", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"]);
const editableStatusEnum = z.enum(["SCHEDULED", "IN_PROGRESS", "CANCELLED"]);
const priorityEnum = z.enum(["", "LOW", "MEDIUM", "HIGH"]);
const priorityRequiredEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

const dateTimeString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) return true;
    return !Number.isNaN(new Date(value).getTime());
  }, "请输入合法时间");

export const todoFilterSchema = z.object({
  keyword: z.string().trim().max(120, "关键词最多 120 个字符").catch(""),
  status: statusEnum.catch("SCHEDULED"),
  priority: priorityEnum.catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(30).catch(8),
});

export const todoFormSchema = z
  .object({
    title: z.string().trim().min(1, "请输入待办标题").max(200, "标题最多 200 个字符"),
    descr: z.string().trim().max(2000, "描述最多 2000 个字符").optional().or(z.literal("")),
    status: editableStatusEnum.default("SCHEDULED"),
    priority: priorityRequiredEnum.default("MEDIUM"),
    startTime: dateTimeString,
    dueDate: dateTimeString,
    expireTime: dateTimeString,
  })
  .refine(
    (value) => {
      if (!value.startTime || !value.dueDate) return true;
      return new Date(value.startTime).getTime() <= new Date(value.dueDate).getTime();
    },
    {
      path: ["dueDate"],
      message: "截止时间不能早于开始时间",
    },
  )
  .refine(
    (value) => {
      if (!value.dueDate || !value.expireTime) return true;
      return new Date(value.expireTime).getTime() >= new Date(value.dueDate).getTime();
    },
    {
      path: ["expireTime"],
      message: "过期时间不能早于截止时间",
    },
  );

export type TodoFilterInput = z.input<typeof todoFilterSchema>;
export type TodoFilterValues = z.output<typeof todoFilterSchema>;
export type TodoFormInput = z.input<typeof todoFormSchema>;
export type TodoFormValues = z.output<typeof todoFormSchema>;
