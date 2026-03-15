<script lang="ts">
    import CountdownMatchContainer from '$lib/overlay/CountdownMatchContainer.svelte';
    import { formatRelativeTime, formatTorontoTime, getMatchStartMs, resolveMatchParticipants } from '$lib/overlay/matchDisplay';

    let { matches = [], allMatches = [], nowMs = Date.now() } = $props<{
        matches?: any[];
        allMatches?: any[];
        nowMs?: number;
    }>();
</script>

<CountdownMatchContainer title="Upcoming Matches">
    {#if matches.length > 0}
        <div class="upcoming-list">
            {#each matches as match}
                {@const participants = resolveMatchParticipants(match, allMatches)}
                {@const startMs = getMatchStartMs(match)}

                <div class="upcoming-match">
                    <div class="match-time-label">{formatTorontoTime(startMs)} · {formatRelativeTime(startMs, nowMs)}</div>
                    <div class="players-box">
                        <div class="player-row">
                            <div class="player-main">
                                {#if participants[0]?.avatarUrl}
                                    <img src={participants[0].avatarUrl} alt={participants[0].name} class="avatar" />
                                {:else}
                                    <div class="avatar avatar-fallback">{participants[0]?.name?.slice(0, 1) ?? '?'}</div>
                                {/if}
                                <span class="name">{participants[0]?.name ?? 'TBD'}</span>
                            </div>
                        </div>
                        <div class="player-row">
                            <div class="player-main">
                                {#if participants[1]?.avatarUrl}
                                    <img src={participants[1].avatarUrl} alt={participants[1].name} class="avatar" />
                                {:else}
                                    <div class="avatar avatar-fallback">{participants[1]?.name?.slice(0, 1) ?? '?'}</div>
                                {/if}
                                <span class="name">{participants[1]?.name ?? 'TBD'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p class="empty">No upcoming matches found.</p>
    {/if}
</CountdownMatchContainer>

<style>
    .upcoming-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .upcoming-match {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .match-time-label {
        font-size: 1rem;
        color: rgba(0, 0, 0, 0.58);
        padding-left: 0.15rem;
    }

    .players-box {
        overflow: hidden;
        border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .player-row {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        background: rgba(255, 255, 255, 0.4);
        padding: 0.85rem 1rem;
    }

    .player-row + .player-row {
        border-top: 1px solid rgba(0, 0, 0, 0.08);
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

    .empty {
        margin: 0;
        padding: 0.6rem 0.2rem 0.4rem 0.2rem;
        font-size: 0.9rem;
        color: rgba(0, 0, 0, 0.62);
    }
</style>
