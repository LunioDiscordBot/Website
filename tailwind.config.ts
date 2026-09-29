import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			colors: {
				background: 'rgb(var(--color-background) / <alpha-value>)',
				surface: 'rgb(var(--color-surface) / <alpha-value>)',
				panel: 'rgb(var(--color-panel) / <alpha-value>)',
				'panel-high': 'rgb(var(--color-panel-high) / <alpha-value>)',
				text: 'rgb(var(--color-text) / <alpha-value>)',
				muted: 'rgb(var(--color-muted) / <alpha-value>)',
				outline: 'rgb(var(--color-outline) / <alpha-value>)',
				primary: 'rgb(var(--color-primary) / <alpha-value>)',
				secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
				tertiary: 'rgb(var(--color-tertiary) / <alpha-value>)',
				success: 'rgb(var(--color-success) / <alpha-value>)',
				danger: 'rgb(var(--color-danger) / <alpha-value>)',
			},
			fontFamily: {
				headline: ['var(--font-space)', 'sans-serif'],
				body: ['var(--font-manrope)', 'sans-serif'],
			},
		},
	},
	plugins: [],
};

export default config;
