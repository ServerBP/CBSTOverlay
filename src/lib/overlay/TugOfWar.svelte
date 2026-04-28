<script lang="ts">
  export let leftAccuracy: number = 0;
  export let rightAccuracy: number = 0;

  // Helper: accept either 0..1 or 0..100 inputs, normalize to 0..100
  function toPercent(v: number) {
	if (v == null) return 0;
	return v <= 1 ? v * 100 : v;
  }

  $: leftP = toPercent(leftAccuracy);
  $: rightP = toPercent(rightAccuracy);

  // positive diff => right is leading, negative => left is leading
  $: diff = rightP - leftP;
  $: absDiff = Math.abs(diff);

  // Clamp to valid percent range first so scale is stable even with noisy values.
  $: clampedDiff = Math.min(absDiff, 100);

  // Log curve normalized to 0..50% of total width (each side max 50%).
  // Power-shaping (<1) makes mid-range gaps more dramatic while staying logarithmic.
  // Example: 84 vs 92 (~8 diff) now lands above halfway to the max extension.
  const logCurveExponent = 0.58;
  $: widthPct =
    clampedDiff === 0
      ? 0
      : Math.pow(Math.log1p(clampedDiff) / Math.log1p(100), logCurveExponent) * 50;

  $: leftWidth = diff < 0 ? `${widthPct}%` : "0%";
  $: rightWidth = diff > 0 ? `${widthPct}%` : "0%";
</script>

<div class="tow-wrapper" aria-hidden="true">
  <div class="tow-bar left" id="LeftTug" style="width: {leftWidth}"></div>
  <div class="tow-bar right" id="RightTug" style="width: {rightWidth}"></div>
  <div class="center-mark"></div>
</div>

<style>
  .tow-wrapper {
	position: relative;
	width: 100%;
	height: 18px;
  }

  /* thin bars that grow outward from center */
  .tow-bar {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	height: 8px;
	border-radius: 2px;
	transition: width 420ms cubic-bezier(0.22, 0.9, 0.35, 1);
  }

  /* left bar anchors at center and grows left */
  .tow-bar.left {
	right: 50%;
	transform-origin: right center;
	background: linear-gradient(90deg, #ff5a5a, #d82d2d);
	box-shadow: 0 0 6px rgba(216, 45, 45, 0.25);
  }

  /* right bar anchors at center and grows right */
  .tow-bar.right {
	left: 50%;
	transform-origin: left center;
	background: linear-gradient(90deg, #3aa0ff, #1b66ff);
	box-shadow: 0 0 6px rgba(27, 102, 255, 0.2);
  }

  /* subtle center mark for reference (optional) */
  .center-mark {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 2px;
	height: 10px;
	background: rgba(255, 255, 255, 0.06);
	pointer-events: none;
  }
</style>
