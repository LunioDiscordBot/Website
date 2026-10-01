// Adapted from RareFormLabs/thinking-orbs (MIT), commit e09bfa6.
// Copyright (c) 2026 Jakub Antalik. See thinking-orb.LICENSE.

export type OrbState = 'working' | 'searching';
type ModeDraw = (ctx: CanvasRenderingContext2D, size: number, t: number, dark: boolean, options: Record<string, number | undefined>) => void;

// Shared primitives for the dotted 3D thought-orbs. Ported from inkform
// (PlotterLab's HalftoneSphere lineage): honestly 3D — rotated,
// depth-shaded, z-sorted. Depth is carried by dot size and ink weight
// alone. Plain 2D canvas fills only: no ctx.filter, no SVG filters, so
// every mode renders identically in Chrome, Safari and Firefox.

export interface Dot {
	x: number;
	y: number;
	z: number;
	r: number;
	/** Ink value: 0 = darkest ink on paper. Mirrored on dark themes. */
	white: number;
	a?: number;
}

export type Projector = (x: number, y: number, z: number) => [number, number, number];

/** Deterministic hash in [0, 1). */
export function hashD(a: number, b: number): number {
	const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
	return h - Math.floor(h);
}

/** Stable directions on a unit sphere (Fibonacci lattice). */
export function fibDir(i: number, n: number): [number, number, number] {
	const golden = Math.PI * (3 - Math.sqrt(5));
	const y = 1 - (2 * (i + 0.5)) / n;
	const rad = Math.sqrt(1 - y * y);
	const a = i * golden;
	return [rad * Math.cos(a), y, rad * Math.sin(a)];
}

