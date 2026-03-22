<script lang="ts">
    import { PUBLIC_BK_API_URL } from "$env/static/public";
    import { onMount } from "svelte";
    import { page } from "$app/state";

    interface Captain {
        guid: string;
        preferredName: string;
        avatarUrl?: string;
    }

    interface Side {
        guid: string;
        captain: Captain;
    }

    interface MatchSides {
        team1: Side;
        team2: Side;
    }

    interface MatchScore {
        guid: string;
        user: string;
        matchResultGuid: string;
        mapGuid?: string;
        mapHashIfNotMap?: string;
        score: number;
        completionType: number;
        misses: number;
        badCuts: number;
        goodCuts: number;
        endTime: number;
        accuracy: number;
        isCallingReplay: boolean;
    }

    interface MatchResults {
        guid: string;
        winnerGuid?: string;
        team1Score?: number;
        team2Score?: number;
        scores?: MatchScore[];
    }

    interface Match {
        guid: string;
        matchNumber?: number;
        matchType?: string;
        scheduledTime?: string;
        actualStartTime?: string;
        actualEndTime?: string;
        status: string;
        players?: MatchSides | string;
        sides?: MatchSides;
        results: MatchResults;
        nextMatchGuid?: string;
        loserMatchGuid?: string;
    }

    interface Bracket {
        id: string;
        matches: Match[];
    }

    interface Division {
        id: string;
        brackets: Bracket[];
    }

    interface Placement {
        place: number;
        captain: Captain;
        prize: number;
        wins: number;
        losses: number;
        division: "higher" | "lower";
    }

    interface FunStat {
        type: "most_mistakes" | "highest_accuracy" | "most_replays" | "longest_match" | "shortest_match";
        label: string;
        icon: string;
        detail: string;
        captain?: Captain;
        opponent?: Captain;
        winnerCaptain?: Captain;
        value: string | number;
    }

    interface RawCaptain {
        guid?: string;
        preferredName?: string;
        avatarUrl?: string;
    }

    function normalizeGuid(value: unknown): string {
        if (typeof value === "string") return value.trim().toLowerCase();
        if (typeof value === "number" || typeof value === "bigint") return String(value).trim().toLowerCase();
        return "";
    }

    function scoreUserGuid(score: MatchScore): string {
        const direct = normalizeGuid((score as unknown as { user?: unknown }).user);
        if (direct) return direct;

        const nested = (score as unknown as { user?: { guid?: unknown; userGuid?: unknown; id?: unknown } }).user;
        if (nested && typeof nested === "object") {
            return normalizeGuid(nested.guid ?? nested.userGuid ?? nested.id);
        }

        return "";
    }

    const TBD_CAPTAIN: Captain = {
        guid: "tbd",
        preferredName: "TBD"
    };

    let totalPrize = $derived.by(() => {
        const raw = page.url.searchParams.get("total") ?? "0";
        const num = parseFloat(raw.replace(/[^0-9.]/g, ""));
        return isNaN(num) ? 0 : num;
    });

    let prizeDisplay = $derived.by(() => {
        const raw = page.url.searchParams.get("total") ?? "0 CAD";
        return raw;
    });

    const PRIZE_SPLITS = {
        higher1: 0.40,
        higher2: 0.30,
        higher3: 0.20,
        lower1: 0.10,
    };

    function calcPrize(pct: number): number {
        return Math.round(totalPrize * pct * 100) / 100;
    }

    let divisions = $state<Division[]>([]);
    let higherPlacements = $state<Placement[]>([]);
    let lowerPlacements = $state<Placement[]>([]);
    let funStats = $state<FunStat[]>([]);
    let loaded = $state(false);

    function makeTbdCaptain(key: string): Captain {
        return {
            ...TBD_CAPTAIN,
            guid: `tbd-${key}`,
            avatarUrl: "/Logo.svg",
        };
    }

    function normalizeCaptain(rawCaptain: RawCaptain | undefined, fallbackKey: string): Captain {
        const guid = rawCaptain?.guid?.trim();
        const preferredName = rawCaptain?.preferredName?.trim();
        const avatarUrl = rawCaptain?.avatarUrl?.trim();
        const fallback = makeTbdCaptain(fallbackKey);

        return {
            guid: guid && guid.length > 0 ? guid : fallback.guid,
            preferredName: preferredName && preferredName.length > 0 ? preferredName : fallback.preferredName,
            avatarUrl: avatarUrl && avatarUrl.length > 0 ? avatarUrl : "/Logo.svg",
        };
    }

    function isMatchSides(value: unknown): value is MatchSides {
        if (!value || typeof value !== "object") return false;
        const candidate = value as Partial<MatchSides>;
        return Boolean(candidate.team1 && candidate.team2);
    }

    function getSides(match: Match | undefined): MatchSides | undefined {
        if (!match) return undefined;
        if (isMatchSides(match.sides)) return match.sides;
        if (isMatchSides(match.players)) return match.players;
        return undefined;
    }

    function safeCaptain(side: Side | undefined, fallbackKey: string): Captain {
        return normalizeCaptain(side?.captain, fallbackKey);
    }

    function matchCaptains(match: Match | undefined, fallbackKey: string): { team1: Captain; team2: Captain } {
        const sides = getSides(match);
        return {
            team1: safeCaptain(sides?.team1, `${fallbackKey}-team1`),
            team2: safeCaptain(sides?.team2, `${fallbackKey}-team2`),
        };
    }

    function resolveWinnerCaptain(match: Match | undefined, fallbackKey: string): Captain | undefined {
        const winnerGuid = match?.results?.winnerGuid;
        const sides = getSides(match);
        if (!winnerGuid || !sides) return undefined;

        const t1 = safeCaptain(sides.team1, `${fallbackKey}-team1`);
        const t2 = safeCaptain(sides.team2, `${fallbackKey}-team2`);

        if (winnerGuid === t1.guid || winnerGuid === sides.team1?.guid) return t1;
        if (winnerGuid === t2.guid || winnerGuid === sides.team2?.guid) return t2;
        return undefined;
    }

    function resolveLoserCaptain(match: Match | undefined, fallbackKey: string): Captain | undefined {
        const winnerGuid = match?.results?.winnerGuid;
        const sides = getSides(match);
        if (!winnerGuid || !sides) return undefined;

        const t1 = safeCaptain(sides.team1, `${fallbackKey}-team1`);
        const t2 = safeCaptain(sides.team2, `${fallbackKey}-team2`);

        if (winnerGuid === t1.guid || winnerGuid === sides.team1?.guid) return t2;
        if (winnerGuid === t2.guid || winnerGuid === sides.team2?.guid) return t1;
        return undefined;
    }

    function allMatchesFlat(divs: Division[]): Match[] {
        return divs.flatMap(d => d.brackets.flatMap(b => b.matches));
    }

    function getBracket(divs: Division[], divId: string, bracketId: string): Bracket | undefined {
        return divs
            .find(d => d.id?.toLowerCase() === divId.toLowerCase())
            ?.brackets.find(b => b.id?.toLowerCase() === bracketId.toLowerCase());
    }

    function getMatch(bracket: Bracket | undefined, matchNumber: number): Match | undefined {
        return bracket?.matches.find(m => Number(m.matchNumber) === matchNumber);
    }

    function winLossRecord(captainGuid: string, allMatches: Match[]): { wins: number; losses: number } {
        if (!captainGuid || captainGuid.startsWith("tbd-")) {
            return { wins: 0, losses: 0 };
        }

        let wins = 0;
        let losses = 0;

        for (const m of allMatches) {
            const sides = getSides(m);
            const t1Captain = sides?.team1?.captain?.guid;
            const t2Captain = sides?.team2?.captain?.guid;
            const winnerGuid = m.results?.winnerGuid;

            const isPlayer = t1Captain === captainGuid || t2Captain === captainGuid;
            if (!isPlayer || !winnerGuid) continue;

            const t1Side = sides?.team1?.guid;
            const t2Side = sides?.team2?.guid;
            const captainWon = winnerGuid === captainGuid
                || (winnerGuid === t1Side && t1Captain === captainGuid)
                || (winnerGuid === t2Side && t2Captain === captainGuid);

            if (captainWon) wins++;
            else losses++;
        }

        return { wins, losses };
    }

    function resolvePlacements(divs: Division[]): { higher: Placement[]; lower: Placement[] } {
        const all = allMatchesFlat(divs);

        const upperA = getBracket(divs, "A", "upper");
        const lowerA = getBracket(divs, "A", "lower");

        const gf = getMatch(upperA, 30);
        const br = getMatch(upperA, 31);
        const lgf = getMatch(lowerA, 29);

        const actualGF = br?.results?.winnerGuid ? br : gf;
        const gfCaptains = matchCaptains(actualGF, "higher-gf");
        const higherWinner = resolveWinnerCaptain(actualGF, "higher-gf");

        const higher1Captain = higherWinner ?? gfCaptains.team1;
        const higher2Captain = higherWinner
            ? (higherWinner.guid === gfCaptains.team1.guid ? gfCaptains.team2 : gfCaptains.team1)
            : gfCaptains.team2;

        const higher3Captain = resolveLoserCaptain(lgf, "higher-lgf")
            ?? matchCaptains(lgf, "higher-lgf").team2;

        const higher: Placement[] = [
            { place: 1, captain: higher1Captain, prize: calcPrize(PRIZE_SPLITS.higher1), ...winLossRecord(higher1Captain.guid, all), division: "higher" },
            { place: 2, captain: higher2Captain, prize: calcPrize(PRIZE_SPLITS.higher2), ...winLossRecord(higher2Captain.guid, all), division: "higher" },
            { place: 3, captain: higher3Captain, prize: calcPrize(PRIZE_SPLITS.higher3), ...winLossRecord(higher3Captain.guid, all), division: "higher" },
        ];

        const upperB = getBracket(divs, "B", "upper");
        const lowerB = getBracket(divs, "B", "lower");

        const bFinals = getMatch(upperB, 18);
        const b3rdMatch = getMatch(lowerB, 17);

        const lowerFinalCaptains = matchCaptains(bFinals, "lower-finals");
        const lowerWinner = resolveWinnerCaptain(bFinals, "lower-finals");

        const lower1Captain = lowerWinner ?? lowerFinalCaptains.team1;
        const lower2Captain = lowerWinner
            ? (lowerWinner.guid === lowerFinalCaptains.team1.guid ? lowerFinalCaptains.team2 : lowerFinalCaptains.team1)
            : lowerFinalCaptains.team2;

        const lower3Captain = resolveLoserCaptain(b3rdMatch, "lower-third")
            ?? matchCaptains(b3rdMatch, "lower-third").team2;

        const lower: Placement[] = [
            { place: 1, captain: lower1Captain, prize: calcPrize(PRIZE_SPLITS.lower1), ...winLossRecord(lower1Captain.guid, all), division: "lower" },
            { place: 2, captain: lower2Captain, prize: 0, ...winLossRecord(lower2Captain.guid, all), division: "lower" },
            { place: 3, captain: lower3Captain, prize: 0, ...winLossRecord(lower3Captain.guid, all), division: "lower" },
        ];

        return { higher, lower };
    }

    function resolveFunStats(_divs: Division[], all: Match[]): FunStat[] {
        const allScores: MatchScore[] = [];
        for (const m of all) {
            if (Array.isArray(m.results?.scores)) allScores.push(...m.results.scores);
        }

        const captainLookup = new Map<string, Captain>();
        for (const match of all) {
            const sides = getSides(match);
            const captainA = sides?.team1?.captain;
            const captainB = sides?.team2?.captain;
            const sideAGuid = normalizeGuid(sides?.team1?.guid);
            const sideBGuid = normalizeGuid(sides?.team2?.guid);

            if (captainA?.guid) {
                const normalizedCaptainA = normalizeCaptain(captainA, `fun-lookup-${match.guid}-a`);
                captainLookup.set(normalizeGuid(captainA.guid), normalizedCaptainA);
                if (sideAGuid) captainLookup.set(sideAGuid, normalizedCaptainA);
            }
            if (captainB?.guid) {
                const normalizedCaptainB = normalizeCaptain(captainB, `fun-lookup-${match.guid}-b`);
                captainLookup.set(normalizeGuid(captainB.guid), normalizedCaptainB);
                if (sideBGuid) captainLookup.set(sideBGuid, normalizedCaptainB);
            }
        }

        const stats: FunStat[] = [];

        const mistakesMap = new Map<string, number>();
        for (const s of allScores) {
            const key = scoreUserGuid(s);
            if (!key) continue;
            const cur = mistakesMap.get(key) ?? 0;
            const mistakes = Number(s.badCuts ?? 0) + Number(s.misses ?? 0);
            if (mistakes > cur) mistakesMap.set(key, mistakes);
        }

        let worstUser = "";
        let worstMistakes = 0;
        mistakesMap.forEach((v, k) => {
            if (v > worstMistakes) {
                worstMistakes = v;
                worstUser = k;
            }
        });

        const replayMap = new Map<string, number>();
        for (const s of allScores) {
            if (Boolean(s.isCallingReplay)) {
                const key = scoreUserGuid(s);
                if (!key) continue;
                replayMap.set(key, (replayMap.get(key) ?? 0) + 1);
            }
        }

        let replayUser = "";
        let replayCount = 0;
        replayMap.forEach((v, k) => {
            if (v > replayCount) {
                replayCount = v;
                replayUser = k;
            }
        });

        let accUser = "";
        let accVal = 0;
        for (const s of allScores) {
            const accuracy = Number(s.accuracy ?? 0);
            if (!Number.isFinite(accuracy)) continue;
            if (accuracy > accVal) {
                accVal = accuracy;
                accUser = scoreUserGuid(s);
            }
        }

        function captainByUserGuid(userGuid: string): Captain | undefined {
            const key = normalizeGuid(userGuid);
            if (!key) return undefined;
            return captainLookup.get(key);
        }

        if (worstUser) {
            stats.push({
                type: "most_mistakes",
                label: "Most Misses + Bad Cuts on a Map",
                icon: "pi-times-circle",
                detail: `${worstMistakes} mistakes on a single map`,
                captain: captainByUserGuid(worstUser),
                value: worstMistakes,
            });
        }

        if (accUser) {
            stats.push({
                type: "highest_accuracy",
                label: "Highest Accuracy on any Map",
                icon: "pi-bullseye",
                detail: `${accVal.toFixed(2)}% accuracy`,
                captain: captainByUserGuid(accUser),
                value: accVal,
            });
        }

        if (replayUser) {
            stats.push({
                type: "most_replays",
                label: "Most Replays Called (total)",
                icon: "pi-refresh",
                detail: `${replayCount} replay call${replayCount === 1 ? "" : "s"}`,
                captain: captainByUserGuid(replayUser),
                value: replayCount,
            });
        }

        interface DurationMatch {
            match: Match;
            duration: number;
        }

        const timed: DurationMatch[] = [];
        for (const m of all) {
            if (m.actualStartTime && m.actualEndTime) {
                const duration = new Date(m.actualEndTime).getTime() - new Date(m.actualStartTime).getTime();
                if (duration > 0) timed.push({ match: m, duration });
            }
        }

        if (timed.length > 0) {
            timed.sort((a, b) => b.duration - a.duration);
            const longest = timed[0];
            const shortest = timed[timed.length - 1];

            function matchDurationStr(ms: number): string {
                const mins = Math.max(1, Math.round(ms / 60000));
                return `${mins}m`;
            }

            const addMatchStat = (entry: DurationMatch, type: "longest_match" | "shortest_match", label: string, icon: string) => {
                const captains = matchCaptains(entry.match, "funstat-match");
                const winnerCaptain = resolveWinnerCaptain(entry.match, "funstat-match") ?? captains.team1;

                stats.push({
                    type,
                    label,
                    icon,
                    detail: matchDurationStr(entry.duration),
                    captain: captains.team1,
                    opponent: captains.team2,
                    winnerCaptain,
                    value: entry.duration,
                });
            };

            addMatchStat(longest, "longest_match", "Marathon Match", "pi-clock");
            if (shortest.match.guid !== longest.match.guid) {
                addMatchStat(shortest, "shortest_match", "Short Sweep", "pi-bolt");
            }
        }

        return stats;
    }

    onMount(async () => {
        try {
            const bkResponse = await fetch(`${PUBLIC_BK_API_URL}/tournament/CBST2026?matches=true`).then(r => r.json());
            divisions = bkResponse?.divisions ?? [];
            const all = allMatchesFlat(divisions);
            const { higher, lower } = resolvePlacements(divisions);
            higherPlacements = higher;
            lowerPlacements = lower;
            funStats = resolveFunStats(divisions, all);
        } catch (e) {
            console.error("Failed to load tournament data", e);
        } finally {
            loaded = true;
        }
    });

    function placeOrdinal(n: number): string {
        if (n === 1) return "1st";
        if (n === 2) return "2nd";
        if (n === 3) return "3rd";
        return `${n}th`;
    }

    function formatPrize(amount: number): string {
        return amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function isTbdCaptain(captain: Captain | undefined): boolean {
        return !captain?.guid
            || captain.guid.startsWith("tbd-")
            || captain.guid === "tbd"
            || !captain.preferredName
            || captain.preferredName === "TBD";
    }

    function displayRecordValue(captain: Captain | undefined, value: number): string {
        return isTbdCaptain(captain) ? "--" : `${value}`;
    }

    const displayFunStats = $derived.by(() => {
        return funStats;
    });

    const lowerWinnerPlacement = $derived.by(() => lowerPlacements.find((placement) => placement.place === 1));
    const lowerRunnerPlacements = $derived.by(() =>
        lowerPlacements
            .filter((placement) => placement.place === 2 || placement.place === 3)
            .sort((left, right) => left.place - right.place)
    );

    const HIGHER_GLOW = ["#ffd700", "#c0c0c0", "#cd7f32"];
    const LOWER_GLOW = ["#60c4ff", "#a78bfa", "#34d399"];
</script>

<div class="screen">
    <!-- Video backgrounds -->
    <video src="/Background_White.webm" class="panel-bg left-bg" muted autoplay loop></video>
    <video src="/Background_Dark.webm"  class="panel-bg right-bg" muted autoplay loop></video>

    <!-- Dark overlay on right side for contrast -->
    <div class="right-dark-overlay"></div>

    <aside class="left-panel">
        <div class="left-vignette"></div>

        <div class="left-content">
            <div class="stats-title">
                <span class="stats-title-line"></span>
                <span class="stats-title-text">TOURNAMENT HIGHLIGHTS</span>
                <span class="stats-title-line"></span>
            </div>

            <div class="fun-stats-list">
                {#each displayFunStats as stat, i}
                    <div class="stat-card" style="animation-delay: {i * 0.12}s">
                        <div class="stat-corner stat-corner-top-left"></div>
                        <div class="stat-corner stat-corner-bottom-right"></div>

                        <div class="stat-card-header">
                            <span class="stat-label">{stat.label}</span>
                        </div>

                        {#if stat.type === "longest_match" || stat.type === "shortest_match"}
                            <div class="stat-match-body">
                                <div class="stat-match-players">
                                    {#if stat.captain}
                                        <div class="stat-mini-player" class:winner={stat.captain.guid === stat.winnerCaptain?.guid}>
                                            {#if stat.captain.avatarUrl}
                                                <img src={stat.captain.avatarUrl} alt={stat.captain.preferredName} class="stat-avatar" />
                                            {:else}
                                                <div class="stat-avatar stat-avatar-fallback">{stat.captain.preferredName[0]}</div>
                                            {/if}
                                            <span class="stat-player-name">{stat.captain.preferredName}</span>
                                            {#if stat.captain.guid === stat.winnerCaptain?.guid}
                                                <span class="crown"><i class="pi pi-crown"></i></span>
                                            {/if}
                                        </div>
                                    {/if}
                                    <span class="vs-divider">VS</span>
                                    {#if stat.opponent}
                                        <div class="stat-mini-player" class:winner={stat.opponent.guid === stat.winnerCaptain?.guid}>
                                            {#if stat.opponent.avatarUrl}
                                                <img src={stat.opponent.avatarUrl} alt={stat.opponent.preferredName} class="stat-avatar" />
                                            {:else}
                                                <div class="stat-avatar stat-avatar-fallback">{stat.opponent.preferredName[0]}</div>
                                            {/if}
                                            <span class="stat-player-name">{stat.opponent.preferredName}</span>
                                            {#if stat.opponent.guid === stat.winnerCaptain?.guid}
                                                <span class="crown"><i class="pi pi-crown"></i></span>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                                <div class="stat-value-chip">{stat.detail}</div>
                            </div>
                        {:else}
                            <div class="stat-player-body">
                                {#if stat.captain}
                                    <div class="stat-captain-row">
                                        {#if stat.captain.avatarUrl}
                                            <img src={stat.captain.avatarUrl} alt={stat.captain.preferredName} class="stat-avatar-lg" />
                                        {:else}
                                            <div class="stat-avatar-lg stat-avatar-fallback-lg">{stat.captain.preferredName[0]}</div>
                                        {/if}
                                        <span class="stat-captain-name">{stat.captain.preferredName}</span>
                                    </div>
                                {/if}
                                <div class="stat-value-chip">{stat.detail}</div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </aside>

    <main class="right-panel">
        <!-- Prize pool header -->
        <div class="prize-header">
            <div class="prize-label-row">
                <span class="prize-tag">TOTAL PRIZE POOL</span>
            </div>
            <div class="prize-amount">${prizeDisplay}</div>
        </div>

        <!-- Higher division (larger) -->
        <section class="division-section higher-section">
            <div class="division-label">
                <div class="division-label-accent"></div>
                <span>DIVISION A</span>
                <div class="division-label-accent"></div>
            </div>

            <div class="podium-row higher-podium">
                <!-- 2nd place left -->
                {#if higherPlacements[1]}
                    {@const p = higherPlacements[1]}
                    <div class="podium-card place-2" style="--glow: {HIGHER_GLOW[1]}">
                        <div class="podium-place-badge" style="--glow: {HIGHER_GLOW[1]}">
                            <span class="ordinal">{placeOrdinal(p.place)}</span>
                        </div>
                        <div class="avatar-wrap">
                            {#if p.captain.avatarUrl}
                                <img src={p.captain.avatarUrl} alt={p.captain.preferredName} class="podium-avatar" />
                            {:else}
                                <div class="podium-avatar podium-avatar-fallback">{p.captain.preferredName[0]}</div>
                            {/if}
                            <div class="avatar-ring" style="--glow: {HIGHER_GLOW[1]}"></div>
                        </div>
                        <span class="podium-name">{p.captain.preferredName}</span>
                        <div class="podium-record">
                            <span class="wins">{displayRecordValue(p.captain, p.wins)}W</span>
                            <span class="record-sep">–</span>
                            <span class="losses">{displayRecordValue(p.captain, p.losses)}L</span>
                        </div>
                        <div class="podium-prize" style="color: {HIGHER_GLOW[1]}">
                            ${formatPrize(p.prize)} <span class="cad">CAD</span>
                        </div>
                    </div>
                {/if}

                <!-- 1st place center (largest) -->
                {#if higherPlacements[0]}
                    {@const p = higherPlacements[0]}
                    <div class="podium-card place-1 center-card" style="--glow: {HIGHER_GLOW[0]}">
                        <div class="champion-crown"><i class="pi pi-crown"></i></div>
                        <div class="podium-place-badge champion-badge" style="--glow: {HIGHER_GLOW[0]}">
                            <span class="ordinal">{placeOrdinal(p.place)}</span>
                        </div>
                        <div class="avatar-wrap avatar-wrap-lg">
                            {#if p.captain.avatarUrl}
                                <img src={p.captain.avatarUrl} alt={p.captain.preferredName} class="podium-avatar avatar-lg" />
                            {:else}
                                <div class="podium-avatar avatar-lg podium-avatar-fallback">{p.captain.preferredName[0]}</div>
                            {/if}
                            <div class="avatar-ring avatar-ring-lg" style="--glow: {HIGHER_GLOW[0]}"></div>
                            <div class="avatar-ring-outer" style="--glow: {HIGHER_GLOW[0]}"></div>
                        </div>
                        <span class="podium-name name-lg">{p.captain.preferredName}</span>
                        <div class="podium-record">
                            <span class="wins">{displayRecordValue(p.captain, p.wins)}W</span>
                            <span class="record-sep">–</span>
                            <span class="losses">{displayRecordValue(p.captain, p.losses)}L</span>
                        </div>
                        <div class="podium-prize prize-lg" style="color: {HIGHER_GLOW[0]}">
                            ${formatPrize(p.prize)} <span class="cad">CAD</span>
                        </div>
                    </div>
                {/if}

                <!-- 3rd place right -->
                {#if higherPlacements[2]}
                    {@const p = higherPlacements[2]}
                    <div class="podium-card place-3" style="--glow: {HIGHER_GLOW[2]}">
                        <div class="podium-place-badge" style="--glow: {HIGHER_GLOW[2]}">
                            <span class="ordinal">{placeOrdinal(p.place)}</span>
                        </div>
                        <div class="avatar-wrap">
                            {#if p.captain.avatarUrl}
                                <img src={p.captain.avatarUrl} alt={p.captain.preferredName} class="podium-avatar" />
                            {:else}
                                <div class="podium-avatar podium-avatar-fallback">{p.captain.preferredName[0]}</div>
                            {/if}
                            <div class="avatar-ring" style="--glow: {HIGHER_GLOW[2]}"></div>
                        </div>
                        <span class="podium-name">{p.captain.preferredName}</span>
                        <div class="podium-record">
                            <span class="wins">{displayRecordValue(p.captain, p.wins)}W</span>
                            <span class="record-sep">–</span>
                            <span class="losses">{displayRecordValue(p.captain, p.losses)}L</span>
                        </div>
                        <div class="podium-prize" style="color: {HIGHER_GLOW[2]}">
                            ${formatPrize(p.prize)} <span class="cad">CAD</span>
                        </div>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Divider -->
        <div class="panel-divider">
            <div class="divider-line"></div>
            <div class="divider-diamond"></div>
            <div class="divider-line"></div>
        </div>

        <!-- Lower division (smaller) -->
        <section class="division-section lower-section">
            <div class="division-label lower-label">
                <div class="division-label-accent lower-accent"></div>
                <span>DIVISION B</span>
                <div class="division-label-accent lower-accent"></div>
            </div>

            <div class="lower-podium-block">
                {#if lowerWinnerPlacement}
                    {@const p = lowerWinnerPlacement}
                    <div class="lower-card lower-card-winner" style="--glow: {LOWER_GLOW[0]}">
                        <div class="lower-place-badge" style="--glow: {LOWER_GLOW[0]}">{placeOrdinal(p.place)}</div>
                        <div class="lower-avatar-wrap">
                            {#if p.captain.avatarUrl}
                                <img src={p.captain.avatarUrl} alt={p.captain.preferredName} class="lower-avatar" />
                            {:else}
                                <div class="lower-avatar lower-avatar-fallback">{p.captain.preferredName[0]}</div>
                            {/if}
                            <div class="lower-avatar-ring" style="--glow: {LOWER_GLOW[0]}"></div>
                        </div>
                        <div class="lower-info">
                            <span class="lower-name">{p.captain.preferredName}</span>
                            <div class="lower-record">
                                <span class="wins">{displayRecordValue(p.captain, p.wins)}W</span>
                                <span class="record-sep">–</span>
                                <span class="losses">{displayRecordValue(p.captain, p.losses)}L</span>
                            </div>
                        </div>
                        {#if p.prize > 0}
                            <div class="lower-prize" style="color: {LOWER_GLOW[0]}">
                                {#if isTbdCaptain(p.captain)}
                                    TBD <span class="cad">PRIZE</span>
                                {:else}
                                    ${formatPrize(p.prize)} <span class="cad">CAD</span>
                                {/if}
                            </div>
                        {:else}
                            <div class="lower-prize no-prize">{isTbdCaptain(p.captain) ? "TBD" : "—"}</div>
                        {/if}
                    </div>
                {/if}

                <div class="lower-podium-runners">
                    {#each lowerRunnerPlacements as p, i}
                        <div class="lower-card" style="--glow: {LOWER_GLOW[p.place - 1] ?? LOWER_GLOW[i + 1]}; animation-delay: {0.1 + i * 0.1}s">
                            <div class="lower-place-badge" style="--glow: {LOWER_GLOW[p.place - 1] ?? LOWER_GLOW[i + 1]}">{placeOrdinal(p.place)}</div>
                            <div class="lower-avatar-wrap">
                                {#if p.captain.avatarUrl}
                                    <img src={p.captain.avatarUrl} alt={p.captain.preferredName} class="lower-avatar" />
                                {:else}
                                    <div class="lower-avatar lower-avatar-fallback">{p.captain.preferredName[0]}</div>
                                {/if}
                                <div class="lower-avatar-ring" style="--glow: {LOWER_GLOW[p.place - 1] ?? LOWER_GLOW[i + 1]}"></div>
                            </div>
                            <div class="lower-info">
                                <span class="lower-name">{p.captain.preferredName}</span>
                                <div class="lower-record">
                                    <span class="wins">{displayRecordValue(p.captain, p.wins)}W</span>
                                    <span class="record-sep">–</span>
                                    <span class="losses">{displayRecordValue(p.captain, p.losses)}L</span>
                                </div>
                            </div>
                            {#if p.prize > 0}
                                <div class="lower-prize" style="color: {LOWER_GLOW[p.place - 1] ?? LOWER_GLOW[i + 1]}">
                                    {#if isTbdCaptain(p.captain)}
                                        TBD <span class="cad">PRIZE</span>
                                    {:else}
                                        ${formatPrize(p.prize)} <span class="cad">CAD</span>
                                    {/if}
                                </div>
                            {:else}
                                <div class="lower-prize no-prize">{isTbdCaptain(p.captain) ? "TBD" : "—"}</div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            {#if lowerPlacements.length === 0}
                <div class="lower-empty">TBD · TBD · TBD</div>
            {/if}
        </section>

        <div class="scene-brand geist">
            <img src="/TEXT_WHITE.png" alt="Beat Saber Canada" />
        </div>
    </main>
</div>

<style>
    :global(*), :global(*::before), :global(*::after) {
        box-sizing: border-box;
    }

    :global(html), :global(body) {
        margin: 0;
        padding: 0;
        width: 1920px;
        height: 1080px;
        min-width: 1920px;
        min-height: 1080px;
        max-width: 1920px;
        max-height: 1080px;
        overflow: hidden;
        font-family: 'Geist', 'Inter', system-ui, sans-serif;
    }

    .screen {
        position: relative;
        width: 1920px;
        height: 1080px;
        display: flex;
        overflow: hidden;
        background: #080a0e;
    }

    .panel-bg {
        position: absolute;
        top: 0;
        height: 100%;
        object-fit: cover;
        z-index: 0;
        pointer-events: none;
    }

    .left-bg {
        left: 0;
        width: 34%;
    }

    .right-bg {
        left: 34%;
        width: 66%;
    }

    .right-dark-overlay {
        position: absolute;
        left: 34%;
        top: 0;
        width: 66%;
        height: 100%;
        background: rgba(4, 6, 12, 0.72);
        z-index: 1;
        pointer-events: none;
    }

    .left-panel {
        position: relative;
        width: 34%;
        height: 100%;
        z-index: 2;
        flex-shrink: 0;
    }

    .left-vignette {
        position: absolute;
        inset: 0;
        z-index: 1;
        background: radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0, 0, 0, 0.32) 100%);
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
        padding: 2.5rem 1.6rem 2rem;
        gap: 1rem;
    }

    /* Stats section title */
    .stats-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        margin-top: 0.4rem;
    }

    .stats-title-line {
        flex: 1;
        height: 1px;
        background: rgba(0, 0, 0, 0.25);
    }

    .stats-title-text {
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(0, 0, 0, 0.58);
        white-space: nowrap;
    }

    /* Fun stats list */
    .fun-stats-list {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        width: 100%;
        flex: 1;
        overflow: hidden;
        justify-content: space-between;
    }

    @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-16px); }
        to   { opacity: 1; transform: translateX(0); }
    }

    .stat-card {
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(0, 0, 0, 0.18);
        border-radius: 0;
        padding: 0.92rem 0.95rem 0.82rem;
        backdrop-filter: blur(3px);
        animation: slideInLeft 0.5s ease both;
        position: relative;
        overflow: hidden;
        min-height: 9.45rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .stat-corner {
        position: absolute;
        width: 1rem;
        height: 1rem;
        border-color: rgba(0, 0, 0, 0.26);
        pointer-events: none;
    }

    .stat-corner-top-left {
        top: 0.45rem;
        left: 0.45rem;
        border-top: 1px solid;
        border-left: 1px solid;
    }

    .stat-corner-bottom-right {
        right: 0.45rem;
        bottom: 0.45rem;
        border-bottom: 1px solid;
        border-right: 1px solid;
    }

    .stat-card-header {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-bottom: 0.45rem;
        padding: 0 0.1rem;
    }

    .stat-label {
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(0, 0, 0, 0.78);
    }

    .stat-player-body {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: rgba(255, 255, 255, 0.72);
        border-radius: 0;
        padding: 0.62rem 0.76rem;
    }

    .stat-captain-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .stat-avatar-lg {
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(99, 102, 241, 0.4);
    }

    .stat-avatar-fallback-lg {
        display: grid;
        place-items: center;
        background: rgba(99, 102, 241, 0.15);
        color: #6366f1;
        font-weight: 700;
        font-size: 1rem;
    }

    .stat-captain-name {
        font-size: 1.08rem;
        font-weight: 700;
        color: #000;
    }

    .stat-value-chip {
        font-size: 0.84rem;
        font-weight: 700;
        color: #4f46e5;
        background: rgba(79, 70, 229, 0.12);
        padding: 0.2rem 0.55rem;
        border-radius: 0;
        white-space: nowrap;
    }

    /* Match stats */
    .stat-match-body {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: rgba(255, 255, 255, 0.72);
        border-radius: 0;
        padding: 0.62rem 0.76rem;
    }

    .stat-match-players {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .stat-mini-player {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        opacity: 0.6;
        transition: opacity 0.2s;
    }

    .stat-mini-player.winner {
        opacity: 1;
    }

    .stat-avatar {
        width: 1.8rem;
        height: 1.8rem;
        border-radius: 50%;
        object-fit: cover;
    }

    .stat-avatar-fallback {
        display: grid;
        place-items: center;
        background: rgba(0,0,0,0.1);
        color: rgba(0,0,0,0.6);
        font-size: 0.75rem;
        font-weight: 700;
    }

    .stat-player-name {
        font-size: 0.92rem;
        font-weight: 600;
        color: #000;
    }

    .vs-divider {
        font-size: 0.74rem;
        font-weight: 800;
        color: rgba(0,0,0,0.45);
        letter-spacing: 0.1em;
    }

    .crown {
        font-size: 0.9rem;
        color: #ffd700;
        line-height: 1;
    }

    .right-panel {
        position: relative;
        flex: 1;
        height: 100%;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.55rem 2.25rem 4.65rem;
        gap: 0.6rem;
        overflow: hidden;
    }

    /* Prize header */
    .prize-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.1rem;
        margin-bottom: 0.3rem;
    }

    .prize-label-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .prize-tag {
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.45);
    }

    .prize-amount {
        font-family: 'Agency FB', 'Arial Narrow', sans-serif;
        font-size: 4.25rem;
        font-weight: 900;
        color: #fff;
        letter-spacing: 0.04em;
        line-height: 1;
        text-shadow: 0 0 40px rgba(255, 215, 0, 0.4);
    }

    /* Division label */
    .division-label {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
        margin-bottom: 0.5rem;
    }

    .division-label span {
        font-size: 1.2rem;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: rgba(255, 215, 0, 0.7);
        white-space: nowrap;
    }

    .division-label-accent {
        flex: 1;
        height: 1px;
        background: linear-gradient(to right, rgba(255, 215, 0, 0.5), transparent);
    }

    .division-label-accent:first-child {
        background: linear-gradient(to left, rgba(255, 215, 0, 0.5), transparent);
    }

    .lower-label span {
        color: rgba(96, 196, 255, 0.7);
    }

    .lower-accent {
        background: linear-gradient(to right, rgba(96, 196, 255, 0.4), transparent) !important;
    }

    .lower-accent:first-child {
        background: linear-gradient(to left, rgba(96, 196, 255, 0.4), transparent) !important;
    }

    /* Sections */
    .division-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .higher-section {
        flex: 1.28;
        min-height: 0;
    }

    .lower-section {
        flex-shrink: 0;
        width: 100%;
        margin-top: 0.08rem;
        padding-right: 0;
    }

    /* Podium rows */
    .podium-row {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 1.25rem;
        width: 100%;
    }

    /* Podium cards - higher div */
    @keyframes riseUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .podium-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.45rem;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 0;
        padding: 1.25rem 1.5rem 1.5rem;
        backdrop-filter: blur(12px);
        position: relative;
        min-width: 220px;
        animation: riseUp 0.6s ease both;
        transition: transform 0.3s ease;
    }

    .podium-card::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: 0;
        border: 1px solid var(--glow, rgba(255,215,0,0.3));
        pointer-events: none;
        opacity: 0.5;
    }

    .podium-card::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60%;
        height: 1px;
        background: var(--glow, #ffd700);
        filter: blur(4px);
        opacity: 0.7;
    }

    .center-card {
        min-width: 280px;
        padding: 1.5rem 2rem 1.9rem;
        background: linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 100%);
        border-color: rgba(255, 215, 0, 0.3);
        animation-delay: 0.15s;
        z-index: 1;
        transform: translateY(-0.35rem);
    }

    .place-2 { animation-delay: 0.05s; }
    .place-3 { animation-delay: 0.25s; }

    .champion-crown {
        font-size: 1.55rem;
        line-height: 1;
        color: #ffd700;
        filter: drop-shadow(0 0 7px rgba(255,215,0,0.8));
        animation: floatBob 2.5s ease-in-out infinite;
    }

    @keyframes floatBob {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-5px); }
    }

    .podium-place-badge {
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--glow, #ffd700);
        background: rgba(255,255,255,0.06);
        padding: 0.22rem 0.66rem;
        border-radius: 0;
        border: 1px solid rgba(255,255,255,0.1);
    }

    .champion-badge {
        font-size: 0.82rem;
    }

    /* Avatar */
    .avatar-wrap {
        position: relative;
        width: 5.35rem;
        height: 5.35rem;
    }

    .avatar-wrap-lg {
        width: 7.8rem;
        height: 7.8rem;
    }

    .podium-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        position: relative;
        z-index: 1;
    }

    .podium-avatar-fallback {
        display: grid;
        place-items: center;
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.7);
        font-size: 1.8rem;
        font-weight: 700;
    }

    .avatar-ring {
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        border: 2px solid var(--glow, #ffd700);
        opacity: 0.7;
        z-index: 0;
        animation: pulseBorder 2s ease-in-out infinite;
    }

    .avatar-ring-lg {
        inset: -4px;
        border-width: 2px;
    }

    .avatar-ring-outer {
        position: absolute;
        inset: -10px;
        border-radius: 50%;
        border: 1px solid var(--glow, #ffd700);
        opacity: 0.2;
        z-index: 0;
        animation: pulseBorder 2s ease-in-out infinite reverse;
    }

    @keyframes pulseBorder {
        0%, 100% { opacity: 0.5; }
        50%       { opacity: 0.9; }
    }

    .podium-name {
        font-size: 1.2rem;
        font-weight: 700;
        color: #fff;
        text-align: center;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .name-lg {
        font-size: 1.55rem;
        max-width: 220px;
    }

    .podium-record {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.92rem;
        font-weight: 600;
    }

    .wins   { color: #4ade80; }
    .losses { color: #f87171; }
    .record-sep { color: rgba(255,255,255,0.35); }

    .podium-prize {
        font-size: 1.22rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        margin-top: 0.1rem;
    }

    .prize-lg {
        font-size: 1.55rem;
    }

    .cad {
        font-size: 0.65em;
        font-weight: 600;
        opacity: 0.8;
    }

    /* Divider */
    .panel-divider {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0 2rem;
    }

    .divider-line {
        flex: 1;
        height: 1px;
        background: rgba(255,255,255,0.1);
    }

    .divider-diamond {
        width: 6px;
        height: 6px;
        background: rgba(255,255,255,0.25);
        transform: rotate(45deg);
    }

    /* Lower division cards */
    .lower-podium-block {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.8rem;
    }

    .lower-podium-runners {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 1rem;
        width: calc(100% - 16rem);
        max-width: calc(100% - 16rem);
        min-width: 0;
    }

    .lower-card {
        display: flex;
        align-items: center;
        gap: 0.92rem;
        background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0;
        padding: 0.95rem 1.25rem 0.95rem 0.95rem;
        backdrop-filter: blur(10px);
        min-width: 265px;
        max-width: 360px;
        flex: 1;
        animation: riseUp 0.55s ease both;
        position: relative;
    }

    .lower-card-winner {
        min-width: 380px;
        max-width: 430px;
        transform: translateY(-0.15rem);
        z-index: 1;
        border-color: rgba(255, 255, 255, 0.18);
    }

    .lower-empty {
        margin-top: 0.55rem;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.35);
        letter-spacing: 0.16em;
        text-transform: uppercase;
    }

    .scene-brand {
        position: absolute;
        right: 1.8rem;
        bottom: 0.8rem;
        z-index: 4;
        width: 14.5rem;
        display: flex;
        justify-content: flex-end;
        pointer-events: none;
        opacity: 0.82;
    }

    .scene-brand img {
        width: 100%;
        height: auto;
        object-fit: contain;
    }

    .lower-card::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: 0;
        border: 1px solid var(--glow, #60c4ff);
        opacity: 0.25;
        pointer-events: none;
    }

    .lower-place-badge {
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--glow, #60c4ff);
        writing-mode: vertical-rl;
        text-orientation: mixed;
        transform: rotate(180deg);
        align-self: stretch;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .lower-avatar-wrap {
        position: relative;
        width: 3.85rem;
        height: 3.85rem;
        flex-shrink: 0;
    }

    .lower-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
    }

    .lower-avatar-fallback {
        display: grid;
        place-items: center;
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.7);
        font-size: 1.1rem;
        font-weight: 700;
    }

    .lower-avatar-ring {
        position: absolute;
        inset: -2px;
        border-radius: 50%;
        border: 1.5px solid var(--glow, #60c4ff);
        opacity: 0.6;
    }

    .lower-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        flex: 1;
        min-width: 0;
    }

    .lower-name {
        font-size: 1.08rem;
        font-weight: 700;
        color: #fff;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lower-record {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.86rem;
        font-weight: 600;
    }

    .lower-prize {
        font-size: 0.98rem;
        font-weight: 700;
        white-space: nowrap;
    }

    .no-prize {
        color: rgba(255,255,255,0.2);
    }
</style>