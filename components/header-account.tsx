'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiJson, API_BASE_URL, API_PREFIX, type AuthUser } from '@/lib/api';
import { clearAuthClientState } from '@/lib/auth-storage';

export function HeaderAccount() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		let active = true;

		void apiJson<AuthUser>('/api/auth/me')
			.then((response) => {
				if (active) setUser(response);
			})
			.catch(() => {
				if (active) setUser(null);
			});

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const onPointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		window.addEventListener('mousedown', onPointerDown);
		return () => window.removeEventListener('mousedown', onPointerDown);
	}, []);

	const logout = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await fetch(`${API_BASE_URL}${API_PREFIX}/auth/logout`, {
				method: 'POST',
				credentials: 'include',
			});
		} finally {
			clearAuthClientState();
			window.location.href = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || '/';
			setBusy(false);
		}
	};

	if (!user) {
		return (
			<Link className="ghost-button px-4 py-2 text-sm" href="/login" prefetch={false}>
				Login
			</Link>
		);
	}

	return (
		<div className="relative" ref={containerRef}>
			<button
				className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-2 py-2 pr-4 transition hover:bg-white/[0.08]"
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				{user.avatarUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img alt={user.username} className="h-9 w-9 rounded-full border border-white/10 object-cover" src={user.avatarUrl} />
				) : (
					<div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-primary/10 font-headline text-sm font-bold text-primary">
						{(user.username ?? 'U').slice(0, 1).toUpperCase()}
					</div>
				)}
				<div className="hidden text-left sm:block">
					<div className="text-sm font-bold text-white">{user.globalName || user.username}</div>
					<div className="text-xs text-muted">@{user.username}</div>
				</div>
			</button>

			{open ? (
				<div className="account-menu absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 p-2">
					<div className="account-menu-surface px-4 py-3">
						<div className="font-bold text-tertiary">{user.globalName || user.username}</div>
						<div className="mt-1 text-sm text-muted">@{user.username}</div>
					</div>

					<div className="mt-2 grid gap-1">
						<Link className="account-menu-action" href="/settings" onClick={() => setOpen(false)} prefetch={false}>
							Site Settings
						</Link>
						<button
							className="account-menu-action account-menu-action-danger text-left disabled:opacity-50"
							disabled={busy}
							onClick={() => void logout()}
							type="button"
						>
							{busy ? 'Logging out...' : 'Logout'}
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
