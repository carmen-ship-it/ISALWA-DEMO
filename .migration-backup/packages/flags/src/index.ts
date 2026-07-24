export type FlagMap = Record<string, boolean>;

const defaults: FlagMap = {
  'ui.darkMode': false,
  'ai.summaries': false,
  'maps.liveProvider': false,
  'messaging.liveProvider': false,
};

export function evaluateFlag(key: string, overrides: FlagMap = {}): boolean {
  if (key in overrides) return Boolean(overrides[key]);
  return Boolean(defaults[key]);
}

export function listDefaultFlags(): FlagMap {
  return { ...defaults };
}
