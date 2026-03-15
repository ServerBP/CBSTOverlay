<script lang="ts">
    import CountdownMatchContainer from '$lib/overlay/CountdownMatchContainer.svelte';
    import { resolveMatchParticipants } from '$lib/overlay/matchDisplay';

    let { matches = [], allMatches = [] } = $props<{ matches?: any[]; allMatches?: any[] }>();

    const title = $derived(matches.length === 1 ? 'Previous Match' : 'Previous Matches');
</script>

<CountdownMatchContainer {title}>
    {#if matches.length > 0}
        {#each matches as match, idx}
            {@const participants = resolveMatchParticipants(match, allMatches)}
            {@const winnerGuid = match?.results?.winnerGuid ?? null}
            {@const team1Score = match?.results?.team1Score ?? null}
            {@const team2Score = match?.results?.team2Score ?? null}

            <div class="players-box" class:space={idx != matches.length - 1}>
                <div class="player-row" class:winner={participants[0]?.guid && participants[0].guid === winnerGuid}>
                    <div class="player-main">
                        {#if participants[0]?.avatarUrl}
                            <img src={participants[0].avatarUrl} alt={participants[0].name} class="avatar" />
                        {:else}
                            <div class="avatar avatar-fallback">{participants[0]?.name?.slice(0, 1) ?? '?'}</div>
                        {/if}

                        <span class="name">{participants[0]?.name ?? 'TBD'}</span>

                        {#if participants[0]?.guid && participants[0].guid === winnerGuid}
                            <span class="winner-tag">Winner</span>
                        {/if}
                    </div>

                    <span class="score">{team1Score ?? '-'}</span>
                </div>

                <div class="player-row" class:winner={participants[1]?.guid && participants[1].guid === winnerGuid}>
                    <div class="player-main">
                        {#if participants[1]?.avatarUrl}
                            <img src={participants[1].avatarUrl} alt={participants[1].name} class="avatar" />
                        {:else}
                            <div class="avatar avatar-fallback">{participants[1]?.name?.slice(0, 1) ?? '?'}</div>
                        {/if}

                        <span class="name">{participants[1]?.name ?? 'TBD'}</span>

                        {#if participants[1]?.guid && participants[1].guid === winnerGuid}
                            <span class="winner-tag">Winner</span>
                        {/if}
                    </div>

                    <span class="score">{team2Score ?? '-'}</span>
                </div>
            </div>
        {/each}
    {:else}
        <p class="empty">No previous matches found.</p>
    {/if}
</CountdownMatchContainer>

<style>
    .players-box {
        overflow: hidden;
        border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .players-box.space {
        margin-bottom: 1rem;
    }

    .player-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        background: rgba(255, 255, 255, 0.4);
        padding: 0.85rem 1rem;
    }

    .player-row + .player-row {
        border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .player-row.winner {
        background: rgba(49, 130, 206, 0.12);
    }

    .player-main {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-width: 0;
    }

    .avatar {
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 999px;
        object-fit: cover;
        flex: 0 0 auto;
    }

    .avatar-fallback {
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.08);
        color: rgba(0, 0, 0, 0.7);
        font-size: 1rem;
        font-weight: 700;
    }

    .name {
        font-size: 1.4rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .winner-tag {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #1b4e83;
        background: rgba(49, 130, 206, 0.18);
        padding: 0.22rem 0.5rem;
        border-radius: 999px;
        flex: 0 0 auto;
    }

    .score {
        font-size: 1.45rem;
        font-weight: 700;
        min-width: 1.5rem;
        text-align: right;
        flex: 0 0 auto;
    }

    .empty {
        margin: 0;
        padding: 0.6rem 0.2rem 0.4rem 0.2rem;
        font-size: 0.9rem;
        color: rgba(0, 0, 0, 0.62);
    }
</style>
