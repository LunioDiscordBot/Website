export const THEME_STORAGE_KEY = "lunio.theme.preference";

export type ThemePreference = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

export const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance automatically.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use Lunio's darker control-room look.",
  },
  {
    value: "light",
    label: "Light",
    description: "Use a brighter, cleaner dashboard surface.",
  },
];

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "dark" || value === "light";
}
