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
    const tournamentLogoUrl = "/MAPS_transparent_logo.png";

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
        <div class="side side-left">
            <div class="identity identity-left">
                <div class="avatar-wrapper">
                    {#if team1Avatar}
                        <img src={team1Avatar} alt={team1Name} class="avatar avatar-left" />
                    {:else}
                        <div class="avatar avatar-placeholder avatar-left"></div>
                    {/if}
                </div>

                <div class="player-info player-info-left">
                    <span class="player-name">{team1Name}</span>
                </div>
            </div>

            <div class="score-row score-row-left">
                <div
                    class="replay-badge"
                    class:replay-active={team1Replays > 0}
                    class:replay-used={team1Replays === 0}
                    class:replay-pop={t1ReplayAnim}
                >
                    <i class="pi pi-replay"></i>
                </div>

                {#each Array(maxScore) as _, i}
                    <div
                        class="score-tile score-tile-left"
                        class:score-tile-filled={i < team1Score}
                        class:score-tile-empty={i >= team1Score}
                        class:score-tile-pop={t1ScoreAnim !== null && i === t1ScoreAnim - 1}
                    ></div>
                {/each}
            </div>
        </div>

        <div class="center">
            <img src={tournamentLogoUrl} alt="Tournament logo" class="tournament-logo" />
            <div class="match-type-box">
                <span class="match-type-text">{matchType}</span>
            </div>
        </div>

        <div class="side side-right">
            <div class="score-row score-row-right">
                {#each Array(maxScore) as _, i}
                    {@const tileIndex = maxScore - 1 - i}
                    <div
                        class="score-tile score-tile-right"
                        class:score-tile-filled={tileIndex < team2Score}
                        class:score-tile-empty={tileIndex >= team2Score}
                        class:score-tile-pop={t2ScoreAnim !== null && tileIndex === t2ScoreAnim - 1}
                    ></div>
                {/each}

                <div
                    class="replay-badge"
                    class:replay-active={team2Replays > 0}
                    class:replay-used={team2Replays === 0}
                    class:replay-pop={t2ReplayAnim}
                >
                    <i class="pi pi-replay"></i>
                </div>
            </div>

            <div class="identity identity-right">
                <div class="player-info player-info-right">
                    <span class="player-name">{team2Name}</span>
                </div>

                <div class="avatar-wrapper">
                    {#if team2Avatar}
                        <img src={team2Avatar} alt={team2Name} class="avatar avatar-right" />
                    {:else}
                        <div class="avatar avatar-placeholder avatar-right"></div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
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
        background:
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 30%),
            linear-gradient(180deg, #050505 0%, #101010 52%, #050505 100%);
    }

    .header-inner::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
            linear-gradient(90deg, rgba(214, 59, 75, 0.12) 0%, transparent 24%),
            linear-gradient(270deg, rgba(72, 118, 255, 0.12) 0%, transparent 24%);
    }

    .header-inner::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        pointer-events: none;
        background: linear-gradient(90deg, rgba(214, 59, 75, 0.35), rgba(255, 255, 255, 0.14) 50%, rgba(72, 118, 255, 0.35));
    }

    .side {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        padding: 10px 0;
        gap: 18px;
    }

    .side-left {
        --team-accent: #d63b4b;
        padding-left: 0;
    }

    .side-right {
        --team-accent: #4b79ff;
        padding-right: 0;
        justify-content: flex-end;
    }

    .identity {
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 14px;
    }

    .identity-left {
        margin-right: auto;
    }

    .identity-right {
        margin-left: auto;
        justify-content: flex-end;
    }

    .avatar-wrapper {
        flex-shrink: 0;
        width: 150px;
        height: 150px;
        padding: 8px;
    }

    .avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0;
    }

    .avatar-left {
        border: 1px solid rgba(214, 59, 75, 0.75);
        box-shadow: 0 0 16px rgba(214, 59, 75, 0.1);
    }

    .avatar-right {
        border: 1px solid rgba(75, 121, 255, 0.78);
        box-shadow: 0 0 16px rgba(75, 121, 255, 0.1);
    }

    .avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
    }

    .player-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        flex: 1;
        padding: 0;
        gap: 0;
    }

    .player-info-left {
        align-items: flex-start;
    }

    .player-info-right {
        align-items: flex-end;
    }

    .player-name {
        font-size: 26px;
        font-weight: 700;
        color: rgba(245, 245, 245, 0.98);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 320px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        text-align: inherit;
    }

    .score-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .score-row-left {
        flex-direction: row;
        margin-left: auto;
    }

    .score-row-right {
        flex-direction: row;
        margin-right: auto;
    }

    .score-tile {
        width: 26px;
        height: 116px;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(22, 22, 22, 0.92);
        transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
    }

    .score-tile-left {
        clip-path: polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%);
    }

    .score-tile-right {
        clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%);
    }

    .score-tile-empty {
        background: rgba(20, 20, 20, 0.94);
        border-color: color-mix(in srgb, var(--team-accent) 78%, rgba(255, 255, 255, 0.06));
    }

    .score-tile-filled {
        background: var(--team-accent);
        border-color: var(--team-accent);
    }

    .score-tile-pop {
        animation: popTile 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes popTile {
        0% {
            transform: scale(1);
        }

        30% {
            transform: scale(1.28);
        }

        60% {
            transform: scale(0.94);
        }

        100% {
            transform: scale(1);
        }
    }

    .replay-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        width: 52px;
        height: 52px;
        justify-content: center;
        transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
    }

    .replay-badge .pi {
        font-size: 27px;
    }

    .replay-active {
        border-color: rgba(255, 255, 255, 0.5);
    }

    .replay-active .pi {
        color: rgba(255, 255, 255, 0.98);
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.38);
    }

    .replay-used {
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: none;
        opacity: 0.72;
    }

    .replay-used .pi {
        color: rgba(190, 190, 190, 0.72);
        text-shadow: none;
    }

    .replay-pop {
        animation: popReplay 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes popReplay {
        0% {
            transform: scale(1);
        }

        30% {
            transform: scale(1.25);
        }

        60% {
            transform: scale(0.95);
        }

        100% {
            transform: scale(1);
        }
    }

    .center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        width: 292px;
        flex-shrink: 0;
        padding-top: 6px;
        z-index: 2;
    }

    .tournament-logo {
        width: 112px;
        height: 112px;
        object-fit: contain;
        filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.08));
    }

    .match-type-box {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 8px;
        padding: 6px 22px;
        min-width: 168px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.03);
        clip-path: polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%);
    }

    .match-type-text {
        font-size: 11px;
        font-weight: 700;
        color: rgba(235, 235, 235, 0.9);
        text-transform: uppercase;
        letter-spacing: 3px;
        white-space: nowrap;
    }
</style>