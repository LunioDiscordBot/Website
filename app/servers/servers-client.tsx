"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/site-language-provider";
import { buildDashboardPath, buildInvitePath } from "@/lib/dashboard-routes";
import { getPreferredBotId as getPreferredBotFromList } from "@/lib/bot-preference";
import { useEffect, useState } from "react";
import {
  apiJson,
  type AuthGuildsResponse,
  type BotsResponse,
} from "@/lib/api";

const BOT_STORAGE_KEY = "lunio:web:botId";
const SERVER_CACHE_KEY = "lunio:web:servers-cache";
const SERVER_CACHE_MAX_AGE_MS = 1000 * 60 * 5;

type ServerPickerCache = {
  botOptions: Array<{ botId: string; label: string }>;
  guilds: AuthGuildsResponse["guilds"];
  refreshedAt: number;
};

export function ServersClient() {
  const { messages } = useSiteLanguage();
  const [selectedBotId, setSelectedBotId] = useState("");
  const [botOptions, setBotOptions] = useState<Array<{ botId: string; label: string }>>([]);
  const [guilds, setGuilds] = useState<AuthGuildsResponse["guilds"]>([]);
  const [guildsError, setGuildsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  const persistCache = (nextCache: ServerPickerCache) => {
    window.sessionStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(nextCache));
  };

  const readCache = (): ServerPickerCache | null => {
    const raw = window.sessionStorage.getItem(SERVER_CACHE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<ServerPickerCache>;
      if (!Array.isArray(parsed.botOptions) || !Array.isArray(parsed.guilds)) {
        return null;
      }
      if (typeof parsed.refreshedAt !== "number") return null;
      return {
        botOptions: parsed.botOptions,
        guilds: parsed.guilds,
        refreshedAt: parsed.refreshedAt,
      };
    } catch {
      return null;
    }
  };

  const loadServerPickerData = async (
    activeRef: { current: boolean },
    options?: { silent?: boolean },
  ) => {
    if (!options?.silent) setIsRefreshing(true);
    try {
      const [botsResponse, guildsResponse] = await Promise.all([
        apiJson<BotsResponse>("/api/bots"),
        apiJson<AuthGuildsResponse>("/api/auth/guilds"),
      ]);

      if (!activeRef.current) return;
      const nextBotOptions = botsResponse.bots ?? [];
      const nextGuilds = guildsResponse.guilds ?? [];
      const refreshedAt = Date.now();
      setBotOptions(nextBotOptions);
      setGuilds(nextGuilds);
      setLastRefreshedAt(refreshedAt);
      setGuildsError(null);
      persistCache({
        botOptions: nextBotOptions,
        guilds: nextGuilds,
        refreshedAt,
      });
    } catch (error) {
      if (!activeRef.current) return;
      setGuildsError(
        error instanceof Error ? error.message : "Unable to load guilds",
      );
    } finally {
      if (activeRef.current && !options?.silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const savedBotId = window.localStorage.getItem(BOT_STORAGE_KEY) || "";
    setSelectedBotId(savedBotId);
    const activeRef = { current: true };
    const cached = readCache();

    if (cached) {
      setBotOptions(cached.botOptions);
      setGuilds(cached.guilds);
      setLastRefreshedAt(cached.refreshedAt);
      setGuildsError(null);
    }

    const isCacheFresh =
      cached && Date.now() - cached.refreshedAt < SERVER_CACHE_MAX_AGE_MS;

    if (!isCacheFresh) {
      void loadServerPickerData(activeRef);
    }

    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    const onFocus = () => {
      const cached = readCache();
      if (cached && Date.now() - cached.refreshedAt < SERVER_CACHE_MAX_AGE_MS) {
        return;
      }
      const activeRef = { current: true };
      void loadServerPickerData(activeRef, { silent: true });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const connectedGuildCount = guilds.filter(
    (guild) => guild.connectedBots.length > 0,
  ).length;
  const manageableGuildCount = guilds.filter((guild) => guild.canManage).length;
  const copy =
    connectedGuildCount > 0
      ? messages.servers.connectedCopy
          .replace("{count}", String(connectedGuildCount))
          .replace("{suffix}", connectedGuildCount === 1 ? "" : "s")
      : manageableGuildCount > 0
        ? messages.servers.manageableCopy
        : messages.servers.emptyCopy;

  const refreshServerPicker = async () => {
    const activeRef = { current: true };
    await loadServerPickerData(activeRef);
  };

  const visibleGuilds = guilds.filter((guild) => {
    const actionableBotStates = guild.botStates.filter(
      (bot) => bot.status === "connected" || (bot.status === "invite" && guild.canManage),
    );

    if (selectedBotId) {
      return actionableBotStates.some((bot) => bot.botId === selectedBotId);
    }

    return actionableBotStates.length > 0;
  });
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredGuilds = normalizedSearchQuery
    ? visibleGuilds.filter(
        (guild) =>
          guild.name.toLowerCase().includes(normalizedSearchQuery) ||
          guild.guildId.includes(normalizedSearchQuery),
      )
    : visibleGuilds;
  const getGuildPriority = (guild: (typeof filteredGuilds)[number]) => {
    const selectedBotState = selectedBotId
      ? guild.botStates.find((bot) => bot.botId === selectedBotId) ?? null
      : null;
    const sharesSelectedBot = selectedBotState?.status === "connected";
    const canInviteSelectedBot =
      guild.canManage && selectedBotState?.status === "invite";
    const sharesAnyBot = guild.connectedBots.length > 0;

    if (selectedBotId) {
      if (sharesSelectedBot && guild.canManage) return 0;
      if (sharesSelectedBot) return 1;
      if (canInviteSelectedBot) return 2;
      return 3;
    }

    if (sharesAnyBot && guild.canManage) return 0;
    if (sharesAnyBot) return 1;
    if (
      guild.canManage &&
      guild.botStates.some((bot) => bot.status === "invite")
    ) {
      return 2;
    }
    return 3;
  };

  const sortedGuilds = [...filteredGuilds].sort((left, right) => {
    const leftPriority = getGuildPriority(left);
    const rightPriority = getGuildPriority(right);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (left.connectedBots.length !== right.connectedBots.length) {
      return right.connectedBots.length - left.connectedBots.length;
    }

    return left.name.localeCompare(right.name);
  });
  const formatLastRefreshed = (timestamp: number | null) => {
    if (!timestamp) return messages.servers.notRefreshed;
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreferredBotId = (guild: AuthGuildsResponse["guilds"][number]) =>
    selectedBotId && guild.connectedBots.includes(selectedBotId)
      ? selectedBotId
      : getPreferredBotFromList([
          ...guild.connectedBots,
          ...botOptions.map((bot) => bot.botId),
        ]);

  return (
    <div className="space-y-8">
      <p className="section-copy">{copy}</p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={`rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] transition ${
              !selectedBotId
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/10 bg-white/[0.03] text-muted hover:text-white"
            }`}
            onClick={() => {
              window.localStorage.removeItem(BOT_STORAGE_KEY);
              setSelectedBotId("");
            }}
            type="button"
          >
            {messages.servers.allBots}
          </button>
        {botOptions.map((bot) => (
          <button
            className={`rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] transition ${
              selectedBotId === bot.botId
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/10 bg-white/[0.03] text-muted hover:text-white"
            }`}
            key={bot.botId}
            onClick={() => {
              window.localStorage.setItem(BOT_STORAGE_KEY, bot.botId);
              setSelectedBotId(bot.botId);
            }}
            type="button"
          >
            {bot.label}
          </button>
        ))}
        <button
          className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-muted transition hover:text-white disabled:opacity-50"
          disabled={isRefreshing}
          onClick={() => void refreshServerPicker()}
          type="button"
        >
          {isRefreshing ? messages.servers.refreshing : messages.servers.refresh}
        </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            {messages.servers.lastRefresh} {formatLastRefreshed(lastRefreshedAt)}
          </div>
          <input
            className="min-w-[16rem] rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/30"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={messages.servers.searchPlaceholder}
            type="search"
            value={searchQuery}
          />
        </div>
      </div>

      {guildsError ? (
        <div className="rounded-[1.5rem] border border-danger/30 bg-danger/10 p-5 text-sm text-red-100">
          {guildsError === "Unauthorized"
            ? messages.servers.unauthorized
            : guildsError}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sortedGuilds.map((guild) => (
          <article
            className={`panel p-6 ${guild.connectedBots.length === 0 ? "opacity-60" : ""}`}
            key={guild.guildId}
          >
            <div className="flex items-start justify-between gap-4">
              {guild.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={guild.name}
                  className="h-14 w-14 rounded-[1.2rem] border border-white/10 object-cover"
                  src={guild.iconUrl}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary/10 font-headline text-xl font-bold text-primary">
                  {guild.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                {guild.connectedBots.length > 0
                  ? messages.servers.botCount
                      .replace("{count}", String(guild.connectedBots.length))
                      .replace("{suffix}", guild.connectedBots.length === 1 ? "" : "s")
                  : messages.servers.inviteAvailable}
              </div>
            </div>

            <h2 className="mt-5 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              {guild.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{messages.servers.guildId}: {guild.guildId}</p>

            <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-secondary">
              {guild.owner
                ? messages.servers.owner
                : guild.canManage
                  ? messages.servers.manageable
                  : messages.servers.member}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {guild.botStates.map((bot) => (
                <div
                  className={`flex items-center gap-3 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
                    bot.status === "connected"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/[0.03] text-muted"
                  }`}
                  key={`${guild.guildId}:${bot.botId}`}
                >
                  {bot.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={bot.label}
                      className="h-6 w-6 rounded-full border border-white/10 object-cover"
                      src={bot.avatarUrl}
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[10px] text-white">
                      {bot.label.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span>{bot.label}</span>
                  <span>{bot.status === "connected" ? messages.servers.live : messages.servers.invite}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {guild.connectedBots.length > 0 ? (
                <Link
                  className="secondary-button w-full"
                  href={buildDashboardPath(
                    getPreferredBotId(guild),
                    guild.guildId,
                  )}
                >
                  {messages.servers.openDashboard}
                </Link>
              ) : null}

              {guild.canManage
                ? guild.botStates
                    .filter((bot) => bot.status === "invite" && bot.inviteUrl)
                    .map((bot) => (
                      <Link
                        className="ghost-button w-full text-center"
                        href={buildInvitePath(bot.botId, guild.guildId)}
                        key={`${guild.guildId}:${bot.botId}:invite`}
                      >
                        {messages.servers.inviteBot.replace("{label}", bot.label)}
                      </Link>
                    ))
                : null}
            </div>
          </article>
        ))}
      </div>

      {!guildsError && sortedGuilds.length === 0 ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-sm text-muted">
          {searchQuery.trim()
            ? messages.servers.noGuildsSearch
            : messages.servers.noGuildsBot}
        </div>
      ) : null}
    </div>
  );
}
