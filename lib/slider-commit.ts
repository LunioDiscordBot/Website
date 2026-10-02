import type { PointerEvent } from 'react';

/**
 * Commit a range input when the pointer is released anywhere, not only over the input. An element-level
 * `onPointerUp` misses releases outside the slider, which left the slider stuck mid-drag without sending anything.
 * The committed value is read from the input at release time, so a commit callback captured at pointer-down
 * never sends a stale value.
 */
export function commitOnPointerRelease(event: PointerEvent<HTMLInputElement>, commit: (value: number) => void) {
	const input = event.currentTarget;
	const finish = () => {
		window.removeEventListener('pointerup', finish);
		window.removeEventListener('pointercancel', finish);
		commit(Number(input.value));
	};
	window.addEventListener('pointerup', finish);
	window.addEventListener('pointercancel', finish);
}
