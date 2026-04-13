export interface LifeCountdownProfile {
  deathDate?: string;
  todayWarningDate?: string;
  todayWarningText?: string;
  todayWarningGeneratedAt?: string;
  todayWarningModel?: string;
  updateDate?: string;
}

export interface LifeCountdownSaveInput {
  deathDate: string;
}

export interface LifeCountdownGenerateInput {
  forceRefresh?: boolean;
  modelName?: string;
}

export interface LifeCountdownWarningResult {
  warningText?: string;
  warningDate?: string;
  generatedAt?: string;
  modelName?: string;
  cached?: boolean;
}

export interface CountdownSnapshot {
  expired: boolean;
  totalDays: number;
  years: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
