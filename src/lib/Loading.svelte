<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    interface Props {
        message?: string;
    }

    let { message = '' }: Props = $props();

    let dotCount = $state(0);
    let dotInterval: ReturnType<typeof setInterval>;

    onMount(() => {
        dotInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
        }, 450);
    });

    onDestroy(() => {
        clearInterval(dotInterval);
    });

    let dots = $derived('.'.repeat(dotCount));
</script>

<div class="loading-overlay">
    <div class="vignette"></div>

    <div class="content">
        <div class="spinner-wrap">
            <div class="spinner">
                <div class="arc arc-1"></div>
                <div class="arc arc-2"></div>
                <div class="inner-dot"></div>
            </div>
        </div>

        <div class="loading-text">
            <span class="loading-label">Loading</span><span class="dots">{dots}</span>
        </div>

        {#if message}
            <div class="sub-message">{message}</div>
        {/if}
    </div>
</div>

<style>
    .loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(14px) brightness(0.35) saturate(0.7);
        -webkit-backdrop-filter: blur(14px) brightness(0.35) saturate(0.7);
    }

    .mesh-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        opacity: 0.9;
    }

    .vignette {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.55) 100%);
        pointer-events: none;
    }

    .content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
    }

    /* Spinner */
    .spinner-wrap {
        position: relative;
        width: 64px;
        height: 64px;
    }

    .spinner {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .arc {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid transparent;
    }

    .arc-1 {
        border-top-color: rgba(180, 190, 220, 0.85);
        border-right-color: rgba(180, 190, 220, 0.2);
        animation: spin 1.1s cubic-bezier(0.6, 0.1, 0.4, 0.9) infinite;
    }

    .arc-2 {
        inset: 10px;
        border-bottom-color: rgba(140, 155, 200, 0.5);
        border-left-color: rgba(140, 155, 200, 0.1);
        animation: spin 1.6s cubic-bezier(0.6, 0.1, 0.4, 0.9) infinite reverse;
    }

    .inner-dot {
        position: absolute;
        inset: 0;
        margin: auto;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(200, 210, 240, 0.6);
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.4; transform: scale(0.85); }
        50% { opacity: 1; transform: scale(1.15); }
    }

    /* Text */
    .loading-text {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 1.25rem;
        font-weight: 500;
        letter-spacing: 0.12em;
        color: rgba(220, 225, 240, 0.92);
        text-transform: uppercase;
        display: flex;
        align-items: baseline;
        user-select: none;
    }

    .loading-label {
        display: inline-block;
    }

    .dots {
        display: inline-block;
        width: 2ch;
        text-align: left;
        color: rgba(180, 190, 220, 0.7);
        font-weight: 400;
    }

    .sub-message {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 0.82rem;
        color: rgba(160, 168, 190, 0.55);
        letter-spacing: 0.04em;
        text-align: center;
        max-width: 280px;
        line-height: 1.5;
        user-select: none;
    }
</style>