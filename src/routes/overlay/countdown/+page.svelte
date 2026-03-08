<script lang="ts">
    import { page } from "$app/state";
    import Background from "$lib/overlay/Background.svelte";
    import Container from "$lib/Container.svelte";
    import { onMount } from "svelte";

    const query = page.url.searchParams;
    const hours = parseInt(query.get('h') ?? '0', 10);
    const minutes = parseInt(query.get('m') ?? '0', 10);
    const seconds = parseInt(query.get('s') ?? '0', 10);

    const totalInitial = hours * 3600 + minutes * 60 + seconds;
    let remaining = $state(totalInitial);
    let finished = $state(false);
    let tick = $state(false); // toggles each second for pulse animation

    let displayH = $derived(Math.floor(remaining / 3600));
    let displayM = $derived(Math.floor((remaining % 3600) / 60));
    let displayS = $derived(remaining % 60);

    // Format helpers
    function pad(n: number): string {
        return n.toString().padStart(2, '0');
    }

    let formattedTime = $derived.by(() => {
        if (displayH > 0) {
            return `${displayH}:${pad(displayM)}:${pad(displayS)}`;
        } else if (displayM > 0) {
            return `${displayM}:${pad(displayS)}`;
        } else {
            return `${displayS}`;
        }
    });

    let urgent = $derived(remaining <= 10 && remaining > 0);

    onMount(() => {
        if (remaining <= 0) {
            finished = true;
            return;
        }

        const interval = setInterval(() => {
            remaining--;
            tick = !tick;
            if (remaining <= 0) {
                remaining = 0;
                finished = true;
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    });
</script>

<Background>
    <div class="countdown-wrapper">
        <Container width="40rem" height="16rem">
            <div class="countdown-content">
                {#if !finished}
                    <div class="label keania">STARTING IN</div>
                    <div
                        class="timer"
                        class:pulse={tick}
                        class:urgent
                    >
                        {formattedTime}
                    </div>
                {/if}
            </div>
        </Container>

        <!-- Progress bar -->
        {#if !finished && totalInitial > 0}
            <div class="progress-track">
                <div
                    class="progress-fill"
                    style="width: {((totalInitial - remaining) / totalInitial) * 100}%"
                ></div>
            </div>
        {/if}
    </div>
</Background>

<style>
    .countdown-wrapper {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
    }

    .countdown-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        width: 100%;
    }

    .label {
        font-size: 1.6rem;
        letter-spacing: 0.35em;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
    }

    .timer {
        font-family: "Orbitron", sans-serif;
        font-size: 5.5rem;
        color: #fff;
        letter-spacing: 0.08em;
        text-shadow: 0 0 20px rgba(100, 180, 255, 0.4), 0 0 60px rgba(100, 180, 255, 0.15);
        transition: transform 0.15s ease, color 0.3s ease, text-shadow 0.3s ease;
    }

    .timer.pulse {
        animation: pulse-tick 0.4s ease-out;
    }

    .timer.urgent {
        color: #ff4444;
        text-shadow: 0 0 20px rgba(255, 68, 68, 0.6), 0 0 60px rgba(255, 68, 68, 0.25);
        animation: pulse-urgent 1s ease-in-out infinite;
    }

    .finished-label {
        font-size: 5rem;
        color: #4ade80;
        letter-spacing: 0.3em;
        text-shadow: 0 0 30px rgba(74, 222, 128, 0.5), 0 0 80px rgba(74, 222, 128, 0.2);
        animation: glow-in 0.6s ease-out;
    }

    .progress-track {
        width: 38rem;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, rgba(255, 96, 96, 0.8), #c2c0cbcc);
        border-radius: 2px;
        transition: width 1s linear;
        box-shadow: 0 0 8px rgba(100, 180, 255, 0.4);
    }

    @keyframes pulse-tick {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.04); }
        100% { transform: scale(1); }
    }

    @keyframes pulse-urgent {
        0%, 100% { transform: scale(1); opacity: 1; }
        50%      { transform: scale(1.06); opacity: 0.85; }
    }

    @keyframes glow-in {
        0%   { opacity: 0; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1); }
    }
</style>