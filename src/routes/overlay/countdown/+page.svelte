<script lang="ts">
    import { page } from "$app/state";
    import { PUBLIC_BK_API_URL } from "$env/static/public";
    import PreviousMatchCard from "$lib/overlay/PreviousMatchCard.svelte";
    import UpcomingMatchesCard from "$lib/overlay/UpcomingMatchesCard.svelte";
    import { pickPreviousAndUpcoming } from "$lib/overlay/matchDisplay";
    import { onMount } from "svelte";

    const query = page.url.searchParams;
    const hours = parseInt(query.get('h') ?? '0', 10);
    const minutes = parseInt(query.get('m') ?? '0', 10);
    const seconds = parseInt(query.get('s') ?? '0', 10);

    let matches = $state<any[]>([]);
    let nowMs = $state(Date.now());

    const totalInitial = hours * 3600 + minutes * 60 + seconds;
    let remaining = $state(totalInitial);

    let displayH = $derived(Math.floor(remaining / 3600));
    let displayM = $derived(Math.floor((remaining % 3600) / 60));
    let displayS = $derived(remaining % 60);

    function pad(n: number): string {
        return n.toString().padStart(2, '0');
    }

    // "Live in" always shows mm:ss, prepends hh: if hours > 0
    let liveInTime = $derived.by(() => {
        if (displayH > 0) {
            return `${pad(displayH)}:${pad(displayM)}:${pad(displayS)}`;
        }
        return `${pad(displayM)}:${pad(displayS)}`;
    });

    let hasHours = $derived(displayH > 0);

    const selectedMatches = $derived(pickPreviousAndUpcoming(matches, nowMs));
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

            if (remaining > 0) {
                remaining--;
            }

            if (remaining < 0) {
                remaining = 0;
            }
        }, 1000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    });
</script>

<div class="screen">
    <div class="left-panel">
        <video src="/bg_gameplay.webm" class="panel-bg" muted autoplay loop></video>
        <div class="left-content">
            <div class="logo">
                <img src="/Logo.svg" alt="Logo" />
            </div>
            <div class="brand geist">
                <div class="brand-line">
                    {#each 'BEAT'.split('') as char}
                        <span class="text-blue-600">{char}</span>
                    {/each}
                    {#each 'SABER'.split('') as char}
                        <span class="text-red-600">{char}</span>
                    {/each}
                </div>
                <div class="brand-line">
                    {#each 'CANADA'.split('') as char}
                        <span>{char}</span>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <div class="right-panel">
        <video src="/Background_White.webm" class="panel-bg" muted autoplay loop></video>
        <div class="vignette"></div>
        <div class="right-content">
            <div class="live-in-box geist">
                <span class="live-in-label">Live in&nbsp;</span>
                <span class="live-in-time">{liveInTime}</span>
            </div>

            <div class="match-info-stack">
                <PreviousMatchCard matches={previousMatches} allMatches={matches} />
                <UpcomingMatchesCard matches={upcomingMatches} allMatches={matches} nowMs={nowMs} />
            </div>

            <div class="countdown-box dotsfont">
                <div class="countdown-segment">
                    <span class="countdown-number">{hasHours ? `${pad(displayH)}:` : ''}{pad(displayM)}</span>
                </div>
                <div class="countdown-segment last">
                    <span class="countdown-number">{pad(displayS)}</span>
                </div>
            </div>
        </div>
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
        width: 60%;
    }

    .right-panel {
        width: 40%;
    }

    .panel-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
    }

    .left-content {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 2.5rem;
    }

    .logo img {
        width: 100px;
        height: 100px;
    }

    .brand {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        width: 32rem;
    }

    .brand-line {
        display: flex;
        justify-content: space-between;
        font-size: 3.8rem;
        font-weight: 800;
        color: white;
        line-height: 1.05;
        text-transform: uppercase;
    }

    .right-content {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-end;
        gap: 0.95rem;
        padding: 2.5rem 0 2.2rem 2.5rem;
    }

    .match-info-stack {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        width: 36rem;
        align-self: center;
    }

    .live-in-box {
        background: white;
        color: #000;
        padding: 0.6rem 1.4rem;
        font-size: 1.3rem;
        width: 11rem;
        line-height: 1;
        white-space: nowrap;
    }

    .live-in-label {
        font-weight: 400;
    }

    .live-in-time {
        font-weight: 700;
    }

    .vignette {
        position: absolute;
        inset: 0;
        z-index: 1;
        background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.35) 100%);
        pointer-events: none;
    }

    .countdown-box {
        background: #000;
        display: flex;
        flex-direction: column;
        width: 28rem;
        margin-top: auto;
    }

    .countdown-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 15rem;
    }

    .countdown-segment.last {
        border-bottom: none;
    }

    .countdown-number {
        font-size: 15rem;
        font-weight: 400;
        color: white;
        line-height: 1;
        letter-spacing: 0.05em;
    }
</style>