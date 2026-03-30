const normalizeBotId = (botId: string) =>
  botId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

const getBotClientId = (botId: string) => {
  const normalized = normalizeBotId(botId);
  return (
    process.env[`DISCORD_CLIENT_ID_${normalized}`] ||
    (botId === "lunio" ? process.env.DISCORD_CLIENT_ID : undefined) ||
    null
  );
};

type InviteOptions = {
  guildId?: string | null;
  redirectUri?: string | null;
  state?: string | null;
};

export function getBotInviteUrl(botId: string, options?: InviteOptions) {
  const clientId = getBotClientId(botId);
  if (!clientId) return null;

  const normalized = normalizeBotId(botId);
  const permissions =
    process.env[`DISCORD_BOT_PERMISSIONS_${normalized}`] ||
    process.env.DISCORD_BOT_PERMISSIONS ||
    "277025508416";
  const scopes =
    process.env[`DISCORD_BOT_SCOPES_${normalized}`] ||
    process.env.DISCORD_BOT_SCOPES ||
    "bot applications.commands";

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("permissions", permissions);

  if (options?.guildId) {
    url.searchParams.set("guild_id", options.guildId);
    url.searchParams.set("disable_guild_select", "true");
  }

  if (options?.redirectUri) {
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", options.redirectUri);

    if (options.state) {
      url.searchParams.set("state", options.state);
    }
  }

  return url.toString();
}
