const BOT_ID_PREFERENCE = ["lunio", "lunio2"];

export function getPreferredBotId(
  botIds: Array<string | null | undefined>,
  fallback = "lunio",
) {
  const normalized = botIds.filter(
    (botId): botId is string => typeof botId === "string" && botId.trim().length > 0,
  );

  for (const preferredBotId of BOT_ID_PREFERENCE) {
    if (normalized.includes(preferredBotId)) {
      return preferredBotId;
    }
  }

  return normalized[0] ?? fallback;
}
