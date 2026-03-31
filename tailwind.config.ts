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
			boxShadow: {
				cyan: '0 0 30px rgba(0, 255, 255, 0.18)',
				pink: '0 0 30px rgba(253, 104, 179, 0.18)',
			},
			backgroundImage: {
				'hero-grid':
					'radial-gradient(circle at top right, rgba(0,255,255,0.14), transparent 30%), radial-gradient(circle at bottom left, rgba(253,104,179,0.12), transparent 25%), linear-gradient(180deg, #0b0b0b 0%, #0e0e0e 46%, #090909 100%)',
			},
			borderRadius: {
				xl2: '1.375rem',
				xl3: '1.75rem',
			},
		},
	},
	plugins: [],
};

export default config;
