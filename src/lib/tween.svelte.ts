/**
 * Tweening utility for smooth value animation.
 * Uses requestAnimationFrame with cubic ease-out.
 * Immediately retargets on new values — no backlog.
 */
export function createTween(initial: number = 0, duration: number = 150) {
	let current = $state(initial);
	let _target = initial;
	let _start = initial;
	let _startTime = 0;
	let _rafId: number | null = null;

	function animate() {
		const elapsed = performance.now() - _startTime;
		const t = Math.min(elapsed / duration, 1);
		const eased = 1 - Math.pow(1 - t, 3);
		current = _start + (_target - _start) * eased;

		if (t < 1) {
			_rafId = requestAnimationFrame(animate);
		} else {
			current = _target;
			_rafId = null;
		}
	}

	return {
		get value() { return current; },
		set(value: number) {
			if (value === _target) return;
			_start = current;
			_target = value;
			_startTime = performance.now();
			if (_rafId !== null) cancelAnimationFrame(_rafId);
			_rafId = requestAnimationFrame(animate);
		},
		destroy() {
			if (_rafId !== null) cancelAnimationFrame(_rafId);
		},
	};
}
