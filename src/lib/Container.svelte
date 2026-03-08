<script lang="ts">
	let {
		width = '32rem',
		height = '6rem',
		lineColor = 'rgba(255, 255, 255, 0.75)',
		plusColor = 'rgba(255, 255, 255, 0.95)',
		children
	} = $props<{
		width?: string;
		height?: string;
		lineColor?: string;
		plusColor?: string;
		children?: () => unknown;
	}>();
</script>

<div
	class="container"
	style={`--container-width: ${width}; --container-height: ${height}; --line-color: ${lineColor}; --plus-color: ${plusColor};`}
>
	<div class="corner top-left"><span class="h"></span><span class="v"></span></div>
	<div class="corner top-right"><span class="h"></span><span class="v"></span></div>
	<div class="corner bottom-left"><span class="h"></span><span class="v"></span></div>
	<div class="corner bottom-right"><span class="h"></span><span class="v"></span></div>

	<div class="inner">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.container {
		position: relative;
		width: var(--container-width);
		height: var(--container-height);
		border: 2px solid var(--line-color);
	}

	.inner {
		width: 100%;
		height: 100%;
		padding: 1.5rem;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.corner {
		position: absolute;
		width: 1.5rem;
		height: 1.5rem;
		pointer-events: none;
	}

	.corner .h,
	.corner .v {
		position: absolute;
		background: var(--plus-color);
		border-radius: 99px;
	}

	.corner .h {
		top: 50%;
		left: 0;
		width: 100%;
		height: 4px;
		transform: translateY(-50%);
	}

	.corner .v {
		top: 0;
		left: 50%;
		width: 4px;
		height: 100%;
		transform: translateX(-50%);
	}

	.top-left {
		top: -0.75rem;
		left: -0.75rem;
	}

	.top-right {
		top: -0.75rem;
		right: -0.75rem;
	}

	.bottom-left {
		bottom: -0.75rem;
		left: -0.75rem;
	}

	.bottom-right {
		bottom: -0.75rem;
		right: -0.75rem;
	}
</style>