<script lang="ts">
	let {
		leftAccuracy = 0,
		rightAccuracy = 0,
		leftScore = 0,
		rightScore = 0,
		isReplay = false,
		toBeatAccuracy = 0,
		toBeatScore = 0,
	} = $props<{
		leftAccuracy: number;
		rightAccuracy: number;
		leftScore: number;
		rightScore: number;
		isReplay?: boolean;
		toBeatAccuracy?: number;
		toBeatScore?: number;
	}>();

	function formatAccuracy(acc: number): string {
		return (acc * 100).toFixed(2) + "%";
	}

	function formatScore(score: number): string {
		return score.toLocaleString();
	}

	function getDiff(
		acc: number,
		toBeat: number,
	): { text: string; isPositive: boolean } {
		const d = (acc * 100 - toBeat);
		const sign = d >= 0 ? "+" : "";
		return { text: sign + d.toFixed(2), isPositive: d >= 0 };
	}

	const leftDiff = $derived(getDiff(leftAccuracy, toBeatAccuracy));
	const rightDiff = $derived(getDiff(rightAccuracy, toBeatAccuracy));
</script>

<div class="score-display">
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
				>{formatAccuracy(leftAccuracy)}</span>
		</div>

		<div class="acc-divider"></div>

		<div class="acc-side right">
			<span class="accuracy right-color"
				>{formatAccuracy(rightAccuracy)}</span>
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
			<span class="total-score">{formatScore(leftScore)}</span>
		</div>
		<div class="score-divider"></div>
		<div class="score-side right">
			<span class="total-score">{formatScore(rightScore)}</span>
		</div>
	</div>

	<!-- Replay "Score to Beat" indicator -->
	{#if isReplay}
		<div class="replay-indicator">
			<span class="replay-label">SCORE TO BEAT</span>
			<div class="replay-values">
				<span class="replay-acc">{toBeatAccuracy.toFixed(2)}</span>
				<span class="replay-sep">|</span>
				<span class="replay-score">{formatScore(toBeatScore)}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.score-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		width: 100%;
	}

	/* Accuracy row */
	.accuracy-row {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		gap: 14px;
	}

	.acc-side {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.acc-side.left {
		justify-content: flex-end;
		flex: 1;
	}
	.acc-side.right {
		justify-content: flex-start;
		flex: 1;
	}

	.acc-divider {
		width: 2px;
		height: 38px;
		background: linear-gradient(
			180deg,
			transparent,
			rgba(255, 255, 255, 0.25),
			transparent
		);
		flex-shrink: 0;
	}

	.accuracy {
		/* font-family: "Keania", sans-serif; */
		font-family: "Orbitron", sans-serif;
		font-size: 46px;
		font-weight: 400;
		letter-spacing: 1px;
		text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
		line-height: 1;
	}

	.left-color {
		color: #ffffff;
	}

	.right-color {
		color: #f01035;
		text-shadow: 0 2px 14px rgba(196, 30, 58, 0.55);
	}

	/* Diff badges */
	.diff {
		font-family: "Orbitron", sans-serif;
		font-size: 22px;
		font-weight: 400;
		letter-spacing: 0.5px;
		line-height: 1;
	}

	.diff.positive {
		color: #3cb371;
		text-shadow: 0 0 8px rgba(60, 179, 113, 0.45);
	}

	.diff.negative {
		color: #e8112d;
		text-shadow: 0 0 8px rgba(232, 17, 45, 0.45);
	}

	/* Score row */
	.total-score-row {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		gap: 14px;
	}

	.score-side {
		display: flex;
		align-items: center;
	}

	.score-side.left {
		justify-content: flex-end;
		flex: 1;
	}
	.score-side.right {
		justify-content: flex-start;
		flex: 1;
	}

	.score-divider {
		width: 2px;
		height: 26px;
		background: linear-gradient(
			180deg,
			transparent,
			rgba(255, 255, 255, 0.12),
			transparent
		);
		flex-shrink: 0;
	}

	.total-score {
		font-family: "Orbitron", sans-serif;
		font-size: 30px;
		font-weight: 400;
		color: #8a8a8e;
		letter-spacing: 1px;
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
		line-height: 1;
	}

	/* Replay indicator */
	.replay-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 6px;
		padding: 5px 22px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(196, 30, 58, 0.45);
		border-radius: 6px;
	}

	.replay-label {
		font-family: "Orbitron", sans-serif;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.55);
		letter-spacing: 3px;
		text-transform: uppercase;
		line-height: 1;
		margin-bottom: 3px;
	}

	.replay-values {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.replay-acc,
	.replay-score {
		font-family: "Orbitron", sans-serif;
		font-size: 20px;
		color: #e8552e;
		text-shadow: 0 0 8px rgba(232, 85, 46, 0.4);
		line-height: 1;
	}

	.replay-sep {
		color: rgba(255, 255, 255, 0.25);
		font-size: 18px;
	}
</style>
