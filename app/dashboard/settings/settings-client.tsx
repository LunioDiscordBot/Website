"use client";

import Link from "next/link";
import { buildDashboardPath } from "@/lib/dashboard-routes";
import { getPreferredBotId as getPreferredBotFromList } from "@/lib/bot-preference";
import { DashboardRouteState } from "@/components/dashboard-route-state";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  apiJson,
  buildBotScopedPath,
  formatDuration,
  type AuthGuild,
  type AuthGuildsResponse,
  type BotsResponse,
  type CommandFeedback,
  type GuildMetadata,
  type GuildSettings,
  type GuildSettingsSaveResponse,
} from "@/lib/api";
import {
  buildFailedCommandFeedback,
  buildSendingCommandFeedback,
  buildSettingsSaveFeedback,
  formatCommandFeedbackPhase,
  formatShortCommandId,
  getCommandFeedbackToneClasses,
} from "@/lib/command-feedback";

type SettingsForm = {
  Language: string;
  Announce: boolean;
  DelAnnounce: boolean;
  Playlists: boolean;
  Ephemeral: boolean;
  Requester: boolean;
  PlayerControls: boolean;
  VoiceStatus: boolean;
  DefaultVol: number;
  MusicDJRole: string[];
  VCs: string[];
  CustomChannel: boolean;
  mChannelID: string;
  mEmbedMode: "v1" | "v2";
  SongUserLimit: number;
  SongTimeLimitMS: number;
  twentyFourSeven: boolean;
};

type MetadataState = {
  metadata: GuildMetadata | null;
  settings: GuildSettings | null;
};

const CREATE_CUSTOM_CHANNEL_VALUE = "__create__";

const EMPTY_FORM: SettingsForm = {
  Language: "en-US",
  Announce: true,
  DelAnnounce: false,
  Playlists: true,
  Ephemeral: true,
  Requester: true,
  PlayerControls: false,
  VoiceStatus: false,
  DefaultVol: 100,
  MusicDJRole: [],
  VCs: [],
  CustomChannel: false,
  mChannelID: CREATE_CUSTOM_CHANNEL_VALUE,
  mEmbedMode: "v1",
  SongUserLimit: 0,
  SongTimeLimitMS: 0,
  twentyFourSeven: false,
};

const LANGUAGE_OPTIONS = [
  "de",
  "en-GB",
  "en-US",
  "es-ES",
  "es-419",
  "fr",
  "hr",
  "it",
  "lt",
  "hu",
  "nl",
  "no",
  "pl",
  "pt-BR",
  "ro",
  "fi",
  "sv-SE",
  "tr",
  "cs",
  "el",
];

function mergeSettings(
  settings: GuildSettings | null,
  metadata: GuildMetadata | null,
): SettingsForm {
  const source = settings ?? metadata?.settings;
  if (!source) return EMPTY_FORM;
  const customChannelEnabled = Boolean(source.CustomChannel);

  return {
    Language: source.Language ?? "en-US",
    Announce: customChannelEnabled ? false : source.Announce !== false,
    DelAnnounce: customChannelEnabled ? false : Boolean(source.DelAnnounce),
    Playlists: source.Playlists !== false,
    Ephemeral: source.Ephemeral !== false,
    Requester: source.Requester !== false,
    PlayerControls: customChannelEnabled ? false : Boolean(source.PlayerControls),
    VoiceStatus: Boolean(source.VoiceStatus),
    DefaultVol: Number(source.DefaultVol ?? 100),
    MusicDJRole: Array.isArray(source.MusicDJRole) ? source.MusicDJRole : [],
    VCs: Array.isArray(source.VCs) ? source.VCs : [],
    CustomChannel: Boolean(source.CustomChannel),
    mChannelID: source.mChannelID ?? CREATE_CUSTOM_CHANNEL_VALUE,
    mEmbedMode: source.mEmbedMode === "v2" ? "v2" : "v1",
    SongUserLimit: Number(source.SongUserLimit ?? 0),
    SongTimeLimitMS: Number(source.SongTimeLimitMS ?? 0),
    twentyFourSeven: Boolean(source.twentyFourSeven),
  };
}

function mergeSavedSettingsIntoMetadata(
  metadata: GuildMetadata | null,
  settings: GuildSettings,
): GuildMetadata | null {
  if (!metadata) return metadata;

  return {
    ...metadata,
    settings: {
      CustomChannel: settings.CustomChannel,
      mChannelID: settings.mChannelID,
      mEmbedMode: settings.mEmbedMode,
      Announce: settings.Announce,
      DelAnnounce: settings.DelAnnounce,
      MusicDJ: settings.MusicDJ,
      MusicDJRole: settings.MusicDJRole,
      VCToggle: settings.VCToggle,
      VCs: settings.VCs,
      DefaultVol: settings.DefaultVol,
      Playlists: settings.Playlists,
      twentyFourSeven: settings.twentyFourSeven,
      permpremium: metadata.settings?.permpremium ?? false,
      Language: settings.Language,
      Requester: settings.Requester,
      PlayerControls: settings.PlayerControls,
      VoiceStatus: settings.VoiceStatus,
      Ephemeral: settings.Ephemeral,
      SongUserLimit: settings.SongUserLimit,
      SongTimeLimitMS: settings.SongTimeLimitMS,
    },
  };
}

