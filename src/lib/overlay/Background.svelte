<script lang="ts">
	let { children }: { children?: any } = $props();
</script>

<div class="container">
    <video src="/Background_Topology.webm" class="background" muted autoplay loop></video>
    <!-- <img class="background" src="/Base.svg" alt="Base" /> -->

	<div class="content">
        {#if children}
            {@render children()}
        {/if}
	</div>
</div>


<style>
    :global(*),
    :global(*::before),
    :global(*::after) {
        box-sizing: border-box;
    }

    :global(html),
    :global(body) {
        margin: 0;
        padding: 0;
        width: 1920px;
        height: 1080px;
        min-width: 1920px;
        min-height: 1080px;
        max-width: 1920px;
        max-height: 1080px;
        overflow: hidden;
    }

    .container {
        position: relative;
        width: 1920px;
        height: 1080px;
        min-width: 1920px;
        min-height: 1080px;
        max-width: 1920px;
        max-height: 1080px;
        overflow: hidden;
        flex-shrink: 0;
    }

    .background {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
        transform: scale(1.05);
        filter: blur(5px);
    }

    .content {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        z-index: 1;
    }
</style>