import { z } from "zod";

export const loginSchema = z.object({
  account: z.string().min(1, "请输入账号"),
  password: z.string().min(6, "密码至少 6 位"),
});

export type LoginSchema = z.infer<typeof loginSchema>;
