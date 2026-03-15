<script lang="ts">
    let { match } = $props<{ match: any }>();

    function getTeamName(team: any): string {
        return team.isSolo ? team.captain.preferredName : team.name;
    }

    function getTeamAvatarUrl(team: any): string {
        return team.isSolo ? team.captain.avatarUrl : team.imageUrl;
    }

    const team1 = $derived(match?.sides?.team1);
    const team2 = $derived(match?.sides?.team2);

    const team1Name = $derived(getTeamName(team1));
    const team2Name = $derived(getTeamName(team2));

    const team1Avatar = $derived(getTeamAvatarUrl(team1));
    const team2Avatar = $derived(getTeamAvatarUrl(team2));

    const team1Score = $derived(match?.results?.team1Score ?? 0);
    const team2Score = $derived(match?.results?.team2Score ?? 0);
    const maxScore   = $derived(match?.maxScore ?? 0);

    const team1Replays = $derived(match?.results?.team1ReplaysRemaining ?? 0);
    const team2Replays = $derived(match?.results?.team2ReplaysRemaining ?? 0);

    const matchType = $derived(match?.matchType ?? '');

    let prevT1Score   = $state(0);
    let prevT2Score   = $state(0);
    let prevT1Replays = $state(0);
    let prevT2Replays = $state(0);

    // Track which leaves / replays just changed for the pop animation
    let t1ScoreAnim  = $state<number | null>(null);
    let t2ScoreAnim  = $state<number | null>(null);
    let t1ReplayAnim = $state(false);
    let t2ReplayAnim = $state(false);

    $effect(() => {
        if (team1Score !== prevT1Score) {
            t1ScoreAnim = team1Score;
            prevT1Score = team1Score;
            setTimeout(() => (t1ScoreAnim = null), 650);
        }
    });

    $effect(() => {
        if (team2Score !== prevT2Score) {
            t2ScoreAnim = team2Score;
            prevT2Score = team2Score;
            setTimeout(() => (t2ScoreAnim = null), 650);
        }
    });

    $effect(() => {
        if (team1Replays !== prevT1Replays) {
            t1ReplayAnim = true;
            prevT1Replays = team1Replays;
            setTimeout(() => (t1ReplayAnim = false), 650);
        }
    });

    $effect(() => {
        if (team2Replays !== prevT2Replays) {
            t2ReplayAnim = true;
            prevT2Replays = team2Replays;
            setTimeout(() => (t2ReplayAnim = false), 650);
        }
    });
</script>

