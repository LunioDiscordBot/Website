'use client';

import { useEffect, useRef } from 'react';
import { drawThinkingOrb, type OrbState } from '@/lib/thinking-orb';

/** Decorative orb; its parent supplies the loading announcement. */
export function ThinkingOrb({ className = '', size = 20, state = 'working' }: { className?: string; size?: 20 | 64; state?: OrbState }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;

		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = size * pixelRatio;
		canvas.height = size * pixelRatio;
		ctx.scale(pixelRatio, pixelRatio);

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let visible = false;
		let frameId = 0;
		let lastPaint = 0;
		let dark = document.documentElement.dataset.theme !== 'light';

		const paint = (time: number) => {
			ctx.clearRect(0, 0, size, size);
			drawThinkingOrb(ctx, size, reducedMotion.matches ? 1.4 : time / 1000, dark, state);
		};
		const tick = (time: number) => {
			// These small indicators only need 30 fps, including on high refresh displays.
			if (time - lastPaint >= 1000 / 30) {
				paint(time);
				lastPaint = time;
			}
			frameId = window.requestAnimationFrame(tick);
		};
		const syncAnimation = () => {
			window.cancelAnimationFrame(frameId);
			paint(performance.now());
			if (visible && !document.hidden && !reducedMotion.matches) {
				frameId = window.requestAnimationFrame(tick);
			}
		};
		const visibilityObserver = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			syncAnimation();
		});
		const themeObserver = new MutationObserver(() => {
			dark = document.documentElement.dataset.theme !== 'light';
			syncAnimation();
		});

		visibilityObserver.observe(canvas);
		themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		reducedMotion.addEventListener('change', syncAnimation);
		document.addEventListener('visibilitychange', syncAnimation);
		paint(performance.now());

		return () => {
			window.cancelAnimationFrame(frameId);
			visibilityObserver.disconnect();
			themeObserver.disconnect();
			reducedMotion.removeEventListener('change', syncAnimation);
			document.removeEventListener('visibilitychange', syncAnimation);
		};
	}, [size, state]);

	return <canvas aria-hidden="true" className={`block shrink-0 ${className}`} height={size} ref={canvasRef} width={size} />;
}
