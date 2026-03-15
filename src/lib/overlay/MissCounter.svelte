<script lang="ts">
    import { createTween } from '$lib/tween.svelte';
    import { onDestroy } from 'svelte';

    let {
        notesMissed = 0,
        badCuts = 0,
        wallHits = 0,
        bombHits = 0,
        side = 'left',
    } = $props<{
        notesMissed: number;
        badCuts: number;
        wallHits: number;
        bombHits: number;
        side: 'left' | 'right';
    }>();

    const totalMisses = $derived(notesMissed + badCuts);
    const isFC = $derived(totalMisses === 0 && wallHits === 0 && bombHits === 0);

    const tweenMisses = createTween(0, 150);

    $effect(() => { tweenMisses.set(totalMisses); });

    let prevTotal = $state(0);
    let animClass = $state('');

    $effect(() => {
        if (totalMisses > prevTotal) {
            animClass = 'pulse';
            setTimeout(() => { animClass = ''; }, 350);
        }
        prevTotal = totalMisses;
    });

    onDestroy(() => { tweenMisses.destroy(); });
</script>

<div class="miss-counter {side}">
    {#if isFC}
        <div class="fc-badge">
            <i class="pi pi-check"></i>
            <span class="fc-label">FC</span>
        </div>
    {:else}
        <div class="miss-badge {animClass}">
            <i class="pi pi-times"></i>
            <span class="miss-number">{Math.round(tweenMisses.value)}</span>
        </div>
    {/if}
</div>

<style>
    .miss-counter {
        position: absolute;
        bottom: 16px;
        z-index: 20;
        pointer-events: none;
    }

    .miss-counter.left {
        left: 20px;
    }

    .miss-counter.right {
        right: 20px;
    }

    .fc-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(0, 0, 0, 0.6);
        padding: 4px 12px;
    }

    .fc-badge i {
        color: #4ade80;
        font-size: 18px;
    }

    .fc-label {
        font-family: "Orbitron", sans-serif;
        font-weight: 800;
        font-size: 22px;
        color: #4ade80;
        letter-spacing: 2px;
    }

    .miss-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(0, 0, 0, 0.6);
        padding: 4px 12px;
    }

    .miss-badge i {
        color: #f87171;
        font-size: 18px;
    }

    .miss-number {
        font-family: "Orbitron", sans-serif;
        font-weight: 800;
        font-size: 22px;
        color: #f87171;
        font-variant-numeric: tabular-nums;
    }

    .miss-badge.pulse {
        animation: miss-pulse 0.3s ease-out forwards;
    }

    @keyframes miss-pulse {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.15); }
        100% { transform: scale(1); }
    }
</style>
