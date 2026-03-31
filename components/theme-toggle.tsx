'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import { type ThemePreference } from '@/lib/theme';

function ThemeIcon({ preference, className = 'h-4 w-4' }: { preference: ThemePreference; className?: string }) {
	const sharedProps = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.9,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		'aria-hidden': true,
	};

	if (preference === 'light') {
		return (
			<svg {...sharedProps}>
				<circle cx="12" cy="12" r="4.25" />
				<path d="M12 2.5v2.25" />
				<path d="M12 19.25v2.25" />
				<path d="m4.93 4.93 1.6 1.6" />
				<path d="m17.47 17.47 1.6 1.6" />
				<path d="M2.5 12h2.25" />
				<path d="M19.25 12h2.25" />
				<path d="m4.93 19.07 1.6-1.6" />
				<path d="m17.47 6.53 1.6-1.6" />
			</svg>
		);
	}

	if (preference === 'dark') {
		return (
			<svg {...sharedProps}>
				<path d="M20 14.25A7.75 7.75 0 1 1 9.75 4 6.25 6.25 0 0 0 20 14.25Z" />
			</svg>
		);
	}

	return (
		<svg {...sharedProps}>
			<rect x="4.5" y="5.5" width="15" height="10.5" rx="2.25" />
			<path d="M8.5 19.5h7" />
			<path d="M12 16v3.5" />
		</svg>
	);
}

export function ThemeToggle() {
	const { preference, setPreference } = useTheme();
	const [animationTick, setAnimationTick] = useState(0);
	const timeoutRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				window.clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const nextPreference = preference === 'system' ? 'dark' : preference === 'dark' ? 'light' : 'system';

	const nextLabel = nextPreference === 'system' ? 'System' : nextPreference === 'dark' ? 'Dark' : 'Light';

	const currentLabel = preference === 'system' ? 'System' : preference === 'dark' ? 'Dark' : 'Light';

	const cycleTheme = () => {
		setPreference(nextPreference);
		setAnimationTick((current) => current + 1);
		if (timeoutRef.current) {
			window.clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = window.setTimeout(() => {
			timeoutRef.current = null;
		}, 260);
	};

	return (
		<button
			aria-label={`Theme: ${currentLabel}. Click to switch to ${nextLabel}.`}
			className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition hover:bg-white/[0.08] hover:text-white"
			onClick={cycleTheme}
			title={`Theme: ${currentLabel}. Click to switch to ${nextLabel}.`}
			type="button"
		>
			<span className="inline-flex items-center justify-center text-primary" key={`${preference}-${animationTick}`}>
				<span className="inline-flex animate-[theme-pop_260ms_ease] items-center justify-center">
					<ThemeIcon className="h-[18px] w-[18px]" preference={preference} />
				</span>
			</span>
		</button>
	);
}
