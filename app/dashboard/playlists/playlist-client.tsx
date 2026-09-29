'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	apiJson,
	buildBotScopedPath,
	formatDuration,
	type AcceptedCommandResponse,
	type AuthUser,
	type CommandStatus,
	type GuildMetadata,
	type PlaylistDetail,
	type PlaylistDetailResult,
	type PlaylistListResult,
	type PlaylistShareResult,
	type PlaylistSummary,
	type SearchPlaylistResult,
	type SearchTrackResult,
} from '@/lib/api';

type PlaylistClientProps = {
	botIdFromQuery?: string;
	guildIdFromQuery?: string;
};

type PlaylistAction =
	| 'list'
	| 'show'
	| 'create'
	| 'delete'
	| 'default'
	| 'share'
	| 'song-delete'
	| 'song-move'
	| 'song-save'
	| 'save'
	| 'load';

type PlaylistCommandBody = {
	action: PlaylistAction;
	playlistName?: string | null;
	query?: string | null;
	trackData?: Record<string, unknown> | null;
	position?: number | null;
	from?: number | null;
	to?: number | null;
	flags?: 'n' | 's' | 'r' | null;
	memberVoiceChannelId?: string | null;
};

type SearchResultsData = {
	playlist?: SearchPlaylistResult | null;
	results?: SearchTrackResult[];
};

const COMMAND_TIMEOUT_MS = 9000;
const COMMAND_POLL_MS = 350;

function getStatusMessage(status: CommandStatus | null, fallback: string) {
	return status?.result?.message || fallback;
}

async function waitForCommandResult(commandId: string) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < COMMAND_TIMEOUT_MS) {
		const status = await apiJson<CommandStatus>(`/api/commands/${commandId}`);
		if (status.result) return status;
		await new Promise((resolve) => window.setTimeout(resolve, COMMAND_POLL_MS));
	}
	return null;
}

function extractPlaylistList(data: Record<string, unknown> | undefined): PlaylistListResult | null {
	const candidate = data as unknown as PlaylistListResult | undefined;
	if (!candidate || !Array.isArray(candidate.playlists)) return null;
	return data as unknown as PlaylistListResult;
}

function extractPlaylistDetail(data: Record<string, unknown> | undefined): PlaylistDetail | null {
	const playlist = (data as unknown as PlaylistDetailResult | undefined)?.playlist;
	if (!playlist || typeof playlist.name !== 'string' || !Array.isArray(playlist.songs)) return null;
	return playlist;
}

function extractShare(data: Record<string, unknown> | undefined): PlaylistShareResult | null {
	const share = data as unknown as PlaylistShareResult | undefined;
	if (!share?.shareId || !share?.loadValue) return null;
	return share;
}

function isSearchTrackResult(value: unknown): value is SearchTrackResult {
	return Boolean(
		value &&
			typeof value === 'object' &&
			typeof (value as SearchTrackResult).title === 'string' &&
			typeof (value as SearchTrackResult).artist === 'string' &&
			typeof (value as SearchTrackResult).duration === 'number' &&
			typeof (value as SearchTrackResult).url === 'string'
	);
}

function isSearchPlaylistResult(value: unknown): value is SearchPlaylistResult {
	return Boolean(
		value &&
			typeof value === 'object' &&
			typeof (value as SearchPlaylistResult).title === 'string' &&
			typeof (value as SearchPlaylistResult).url === 'string' &&
			typeof (value as SearchPlaylistResult).trackCount === 'number'
	);
}

function extractSearchResults(data: Record<string, unknown> | undefined | null): SearchTrackResult[] {
	const candidate = (data as SearchResultsData | undefined)?.results;
	return Array.isArray(candidate) ? candidate.filter(isSearchTrackResult) : [];
}

function extractSearchPlaylist(data: Record<string, unknown> | undefined | null): SearchPlaylistResult | null {
	const candidate = (data as SearchResultsData | undefined)?.playlist;
	return isSearchPlaylistResult(candidate) ? candidate : null;
}

