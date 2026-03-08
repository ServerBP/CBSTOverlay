<script lang="ts">
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

    let prevTotal = $state(0);
    let animClass = $state('');

    $effect(() => {
        if (totalMisses > prevTotal) {
            animClass = 'pulse';
            setTimeout(() => { animClass = ''; }, 350);
        }
        prevTotal = totalMisses;
    });
</script>

<div class="miss-counter {side}">
    {#if isFC}
        <div class="fc-text">
            <i class="pi pi-check"></i>
            <span class="fc-label">FC</span>
        </div>
    {:else}
        <div class="miss-text {animClass}">
            <i class="pi pi-times"></i>
            <span class="miss-number">{totalMisses}</span>
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

    .fc-text {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .fc-text i {
        color: #4ade80;
        font-size: 20px;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    }

    .fc-label {
        font-family: "Exo 2", sans-serif;
        font-weight: 800;
        font-size: 24px;
        color: #4ade80;
        letter-spacing: 2px;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    }

    .miss-text {
        display: flex;
        align-items: center;
        gap: 3px;
    }

    .miss-text i {
        color: #f87171;
        font-size: 20px;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    }

    .miss-number {
        font-family: "Exo 2", sans-serif;
        font-weight: 800;
        font-size: 24px;
        color: #f87171;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    }

    .miss-text.pulse {
        animation: miss-pulse 0.3s ease-out forwards;
    }

    @keyframes miss-pulse {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.15); }
        100% { transform: scale(1); }
    }
</style>
