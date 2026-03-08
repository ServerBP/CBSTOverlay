<script lang="ts">
    let { combo = 0, side = 'left' } = $props<{
        combo: number;
        side: 'left' | 'right';
    }>();

    let prevCombo = $state(0);
    let animClass = $state('');
    let displayCombo = $state(0);

    $effect(() => {
        const newCombo = combo;
        if (newCombo !== prevCombo) {
            if (newCombo > prevCombo && newCombo > 0) {
                // Combo went up
                animClass = 'bump';
            } else if (newCombo < prevCombo) {
                // Combo broke (miss / bad cut)
                animClass = 'shake';
            }
            displayCombo = newCombo;
            prevCombo = newCombo;

            // Remove animation class after it plays
            setTimeout(() => {
                animClass = '';
            }, 350);
        }
    });
</script>

<div class="combo-display {side} {animClass}" class:hidden={displayCombo === 0}>
    <span class="combo-x">x</span><span class="combo-number">{displayCombo}</span>
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
        text-shadow:
            0 0 8px rgba(255, 255, 255, 0.5),
            0 2px 6px rgba(0, 0, 0, 0.7);
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
        font-size: 22px;
        opacity: 0.7;
        font-weight: 700;
    }

    .combo-number {
        font-size: 38px;
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
            transform: scale(1.2);
            text-shadow:
                0 0 14px rgba(255, 255, 255, 0.8),
                0 0 24px rgba(120, 200, 255, 0.5),
                0 2px 6px rgba(0, 0, 0, 0.7);
        }
        100% {
            transform: scale(1);
            text-shadow:
                0 0 8px rgba(255, 255, 255, 0.5),
                0 2px 6px rgba(0, 0, 0, 0.7);
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
