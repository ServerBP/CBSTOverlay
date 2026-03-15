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
	style={`--container-width: ${width}; --container-height: ${height}; --line-color: ${lineColor}; --corner-color: ${plusColor};`}
>
	<div class="corner corner-tl"></div>
	<div class="corner corner-tr"></div>
	<div class="corner corner-bl"></div>
	<div class="corner corner-br"></div>

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
		border: 1px solid var(--line-color);
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
		width: 1rem;
		height: 1rem;
		pointer-events: none;
	}

	.corner-tl {
		top: -1px;
		left: -1px;
		border-top: 2px solid var(--corner-color);
		border-left: 2px solid var(--corner-color);
	}

	.corner-tr {
		top: -1px;
		right: -1px;
		border-top: 2px solid var(--corner-color);
		border-right: 2px solid var(--corner-color);
	}

	.corner-bl {
		bottom: -1px;
		left: -1px;
		border-bottom: 2px solid var(--corner-color);
		border-left: 2px solid var(--corner-color);
	}

	.corner-br {
		bottom: -1px;
		right: -1px;
		border-bottom: 2px solid var(--corner-color);
		border-right: 2px solid var(--corner-color);
	}
</style>