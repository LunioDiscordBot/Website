'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiJson, API_BASE_URL, API_PREFIX, type AuthUser } from '@/lib/api';
import { clearAuthClientState } from '@/lib/auth-storage';
import { ThinkingOrb } from './thinking-orb';

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

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false);
		};

		window.addEventListener('mousedown', onPointerDown);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('mousedown', onPointerDown);
			window.removeEventListener('keydown', onKeyDown);
		};
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
			<Link className="dash-btn" href="/login" prefetch={false}>
				Log In
			</Link>
		);
	}

	const displayName = user.globalName || user.username;

	return (
		<div className="relative" ref={containerRef}>
			<button
				aria-controls="header-account-menu"
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={`Account menu for ${displayName}`}
				className="dash-btn gap-2 pl-1.5 pr-3"
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				{user.avatarUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img alt="" className="h-6 w-6 rounded-full object-cover" height={24} src={user.avatarUrl} width={24} />
				) : (
					<span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
						{(user.username ?? 'U').slice(0, 1).toUpperCase()}
					</span>
				)}
				<span className="max-w-[9rem] truncate">{displayName}</span>
			</button>

			{open ? (
				<div className="account-menu absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 p-1.5" id="header-account-menu" role="menu">
					<div className="px-2.5 py-2">
						<div className="truncate text-sm font-semibold">{displayName}</div>
						<div className="truncate text-xs text-muted">@{user.username}</div>
					</div>
					<div className="dash-divider my-1 border-t" />
					<Link className="account-menu-action" href="/servers" onClick={() => setOpen(false)} prefetch={false} role="menuitem">
						Dashboard
					</Link>
					<Link className="account-menu-action" href="/settings" onClick={() => setOpen(false)} prefetch={false} role="menuitem">
						Site Settings
					</Link>
					<div className="dash-divider my-1 border-t" />
					<button className="account-menu-action account-menu-action-danger" disabled={busy} onClick={() => void logout()} role="menuitem" type="button">
						{busy ? (
							<>
								<ThinkingOrb />
								Logging out…
							</>
						) : (
							'Log Out'
						)}
					</button>
				</div>
			) : null}
		</div>
	);
}
