<script lang="ts">
    import type { Snippet } from 'svelte';

    let { title, subtitle = '', children } = $props<{ title: string; subtitle?: string; children?: Snippet }>();
</script>

<section class="match-container geist">
    <div class="corner corner-top-left"></div>
    <div class="corner corner-bottom-right"></div>

    <header class="container-header">
        <h3>{title}</h3>
        {#if subtitle}
            <span class="subtitle">{subtitle}</span>
        {/if}
    </header>

    <div class="container-body">
        {@render children?.()}
    </div>
</section>

<style>
    .match-container {
        position: relative;
        width: 100%;
        color: #101010;
        border-radius: 0.9rem;
        backdrop-filter: blur(2px);
        overflow: hidden;
    }

    .corner {
        position: absolute;
        pointer-events: none;
        width: 1.3rem;
        height: 1.3rem;
        border-color: rgba(0, 0, 0, 0.2);
    }

    .corner-top-left {
        top: 0.55rem;
        left: 0.55rem;
        border-top: 1px solid;
        border-left: 1px solid;
    }

    .corner-bottom-right {
        right: 0.55rem;
        bottom: 0.55rem;
        border-bottom: 1px solid;
        border-right: 1px solid;
    }

    .container-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1rem 0.35rem 1rem;
    }

    .container-header h3 {
        margin: 0;
        font-size: 1.5rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-weight: 700;
    }

    .subtitle {
        font-size: 1rem;
        color: rgba(0, 0, 0, 0.62);
    }

    .container-body {
        padding: 0.15rem 0.8rem 0.85rem 0.8rem;
    }
</style>