/** Shortest signed angular distance, wrapped to (-π, π]. */
export function angleDelta(a: number, b: number): number {
	return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Shared spin + tilt + orthographic projection. */
export function makeProj(yaw: number, tilt: number, cx: number, cy: number, scale: number): Projector {
	const st = Math.sin(tilt);
	const ct = Math.cos(tilt);
	const sy = Math.sin(yaw);
	const cyw = Math.cos(yaw);
	return (x, y, z) => {
		const x1 = x * cyw + z * sy;
		const z1 = -x * sy + z * cyw;
		const y1 = y * ct - z1 * st;
		const z2 = y * st + z1 * ct;
		return [cx + x1 * scale, cy - y1 * scale, z2];
	};
}

/**
 * Painter: z-sort far→near, matte grayscale dots. On dark substrates the
 * ink value is mirrored (1 - white) so near dots read bright — the same
 * depth language on an inverted substrate.
 */
export function paint(ctx: CanvasRenderingContext2D, dots: Dot[], dark: boolean, rMin = 0.3): void {
	dots.sort((a, b) => a.z - b.z);
	for (const d of dots) {
		const alpha = d.a ?? 1;
		if (alpha < 0.02) continue;
		const w = Math.min(1, Math.max(0, d.white));
		const g = Math.round((dark ? 1 - w : w) * 255);
		ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`;
		ctx.beginPath();
		ctx.arc(d.x, d.y, Math.max(rMin, d.r), 0, Math.PI * 2);
		ctx.fill();
	}
}

/**
 * Dot radii were tuned for a 300pt frame; sub-linear scaling keeps small
 * spinners legible. Lower pow = radii shrink less with size.
 */
export function radiusScale(size: number, pow: number): number {
	return (size / 300) ** pow;
}

// Orbits: particles on tilted orbits — the "working" state. No nucleus
// (the tuned preset runs coreless): just ghost paths and the particles
// doing the work.

export const drawOrbits: ModeDraw = (ctx, size, t, dark, o) => {
	const cx = size / 2;
	const cy = size / 2;
	const R = (size / 2) * 0.82;
	const pt = makeProj(t * 0.12, 0.3, cx, cy, 1);
	const rs = radiusScale(size, o.rsPow ?? 0.6);

	const dots: Dot[] = [];
	const orbitN = o.orbitN ?? 12;
	const ghostN = o.ghostN ?? 40;
	const particles = o.particles ?? 3;

	// orbits: each a tilted circle — a ghost path + running particles
	for (let orb = 0; orb < orbitN; orb++) {
		const h1 = hashD(orb, 1.7);
		const h2 = hashD(orb, 5.2);
		const h3 = hashD(orb, 8.9);
		const ro = R * (0.45 + 0.52 * h1);
		const th = h1 * 2 * Math.PI;
		const phi = Math.acos(2 * h2 - 1);
		// orbit plane basis (u, v ⟂ normal n)
		const nx = Math.sin(phi) * Math.cos(th);
		const ny = Math.cos(phi);
		const nz = Math.sin(phi) * Math.sin(th);
		let ux = -ny;
		let uy = nx;
		const uz = 0;
		const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
		ux /= ul;
		uy /= ul;
		const vx = ny * uz - nz * uy;
		const vy = nz * ux - nx * uz;
		const vz = nx * uy - ny * ux;
		const speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1);

		// ghost path
		for (let k = 0; k < ghostN; k++) {
			const a = (k / ghostN) * 2 * Math.PI;
			const [px, py, z] = pt((ux * Math.cos(a) + vx * Math.sin(a)) * ro, (uy * Math.cos(a) + vy * Math.sin(a)) * ro, (uz * Math.cos(a) + vz * Math.sin(a)) * ro);
			const depth = (z / ro + 1) / 2;
			dots.push({
				x: px,
				y: py,
				z,
				r: (o.ghostR ?? 0.9) * rs,
				white: 0.72,
				a: (o.ghostA ?? 0.5) * (0.4 + 0.6 * depth),
			});
		}
		// the particles doing the work
		for (let m = 0; m < particles; m++) {
			const a = t * speed + (m / particles) * 2 * Math.PI + h2 * 6;
			const [px, py, z] = pt((ux * Math.cos(a) + vx * Math.sin(a)) * ro, (uy * Math.cos(a) + vy * Math.sin(a)) * ro, (uz * Math.cos(a) + vz * Math.sin(a)) * ro);
			const depth = (z / ro + 1) / 2;
			dots.push({
				x: px,
				y: py,
				z,
				r: ((o.partR ?? 1.2) + (o.partRDepth ?? 1.6) * depth) * rs,
				white: 0.3 - 0.22 * depth,
			});
		}
	}
	paint(ctx, dots, dark, o.rMin);
};

export const drawGlobe: ModeDraw = (ctx, size, t, dark, o) => {
	const spin = 0.5;
	const cx = size / 2;
	const cy = size / 2;
	const radius = (size / 2) * 0.82;
	const tilt = 0.4 + 0.06 * Math.sin(t * 0.35);
	const pt = makeProj(t * spin, tilt, cx, cy, radius);
	// scan sweeps relative to the spin; scanMul scales that relative rate
	const scan = t * (spin + (1.7 - spin) * (o.scanMul ?? 1));
	const rs = radiusScale(size, o.rsPow ?? 0.6);
	const dimBase = o.dimBase ?? 1;

	const dots: Dot[] = [];
	const latRings = o.latRings ?? 17;
	const lonDensity = o.lonDensity ?? 44;
	for (let li = 0; li <= latRings; li++) {
		const lat = -Math.PI / 2 + (li / latRings) * Math.PI;
		const cosLat = Math.cos(lat);
		const sinLat = Math.sin(lat);
		const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
		for (let lj = 0; lj < lonCount; lj++) {
			const lon = (lj / lonCount) * 2 * Math.PI;
			const [px, py, z] = pt(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon));
			const depth = (z + 1) / 2;
			// the scan: a moving meridian read as a size ripple, not a shine
			const d = angleDelta(lon + t * spin, scan);
			const boost = Math.exp(-(d * d) / 0.18) * Math.max(0, z);
			dots.push({
				x: px,
				y: py,
				z,
				r: ((o.rBase ?? 0.6) + (o.rDepth ?? 1.7) * depth + (o.rBoost ?? 1) * boost) * rs,
				white: (o.inkFar ?? 0.62) - (o.inkSpan ?? 0.54) * depth,
				// dimBase < 1 fades un-scanned dots so the meridian reads clearly
				a: dimBase + (1 - dimBase) * Math.min(1, boost),
			});
		}
	}
	paint(ctx, dots, dark, o.rMin);
};

export function drawThinkingOrb(ctx: CanvasRenderingContext2D, size: number, seconds: number, dark: boolean, state: OrbState) {
	const inline = size <= 24;
	if (state === 'searching') {
		const count = Math.sqrt(inline ? 0.105 : 0.42);
		const scale = inline ? 1.75 : 1.15;
		drawGlobe(ctx, size, seconds * (inline ? 2.665 : 2.015), dark, {
			latRings: Math.round(17 * count),
			lonDensity: Math.round(44 * count),
			rBase: 0.6 * scale,
			rDepth: 1.7 * scale,
			scanMul: inline ? 4.335 : 4.08,
			dimBase: 0.45,
		});
	} else {
		const count = inline ? 0.238 : 1;
		const scale = inline ? 2.4 : 1;
		drawOrbits(ctx, size, seconds * (inline ? 3.9 : 1.885), dark, {
			orbitN: Math.round(12 * count),
			ghostN: Math.round(40 * count),
			ghostR: 0.9 * scale,
			partR: 1.2 * scale,
			partRDepth: 1.6 * scale,
		});
	}
}
