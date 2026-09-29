'use client';

import { useEffect, useState } from 'react';

const COOKIE_NOTICE_KEY = 'lunio.cookie_notice.dismissed';

export function CookieNotice() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		try {
			const dismissed = window.localStorage.getItem(COOKIE_NOTICE_KEY);
			setVisible(dismissed !== 'true');
		} catch {
			setVisible(true);
		}
	}, []);

	const dismiss = () => {
		try {
			window.localStorage.setItem(COOKIE_NOTICE_KEY, 'true');
		} catch {
			// Ignore storage failures and just hide the banner for this render.
		}
		setVisible(false);
	};

	if (!visible) {
		return null;
	}

	return (
		<div aria-label="Cookie notice" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[70] sm:left-auto sm:right-6 sm:max-w-sm" role="region">
			<div className="dash-card p-4 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
				<h2 className="text-sm font-semibold">Cookies</h2>
				<p className="mt-1 text-sm leading-6 text-muted">
					Lunio uses cookies to keep you signed in, secure your session, and remember your site preferences on this device.
				</p>
				<div className="mt-3 flex gap-2">
					<button className="dash-btn dash-btn-primary h-8 px-3" onClick={dismiss} type="button">
						Got It
					</button>
					<a className="dash-btn h-8 px-3" href="/privacy">
						Privacy Policy
					</a>
				</div>
			</div>
		</div>
	);
}
