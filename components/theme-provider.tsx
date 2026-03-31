'use client';

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { isThemePreference, resolveThemePreference, THEME_STORAGE_KEY, type ResolvedTheme, type ThemePreference } from '@/lib/theme';

type ThemeContextValue = {
	preference: ThemePreference;
	resolvedTheme: ResolvedTheme;
	setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPrefersDark() {
	if (typeof window === 'undefined') return true;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeToDocument(preference: ThemePreference, resolvedTheme: ResolvedTheme) {
	const root = document.documentElement;
	root.dataset.themePreference = preference;
	root.dataset.theme = resolvedTheme;
	root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: PropsWithChildren) {
	const [preference, setPreferenceState] = useState<ThemePreference>('system');
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

	useEffect(() => {
		const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
		const nextPreference = isThemePreference(storedPreference) ? storedPreference : 'system';
		const nextResolvedTheme = resolveThemePreference(nextPreference, getSystemPrefersDark());

		setPreferenceState(nextPreference);
		setResolvedTheme(nextResolvedTheme);
		applyThemeToDocument(nextPreference, nextResolvedTheme);
	}, []);

	useEffect(() => {
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			setResolvedTheme((currentResolvedTheme) => {
				if (preference !== 'system') return currentResolvedTheme;
				const nextResolvedTheme = resolveThemePreference('system', media.matches);
				applyThemeToDocument('system', nextResolvedTheme);
				return nextResolvedTheme;
			});
		};

		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	}, [preference]);

	const setPreference = (nextPreference: ThemePreference) => {
		const nextResolvedTheme = resolveThemePreference(nextPreference, getSystemPrefersDark());

		window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
		setPreferenceState(nextPreference);
		setResolvedTheme(nextResolvedTheme);
		applyThemeToDocument(nextPreference, nextResolvedTheme);
	};

	const value = useMemo(
		() => ({
			preference,
			resolvedTheme,
			setPreference,
		}),
		[preference, resolvedTheme]
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}

	return context;
}
