<script lang="ts">
	let { leftAccuracy = 0, rightAccuracy = 0 } = $props<{
		leftAccuracy: number;
		rightAccuracy: number;
	}>();

	// Positive diff = left player leading → center shifts right
	const diff = $derived(leftAccuracy - rightAccuracy);

	// Logarithmic scaling so tiny and large differences both look good
	// Maps diffs from ~0.001 to 0.5+ into a 0–48 % shift from center
	const shift = $derived.by(() => {
		const absDiff = Math.abs(diff);
		if (absDiff < 0.00001) return 0;
		const scaled = Math.log10(1 + absDiff * 1000) / Math.log10(1001);
		return Math.sign(diff) * Math.min(scaled * 50, 48);
	});

	const leftPercent = $derived(50 + shift);
	const rightPercent = $derived(50 - shift);

	// Static ember particle configs (randomised once at mount)
	const embers = [
		{ delay: "0s", x: "-8px", dur: "0.9s" },
		{ delay: "0.15s", x: "6px", dur: "1.1s" },
		{ delay: "0.35s", x: "-12px", dur: "0.8s" },
		{ delay: "0.5s", x: "10px", dur: "1.0s" },
		{ delay: "0.7s", x: "-4px", dur: "1.2s" },
		{ delay: "0.85s", x: "14px", dur: "0.85s" },
		{ delay: "0.25s", x: "-15px", dur: "1.05s" },
		{ delay: "0.6s", x: "3px", dur: "0.95s" },
		{ delay: "0.1s", x: "11px", dur: "0.75s" },
		{ delay: "0.45s", x: "-6px", dur: "1.15s" },
	];
</script>

