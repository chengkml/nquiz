"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { DatabaseZap, LoaderCircle, Save, ShieldCheck, X } from "lucide-react";
import {
  datasourceFormSchema,
  type DatasourceFormSchemaOutput,
  type DatasourceFormSchemaValues,
} from "@/features/datasource/schemas/datasource-form-schema";
import { datasourceTypes, type ConnectionCheckResult, type DatasourceDetail } from "@/lib/datasource/types";

const defaultValues: DatasourceFormSchemaValues = {
  name: "",
  type: "MYSQL",
  driver: datasourceTypes[0].driver,
  jdbcUrl: datasourceTypes[0].urlTemplate,
  username: "",
  password: "",
  description: "",
  active: true,
};

export function DatasourceFormSheet({
  open,
  mode,
  initialValue,
  saving,
  onClose,
  onSubmit,
  onValidate,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: DatasourceDetail | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: DatasourceFormSchemaOutput) => Promise<void>;
  onValidate: (values: DatasourceFormSchemaOutput) => Promise<ConnectionCheckResult>;
}) {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ConnectionCheckResult | null>(null);

  const form = useForm<DatasourceFormSchemaValues, undefined, DatasourceFormSchemaOutput>({
    resolver: zodResolver(datasourceFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!initialValue) {
      form.reset(defaultValues);
      setValidationResult(null);
      return;
    }

    form.reset({
      id: initialValue.id,
      name: initialValue.name,
      type: initialValue.type,
      driver: initialValue.driver,
      jdbcUrl: initialValue.jdbcUrl,
      username: initialValue.username,
      password: "",
      description: initialValue.description,
      active: initialValue.active,
    });
    setValidationResult(null);
  }, [form, initialValue, open]);

  const selectedType = form.watch("type");
  const typeMeta = useMemo(
    () => datasourceTypes.find((item) => item.value === selectedType) ?? datasourceTypes[0],
    [selectedType],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[1px]">
      <button className="flex-1" aria-label="关闭数据源表单" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col border-l bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-600">DatasourceManagement / Phase 1</p>
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                {mode === "create" ? "新增数据源" : "编辑数据源"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                首版先闭环 CRUD、连接校验、schema 预览与采集。密码字段保持“留空不修改”语义。
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2">
              <Field label="名称" error={form.formState.errors.name?.message}>
                <input className={inputClassName} placeholder="如：nquiz-main-mysql" {...form.register("name")} />
              </Field>

              <Field label="类型" error={form.formState.errors.type?.message}>
                <select
                  className={inputClassName}
                  {...form.register("type", {
                    onChange: (event) => {
                      const next = datasourceTypes.find((item) => item.value === event.target.value);
                      if (next) {
                        form.setValue("driver", next.driver, { shouldDirty: true });
                        form.setValue("jdbcUrl", next.urlTemplate, { shouldDirty: true });
                      }
                    },
                  })}
                >
                  {datasourceTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="驱动" error={form.formState.errors.driver?.message}>
                <input className={inputClassName} placeholder="JDBC Driver" {...form.register("driver")} />
              </Field>

              <Field label="用户名" error={form.formState.errors.username?.message}>
                <input className={inputClassName} placeholder="数据库用户名" {...form.register("username")} />
              </Field>

              <div className="md:col-span-2">
                <Field label="JDBC URL" error={form.formState.errors.jdbcUrl?.message}>
                  <input className={inputClassName} placeholder={typeMeta.urlTemplate} {...form.register("jdbcUrl")} />
                </Field>
              </div>

              <Field
                label={mode === "edit" ? "密码（留空不修改）" : "密码"}
                error={form.formState.errors.password?.message}
              >
                <input className={inputClassName} type="password" placeholder="******" {...form.register("password")} />
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <input type="checkbox" className="size-4 rounded border-slate-300" {...form.register("active")} />
                启用该数据源
              </label>

              <div className="md:col-span-2">
                <Field label="描述" error={form.formState.errors.description?.message}>
                  <textarea
                    className={`${inputClassName} min-h-28 resize-y`}
                    placeholder="补充用途、风险、下游依赖模块等"
                    {...form.register("description")}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-2 leading-6">
                  <p className="font-medium">迁移期风险提示</p>
                  <ul className="list-disc space-y-1 pl-5 text-amber-900/90">
                    <li>本版先把“预览 schema”与“确认采集”区分开，避免旧版查看即写库的副作用。</li>
                    <li>当前仍是前端 mock Route Handler，尚未接入真实后端与密文存储。</li>
                    <li>后续 DataQuery / 数据字典模块应复用同一套数据源域模型，而不是重复造 API。</li>
                  </ul>
                </div>
              </div>
            </section>

            {validationResult ? (
              <section
                className={`rounded-2xl border px-4 py-4 text-sm ${
                  validationResult.success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <DatabaseZap className="size-4" />
                  <span>{validationResult.success ? "连接校验通过" : "连接校验失败"}</span>
                </div>
                <p className="mt-2 leading-6">{validationResult.message}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white/70 px-3 py-1">数据库类型：{validationResult.databaseType}</span>
                  {validationResult.normalizedSchemaHint ? (
                    <span className="rounded-full bg-white/70 px-3 py-1">
                      schema 提示：{validationResult.normalizedSchemaHint}
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <div className="border-t bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={validating}
                onClick={async () => {
                  const values = await form.trigger();
                  if (!values) {
                    return;
                  }
                  setValidating(true);
                  try {
                    const result = await onValidate(datasourceFormSchema.parse(form.getValues()));
                    setValidationResult(result);
                  } finally {
                    setValidating(false);
                  }
                }}
              >
                {validating ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                校验当前输入配置
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={onClose}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={saving}
                >
                  {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {mode === "create" ? "保存数据源" : "保存变更"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200";