<div class="header geist">
    <div class="header-inner">
        <!-- LEFT SIDE (Team 1) -->
        <div class="side side-left">
            <div class="avatar-wrapper">
                {#if team1Avatar}
                    <img src={team1Avatar} alt={team1Name} class="avatar left" />
                {:else}
                    <div class="avatar avatar-placeholder left"></div>
                {/if}
            </div>

            <div class="player-info player-info-left">
                <span class="player-name">{team1Name}</span>

                <div class="score-row score-row-left">
                    <!-- Maple leaves left→right, filled ones first -->
                    {#each Array(maxScore) as _, i}
                        <img
                            src={i < team1Score ? '/FilledMaple.svg' : '/EmptyMaple.svg'}
                            alt={i < team1Score ? 'Filled maple' : 'Empty maple'}
                            class="maple"
                            class:maple-filled={i < team1Score}
                            class:maple-empty={i >= team1Score}
                            class:maple-pop={t1ScoreAnim !== null && i === t1ScoreAnim - 1}
                        />
                    {/each}

                    <!-- Replay indicator -->
                    {#if team1Replays > 0}
                        <div class="replay-badge" class:replay-pop={t1ReplayAnim}>
                            <i class="pi pi-replay"></i>
                            <span class="replay-count">{team1Replays}</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <div class="center">
            <img src="/Logo.svg" alt="CBST Logo" class="logo" />
            <div class="match-type-box">
                <div class="mt-corner mt-tl"></div>
                <div class="mt-corner mt-br"></div>
                <span class="match-type-text">{matchType}</span>
            </div>
        </div>

        <div class="side side-right">
            <div class="player-info player-info-right">
                <span class="player-name">{team2Name}</span>

                <div class="score-row score-row-right">
                    <!-- Replay indicator -->
                    {#if team2Replays > 0}
                        <div class="replay-badge" class:replay-pop={t2ReplayAnim}>
                            <i class="pi pi-replay"></i>
                            <span class="replay-count">{team2Replays}</span>
                        </div>
                    {/if}

                    <!-- Maple leaves: right→left fill. We reverse them so
                        the rightmost leaf fills first. -->
                    {#each Array(maxScore) as _, i}
                        {@const leafIndex = maxScore - 1 - i}
                        <img
                            src={leafIndex < team2Score ? '/FilledMaple.svg' : '/EmptyMaple.svg'}
                            alt={leafIndex < team2Score ? 'Filled maple' : 'Empty maple'}
                            class="maple"
                            class:maple-filled={leafIndex < team2Score}
                            class:maple-empty={leafIndex >= team2Score}
                            class:maple-pop={t2ScoreAnim !== null && leafIndex === t2ScoreAnim - 1}
                        />
                    {/each}
                </div>
            </div>

            <div class="avatar-wrapper">
                {#if team2Avatar}
                    <img src={team2Avatar} alt={team2Name} class="avatar right" />
                {:else}
                    <div class="avatar avatar-placeholder right"></div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .sr-only {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
    }

    .header {
        position: relative;
        width: 1920px;
        height: 180px;
        flex-shrink: 0;
        overflow: visible;
        z-index: 100;
    }

    .header-inner {
        position: relative;
        display: flex;
        align-items: stretch;
        width: 100%;
        height: 100%;
        background: linear-gradient(180deg, #0e0608 0%, #1a0a10 50%, #0e0608 100%);
    }

    /* Subtle warm side accents */
    .header-inner::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
            linear-gradient(90deg, rgba(196, 30, 58, 0.06) 0%, transparent 25%),
            linear-gradient(270deg, rgba(196, 30, 58, 0.06) 0%, transparent 25%);
    }

    /* Bottom accent line */
    .header-inner::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        pointer-events: none;
        background: linear-gradient(90deg, rgba(196, 30, 58, 0.15), #c41e3a 30%, #c41e3a 70%, rgba(196, 30, 58, 0.15));
    }

    .side {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        padding: 8px 0;
    }

    .side-left {
        padding-left: 0;
    }

    .side-right {
        padding-right: 0;
        justify-content: flex-end;
    }

    .avatar-wrapper {
        flex-shrink: 0;
        width: 160px;
        height: 160px;
        padding: 12px;
    }

    .avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
    }

    .avatar.left {
        border: 2px solid rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.06);
    }

    .avatar.right {
        border: 2px solid #c41e3a;
        box-shadow: 0 0 20px rgba(196, 30, 58, 0.15);
    }

    .avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 4px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        background: rgba(196, 30, 58, 0.04);
    }

    .player-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        flex: 1;
        padding: 0 24px;
        gap: 8px;
    }

    .player-info-left {
        align-items: flex-start;
    }

    .player-info-right {
        align-items: flex-end;
    }

    .player-name {
        font-size: 30px;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 520px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .score-row {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .score-row-left {
        flex-direction: row;
    }

    .score-row-right {
        flex-direction: row;
    }

    .maple {
        width: 36px;
        height: 36px;
        transition: transform 0.15s ease;
        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
    }

    .maple-empty {
        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5)) brightness(0.3) opacity(0.5);
    }

    .maple-filled {
        filter: drop-shadow(0 2px 6px rgba(196, 30, 58, 0.6));
    }

    .maple-pop {
        animation: popLeaf 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes popLeaf {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.55); }
        60%  { transform: scale(0.9); }
        100% { transform: scale(1); }
    }

    .replay-badge {
        display: flex;
        align-items: center;
        gap: 3px;
        background: rgba(196, 30, 58, 0.15);
        border: 1px solid rgba(196, 30, 58, 0.4);
        border-radius: 2px;
        padding: 3px 8px;
        margin: 0 4px;
        transition: transform 0.15s ease;
    }

    .replay-badge .pi {
        font-size: 16px;
        color: #c41e3a;
    }

    .replay-count {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
    }

    .replay-pop {
        animation: popReplay 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes popReplay {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.35); }
        60%  { transform: scale(0.92); }
        100% { transform: scale(1); }
    }

    .center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        width: 320px;
        flex-shrink: 0;
        padding-top: 4px;
        z-index: 2;
    }

    .logo {
        width: 120px;
        height: 120px;
        object-fit: contain;
        filter: drop-shadow(0 2px 8px rgba(196, 30, 58, 0.35));
    }

    .match-type-box {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2px;
        padding: 5px 28px;
        min-width: 180px;
        border: 1px solid rgba(196, 30, 58, 0.4);
        background: rgba(196, 30, 58, 0.08);
    }

    .mt-corner {
        position: absolute;
        width: 8px;
        height: 8px;
        pointer-events: none;
    }

    .mt-tl {
        top: -1px;
        left: -1px;
        border-top: 2px solid #c41e3a;
        border-left: 2px solid #c41e3a;
    }

    .mt-br {
        bottom: -1px;
        right: -1px;
        border-bottom: 2px solid #c41e3a;
        border-right: 2px solid #c41e3a;
    }

    .match-type-text {
        font-size: 13px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
        text-transform: uppercase;
        letter-spacing: 3px;
        white-space: nowrap;
    }
</style>