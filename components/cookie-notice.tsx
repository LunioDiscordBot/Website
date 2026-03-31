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
		<div className="fixed bottom-4 left-4 right-4 z-[70] sm:left-6 sm:right-6 lg:left-auto lg:right-6 lg:max-w-md">
			<div className="panel rounded-[1.6rem] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
				<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Cookie Notice</div>
				<p className="mt-3 text-sm leading-7 text-muted">
					Lunio uses cookies to keep you signed in, secure your session, and remember basic site preferences on this device.
				</p>
				<div className="mt-4 flex flex-wrap gap-3">
					<a className="secondary-button" href="/privacy">
						Privacy
					</a>
					<button className="primary-button" onClick={dismiss} type="button">
						Understood
					</button>
				</div>
			</div>
		</div>
	);
}
