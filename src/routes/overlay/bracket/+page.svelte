<script lang="ts">
    import { PUBLIC_BK_API_URL } from "$env/static/public";
    import Container from "$lib/Container.svelte";
    import PreviousMatchCard from "$lib/overlay/PreviousMatchCard.svelte";
    import UpcomingMatchesCard from "$lib/overlay/UpcomingMatchesCard.svelte";
    import { pickPreviousAndUpcoming } from "$lib/overlay/matchDisplay";
    import { onMount } from "svelte";

    let matches = $state<any[]>([]);
    let nowMs = $state(Date.now());

    const selectedMatches = $derived(pickPreviousAndUpcoming(matches, nowMs, 2, 1));
    const previousMatches = $derived(selectedMatches.previous ?? []);
    const upcomingMatches = $derived(selectedMatches.upcoming);

    onMount(() => {
        let cancelled = false;

        const loadMatches = async () => {
            try {
                const bkResponse = await fetch(`${PUBLIC_BK_API_URL}/tournament/CBST2026?matches=true`).then((data) => data.json());

                if (cancelled) {
                    return;
                }

                matches = bkResponse.divisions.flatMap((d: any) => d.brackets.flatMap((b: any) => b.matches));
            } catch (error) {
                console.error("Failed to load matches", error);
            }
        };

        loadMatches();

        const interval = setInterval(() => {
            nowMs = Date.now();
        }, 1000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    });
</script>

<div class="screen">
    <div class="left-panel">
        <video src="/Background_White.webm" class="panel-bg" muted autoplay loop></video>
        <div class="vignette"></div>
        <div class="left-content">
            <div class="title agency">BRACKET</div>

            <div class="match-info-stack">
                <PreviousMatchCard matches={previousMatches} allMatches={matches} />
                <UpcomingMatchesCard matches={upcomingMatches} allMatches={matches} nowMs={nowMs} />
            </div>
        </div>
    </div>

    <div class="right-panel">
        <video src="/Background_Dark.webm" class="panel-bg" muted autoplay loop></video>
        <div class="blur-overlay"></div>
    </div>

    <div class="casters-area">
        <Container width="350px" height="148px" lineColor="rgba(0, 0, 0, 0.75)" plusColor="rgba(0, 0, 0, 0.95)" />
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

    .screen {
        position: relative;
        width: 1920px;
        height: 1080px;
        display: flex;
        overflow: hidden;
    }

    .left-panel,
    .right-panel {
        position: relative;
        height: 100%;
        overflow: hidden;
    }

    .left-panel {
        width: 28%;
    }

    .right-panel {
        width: 72%;
    }

    .panel-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
    }

    .vignette {
        position: absolute;
        inset: 0;
        z-index: 1;
        background: radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.191) 100%);
        pointer-events: none;
    }

    .blur-overlay {
        position: absolute;
        inset: 0;
        z-index: 1;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        pointer-events: none;
    }

    .left-content {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        padding: 2.5rem 1.5rem;
    }

    .title {
        align-self: center;
        font-size: 5rem;
        font-weight: 400;
        color: #000;
        line-height: 1;
    }

    .match-info-stack {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        width: 100%;
        max-width: 32rem;
    }

    .casters-area {
        position: absolute;
        bottom: 16px;
        left: 24px;
        z-index: 1000;
    }
</style>
