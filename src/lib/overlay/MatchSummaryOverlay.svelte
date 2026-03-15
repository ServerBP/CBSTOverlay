<script lang="ts">
    import { processMatch, type SequencedMapEntry, type ReplayRound } from '$lib/services/matchProcessor';

    let { match } = $props<{ match: any }>();

    const processed = $derived(processMatch(match));

    const playedMaps = $derived(
        processed.sequencedMaps.filter(m => m.type !== 'ban' && m.hasScores)
    );

    const team1Guid = $derived(match?.sides?.team1?.guid);
    const team2Guid = $derived(match?.sides?.team2?.guid);

    /** Dynamic card height: fits 3–9+ maps in ~860px (1080 − 180 header − 40 padding) */
    const cardHeight = $derived(
        Math.min(110, Math.max(78, Math.floor((860 - (playedMaps.length - 1) * 6) / Math.max(1, playedMaps.length))))
    );
    const coverSize = $derived(Math.min(72, cardHeight - 16));

    function formatAcc(acc: number): string {
        return acc.toFixed(2) + '%';
    }

    function formatScore(score: number): string {
        return score.toLocaleString();
    }

    function getLastRound(entry: SequencedMapEntry): ReplayRound | null {
        if (!entry.mapScore || entry.mapScore.rounds.length === 0) return null;
        return entry.mapScore.rounds[entry.mapScore.rounds.length - 1];
    }

    function getMapWinner(entry: SequencedMapEntry): string | null {
        return entry.mapScore?.winner ?? null;
    }

    function hasReplay(entry: SequencedMapEntry): boolean {
        return (entry.mapScore?.rounds.length ?? 0) > 1;
    }

    function replayCount(entry: SequencedMapEntry): number {
        return Math.max(0, (entry.mapScore?.rounds.length ?? 1) - 1);
    }

    function isPickBy(entry: SequencedMapEntry, teamGuid: string): boolean {
        return entry.type === 'pick' && entry.actionedByTeamGuid === teamGuid;
    }

    function t1Acc(round: ReplayRound): number {
        if (round.players1.length === 0) return 0;
        return round.players1.reduce((s, p) => s + p.accuracy, 0) / round.players1.length;
    }

    function t2Acc(round: ReplayRound): number {
        if (round.players2.length === 0) return 0;
        return round.players2.reduce((s, p) => s + p.accuracy, 0) / round.players2.length;
    }
</script>

