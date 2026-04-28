<script lang="ts">
	import { createTween } from '$lib/tween.svelte';
	import { onDestroy } from 'svelte';

	let {
		leftAccuracy = 0,
		rightAccuracy = 0,
		leftScore = 0,
		rightScore = 0,
		isReplay = false,
		replaySide = null as 'left' | 'right' | null,
		toBeatAccuracy = 0,
		toBeatScore = 0,
	} = $props<{
		leftAccuracy: number;
		rightAccuracy: number;
		leftScore: number;
		rightScore: number;
		isReplay?: boolean;
		replaySide?: 'left' | 'right' | null;
		toBeatAccuracy?: number;
		toBeatScore?: number;
	}>();

	const tLeftAcc = createTween(0, 150);
	const tRightAcc = createTween(0, 150);
	const tLeftScore = createTween(0, 150);
	const tRightScore = createTween(0, 150);

	$effect(() => { tLeftAcc.set(leftAccuracy); });
	$effect(() => { tRightAcc.set(rightAccuracy); });
	$effect(() => { tLeftScore.set(leftScore); });
	$effect(() => { tRightScore.set(rightScore); });

	onDestroy(() => {
		tLeftAcc.destroy();
		tRightAcc.destroy();
		tLeftScore.destroy();
		tRightScore.destroy();
	});

	function formatAccuracy(acc: number): string {
		return (acc * 100).toFixed(2) + "%";
	}

	function formatScore(score: number): string {
		return Math.round(score).toLocaleString();
	}

	function getDiff(
		acc: number,
		toBeat: number,
	): { text: string; isPositive: boolean } {
		const d = (acc * 100 - toBeat);
		const sign = d >= 0 ? "+" : "";
		return { text: sign + d.toFixed(2), isPositive: d >= 0 };
	}

	const leftDiff = $derived(getDiff(tLeftAcc.value, toBeatAccuracy));
	const rightDiff = $derived(getDiff(tRightAcc.value, toBeatAccuracy));
</script>

<div class="score-display geist">
	<div class="score-panel">
		<!-- Accuracy row -->
		<div class="accuracy-row">
			<div class="acc-side left">
				{#if isReplay}
					<span
						class="diff"
						class:positive={leftDiff.isPositive}
						class:negative={!leftDiff.isPositive}>
						{leftDiff.text}
					</span>
				{/if}
				<span class="accuracy left-color"
					>{formatAccuracy(tLeftAcc.value)}</span>
			</div>

			<div class="acc-divider"></div>

			<div class="acc-side right">
				<span class="accuracy right-color"
					>{formatAccuracy(tRightAcc.value)}</span>
				{#if isReplay}
					<span
						class="diff"
						class:positive={rightDiff.isPositive}
						class:negative={!rightDiff.isPositive}>
						{rightDiff.text}
					</span>
				{/if}
			</div>
		</div>

		<!-- Score row -->
		<div class="total-score-row">
			<div class="score-side left">
				<span class="total-score">{formatScore(tLeftScore.value)}</span>
			</div>
			<div class="score-divider"></div>
			<div class="score-side right">
				<span class="total-score">{formatScore(tRightScore.value)}</span>
			</div>
		</div>
	</div>

	<!-- Score to beat -->
	{#if isReplay}
		<div class="score-to-beat">
			<div class="stb-corner stb-tl"></div>
			<div class="stb-corner stb-br"></div>
			<span class="stb-label">SCORE TO BEAT</span>
			<div class="stb-values">
				<span class="stb-acc">{(toBeatAccuracy).toFixed(2)}%</span>
				<span class="stb-sep">│</span>
				<span class="stb-score">{formatScore(toBeatScore)}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.score-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		width: 100%;
	}

	.score-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		/* background: rgba(0, 0, 0, 0.55); */
		padding: 14px 36px 10px;
	}

	/* Accuracy row */
	.accuracy-row {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		gap: 16px;
	}

	.acc-side {
		display: flex;
		align-items: baseline;
		gap: 10px;
		width: 380px;
		flex-shrink: 0;
	}

	.acc-side.left {
		justify-content: flex-end;
	}
	.acc-side.right {
		justify-content: flex-start;
	}

	.acc-divider {
		width: 2px;
		height: 40px;
		background: rgba(255, 255, 255, 0.15);
		flex-shrink: 0;
	}

	.accuracy {
		font-family: "Orbitron", sans-serif;
		font-size: 48px;
		font-weight: 700;
		letter-spacing: 1px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.left-color {
		color: #d63b4b;
	}

	.right-color {
		color: #4b79ff;
	}

	/* Diff badges */
	.diff {
		font-family: "Orbitron", sans-serif;
		font-size: 22px;
		font-weight: 600;
		letter-spacing: 0.5px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.diff.positive {
		color: #3cb371;
	}

	.diff.negative {
		color: #e8112d;
	}

	/* Score row */
	.total-score-row {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		gap: 16px;
	}

	.score-side {
		display: flex;
		align-items: center;
		width: 380px;
		flex-shrink: 0;
	}

	.score-side.left {
		justify-content: flex-end;
	}
	.score-side.right {
		justify-content: flex-start;
	}

	.score-divider {
		width: 2px;
		height: 24px;
		background: rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	.total-score {
		font-family: "Orbitron", sans-serif;
		font-size: 28px;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 1px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	/* Score to beat — boxy with corner accents */
	.score-to-beat {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 32px;
		background: rgba(12, 12, 12, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.stb-corner {
		position: absolute;
		width: 8px;
		height: 8px;
		pointer-events: none;
	}

	.stb-tl {
		top: -1px;
		left: -1px;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		border-left: 1px solid rgba(255, 255, 255, 0.12);
	}

	.stb-br {
		bottom: -1px;
		right: -1px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		border-right: 1px solid rgba(255, 255, 255, 0.12);
	}

	.stb-label {
		font-size: 11px;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.6);
		letter-spacing: 3px;
		text-transform: uppercase;
		line-height: 1;
	}

	.stb-values {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.stb-acc,
	.stb-score {
		font-family: "Orbitron", sans-serif;
		font-size: 24px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.88);
		line-height: 1;
	}

	.stb-sep {
		color: rgba(255, 255, 255, 0.2);
		font-size: 20px;
	}
</style>
