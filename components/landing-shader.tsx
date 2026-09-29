'use client';

import { useEffect, useRef } from 'react';

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

float fbm(vec2 p) {
	float value = 0.0;
	float amplitude = 0.48;
	for (int i = 0; i < 5; i++) {
		value += amplitude * noise(p);
		p = mat2(1.62, -1.11, 1.11, 1.62) * p + 0.17;
		amplitude *= 0.52;
	}
	return value;
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_resolution.xy;
	vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
	vec2 pointer = (u_pointer * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);

	float t = u_time * 0.08;
	float field = fbm(p * 1.25 + vec2(t, -t * 0.72));
	float bands = sin((p.x * 2.1 + p.y * 1.4 + field * 2.8 - u_time * 0.22) * 3.14159);
	float ribbon = smoothstep(0.18, 0.9, bands * 0.5 + 0.5);
	float pointerGlow = 0.16 / max(0.18, length(p - pointer));
	float centerLift = smoothstep(1.35, 0.12, length(p - vec2(0.12, -0.12)));

	vec3 ink = vec3(0.015, 0.018, 0.019);
	vec3 cyan = vec3(0.0, 0.96, 1.0);
	vec3 rose = vec3(1.0, 0.24, 0.58);
	vec3 lime = vec3(0.52, 0.95, 0.67);
	vec3 blue = vec3(0.16, 0.28, 0.88);

	vec3 color = ink;
	color += cyan * ribbon * 0.18;
	color += rose * (1.0 - ribbon) * field * 0.12;
	color += lime * centerLift * 0.08;
	color += blue * smoothstep(1.0, 0.0, length(p - vec2(-0.72, 0.42))) * 0.18;
	color += cyan * pointerGlow * 0.06;

	float vignette = smoothstep(1.35, 0.18, length(p));
	float grain = hash(gl_FragCoord.xy + u_time) * 0.026;
	color = mix(ink, color, 0.64 + vignette * 0.36) + grain;

	gl_FragColor = vec4(color, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

export function LandingShader({ paused = false }: { paused?: boolean }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const pausedRef = useRef(paused);
	const resumeRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		pausedRef.current = paused;
		if (!paused) resumeRef.current?.();
	}, [paused]);

	useEffect(() => {
		const canvas = canvasRef.current;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
		if (!canvas || !gl) return;

		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
		if (!vertexShader || !fragmentShader) return;

		const program = gl.createProgram();
		if (!program) return;
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

		const positionBuffer = gl.createBuffer();
		const positionLocation = gl.getAttribLocation(program, 'a_position');
		const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
		const timeLocation = gl.getUniformLocation(program, 'u_time');
		const pointerLocation = gl.getUniformLocation(program, 'u_pointer');
		const pointer = { x: 0.58, y: 0.38 };
		let animationFrame = 0;
		let start = performance.now();

		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

		const onPointerMove = (event: PointerEvent) => {
			pointer.x += (event.clientX / window.innerWidth - pointer.x) * 0.28;
			pointer.y += (1 - event.clientY / window.innerHeight - pointer.y) * 0.28;
		};

		const resize = () => {
			const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.7);
			const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
			const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			gl.viewport(0, 0, width, height);
		};

		const render = (now: number) => {
			resize();
			gl.useProgram(program);
			gl.enableVertexAttribArray(positionLocation);
			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
			gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
			gl.uniform1f(timeLocation, reducedMotion ? 8 : (now - start) / 1000);
			gl.uniform2f(pointerLocation, pointer.x, pointer.y);
			gl.drawArrays(gl.TRIANGLES, 0, 6);

			if (!reducedMotion && !pausedRef.current && document.visibilityState === 'visible') {
				animationFrame = window.requestAnimationFrame(render);
			} else {
				animationFrame = 0;
			}
		};

		// Restart the loop after a pause or when the tab becomes visible again.
		const resume = () => {
			if (reducedMotion || animationFrame || pausedRef.current || document.visibilityState !== 'visible') return;
			animationFrame = window.requestAnimationFrame(render);
		};
		resumeRef.current = resume;

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('resize', resize);
		document.addEventListener('visibilitychange', resume);
		animationFrame = window.requestAnimationFrame((now) => {
			start = now;
			render(now);
		});

		return () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('resize', resize);
			document.removeEventListener('visibilitychange', resume);
			resumeRef.current = null;
			window.cancelAnimationFrame(animationFrame);
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			if (positionBuffer) gl.deleteBuffer(positionBuffer);
		};
	}, []);

	return <canvas aria-hidden="true" className="landing-shader-canvas" ref={canvasRef} />;
}