function formatChannelLabel(
  channelId: string | null | undefined,
  channels: Array<{ id: string; name: string }>,
) {
  if (!channelId) return "--";
  const channel = channels.find((entry) => entry.id === channelId);
  if (channel) return `#${channel.name}`;
  return `${channelId.slice(0, 6)}...${channelId.slice(-4)}`;
}

type SelectMenuPosition = {
  left: number;
  top: number;
  width: number;
};

function useSelectMenuPosition(isOpen: boolean) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<SelectMenuPosition | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        left: rect.left,
        top: rect.bottom + 10,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return { triggerRef, position };
}

function DashboardSingleSelect({
  disabled,
  emptyLabel,
  isOpen,
  onSelect,
  onToggle,
  options,
  value,
}: {
  disabled?: boolean;
  emptyLabel: string;
  isOpen: boolean;
  onSelect: (value: string) => void;
  onToggle: () => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  const selected = options.find((option) => option.value === value);
  const { triggerRef, position } = useSelectMenuPosition(isOpen);

  return (
    <div className="relative mt-2">
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="dashboard-select"
        disabled={disabled}
        onClick={onToggle}
        ref={triggerRef}
        type="button"
      >
        <span className="truncate pr-8">
          {selected?.label ?? emptyLabel}
        </span>
      </button>
      {isOpen && position
        ? createPortal(
            <div
              className="dashboard-select-menu max-h-72 overflow-y-auto"
              role="listbox"
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
                width: `${position.width}px`,
              }}
            >
              {options.map((option) => (
                <button
                  className={`dashboard-select-option ${value === option.value ? "dashboard-select-option-active" : ""}`}
                  key={option.value}
                  onClick={() => onSelect(option.value)}
                  role="option"
                  type="button"
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function DashboardMultiSelect({
  disabled,
  emptyLabel,
  isOpen,
  onToggle,
  onValueChange,
  options,
  value,
}: {
  disabled?: boolean;
  emptyLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onValueChange: (value: string[]) => void;
  options: Array<{ value: string; label: string }>;
  value: string[];
}) {
  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);
  const { triggerRef, position } = useSelectMenuPosition(isOpen);

  const toggleOption = (optionValue: string) => {
    onValueChange(
      value.includes(optionValue)
        ? value.filter((entry) => entry !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <div className="relative mt-2">
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="dashboard-select min-h-[3.5rem]"
        disabled={disabled}
        onClick={onToggle}
        ref={triggerRef}
        type="button"
      >
        <span className="line-clamp-2 pr-8 text-left">
          {selectedLabels.length ? selectedLabels.join(", ") : emptyLabel}
        </span>
      </button>
      {isOpen && position
        ? createPortal(
            <div
              className="dashboard-select-menu max-h-80 overflow-y-auto p-2"
              role="listbox"
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
                width: `${position.width}px`,
              }}
            >
              {options.map((option) => {
                const checked = value.includes(option.value);
                return (
                  <button
                    className={`dashboard-select-option flex items-center justify-between gap-3 ${checked ? "dashboard-select-option-active" : ""}`}
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    role="option"
                    type="button"
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
                      {checked ? "Selected" : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function DashboardSettingsClient({
  botIdFromQuery,
  guildIdFromQuery,
}: {
  botIdFromQuery?: string;
  guildIdFromQuery?: string;
}) {
  const router = useRouter();
  const [botId, setBotId] = useState(botIdFromQuery ?? "");
  const [guildId, setGuildId] = useState(guildIdFromQuery ?? "");
  const [botOptions, setBotOptions] = useState<BotsResponse["bots"]>([]);
  const [guildOptions, setGuildOptions] = useState<AuthGuildsResponse["guilds"]>([]);
  const [hasLoadedBotOptions, setHasLoadedBotOptions] = useState(false);
  const [hasLoadedGuildOptions, setHasLoadedGuildOptions] = useState(false);
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [metadata, setMetadata] = useState<GuildMetadata | null>(null);
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<CommandFeedback | null>(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [flashUnsaved, setFlashUnsaved] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const allowImmediateNavigationRef = useRef(false);

  const selectedGuild = useMemo(
    () => guildOptions.find((guild) => guild.guildId === guildId) ?? null,
    [guildOptions, guildId],
  );
  const selectedBot = useMemo(
    () => botOptions.find((bot) => bot.botId === botId) ?? null,
    [botOptions, botId],
  );
  const guildConnectedBots = useMemo(
    () =>
      selectedGuild?.botStates
        .filter((bot) => bot.status === "connected")
        .map((bot) => bot.botId) ?? [],
    [selectedGuild],
  );
  const invalidGuildRoute =
    Boolean(guildId) && hasLoadedGuildOptions && !selectedGuild;
  const invalidBotRoute =
    Boolean(botId) && hasLoadedBotOptions && !selectedBot;
  const botNotConnectedToGuild =
    Boolean(botId) &&
    Boolean(guildId) &&
    Boolean(selectedGuild) &&
    !guildConnectedBots.includes(botId);
  const settingsAccessDenied =
    Boolean(botId) &&
    Boolean(guildId) &&
    Boolean(selectedGuild) &&
    selectedGuild?.canManage !== true;

  useEffect(() => {
    setBotId(botIdFromQuery ?? "");
    setGuildId(guildIdFromQuery ?? "");
  }, [botIdFromQuery, guildIdFromQuery]);

  useEffect(() => {
    let active = true;

    void apiJson<BotsResponse>("/api/bots")
      .then((response) => {
        if (!active) return;
        const nextBots = response.bots ?? [];
        setBotOptions(nextBots);
        setHasLoadedBotOptions(true);
        if (!botIdFromQuery && !guildIdFromQuery && !botId && nextBots.length > 0) {
          setBotId(getPreferredBotFromList(nextBots.map((bot) => bot.botId)));
        }
      })
      .catch(() => {
        if (!active) return;
        setBotOptions([]);
        setHasLoadedBotOptions(true);
      });

    void apiJson<AuthGuildsResponse>("/api/auth/guilds")
      .then((response) => {
        if (!active) return;
        setGuildOptions(response.guilds ?? []);
        setHasLoadedGuildOptions(true);
      })
      .catch((nextError) => {
        if (!active) return;
        setGuildOptions([]);
        setHasLoadedGuildOptions(true);
        setError(nextError instanceof Error ? nextError.message : "Unable to load guilds");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!botId || !guildId) {
      setSettings(null);
      setMetadata(null);
      setForm(EMPTY_FORM);
      setOpenMenu(null);
      setSaveFeedback(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);
    setNotice(null);
    setOpenMenu(null);
    setSaveFeedback(null);

    const load = async () => {
      const [nextSettings, nextMetadata] = await Promise.all([
        apiJson<GuildSettings>(buildBotScopedPath(botId, guildId, "/settings")).catch(() => null),
        apiJson<GuildMetadata>(buildBotScopedPath(botId, guildId, "/metadata")).catch(() => null),
      ]);

      return { settings: nextSettings, metadata: nextMetadata } satisfies MetadataState;
    };

    void load()
      .then(({ settings: nextSettings, metadata: nextMetadata }) => {
        if (!active) return;
        setSettings(nextSettings);
        setMetadata(nextMetadata);
        setForm(mergeSettings(nextSettings, nextMetadata));
      })
      .catch((nextError) => {
        if (!active) return;
        setSettings(null);
        setMetadata(null);
        setForm(EMPTY_FORM);
        setError(
          nextError instanceof Error ? nextError.message : "Unable to load guild settings",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [botId, guildId]);

  const updateField = <K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleMenu = (menu: string) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const handleSave = async () => {
    if (!botId || !guildId) {
      setError("Pick a bot and server first.");
      return;
    }

    if (form.CustomChannel && !form.mChannelID) {
      setError(
        "Pick a panel text channel before enabling custom channel mode.",
      );
      setSaveFeedback(
        buildFailedCommandFeedback(
          "Custom channel mode needs a panel text channel.",
          "GUILD_SETTINGS_UPDATE",
        ),
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);
    setSaveFeedback(
      buildSendingCommandFeedback(
        "GUILD_SETTINGS_UPDATE",
        "Sending this settings update to Lunio and waiting for it to be applied.",
      ),
    );

    try {
      const persistedSettings = settings ?? metadata?.settings ?? null;
      const persistedCustomChannelEnabled = Boolean(
        persistedSettings?.CustomChannel,
      );
      const persistedCustomChannelId = persistedSettings?.mChannelID ?? null;
      const persistedEmbedMode =
        persistedSettings?.mEmbedMode === "v2" ? "v2" : "v1";
      const selectedExistingPanelChannelId =
        form.mChannelID !== CREATE_CUSTOM_CHANNEL_VALUE ? form.mChannelID : null;
      const shouldProvisionCustomChannel =
        form.CustomChannel &&
        (!persistedCustomChannelEnabled ||
          !persistedCustomChannelId ||
          persistedEmbedMode !== form.mEmbedMode ||
          (form.mChannelID === CREATE_CUSTOM_CHANNEL_VALUE &&
            persistedCustomChannelId !== null) ||
          (selectedExistingPanelChannelId !== null &&
            selectedExistingPanelChannelId !== persistedCustomChannelId));
      const customChannelSetupMode = shouldProvisionCustomChannel
        ? form.mChannelID === CREATE_CUSTOM_CHANNEL_VALUE
          ? "create"
          : "existing"
        : undefined;
      const payload = {
        Language: form.Language,
        Announce: form.CustomChannel ? false : form.Announce,
        DelAnnounce: form.CustomChannel ? false : form.DelAnnounce,
        Playlists: form.Playlists,
        Ephemeral: form.Ephemeral,
        Requester: form.Requester,
        PlayerControls: form.CustomChannel ? false : form.PlayerControls,
        VoiceStatus: form.VoiceStatus,
        DefaultVol: form.DefaultVol,
        MusicDJ: form.MusicDJRole.length > 0,
        MusicDJRole: form.MusicDJRole,
        VCToggle: form.VCs.length > 0,
        VCs: form.VCs,
        CustomChannel: form.CustomChannel,
        mChannelID:
          form.CustomChannel && form.mChannelID !== CREATE_CUSTOM_CHANNEL_VALUE
            ? form.mChannelID
            : null,
        CustomChannelSetupMode: customChannelSetupMode,
        CustomChannelSetupChannelID:
          customChannelSetupMode === "existing" &&
          selectedExistingPanelChannelId
            ? selectedExistingPanelChannelId
            : null,
        mEmbedMode: form.mEmbedMode,
        SongUserLimit: form.SongUserLimit,
        SongTimeLimitMS: form.SongTimeLimitMS,
        twentyFourSeven: form.twentyFourSeven,
      };

      const saveResponse = await apiJson<GuildSettingsSaveResponse>(
        buildBotScopedPath(botId, guildId, "/settings"),
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );

      const nextSettings = saveResponse.settings;
      setSettings(nextSettings);
      const nextMetadata = mergeSavedSettingsIntoMetadata(metadata, nextSettings);
      setMetadata(nextMetadata);
      setForm(mergeSettings(nextSettings, nextMetadata));
      setSaveFeedback(buildSettingsSaveFeedback(saveResponse));
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Unable to save guild settings";
      setError(message);
      setSaveFeedback(buildFailedCommandFeedback(message, "GUILD_SETTINGS_UPDATE"));
    } finally {
      setIsSaving(false);
    }
  };

  const refreshMetadata = async () => {
    if (!botId || !guildId) return;
    setIsRefreshingMetadata(true);
    setError(null);
    setNotice(null);
    try {
      const nextMetadata = await apiJson<GuildMetadata>(
        `${buildBotScopedPath(botId, guildId, "/metadata")}?refresh=${Date.now()}`,
      );
      setMetadata(nextMetadata);
      setForm((current) => ({
        ...current,
        MusicDJRole: current.MusicDJRole.filter((id) =>
          (nextMetadata.roles ?? []).some((role) => role.id === id),
        ),
        VCs: current.VCs.filter((id) =>
          (nextMetadata.voiceChannels ?? []).some((channel) => channel.id === id),
        ),
        mChannelID:
          current.mChannelID === CREATE_CUSTOM_CHANNEL_VALUE
            ? CREATE_CUSTOM_CHANNEL_VALUE
            : current.mChannelID &&
                (nextMetadata.textChannels ?? []).some((channel) => channel.id === current.mChannelID)
              ? current.mChannelID
              : CREATE_CUSTOM_CHANNEL_VALUE,
      }));
      setNotice(
        `Channels and roles refreshed from Discord. ${nextMetadata.textChannels?.length ?? 0} text channels, ${nextMetadata.voiceChannels?.length ?? 0} voice channels, ${nextMetadata.roles?.length ?? 0} roles loaded.`,
      );
      setOpenMenu(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to refresh channels and roles",
      );
    } finally {
      setIsRefreshingMetadata(false);
    }
  };

  const canManage = selectedGuild?.canManage ?? false;
  const premiumEnabled = Boolean(metadata?.settings?.permpremium);
  const customChannelEnabled = Boolean(form.CustomChannel);
  const textChannels = metadata?.textChannels ?? [];
  const voiceChannels = metadata?.voiceChannels ?? [];
  const roles = metadata?.roles ?? [];
  const nonDjLimitMinutes = Math.round((form.SongTimeLimitMS ?? 0) / 60000);
  const premiumBadge = <span className="ml-2 text-secondary">*</span>;
  const savedFormSnapshot = useMemo(
    () => JSON.stringify(mergeSettings(settings, metadata)),
    [settings, metadata],
  );
  const currentFormSnapshot = useMemo(() => JSON.stringify(form), [form]);
  const hasUnsavedChanges = savedFormSnapshot !== currentFormSnapshot;

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowImmediateNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("javascript:")) return;
      if (allowImmediateNavigationRef.current) return;

      event.preventDefault();
      setPendingHref(href);
      setShowUnsavedPrompt(true);
      setFlashUnsaved(true);
      window.setTimeout(() => setFlashUnsaved(false), 650);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  const leaveAnyway = () => {
    const href = pendingHref;
    allowImmediateNavigationRef.current = true;
    setShowUnsavedPrompt(false);
    setPendingHref(null);
    if (href) {
      window.location.href = href;
    }
  };

  if (invalidGuildRoute || invalidBotRoute) {
    return (
      <DashboardRouteState
        title="Settings not available"
        message="That bot or server route does not exist for your current session. Pick a server you actually share with Lunio."
      />
    );
  }

  if (botNotConnectedToGuild) {
    return (
      <DashboardRouteState
        title="Bot not in this server"
        message="The selected bot is not connected to this server right now, so there are no guild settings to manage here."
      />
    );
  }

  if (settingsAccessDenied) {
    return (
      <DashboardRouteState
        title="Manage Guild required"
        message="You can view this server in Lunio, but you do not have permission to open its dashboard settings."
      />
    );
  }

  return (
    <div className="grid gap-6">
      {flashUnsaved ? <div className="unsaved-flash" /> : null}
      {showUnsavedPrompt ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div className="panel w-full max-w-lg rounded-[2rem] border border-danger/30 bg-[#150b0b]/95 p-7 shadow-[0_30px_100px_rgba(159,5,25,0.35)]">
            <div className="eyebrow !mb-3 !border-danger/30 !bg-danger/10 !text-red-100">
              Unsaved changes
            </div>
            <h2 className="font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              Leave without saving?
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Your guild settings were changed locally but haven&apos;t been saved yet. If you
              leave now, those edits will be lost.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="ghost-button"
                onClick={() => {
                  setShowUnsavedPrompt(false);
                  setPendingHref(null);
                }}
                type="button"
              >
                Stay here
              </button>
              <button className="primary-button" onClick={leaveAnyway} type="button">
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="dashboard-hero-card">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="eyebrow">Guild settings</div>
            <h1 className="font-headline text-4xl font-bold tracking-[-0.06em] text-white sm:text-5xl">
              Configure this server
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
              These controls now mirror the real Lunio guild settings used by the admin and premium
              commands instead of a generic placeholder schema.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="secondary-button px-4 py-2 text-sm"
              href={buildDashboardPath(botId, guildId)}
            >
              Back to player
            </Link>
            <button
              className="ghost-button gap-2 px-4 py-2 text-sm"
              disabled={isRefreshingMetadata || isLoading}
              onClick={() => void refreshMetadata()}
              type="button"
            >
              <svg
                aria-hidden="true"
                className={`h-4 w-4 ${isRefreshingMetadata ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20 12a8 8 0 1 1-2.34-5.66"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M20 4v6h-6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              {isRefreshingMetadata ? "Refreshing..." : "Fetch channels/roles"}
            </button>
            <Link className="ghost-button px-4 py-2 text-sm" href="/servers">
              Change server
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="dashboard-context-card">
            <div className="metric-label">Guild</div>
            <div className="mt-3 text-lg font-bold text-white">
              {selectedGuild?.name ?? guildId ?? "No server selected"}
            </div>
          </article>
          <article className="dashboard-context-card">
            <div className="metric-label">Bot</div>
            <DashboardSingleSelect
              disabled={isLoading || guildConnectedBots.length <= 1}
              emptyLabel="Select bot"
              isOpen={openMenu === "bot"}
              onSelect={(value) => {
                setOpenMenu(null);
                router.push(buildDashboardPath(value, guildId, "settings"));
              }}
              onToggle={() => toggleMenu("bot")}
              options={(guildConnectedBots.length
                ? guildConnectedBots
                : botOptions.map((bot) => bot.botId)
              )
                .map((connectedBotId) =>
                  botOptions.find((bot) => bot.botId === connectedBotId),
                )
                .filter(Boolean)
                .map((bot) => ({
                  value: bot!.botId,
                  label: bot!.label,
                }))}
              value={botId}
            />
          </article>
          <article className="dashboard-context-card">
            <div className="metric-label">Access</div>
            <div className="mt-3 text-lg font-bold text-white">
              {canManage ? "Manage Guild" : selectedGuild ? "View only" : "Select server first"}
            </div>
          </article>
          <article className="dashboard-context-card">
            <div className="metric-label">Premium</div>
            <div className="mt-3 text-lg font-bold text-white">
              {premiumEnabled ? "Enabled" : "Not active"}
            </div>
          </article>
        </div>
      </section>

      {!guildId || !botId ? (
        <div className="dashboard-empty-card">
          Open settings from the server picker or the dashboard so the selected guild and bot are
          already attached.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.5rem] border border-danger/30 bg-danger/10 p-5 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5 text-sm text-primary">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
        <div className="grid gap-6">
          <article className="dashboard-panel-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="metric-label">Playback defaults</div>
                <h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                  Core behavior
                </h2>
              </div>
              <div className="dashboard-pill">
                {isLoading ? "Loading" : canManage ? "Editable" : "Read only"}
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="field-label">Language</span>
                <DashboardSingleSelect
                  disabled={!canManage || isLoading}
                  emptyLabel="Select language"
                  isOpen={openMenu === "language"}
                  onSelect={(value) => {
                    updateField("Language", value);
                    setOpenMenu(null);
                  }}
                  onToggle={() => toggleMenu("language")}
                  options={LANGUAGE_OPTIONS.map((language) => ({
                    value: language,
                    label: language,
                  }))}
                  value={form.Language}
                />
              </label>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <span className="field-label">
                  Default volume
                  {premiumBadge}
                </span>
                <span className="text-sm font-bold text-white">{form.DefaultVol}%</span>
              </div>
              <input
                className="dashboard-range mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                disabled={!canManage || isLoading || !premiumEnabled}
                max={200}
                min={1}
                onChange={(event) => updateField("DefaultVol", Number(event.target.value))}
                step={1}
                type="range"
                value={form.DefaultVol}
              />
              {!premiumEnabled ? (
                <p className="mt-2 text-sm text-muted">
                  Premium-only default for new players.
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                <input
                  checked={form.Playlists}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading}
                  onChange={(event) => updateField("Playlists", event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-6">Allow users to queue playlists.</span>
              </label>

              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                <input
                  checked={form.Requester}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading}
                  onChange={(event) => updateField("Requester", event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-6">Show requester info on tracks.</span>
              </label>

              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                <input
                  checked={form.Announce}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading || customChannelEnabled}
                  onChange={(event) => {
                    const nextValue = event.target.checked;
                    updateField("Announce", nextValue);
                    if (!nextValue || customChannelEnabled) updateField("DelAnnounce", false);
                  }}
                  type="checkbox"
                />
                <span className="leading-6">
                  Send now playing announcement messages.
                  {customChannelEnabled
                    ? " Disabled while custom channel mode is active."
                    : ""}
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                <input
                  checked={form.DelAnnounce}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading || !form.Announce || customChannelEnabled}
                  onChange={(event) => updateField("DelAnnounce", event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-6">
                  Delete now playing announcements after they have been used.
                  {customChannelEnabled
                    ? " Disabled while custom channel mode is active."
                    : ""}
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                <input
                  checked={form.PlayerControls}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading || customChannelEnabled}
                  onChange={(event) => updateField("PlayerControls", event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-6">
                  Show player controls on now playing embeds.
                  {customChannelEnabled
                    ? " Disabled while custom channel mode is active."
                    : ""}
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                <input
                  checked={form.VoiceStatus}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading}
                  onChange={(event) => updateField("VoiceStatus", event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-6">Enable voice status updates for the player.</span>
              </label>

              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                <input
                  checked={form.Ephemeral}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading}
                  onChange={(event) => updateField("Ephemeral", event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-6">Respond with ephemeral admin command replies.</span>
              </label>
            </div>
          </article>

          <article className="dashboard-panel-card">
            <div className="metric-label">Music panel</div>
            <h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              Custom channel mode
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Choose whether Lunio should create a fresh request-panel channel or
              clear and reuse an existing one, then pick the embed mode for the
              panel messages.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80 md:col-span-2">
                <input
                  checked={form.CustomChannel}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                  disabled={!canManage || isLoading}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setForm((current) => ({
                      ...current,
                      CustomChannel: enabled,
                      mChannelID: enabled
                        ? current.mChannelID || CREATE_CUSTOM_CHANNEL_VALUE
                        : current.mChannelID || CREATE_CUSTOM_CHANNEL_VALUE,
                      Announce: enabled ? false : current.Announce,
                      DelAnnounce: enabled ? false : current.DelAnnounce,
                      PlayerControls: enabled ? false : current.PlayerControls,
                    }));
                  }}
                  type="checkbox"
                />
                <span className="leading-6">
                  Use the dedicated request-panel text channel instead of normal now playing messages.
                </span>
              </label>

              <label className="block">
                <span className="field-label">Panel text channel</span>
                <DashboardSingleSelect
                  disabled={!canManage || isLoading || !form.CustomChannel}
                  emptyLabel="Select a text channel"
                  isOpen={openMenu === "panel-channel"}
                  onSelect={(value) => {
                    updateField("mChannelID", value);
                    setOpenMenu(null);
                  }}
                  onToggle={() => toggleMenu("panel-channel")}
                  options={[
                    {
                      value: CREATE_CUSTOM_CHANNEL_VALUE,
                      label: "Create one for me",
                    },
                    ...textChannels.map((channel) => ({
                      value: channel.id,
                      label: `#${channel.name}`,
                    })),
                  ]}
                  value={form.mChannelID}
                />
                <p className="mt-2 text-sm text-muted">
                  Select <span className="font-bold text-white">Create one for me</span> to let Lunio create a fresh request channel, or pick an existing channel and Lunio will clear it before posting the panel there.
                </p>
              </label>

              <label className="block">
                <span className="field-label">Embed mode</span>
                <DashboardSingleSelect
                  disabled={!canManage || isLoading || !form.CustomChannel}
                  emptyLabel="Select embed mode"
                  isOpen={openMenu === "embed-mode"}
                  onSelect={(value) => {
                    updateField("mEmbedMode", value as "v1" | "v2");
                    setOpenMenu(null);
                  }}
                  onToggle={() => toggleMenu("embed-mode")}
                  options={[
                    { value: "v1", label: "Default" },
                    { value: "v2", label: "Modern" },
                  ]}
                  value={form.mEmbedMode}
                />
              </label>
            </div>
          </article>

          <article className="dashboard-panel-card">
            <div className="metric-label">Access rules</div>
            <h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              Roles and channels
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Refreshed Discord channels and roles are shared across both access
              rules and custom channel mode, so the fetch action lives in the
              page header.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="field-label">DJ roles</span>
                <DashboardMultiSelect
                  disabled={!canManage || isLoading}
                  emptyLabel="Select one or more DJ roles"
                  isOpen={openMenu === "dj-roles"}
                  onToggle={() => toggleMenu("dj-roles")}
                  onValueChange={(value) => updateField("MusicDJRole", value)}
                  options={roles.map((role) => ({
                    value: role.id,
                    label: `@${role.name}`,
                  }))}
                  value={form.MusicDJRole}
                />
                <p className="mt-2 text-sm text-muted">
                  Same role list Lunio can currently see in Discord.
                </p>
              </label>

              <label className="block">
                <span className="field-label">Allowed voice channels</span>
                <DashboardMultiSelect
                  disabled={!canManage || isLoading}
                  emptyLabel="No voice restrictions"
                  isOpen={openMenu === "voice-channels"}
                  onToggle={() => toggleMenu("voice-channels")}
                  onValueChange={(value) => updateField("VCs", value)}
                  options={voiceChannels.map((channel) => ({
                    value: channel.id,
                    label: channel.name,
                  }))}
                  value={form.VCs}
                />
                <p className="mt-2 text-sm text-muted">
                  Empty means unrestricted. Refresh if channels or roles changed in Discord.
                </p>
              </label>
            </div>
          </article>

          <article className="dashboard-panel-card">
            <div className="metric-label">Queue limits</div>
            <h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              Non-DJ limits
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <div className="flex items-center justify-between gap-3">
                  <span className="field-label">Song limit per user</span>
                  <span className="text-sm font-bold text-white">
                    {form.SongUserLimit === 0 ? "Disabled" : form.SongUserLimit}
                  </span>
                </div>
                <input
                  className="dashboard-range mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                  disabled={!canManage || isLoading}
                  max={20}
                  min={0}
                  onChange={(event) => updateField("SongUserLimit", Number(event.target.value))}
                  step={1}
                  type="range"
                  value={form.SongUserLimit}
                />
                <input
                  className="field-input mt-4"
                  disabled={!canManage || isLoading}
                  min={0}
                  onChange={(event) => updateField("SongUserLimit", Number(event.target.value))}
                  type="number"
                  value={form.SongUserLimit}
                />
                <p className="mt-2 text-sm text-muted">0 means no per-user queue cap.</p>
              </label>
              <label className="block">
                <div className="flex items-center justify-between gap-3">
                  <span className="field-label">Time limit per song</span>
                  <span className="text-sm font-bold text-white">
                    {nonDjLimitMinutes === 0 ? "Disabled" : `${nonDjLimitMinutes} min`}
                  </span>
                </div>
                <input
                  className="dashboard-range mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                  disabled={!canManage || isLoading}
                  min={0}
                  max={30}
                  onChange={(event) =>
                    updateField(
                      "SongTimeLimitMS",
                      Number(event.target.value) * 60000,
                    )
                  }
                  step={1}
                  type="range"
                  value={Math.min(nonDjLimitMinutes, 30)}
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="field-label">Hours</span>
                    <input
                      className="field-input"
                      disabled={!canManage || isLoading}
                      min={0}
                      onChange={(event) => {
                        const hours = Math.max(0, Number(event.target.value) || 0);
                        const total =
                          hours * 3600000 +
                          Math.floor((form.SongTimeLimitMS % 3600000) / 60000) * 60000 +
                          (form.SongTimeLimitMS % 60000);
                        updateField("SongTimeLimitMS", total);
                      }}
                      type="number"
                      value={Math.floor(form.SongTimeLimitMS / 3600000)}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Minutes</span>
                    <input
                      className="field-input"
                      disabled={!canManage || isLoading}
                      max={59}
                      min={0}
                      onChange={(event) => {
                        const minutes = Math.max(0, Math.min(59, Number(event.target.value) || 0));
                        const hours = Math.floor(form.SongTimeLimitMS / 3600000);
                        const seconds = Math.floor((form.SongTimeLimitMS % 60000) / 1000);
                        updateField("SongTimeLimitMS", hours * 3600000 + minutes * 60000 + seconds * 1000);
                      }}
                      type="number"
                      value={Math.floor((form.SongTimeLimitMS % 3600000) / 60000)}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Seconds</span>
                    <input
                      className="field-input"
                      disabled={!canManage || isLoading}
                      max={59}
                      min={0}
                      onChange={(event) => {
                        const seconds = Math.max(0, Math.min(59, Number(event.target.value) || 0));
                        const hours = Math.floor(form.SongTimeLimitMS / 3600000);
                        const minutes = Math.floor((form.SongTimeLimitMS % 3600000) / 60000);
                        updateField("SongTimeLimitMS", hours * 3600000 + minutes * 60000 + seconds * 1000);
                      }}
                      type="number"
                      value={Math.floor((form.SongTimeLimitMS % 60000) / 1000)}
                    />
                  </label>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Quick slider for common limits, plus precise HH:MM:SS entry below.
                </p>
              </label>
            </div>
          </article>
        </div>

        <aside className="grid gap-6">
          <article className="dashboard-side-card">
            <div className="metric-label">Guild state</div>
            <h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              Live snapshot
            </h3>
            <label className="mt-6 flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
              <input
                checked={form.twentyFourSeven}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
                disabled={!canManage || isLoading || !premiumEnabled}
                onChange={(event) => updateField("twentyFourSeven", event.target.checked)}
                type="checkbox"
              />
              <span className="leading-6">
                Keep Lunio in voice when playback stops.
                {premiumBadge}
              </span>
            </label>
            <p className="mt-3 text-sm text-muted">
              24/7 can only be enabled while Lunio already has an active player in the target voice channel.
            </p>
            {!premiumEnabled ? (
              <p className="mt-3 text-sm text-muted">
                Premium is required for 24/7 mode and default volume changes.
              </p>
            ) : null}
            <div className="mt-6 grid gap-3">
              <div className="dashboard-stat-row">
                <span>Custom channel</span>
                <strong>{customChannelEnabled ? "Enabled" : "Off"}</strong>
              </div>
              <div className="dashboard-stat-row">
                <span>Setup text channel</span>
                <strong className="truncate pl-4 text-right">
                  {formatChannelLabel(metadata?.settings?.mChannelID, textChannels)}
                </strong>
              </div>
              <div className="dashboard-stat-row">
                <span>Playlists</span>
                <strong>{form.Playlists ? "Allowed" : "Blocked"}</strong>
              </div>
              <div className="dashboard-stat-row">
                <span>Now playing messages</span>
                <strong>{form.Announce ? "On" : "Off"}</strong>
              </div>
              <div className="dashboard-stat-row">
                <span>Delete announcements</span>
                <strong>{form.DelAnnounce ? "On" : "Off"}</strong>
              </div>
              <div className="dashboard-stat-row">
                <span>DJ roles</span>
                <strong>{form.MusicDJRole.length}</strong>
              </div>
              <div className="dashboard-stat-row">
                <span>Voice restrictions</span>
                <strong>{form.VCs.length}</strong>
              </div>
              <div className="dashboard-stat-row">
                <span>Last update</span>
                <strong>
                  {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "--"}
                </strong>
              </div>
            </div>
            {saveFeedback ? (
              <div
                className={`mt-6 rounded-[1.4rem] border p-4 ${getCommandFeedbackToneClasses(saveFeedback.phase)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="metric-label text-current/70">Save status</div>
                  <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-current">
                    {formatCommandFeedbackPhase(saveFeedback.phase)}
                  </span>
                </div>
                <div className="mt-3 text-sm font-bold text-white">{saveFeedback.title}</div>
                <p className="mt-2 text-sm leading-6 text-current/90">{saveFeedback.message}</p>
                <div className="mt-4 grid gap-3">
                  <div className="dashboard-stat-row">
                    <span>Command</span>
                    <strong>{saveFeedback.commandId ? formatShortCommandId(saveFeedback.commandId) : "--"}</strong>
                  </div>
                  <div className="dashboard-stat-row">
                    <span>Instance</span>
                    <strong>{saveFeedback.instanceId ?? "--"}</strong>
                  </div>
                  <div className="dashboard-stat-row">
                    <span>Received</span>
                    <strong>
                      {saveFeedback.ackTimestamp
                        ? new Date(saveFeedback.ackTimestamp).toLocaleTimeString()
                        : "--"}
                    </strong>
                  </div>
                  <div className="dashboard-stat-row">
                    <span>Applied</span>
                    <strong>
                      {saveFeedback.resultTimestamp
                        ? new Date(saveFeedback.resultTimestamp).toLocaleTimeString()
                        : "--"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : null}
            {canManage ? (
              <button
                className="secondary-button mt-6 w-full justify-center"
                disabled={isSaving || isLoading}
                onClick={() => void handleSave()}
                type="button"
              >
                {isSaving ? "Saving..." : "Save settings"}
              </button>
            ) : (
              <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-muted">
                Only members with Manage Guild can save changes here.
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