function formatPlaylistDuration(ms: number | null | undefined) {
	if (!ms || ms < 0) return '0min 0sec';
	const totalSeconds = Math.floor(ms / 1000);
	const totalMinutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (totalMinutes < 60) {
		return `${totalMinutes}min ${seconds}sec`;
	}

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}hr ${minutes}min`;
}

export function DashboardPlaylistClient({ botIdFromQuery, guildIdFromQuery }: PlaylistClientProps) {
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [metadata, setMetadata] = useState<GuildMetadata | null>(null);
	const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
	const [defaultPlaylist, setDefaultPlaylist] = useState('songs');
	const [maxSongsInPlaylist, setMaxSongsInPlaylist] = useState(100);
	const [selectedPlaylistName, setSelectedPlaylistName] = useState('');
	const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDetail | null>(null);
	const [newPlaylistName, setNewPlaylistName] = useState('');
	const [songQuery, setSongQuery] = useState('');
	const [songSearchPlaylist, setSongSearchPlaylist] = useState<SearchPlaylistResult | null>(null);
	const [songSearchResults, setSongSearchResults] = useState<SearchTrackResult[]>([]);
	const [songSearchError, setSongSearchError] = useState<string | null>(null);
	const [isSongSearchLoading, setIsSongSearchLoading] = useState(false);
	const [savingSongUrl, setSavingSongUrl] = useState<string | null>(null);
	const [loadFlags, setLoadFlags] = useState<'none' | 'n' | 's' | 'r'>('none');
	const [shareValue, setShareValue] = useState('');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [feedback, setFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; message: string }>({ tone: 'idle', message: 'Playlist workspace ready.' });
	const [isLoading, setIsLoading] = useState(true);
	const [busyAction, setBusyAction] = useState<string | null>(null);

	const botId = botIdFromQuery || '';
	const guildId = guildIdFromQuery || '';
	const requesterVoiceChannelId = metadata?.requester?.currentVoiceChannelId ?? null;
	const playlistsEnabled = metadata?.settings?.Playlists !== false;
	const selectedSummary = useMemo(() => playlists.find((playlist) => playlist.name === selectedPlaylistName) ?? null, [playlists, selectedPlaylistName]);
	const selectedIsDefault = Boolean(selectedSummary?.isDefault || selectedPlaylist?.isDefault || (selectedPlaylistName && selectedPlaylistName === defaultPlaylist));

	const resetSongSearch = useCallback(() => {
		setSongSearchPlaylist(null);
		setSongSearchResults([]);
		setSongSearchError(null);
		setIsSongSearchLoading(false);
	}, []);

	const sendPlaylistAction = useCallback(
		async (body: PlaylistCommandBody, label: string) => {
			if (!botId || !guildId) throw new Error('Choose a bot and server first.');
			setBusyAction(label);
			setFeedback({ tone: 'idle', message: `${label}...` });
			try {
				const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(botId, guildId, '/playlists/action'), {
					method: 'POST',
					body: JSON.stringify(body),
				});
				const status = await waitForCommandResult(accepted.commandId);
				if (!status?.result) {
					setFeedback({ tone: 'error', message: `${label} timed out. Try again in a moment.` });
					return null;
				}
				setFeedback({ tone: status.result.success ? 'success' : 'error', message: getStatusMessage(status, label) });
				return status;
			} catch (error) {
				const message = error instanceof Error ? error.message : `${label} failed.`;
				setFeedback({ tone: 'error', message });
				return null;
			} finally {
				setBusyAction(null);
			}
		},
		[botId, guildId]
	);

	const refreshMetadata = useCallback(async () => {
		if (!botId || !guildId) return;
		try {
			const nextMetadata = await apiJson<GuildMetadata>(buildBotScopedPath(botId, guildId, '/metadata'));
			setMetadata(nextMetadata);
		} catch {
			setMetadata(null);
		}
	}, [botId, guildId]);

	const loadPlaylists = useCallback(
		async (preferredName?: string | null) => {
			setIsLoading(true);
			const status = await sendPlaylistAction({ action: 'list' }, 'Loading playlists');
			const list = extractPlaylistList(status?.result?.data);
			if (list) {
				setPlaylists(list.playlists);
				setDefaultPlaylist(list.defaultPlaylist || 'songs');
				setMaxSongsInPlaylist(list.maxSongsInPlaylist || 100);
				const nextSelected = preferredName && list.playlists.some((playlist) => playlist.name === preferredName) ? preferredName : list.defaultPlaylist || list.playlists[0]?.name || '';
				setSelectedPlaylistName(nextSelected);
			}
			setIsLoading(false);
		},
		[sendPlaylistAction]
	);

	const loadPlaylistDetail = useCallback(
		async (playlistName: string) => {
			if (!playlistName) {
				setSelectedPlaylist(null);
				return;
			}
			const status = await sendPlaylistAction({ action: 'show', playlistName }, `Opening ${playlistName}`);
			const detail = extractPlaylistDetail(status?.result?.data);
			if (detail) {
				setSelectedPlaylist(detail);
				setSelectedPlaylistName(detail.name);
			}
		},
		[sendPlaylistAction]
	);

	useEffect(() => {
		let active = true;
		void apiJson<AuthUser>('/api/auth/me')
			.then((user) => {
				if (active) setAuthUser(user);
			})
			.catch(() => {
				if (active) setAuthUser(null);
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		void refreshMetadata();
	}, [refreshMetadata]);

	useEffect(() => {
		void loadPlaylists();
	}, [loadPlaylists]);

	useEffect(() => {
		if (selectedPlaylistName) void loadPlaylistDetail(selectedPlaylistName);
	}, [loadPlaylistDetail, selectedPlaylistName]);

	useEffect(() => {
		const query = songQuery.trim();
		if (!selectedPlaylistName || query.length < 3) {
			resetSongSearch();
			return;
		}

		let active = true;
		const timeout = window.setTimeout(async () => {
			if (!botId || !guildId) {
				if (active) setSongSearchError('Choose a bot and server before searching.');
				return;
			}
			if (!authUser) {
				if (active) setSongSearchError('Sign in before searching for playlist tracks.');
				return;
			}

			setIsSongSearchLoading(true);
			setSongSearchError(null);
			try {
				const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(botId, guildId, '/player/search'), {
					method: 'POST',
					body: JSON.stringify({
						query,
						limit: 5,
						memberVoiceChannelId: requesterVoiceChannelId,
					}),
				});
				const status = await waitForCommandResult(accepted.commandId);
				if (!active) return;
				if (!status?.result) {
					setSongSearchPlaylist(null);
					setSongSearchResults([]);
					setSongSearchError('Search timed out. Try again in a moment.');
					return;
				}

				const playlist = extractSearchPlaylist(status.result.data);
				const results = extractSearchResults(status.result.data);
				setSongSearchPlaylist(playlist);
				setSongSearchResults(results);
				setSongSearchError(status.result.success ? (results.length ? null : status.result.message) : status.result.message);
			} catch (error) {
				if (!active) return;
				setSongSearchPlaylist(null);
				setSongSearchResults([]);
				setSongSearchError(error instanceof Error ? error.message : 'Unable to search tracks right now.');
			} finally {
				if (active) setIsSongSearchLoading(false);
			}
		}, 320);

		return () => {
			active = false;
			window.clearTimeout(timeout);
		};
	}, [authUser, botId, guildId, requesterVoiceChannelId, resetSongSearch, selectedPlaylistName, songQuery]);

	const createPlaylist = async () => {
		const name = newPlaylistName.trim();
		if (!name) return;
		const status = await sendPlaylistAction({ action: 'create', playlistName: name }, 'Creating playlist');
		if (status?.result?.success) {
			setNewPlaylistName('');
			await loadPlaylists(name);
		}
	};

	const deletePlaylist = async () => {
		if (!selectedPlaylistName) return;
		const status = await sendPlaylistAction({ action: 'delete', playlistName: selectedPlaylistName }, 'Deleting playlist');
		if (status?.result?.success) {
			setShowDeleteConfirm(false);
			setSelectedPlaylist(null);
			await loadPlaylists();
		}
	};

	const setAsDefault = async () => {
		if (!selectedPlaylistName) return;
		const status = await sendPlaylistAction({ action: 'default', playlistName: selectedPlaylistName }, 'Setting default playlist');
		if (status?.result?.success) await loadPlaylists(selectedPlaylistName);
	};

	const sharePlaylist = async () => {
		if (!selectedPlaylistName) return;
		const status = await sendPlaylistAction({ action: 'share', playlistName: selectedPlaylistName }, 'Creating share code');
		const share = extractShare(status?.result?.data);
		if (share) setShareValue(share.loadValue);
	};

	const addSong = async (track?: SearchTrackResult) => {
		if (!selectedPlaylistName) return;
		const query = (track?.url || songQuery).trim();
		if (!query) return;
		setSavingSongUrl(track?.url || query);
		const status = await sendPlaylistAction(
			{
				action: 'song-save',
				playlistName: selectedPlaylistName,
				query,
				trackData: track?.trackData ?? null,
			},
			track ? `Adding ${track.title}` : 'Adding song'
		);
		setSavingSongUrl(null);
		if (status?.result?.success) {
			setSongQuery('');
			resetSongSearch();
			const detail = extractPlaylistDetail(status.result.data);
			if (detail) setSelectedPlaylist(detail);
			await loadPlaylists(selectedPlaylistName);
		}
	};

	const removeSong = async (position: number) => {
		if (!selectedPlaylistName) return;
		const status = await sendPlaylistAction({ action: 'song-delete', playlistName: selectedPlaylistName, position }, 'Removing song');
		const detail = extractPlaylistDetail(status?.result?.data);
		if (detail) setSelectedPlaylist(detail);
		await loadPlaylists(selectedPlaylistName);
	};

	const moveSong = async (from: number, to: number) => {
		if (!selectedPlaylistName) return;
		if (!Number.isInteger(from) || !Number.isInteger(to)) return;
		const status = await sendPlaylistAction({ action: 'song-move', playlistName: selectedPlaylistName, from, to }, 'Moving song');
		const detail = extractPlaylistDetail(status?.result?.data);
		if (detail) {
			setSelectedPlaylist(detail);
		}
	};

	const saveQueue = async () => {
		if (!selectedPlaylistName) return;
		const status = await sendPlaylistAction({ action: 'save', playlistName: selectedPlaylistName }, 'Saving queue');
		const detail = extractPlaylistDetail(status?.result?.data);
		if (detail) setSelectedPlaylist(detail);
		await loadPlaylists(selectedPlaylistName);
	};

	const loadIntoQueue = async () => {
		if (!selectedPlaylistName) return;
		if (!playlistsEnabled) {
			setFeedback({ tone: 'error', message: 'Playlist loading is disabled in this server.' });
			return;
		}
		await refreshMetadata();
		await sendPlaylistAction(
			{
				action: 'load',
				playlistName: selectedPlaylistName,
				flags: loadFlags === 'none' ? null : loadFlags,
				memberVoiceChannelId: requesterVoiceChannelId,
			},
			'Loading playlist into queue'
		);
	};

	const panelClass = 'rounded-xl border border-white/10 bg-white/[0.035]';
	const mutedText = 'text-white/58';
	const busy = Boolean(busyAction);

	return (
		<>
		<div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
			<section className={`${panelClass} p-5`}>
				<div className="flex items-center justify-between gap-3">
					<div>
						<div className="text-xs font-extrabold uppercase tracking-wide text-primary">Library</div>
						<h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Your playlists</h2>
					</div>
					<button className="ghost-button px-4 py-2 text-sm" disabled={busy} onClick={() => void loadPlaylists(selectedPlaylistName)} type="button">
						Refresh
					</button>
				</div>

				<div className="mt-5 grid gap-2">
					{isLoading ? (
						<div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/58">Loading saved playlists…</div>
					) : playlists.length ? (
						playlists.map((playlist) => (
							<button
								className={`rounded-xl border px-4 py-3 text-left transition ${
									selectedPlaylistName === playlist.name ? 'border-primary/30 bg-primary/10 text-white' : 'border-white/8 bg-black/16 text-white/70 hover:border-white/14 hover:bg-white/[0.05]'
								}`}
								key={playlist.id || playlist.name}
								onClick={() => setSelectedPlaylistName(playlist.name)}
								type="button"
							>
								<div className="flex items-center justify-between gap-3">
									<div className="min-w-0">
										<div className="truncate text-sm font-black">{playlist.name}</div>
										<div className="mt-1 text-xs text-white/45">
											{playlist.songCount} tracks · {formatPlaylistDuration(playlist.duration)}
										</div>
									</div>
									{playlist.isDefault ? (
										<span className="rounded-full border border-primary/25 bg-primary/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
											Default
										</span>
									) : null}
								</div>
							</button>
						))
					) : (
						<div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/58">No playlists yet. Your free default playlist will be created automatically.</div>
					)}
				</div>

				<div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
					<div className="text-xs font-extrabold uppercase tracking-wide text-white/42">Create playlist</div>
					<div className="mt-3 flex gap-2">
						<input
							aria-label="New playlist name"
							autoComplete="off"
							className="field-input mt-0 min-w-0 flex-1"
							maxLength={64}
							name="playlistName"
							onChange={(event) => setNewPlaylistName(event.target.value)}
							placeholder="e.g. Friday Night Mix…"
							value={newPlaylistName}
						/>
						<button className="primary-button px-4 py-2 text-sm" disabled={busy || !newPlaylistName.trim()} onClick={() => void createPlaylist()} type="button">
							Create
						</button>
					</div>
					<p className="mt-3 text-xs leading-6 text-white/45">Everyone gets the default playlist. Creating extra playlists requires premium.</p>
				</div>
			</section>

			<section className={`${panelClass} min-w-0 p-5`}>
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0">
						<div className="text-xs font-extrabold uppercase tracking-wide text-primary">Playlist detail</div>
						<div className="mt-2 flex flex-wrap items-center gap-3">
							<h2 className="truncate font-headline text-4xl font-bold tracking-[-0.06em] text-white">{selectedPlaylist?.name || selectedSummary?.name || 'Select a playlist'}</h2>
							{selectedIsDefault ? (
								<span className="rounded-full border border-primary/25 bg-primary/15 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-primary">
									Default playlist
								</span>
							) : null}
						</div>
						<p className={`mt-2 text-sm ${mutedText}`}>
							{selectedPlaylist ? `${selectedPlaylist.songs.length}/${maxSongsInPlaylist} tracks · ${formatPlaylistDuration(selectedPlaylist.duration)}` : 'Choose a playlist to inspect, edit, or load it into the player.'}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							className={
								selectedIsDefault
									? 'cursor-not-allowed rounded-full border border-white/6 bg-white/[0.025] px-4 py-2 text-sm font-extrabold text-white/28 shadow-none'
									: 'secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:border-white/6 disabled:bg-white/[0.025] disabled:text-white/28 disabled:shadow-none'
							}
							disabled={busy || !selectedPlaylistName || selectedIsDefault}
							onClick={() => void setAsDefault()}
							type="button"
						>
							{selectedIsDefault ? 'Default active' : 'Set default'}
						</button>
						<button className="secondary-button px-4 py-2 text-sm" disabled={busy || !selectedPlaylistName} onClick={() => void sharePlaylist()} type="button">
							Share
						</button>
						<button className="ghost-button px-4 py-2 text-sm text-rose-200" disabled={busy || !selectedPlaylistName} onClick={() => setShowDeleteConfirm(true)} type="button">
							Delete
						</button>
					</div>
				</div>

				<div
					aria-live="polite"
					className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
						feedback.tone === 'error' ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : feedback.tone === 'success' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-white/10 bg-black/18 text-white/56'
					}`}
				>
					{busyAction ? `${busyAction}…` : feedback.message}
				</div>

				{shareValue ? (
					<div className="mt-4 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3">
						<div className="text-xs font-extrabold uppercase tracking-wide text-secondary">Share code</div>
						<div className="mt-2 select-all font-mono text-sm text-white">{shareValue}</div>
					</div>
				) : null}

				<div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
					<div className="rounded-xl border border-white/10 bg-black/18 p-4">
						<div className="text-xs font-extrabold uppercase tracking-wide text-white/42">Add a song</div>
						<div className="mt-3">
							<input
								aria-label="Search for a song to add"
								autoComplete="off"
								className="field-input min-w-0 w-full"
								disabled={busy || !selectedPlaylistName}
								name="songQuery"
								onChange={(event) => setSongQuery(event.target.value)}
								placeholder="Song title, artist, or URL…"
								spellCheck={false}
								type="search"
								value={songQuery}
							/>
						</div>
						<div className="mt-3 text-xs leading-6 text-white/45">
							{isSongSearchLoading
								? 'Searching automatically…'
								: songQuery.trim().length >= 3
									? 'Pick the resolved track you want to save.'
									: 'Type at least 3 characters to preview matches before saving.'}
						</div>

						{songSearchError ? (
							<div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs leading-6 text-rose-100">{songSearchError}</div>
						) : null}

						{isSongSearchLoading && !songSearchResults.length && !songSearchPlaylist ? (
							<div className="mt-3 grid gap-2">
								{([62, 78, 54] as const).map((width, index) => (
									<div className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3" key={index}>
										<div className="h-3 rounded-full bg-white/10 animate-pulse" style={{ width: `${width}%` }} />
										<div className="mt-2 h-2 rounded-full bg-white/6 animate-pulse" style={{ width: `${Math.max(36, width - 18)}%` }} />
									</div>
								))}
							</div>
						) : null}

						{songSearchPlaylist ? (
							<div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-3">
								<div className="text-[10px] font-extrabold uppercase tracking-wide text-primary">Playlist detected</div>
								<div className="mt-2 truncate text-sm font-bold text-white">{songSearchPlaylist.title}</div>
								<div className="mt-1 text-xs text-white/50">
									{songSearchPlaylist.trackCount} tracks. Playlist saving here expects one song, so pick an individual track below.
								</div>
							</div>
						) : null}

						{songSearchResults.length ? (
							<div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
								{songSearchResults.slice(0, 5).map((result) => {
									const isSavingThisResult = savingSongUrl === result.url;
									return (
										<div className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 sm:flex-row sm:items-center sm:justify-between" key={`${result.url}:${result.title}`}>
											<div className="flex min-w-0 items-center gap-3">
												{result.artworkUrl ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img alt="" className="h-12 w-12 shrink-0 rounded-lg border border-white/10 object-cover" height={48} loading="lazy" src={result.artworkUrl} width={48} />
												) : null}
												<div className="min-w-0">
													<div className="truncate text-sm font-bold text-white">{result.title}</div>
													<div className="mt-1 truncate text-xs text-white/45">
														{result.artist} - {formatDuration(result.duration)}
													</div>
												</div>
											</div>
											<button className="secondary-button shrink-0 px-3 py-2 text-xs" disabled={busy || isSavingThisResult} onClick={() => void addSong(result)} type="button">
												{isSavingThisResult ? 'Saving…' : 'Save track'}
											</button>
										</div>
									);
								})}
							</div>
						) : null}
					</div>

					<div className="rounded-xl border border-white/10 bg-black/18 p-4">
						<div className="text-xs font-extrabold uppercase tracking-wide text-white/42">Queue actions</div>
						<div className="mt-3 flex flex-wrap gap-2">
							<select aria-label="Load mode" className="field-select mt-0 min-w-[8rem]" name="loadMode" onChange={(event) => setLoadFlags(event.target.value as typeof loadFlags)} value={loadFlags}>
								<option value="none">Normal</option>
								<option value="n">Next</option>
								<option value="s">Shuffle</option>
								<option value="r">Reverse</option>
							</select>
							<button className="secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:border-white/6 disabled:bg-white/[0.025] disabled:text-white/28 disabled:shadow-none" disabled={busy || !selectedPlaylistName || !authUser || !playlistsEnabled} onClick={() => void loadIntoQueue()} type="button">
								Load
							</button>
							<button className="ghost-button px-4 py-2 text-sm" disabled={busy || !selectedPlaylistName || !authUser} onClick={() => void saveQueue()} type="button">
								Save queue
							</button>
						</div>
						<p className="mt-3 text-xs leading-6 text-white/45">
							{playlistsEnabled ? 'Load requires vote or premium. Save queue requires premium.' : 'Playlist loading is disabled in this server settings.'}
						</p>
					</div>
				</div>

				<div className="mt-5 max-h-[34rem] overflow-y-auto pr-1">
					{selectedPlaylist?.songs.length ? (
						<div className="grid gap-2">
							{selectedPlaylist.songs.map((song, index) => (
								<div className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" key={`${song.index}:${song.url}:${song.title}`}>
									<div className="min-w-0">
										<div className="text-xs font-black uppercase tracking-wide text-primary">#{song.index}</div>
										<div className="mt-1 truncate text-sm font-bold text-white">{song.artist} - {song.title}</div>
										<div className="mt-1 text-xs text-white/42">{formatDuration(song.duration)}</div>
									</div>
									<div className="flex shrink-0 flex-wrap gap-2">
										<button
											aria-label={`Move ${song.title} up`}
											className="ghost-button px-3 py-2 text-xs"
											disabled={busy || index === 0}
											onClick={() => void moveSong(song.index, song.index - 1)}
											type="button"
										>
											↑ Up
										</button>
										<button
											aria-label={`Move ${song.title} down`}
											className="ghost-button px-3 py-2 text-xs"
											disabled={busy || index === selectedPlaylist.songs.length - 1}
											onClick={() => void moveSong(song.index, song.index + 1)}
											type="button"
										>
											↓ Down
										</button>
										<button aria-label={`Remove ${song.title} from playlist`} className="ghost-button px-3 py-2 text-xs text-rose-200" disabled={busy} onClick={() => void removeSong(song.index)} type="button">
											Remove
										</button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/50">
							{selectedPlaylistName ? 'This playlist is empty. Add a song above to start building it.' : 'Select or create a playlist to start.'}
						</div>
					)}
				</div>
			</section>
		</div>
		{showDeleteConfirm ? (
			<div
				aria-labelledby="delete-playlist-title"
				aria-modal="true"
				className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/70 px-4 backdrop-blur-sm"
				onKeyDown={(event) => {
					if (event.key === 'Escape' && !busy) setShowDeleteConfirm(false);
				}}
				role="dialog"
			>
				<div className="w-full max-w-md rounded-xl border border-white/12 bg-[rgba(16,17,20,0.96)] p-6">
					<div className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-rose-200">Delete playlist</div>
					<h3 id="delete-playlist-title" className="mt-4 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
						Delete {selectedPlaylistName}?
					</h3>
					<p className="mt-3 text-sm leading-6 text-white/58">
						This removes the playlist and all saved tracks inside it. This cannot be undone from the dashboard.
					</p>
					<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<button autoFocus className="secondary-button px-5 py-3 text-sm" disabled={busy} onClick={() => setShowDeleteConfirm(false)} type="button">
							Cancel
						</button>
						<button className="rounded-full border border-rose-400/30 bg-rose-500/15 px-5 py-3 text-sm font-extrabold text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={() => void deletePlaylist()} type="button">
							{busyAction === 'Deleting playlist' ? 'Deleting…' : 'Delete Playlist'}
						</button>
					</div>
				</div>
			</div>
		) : null}
		</>
	);
}