<div class="match-summary geist">
    {#if playedMaps.length === 0}
        <div class="no-data">
            <i class="pi pi-clock"></i>
            <span>No maps played yet</span>
        </div>
    {:else}
        {#key playedMaps.length}
            <div class="maps-list">
                {#each playedMaps as entry, idx (entry.mapGuid || entry.mapHash || idx)}
                    {@const lastRound = getLastRound(entry)}
                    {@const winner = getMapWinner(entry)}
                    {@const isT1Winner = winner === team1Guid}
                    {@const isT2Winner = winner === team2Guid}
                    {@const isTB = entry.type === 'tiebreaker'}
                    {@const pickedByT1 = isPickBy(entry, team1Guid)}
                    {@const pickedByT2 = isPickBy(entry, team2Guid)}
                    {@const d = idx * 150}

                    <div
                        class="map-card"
                        class:t1-win={isT1Winner}
                        class:t2-win={isT2Winner}
                        style="animation-delay: {d}ms; height: {cardHeight}px"
                    >
                        <!-- Left: Team 1 scores -->
                        <div class="team-side left" class:winner={isT1Winner} class:loser={isT2Winner}>
                            {#if lastRound}
                                <div class="score-group align-right">
                                    <span class="accuracy t1-acc" style="animation-delay: {d + 400}ms">
                                        {formatAcc(t1Acc(lastRound))}
                                    </span>
                                    <span class="score-num" style="animation-delay: {d + 500}ms">
                                        {formatScore(lastRound.total1)}
                                    </span>
                                </div>
                            {:else}
                                <span class="accuracy dim" style="animation-delay: {d + 400}ms">--.--</span>
                            {/if}
                            {#if isT1Winner}
                                <span class="win-indicator t1-win-ind" style="animation-delay: {d + 700}ms">
                                    <i class="pi pi-crown"></i>
                                </span>
                            {/if}
                        </div>

                        <!-- Center: Map info -->
                        <div class="map-center" style="animation-delay: {d + 200}ms">
                            <div class="map-content" style="--cover-size: {coverSize}px">
                                {#if entry.mapImage}
                                    <img src={entry.mapImage} alt="" class="cover-img" />
                                {:else}
                                    <div class="cover-img placeholder"></div>
                                {/if}
                                <div class="map-details">
                                    <span class="map-name">{entry.mapName}</span>
                                    <div class="badges">
                                        {#if pickedByT1}
                                            <span class="badge pick t1-pick">
                                                <i class="pi pi-caret-left"></i> PICK
                                            </span>
                                        {:else if pickedByT2}
                                            <span class="badge pick t2-pick">
                                                PICK <i class="pi pi-caret-right"></i>
                                            </span>
                                        {/if}
                                        {#if isTB}
                                            <span class="badge tb">TIEBREAKER</span>
                                        {/if}
                                        {#if hasReplay(entry)}
                                            <span class="badge replay" style="animation-delay: {d + 600}ms">
                                                <i class="pi pi-refresh"></i> REPLAY ×{replayCount(entry)}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Team 2 scores -->
                        <div class="team-side right" class:winner={isT2Winner} class:loser={isT1Winner}>
                            {#if isT2Winner}
                                <span class="win-indicator t2-win-ind" style="animation-delay: {d + 700}ms">
                                    <i class="pi pi-crown"></i>
                                </span>
                            {/if}
                            {#if lastRound}
                                <div class="score-group align-left">
                                    <span class="accuracy t2-acc" style="animation-delay: {d + 400}ms">
                                        {formatAcc(t2Acc(lastRound))}
                                    </span>
                                    <span class="score-num" style="animation-delay: {d + 500}ms">
                                        {formatScore(lastRound.total2)}
                                    </span>
                                </div>
                            {:else}
                                <span class="accuracy dim" style="animation-delay: {d + 400}ms">--.--</span>
                            {/if}
                        </div>

                        <!-- Winner accent bar -->
                        {#if isT1Winner || isT2Winner}
                            <div
                                class="winner-bar"
                                class:t1-bar={isT1Winner}
                                class:t2-bar={isT2Winner}
                                style="animation-delay: {d + 750}ms"
                            ></div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/key}
    {/if}
</div>

<style>
    .match-summary {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px 40px;
    }

    .no-data {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        font-size: 22px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.2);
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    .no-data :global(.pi) {
        font-size: 36px;
        opacity: 0.4;
    }

    .maps-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
        max-width: 1780px;
    }

    .map-card {
        display: grid;
        grid-template-columns: 1fr 420px 1fr;
        align-items: center;
        position: relative;
        background: rgba(10, 6, 8, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.04);
        overflow: hidden;
        opacity: 0;
        animation: cardSlideIn 0.5s ease-out both;
    }

    .map-card.t1-win {
        border-left: 3px solid rgba(255, 255, 255, 0.5);
    }

    .map-card.t2-win {
        border-right: 3px solid rgba(196, 30, 58, 0.6);
    }

    /* ── Team sides ── */

    .team-side {
        display: flex;
        align-items: center;
        gap: 16px;
        height: 100%;
        padding: 0 32px;
    }

    .team-side.left {
        justify-content: flex-end;
    }

    .team-side.right {
        justify-content: flex-start;
    }

    .team-side.left.winner {
        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 100%);
    }

    .team-side.right.winner {
        background: linear-gradient(270deg, transparent 0%, rgba(196, 30, 58, 0.045) 100%);
    }

    .team-side.loser .accuracy,
    .team-side.loser .score-num {
        opacity: 0.25 !important;
    }

    /* ── Scores ── */

    .score-group {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .score-group.align-right {
        align-items: flex-end;
    }

    .score-group.align-left {
        align-items: flex-start;
    }

    .accuracy {
        font-family: 'Geist', sans-serif;
        font-size: 38px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.02em;
        opacity: 0;
        animation: scoreReveal 0.4s ease-out both;
    }

    .accuracy.t1-acc {
        color: #ffffff;
    }

    .accuracy.t2-acc {
        color: #c41e3a;
    }

    .accuracy.dim {
        color: rgba(255, 255, 255, 0.1);
        font-size: 30px;
        font-weight: 600;
        animation: fadeIn 0.3s ease-out both;
    }

    .score-num {
        font-family: 'Geist', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.22);
        line-height: 1;
        letter-spacing: 0.03em;
        opacity: 0;
        animation: scoreReveal 0.3s ease-out both;
    }

    /* ── Winner indicator ── */

    .win-indicator {
        opacity: 0;
        display: flex;
        align-items: center;
        animation: winnerArrow 0.5s ease-out both;
    }

    .win-indicator :global(.pi) {
        font-size: 16px;
    }

    .win-indicator.t1-win-ind {
        color: rgba(255, 255, 255, 0.45);
    }

    .win-indicator.t2-win-ind {
        color: rgba(196, 30, 58, 0.6);
    }

    /* ── Map center ── */

    .map-center {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        opacity: 0;
        animation: fadeIn 0.4s ease-out both;
    }

    .map-content {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .cover-img {
        width: var(--cover-size, 56px);
        height: var(--cover-size, 56px);
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .cover-img.placeholder {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .map-details {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }

    .map-name {
        font-family: 'Geist', sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.65);
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 280px;
        letter-spacing: 0.01em;
    }

    /* ── Badges ── */

    .badges {
        display: flex;
        gap: 6px;
        align-items: center;
    }

    .badge {
        font-family: 'Geist', sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        padding: 2px 8px;
        display: flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
    }

    .badge :global(.pi) {
        font-size: 8px;
    }

    .badge.pick.t1-pick {
        color: rgba(255, 255, 255, 0.75);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .badge.pick.t2-pick {
        color: rgba(196, 30, 58, 0.85);
        background: rgba(196, 30, 58, 0.06);
        border: 1px solid rgba(196, 30, 58, 0.2);
    }

    .badge.tb {
        color: #ff8800;
        background: rgba(255, 136, 0, 0.08);
        border: 1px solid rgba(255, 136, 0, 0.2);
    }

    .badge.replay {
        color: #c41e3a;
        background: rgba(196, 30, 58, 0.08);
        border: 1px solid rgba(196, 30, 58, 0.18);
        opacity: 0;
        animation: replayPop 0.5s ease-out both;
    }

    /* ── Winner bar ── */

    .winner-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        opacity: 0;
        animation: winnerGlow 0.7s ease-out both;
    }

    .winner-bar.t1-bar {
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%);
    }

    .winner-bar.t2-bar {
        background: linear-gradient(270deg, rgba(196, 30, 58, 0.5) 0%, transparent 50%);
    }

    /* ── Animations ── */

    @keyframes cardSlideIn {
        from {
            opacity: 0;
            transform: translateY(24px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes scoreReveal {
        from {
            opacity: 0;
            transform: translateY(6px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes winnerGlow {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0.8; }
    }

    @keyframes winnerArrow {
        0% {
            opacity: 0;
            transform: scale(0.5);
        }
        60% {
            opacity: 1;
            transform: scale(1.15);
        }
        100% {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes replayPop {
        0% {
            opacity: 0;
            transform: scale(0.7);
        }
        60% {
            opacity: 1;
            transform: scale(1.08);
        }
        100% {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
