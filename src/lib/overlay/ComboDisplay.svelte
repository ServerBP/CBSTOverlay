<script lang="ts">
    import { createTween } from '$lib/tween.svelte';
    import { onDestroy } from 'svelte';

    let { combo = 0, side = 'left' } = $props<{
        combo: number;
        side: 'left' | 'right';
    }>();

    const tweenCombo = createTween(0, 150);

    let prevCombo = $state(0);
    let animClass = $state('');

    $effect(() => {
        tweenCombo.set(combo);
    });

    $effect(() => {
        const newCombo = combo;
        if (newCombo !== prevCombo) {
            if (newCombo > prevCombo && newCombo > 0) {
                animClass = 'bump';
            } else if (newCombo < prevCombo) {
                animClass = 'shake';
            }
            prevCombo = newCombo;
            setTimeout(() => { animClass = ''; }, 350);
        }
    });

    onDestroy(() => { tweenCombo.destroy(); });
</script>

<div class="combo-display {side} {animClass}" class:hidden={combo === 0}>
    <span class="combo-x">x</span><span class="combo-number">{Math.round(tweenCombo.value)}</span>
</div>

<style>
    .combo-display {
        position: absolute;
        bottom: 16px;
        display: flex;
        align-items: baseline;
        gap: 2px;
        font-weight: 800;
        color: white;
        font-family: "Orbitron", sans-serif;
        background: rgba(0, 0, 0, 0.6);
        padding: 4px 12px;
        z-index: 20;
        pointer-events: none;
        transition: opacity 0.2s ease;
    }

    .combo-display.hidden {
        opacity: 0;
    }

    .combo-display.left {
        right: 20px;
    }

    .combo-display.right {
        left: 20px;
    }

    .combo-x {
        font-size: 20px;
        opacity: 0.7;
        font-weight: 700;
    }

    .combo-number {
        font-size: 36px;
        font-variant-numeric: tabular-nums;
        letter-spacing: -1px;
    }

    .combo-display.bump {
        animation: combo-bump 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    @keyframes combo-bump {
        0% {
            transform: scale(1);
        }
        40% {
            transform: scale(1.15);
        }
        100% {
            transform: scale(1);
        }
    }

    .combo-display.shake {
        animation: combo-shake 0.35s ease-out forwards;
    }

    @keyframes combo-shake {
        0%   { transform: translateX(0); color: white; }
        15%  { transform: translateX(-6px); color: #ff4444; }
        30%  { transform: translateX(5px); color: #ff4444; }
        45%  { transform: translateX(-4px); color: #ff6666; }
        60%  { transform: translateX(3px); color: #ff8888; }
        75%  { transform: translateX(-1px); color: #ffaaaa; }
        100% { transform: translateX(0); color: white; }
    }
</style>