<div class="tow-wrapper">
	<!-- Left bar (white) -->
	<div class="tow-bar left" style="width: {leftPercent}%">
		<div class="bar-fill"></div>
		<div class="bar-shimmer"></div>
		<div class="bar-edge"></div>
	</div>

	<!-- Right bar (Canadian red) -->
	<div class="tow-bar right" style="width: {rightPercent}%">
		<div class="bar-fill"></div>
		<div class="bar-shimmer"></div>
		<div class="bar-edge"></div>
	</div>

	<!-- Fire / ember center point -->
	<div class="tow-flame" style="left: {leftPercent}%">
		<div class="flame-outer"></div>
		<div class="flame-core"></div>
		<div class="flame-ring"></div>
		{#each embers as ember}
			<div
				class="ember"
				style="--delay: {ember.delay}; --x-offset: {ember.x}; --duration: {ember.dur}">
			</div>
		{/each}
	</div>
</div>

<style>
	.tow-wrapper {
		position: relative;
		width: 100%;
		height: 40px;
		display: flex;
		align-items: center;
	}

	/* Bars */
	.tow-bar {
		position: absolute;
		height: 10px;
		top: 50%;
		transform: translateY(-50%);
		transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		overflow: hidden;
		border-radius: 2px;
	}

	.tow-bar.left {
		left: 0;
	}
	.tow-bar.right {
		right: 0;
	}

	/* Solid gradient fill */
	.bar-fill {
		position: absolute;
		inset: 0;
	}

	.left .bar-fill {
		background: linear-gradient(
			to right,
			rgba(255, 255, 255, 0.1) 0%,
			rgba(255, 255, 255, 0.45) 60%,
			rgba(255, 255, 255, 0.92) 100%
		);
		box-shadow: 0 0 14px 3px rgba(255, 255, 255, 0.2);
	}

	.right .bar-fill {
		background: linear-gradient(
			to left,
			rgba(196, 30, 58, 0.1) 0%,
			rgba(196, 30, 58, 0.45) 60%,
			rgba(232, 17, 45, 0.92) 100%
		);
		box-shadow: 0 0 14px 3px rgba(196, 30, 58, 0.2);
	}

	/* Hot edge nearest the flame */
	.bar-edge {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 40px;
	}

	.left .bar-edge {
		right: 0;
		background: linear-gradient(
			to right,
			transparent,
			rgba(255, 220, 120, 0.3)
		);
	}

	.right .bar-edge {
		left: 0;
		background: linear-gradient(
			to left,
			transparent,
			rgba(255, 120, 40, 0.3)
		);
	}

	/* Shimmer / energy flow */
	.bar-shimmer {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.left .bar-shimmer::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 255, 255, 0.3) 40%,
			rgba(255, 255, 255, 0.5) 50%,
			rgba(255, 255, 255, 0.3) 60%,
			transparent 100%
		);
		background-size: 200% 100%;
		animation: shimmer-right 2.4s linear infinite;
	}

	.right .bar-shimmer::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			270deg,
			transparent 0%,
			rgba(232, 85, 46, 0.3) 40%,
			rgba(232, 85, 46, 0.5) 50%,
			rgba(232, 85, 46, 0.3) 60%,
			transparent 100%
		);
		background-size: 200% 100%;
		animation: shimmer-left 2.4s linear infinite;
	}

	@keyframes shimmer-right {
		0% {
			background-position: -100% 0;
		}
		100% {
			background-position: 100% 0;
		}
	}

	@keyframes shimmer-left {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: 0% 0;
		}
	}

	/* Flame / ember center */
	.tow-flame {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 6px;
		height: 40px;
		z-index: 10;
		pointer-events: none;
		transition: left 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.flame-core {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 6px;
		height: 16px;
		transform: translate(-50%, -50%);
		background: #fffbe6;
		border-radius: 3px;
		box-shadow:
			0 0 6px 2px rgba(255, 240, 180, 1),
			0 0 14px 4px rgba(255, 180, 60, 0.85),
			0 0 28px 8px rgba(255, 100, 20, 0.6),
			0 0 48px 14px rgba(255, 50, 10, 0.3);
		animation: flame-pulse 0.7s ease-in-out infinite alternate;
	}

	.flame-outer {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 24px;
		height: 32px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background: radial-gradient(
			ellipse at center,
			rgba(255, 200, 80, 0.25) 0%,
			rgba(255, 100, 20, 0.1) 40%,
			transparent 70%
		);
		animation: flame-breathe 1.2s ease-in-out infinite alternate;
	}

	.flame-ring {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 40px;
		height: 40px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		border: 1px solid rgba(255, 160, 40, 0.12);
		box-shadow: 0 0 18px 5px rgba(255, 120, 30, 0.06);
		animation: ring-pulse 1.8s ease-in-out infinite;
	}

	@keyframes flame-pulse {
		0% {
			box-shadow:
				0 0 6px 2px rgba(255, 240, 180, 1),
				0 0 14px 4px rgba(255, 180, 60, 0.85),
				0 0 28px 8px rgba(255, 100, 20, 0.6),
				0 0 48px 14px rgba(255, 50, 10, 0.3);
		}
		100% {
			box-shadow:
				0 0 8px 3px rgba(255, 250, 200, 1),
				0 0 20px 7px rgba(255, 200, 80, 0.9),
				0 0 38px 12px rgba(255, 120, 30, 0.65),
				0 0 60px 20px rgba(255, 60, 15, 0.35);
		}
	}

	@keyframes flame-breathe {
		0% {
			opacity: 0.6;
			transform: translate(-50%, -50%) scale(0.85);
		}
		100% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.2);
		}
	}

	@keyframes ring-pulse {
		0% {
			opacity: 0.2;
			transform: translate(-50%, -50%) scale(0.75);
		}
		50% {
			opacity: 0.5;
			transform: translate(-50%, -50%) scale(1.15);
		}
		100% {
			opacity: 0.2;
			transform: translate(-50%, -50%) scale(0.75);
		}
	}

	/* Ember particles ─ */
	.ember {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: rgba(255, 200, 80, 0.95);
		box-shadow: 0 0 4px 1px rgba(255, 150, 40, 0.7);
		animation: ember-rise var(--duration, 1s) ease-out infinite;
		animation-delay: var(--delay, 0s);
		pointer-events: none;
	}

	@keyframes ember-rise {
		0% {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
		50% {
			opacity: 0.85;
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--x-offset, 0px)), -38px)
				scale(0.15);
		}
	}
</style>
