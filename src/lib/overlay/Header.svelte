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

<div class="header">
    <!-- Clip path for the polygon bottom edge -->
    <svg class="sr-only" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <clipPath id="headerClip" clipPathUnits="objectBoundingBox">
                <!-- A polygon that keeps the top straight and gives the bottom a subtle angular shape -->
                <polygon points="
                    0,0  1,0
                    1,0.88  0.72,0.88  0.68,1  0.58,0.88
                    0.42,0.88  0.32,1  0.28,0.88  0,0.88
                " />
            </clipPath>
        </defs>
    </svg>

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
            <div class="match-type-wrapper">
                <div class="match-type-bg"></div>
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
        background: linear-gradient(180deg, #1a1014 0%, #2a1018 60%, #1a1014 100%);
    }

    /* Bottom accent line */
    .header-inner::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        pointer-events: none;
        background: linear-gradient(90deg, #c41e3a, #e8552e 50%, #c41e3a);
        opacity: 0.9;
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
        padding: 8px;
    }

    .avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 14px;
        
        box-shadow: 0 0 18px rgba(196, 30, 58, 0.45);
    }

    .avatar.left {
        border: 3px solid #d2cdce;
    }

    .avatar.right {
        border: 3px solid #c41e3a;
    }

    .avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 14px;
        border: 3px solid #c41e3a;
        background: linear-gradient(135deg, #2a1018, #3d1520);
    }

    .player-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        flex: 1;
        padding: 0 18px;
        gap: 6px;
    }

    .player-info-left {
        align-items: flex-start;
    }

    .player-info-right {
        align-items: flex-end;
    }

    .player-name {
        font-family: 'Keania', sans-serif;
        font-size: 32px;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 520px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
        letter-spacing: 1px;
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
        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5)) brightness(0.4) opacity(0.6);
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
        background: rgba(196, 30, 58, 0.25);
        border: 1px solid rgba(196, 30, 58, 0.6);
        border-radius: 8px;
        padding: 3px 8px;
        margin: 0 4px;
        transition: transform 0.15s ease;
    }

    .replay-badge .pi {
        font-size: 16px;
        color: #e8552e;
    }

    .replay-count {
        font-family: 'Keania', sans-serif;
        font-size: 16px;
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
        width: 140px;
        height: 140px;
        object-fit: contain;
        filter: drop-shadow(0 2px 10px rgba(196, 30, 58, 0.5));
    }

    .match-type-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: -6px;
        padding: 2px 0;
        min-width: 200px;
    }

    .match-type-bg {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, #c41e3a 20%, #e8552e 50%, #c41e3a 80%, transparent);
        clip-path: polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%);
        opacity: 0.9;
    }

    .match-type-text {
        position: relative;
        font-family: 'Keania', sans-serif;
        font-size: 15px;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 2px;
        padding: 4px 28px;
        white-space: nowrap;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        z-index: 1;
    }
</style>