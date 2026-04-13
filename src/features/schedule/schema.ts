import { z } from "zod";

const scheduleViewModes = ["MONTH", "WEEK", "YEAR"] as const;
const scheduleEditableStatuses = ["SCHEDULED", "IN_PROGRESS", "CANCELLED"] as const;
const schedulePriorities = ["LOW", "MEDIUM", "HIGH"] as const;

function isValidDateString(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export const scheduleListFilterSchema = z
  .object({
    viewMode: z.enum(scheduleViewModes),
    rangeStart: z.string().refine((value) => isValidDateString(value), "rangeStart 不是合法时间"),
    rangeEnd: z.string().refine((value) => isValidDateString(value), "rangeEnd 不是合法时间"),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.rangeStart).getTime() > new Date(value.rangeEnd).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rangeStart"],
        message: "查询开始时间不能晚于结束时间",
      });
    }
  });

export const scheduleEventMutationSchema = z
  .object({
    title: z.string().trim().min(1, "标题不能为空").max(120, "标题最多 120 个字符"),
    descr: z.string().trim().max(2000, "描述最多 2000 个字符").default(""),
    status: z.enum(scheduleEditableStatuses),
    priority: z.enum(schedulePriorities),
    startTime: z.string().refine((value) => isValidDateString(value), "开始时间不合法"),
    endTime: z.string().refine((value) => isValidDateString(value), "结束时间不合法"),
    expireTime: z
      .string()
      .optional()
      .transform((value) => value?.trim())
      .refine((value) => !value || isValidDateString(value), "过期时间不合法"),
    allDay: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const startMs = new Date(value.startTime).getTime();
    const endMs = new Date(value.endTime).getTime();

    if (endMs < startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "结束时间不能早于开始时间",
      });
    }

    if (value.expireTime && new Date(value.expireTime).getTime() < startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expireTime"],
        message: "过期时间不能早于开始时间",
      });
    }
  });

const formDateTimeSchema = z
  .string()
  .trim()
  .min(1, "请选择时间")
  .refine((value) => isValidDateString(value), "请选择合法时间");

export const scheduleEventFormSchema = z
  .object({
    title: z.string().trim().min(1, "标题不能为空").max(120, "标题最多 120 个字符"),
    descr: z.string().trim().max(2000, "描述最多 2000 个字符").default(""),
    status: z.enum(scheduleEditableStatuses),
    priority: z.enum(schedulePriorities),
    startTime: formDateTimeSchema,
    endTime: formDateTimeSchema,
    expireTime: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || isValidDateString(value), "过期时间不合法"),
    allDay: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const startMs = new Date(value.startTime).getTime();
    const endMs = new Date(value.endTime).getTime();

    if (endMs < startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "结束时间不能早于开始时间",
      });
    }

    if (value.expireTime && new Date(value.expireTime).getTime() < startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expireTime"],
        message: "过期时间不能早于开始时间",
      });
    }
  });

export type ScheduleListFilterInput = z.input<typeof scheduleListFilterSchema>;
export type ScheduleListFilterValues = z.output<typeof scheduleListFilterSchema>;

export type ScheduleEventMutationInput = z.input<typeof scheduleEventMutationSchema>;
export type ScheduleEventMutationValues = z.output<typeof scheduleEventMutationSchema>;

export type ScheduleEventFormInput = z.input<typeof scheduleEventFormSchema>;
export type ScheduleEventFormValues = z.output<typeof scheduleEventFormSchema>;
