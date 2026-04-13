import type {
  LifeCountdownGenerateInput,
  LifeCountdownProfile,
  LifeCountdownSaveInput,
  LifeCountdownWarningResult,
} from "@/features/life-countdown/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败");
  }

  return payload as T;
}

export async function fetchLifeCountdownProfile(): Promise<LifeCountdownProfile> {
  return parseResponse<LifeCountdownProfile>(await fetch("/api/life-countdown/current"));
}

export async function saveLifeCountdownProfile(values: LifeCountdownSaveInput): Promise<LifeCountdownProfile> {
  return parseResponse<LifeCountdownProfile>(
    await fetch("/api/life-countdown/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}

export async function generateLifeCountdownWarning(
  values: LifeCountdownGenerateInput,
): Promise<LifeCountdownWarningResult> {
  return parseResponse<LifeCountdownWarningResult>(
    await fetch("/api/life-countdown/generate-warning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  );
}
