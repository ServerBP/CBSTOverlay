<script lang="ts">
	import './layout.css';
	let { children } = $props();
</script>

<div class="content">
	{@render children()}
</div>


<style>
    :global(html),
    :global(body) {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
    }

    .content {
        position: absolute;
        inset: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        z-index: 1;
    }
</style>