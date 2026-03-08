<script lang="ts">
	import { slide } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
    import { resolveUnknownMaps, type MapMatchResult, type PoolMap } from "$lib/services/mapMatcher";

    export let match: any = null;
    
    type PlayerScore = {
        playerName: string;
        score: number;
        accuracy: number;
        misses: number;
        badCuts: number;
        createdAt: Date;
        isCallingReplay: boolean;
    };
    
    type ReplayRound = {
        players1: PlayerScore[];
        players2: PlayerScore[];
        total1: number;
        total2: number;
        scoreToBeat: number | null;
        scoreToBeatAccuracy: number | null;
        roundNumber: number;
        replayCalledByPlayerName: string | null; // Who called the replay before this round
    };

    type MapScore = {
        mapGuid: string | null;
        mapHashIfNotMap: string | null;
        mapName: string;
        mapImage: string;
        // All rounds (pre-replay = round 0, then replay 1, 2, 3, etc.)
        rounds: ReplayRound[];
        // Overall
        winner: string | null;
        expanded: boolean;
        // BeatSaver resolution data
        resolvedFromBeatSaver?: boolean;
        matchedToPoolMap?: PoolMap | null;
        matchSimilarity?: number;
    };
    
    type SequencedMapEntry = {
        type: 'pick' | 'ban' | 'tiebreaker' | 'unknown';
        mapGuid: string | null;
        mapHash: string | null;
        mapName: string;
        mapImage: string;
        actionedByTeamGuid: string | null; // Who picked/banned
        flowOrder: number;
        pickBanEntry: any | null;
        mapScore: MapScore | null; // Score data if played
        hasScores: boolean;
        expanded: boolean;
        // Resolution status
        isResolving?: boolean;
        resolvedFromBeatSaver?: boolean;
        matchedToPoolMap?: PoolMap | null;
        matchSimilarity?: number;
    };
    
    let mapScoresMap: Map<string, MapScore> = new Map();
    let sequencedMaps: SequencedMapEntry[] = [];
    let unknownMaps: SequencedMapEntry[] = [];
    let allPlayers: any[] = [];
    let resolvedMapsCache: Map<string, MapMatchResult> = new Map();
    let isResolvingMaps: boolean = false;
    
    $: if (match) {
        calculateScores();
        buildSequencedMaps();
        resolveUnknownMapsFromBeatSaver();
    }
    
    /**
     * Resolve unknown maps by fetching from BeatSaver and trying to match to pool
     */
    async function resolveUnknownMapsFromBeatSaver() {
        if (!match || isResolvingMaps) return;
        
        // Collect all hashes that need resolution (maps with hash but no name/image)
        const hashesToResolve: string[] = [];
        
        mapScoresMap.forEach((mapScore, mapKey) => {
            // If we have a hash but no proper name (still "Unknown Map") and haven't resolved yet
            if (mapScore.mapHashIfNotMap && 
                mapScore.mapName === 'Unknown Map' && 
                !resolvedMapsCache.has(mapScore.mapHashIfNotMap)) {
                hashesToResolve.push(mapScore.mapHashIfNotMap);
            }
        });
        
        if (hashesToResolve.length === 0) return;
        
        isResolvingMaps = true;
        
        try {
            // Build pool maps array for matching
            const poolMaps: PoolMap[] = (match.mapPool?.maps || []).map((m: any) => ({
                guid: m.guid,
                name: m.name,
                artist: m.artist,
                mapper: m.mapper,
                hash: m.hash,
                imageUrl: m.imageUrl
            }));
            
            // Resolve all unknown hashes
            const results = await resolveUnknownMaps(hashesToResolve, poolMaps, 0.85);
            
            // Update cache
            results.forEach((result, hash) => {
                resolvedMapsCache.set(hash, result);
            });
            
            // Update mapScoresMap with resolved data
            let updated = false;
            mapScoresMap.forEach((mapScore, mapKey) => {
                if (mapScore.mapHashIfNotMap && resolvedMapsCache.has(mapScore.mapHashIfNotMap)) {
                    const resolved = resolvedMapsCache.get(mapScore.mapHashIfNotMap)!;
                    
                    // Update map with BeatSaver data
                    if (resolved.beatSaverData) {
                        mapScore.mapName = resolved.songName;
                        mapScore.mapImage = resolved.coverUrl;
                        mapScore.resolvedFromBeatSaver = true;
                        
                        // If matched to pool, update with pool info
                        if (resolved.matched && resolved.poolMap) {
                            mapScore.matchedToPoolMap = resolved.poolMap;
                            mapScore.matchSimilarity = resolved.similarity;
                            mapScore.mapGuid = resolved.poolMap.guid;
                            
                            // Use pool image if available (might be higher quality)
                            if (resolved.poolMap.imageUrl) {
                                mapScore.mapImage = resolved.poolMap.imageUrl;
                            }
                        }
                        updated = true;
                    }
                }
            });
            
            if (updated) {
                // Trigger reactivity
                mapScoresMap = new Map(mapScoresMap);
                // Rebuild sequenced maps with updated data
                buildSequencedMaps();
            }
        } catch (error) {
            console.error('Error resolving unknown maps:', error);
        } finally {
            isResolvingMaps = false;
        }
    }
    
    function buildSequencedMaps() {
        if (!match) {
            sequencedMaps = [];
            unknownMaps = [];
            return;
        }
        
        const picksBans = match.picksBans || [];
        const allTeam1Guids = match.sides?.team1 
            ? [match.sides.team1.captain?.guid, ...(match.sides.team1.members || []).map((x: any) => x.teamMember?.guid)]
            : [];
        
        // Build sequenced maps from picksBans
        const sequenced: SequencedMapEntry[] = [];
        const accountedMapKeys = new Set<string>();
        
        picksBans.forEach((pb: any) => {
            const mapGuid = pb.map?.guid || null;
            const mapKey = mapGuid || 'unknown';
            
            let type: 'pick' | 'ban' | 'tiebreaker' = 'pick';
            if (pb.isTB) type = 'tiebreaker';
            else if (pb.isBan) type = 'ban';
            else if (pb.isPick) type = 'pick';
            
            // Determine who actioned this
            let actionedByTeamGuid: string | null = null;
            if (!pb.isTB && pb.actionerGuid) {
                actionedByTeamGuid = pb.actionerGuid;
            }
            
            // Get map score if exists
            const mapScore = mapGuid ? mapScoresMap.get(mapGuid) : null;
            
            // Also check if any map score matched to this pool map (hash mismatch but same song)
            let matchedMapScore: MapScore | null = mapScore || null;
            if (!matchedMapScore && mapGuid) {
                mapScoresMap.forEach((ms) => {
                    if (ms.matchedToPoolMap?.guid === mapGuid) {
                        matchedMapScore = ms;
                    }
                });
            }
            
            const hasScores = matchedMapScore ? matchedMapScore.rounds.length > 0 && (matchedMapScore.rounds[0].total1 > 0 || matchedMapScore.rounds[0].total2 > 0) : false;
            
            if (mapGuid) accountedMapKeys.add(mapGuid);
            // Also account for the matched map's original key
            if (matchedMapScore?.mapHashIfNotMap) {
                accountedMapKeys.add(matchedMapScore.mapHashIfNotMap);
            }
            
            sequenced.push({
                type,
                mapGuid,
                mapHash: matchedMapScore?.mapHashIfNotMap || null,
                mapName: pb.map?.name || 'Unknown Map',
                mapImage: pb.map?.imageUrl || '',
                actionedByTeamGuid,
                flowOrder: pb.flowOrder || sequenced.length + 1,
                pickBanEntry: pb,
                mapScore: matchedMapScore || null,
                hasScores,
                expanded: matchedMapScore?.expanded || false,
                // Add resolution info if this was matched from a different hash
                resolvedFromBeatSaver: matchedMapScore?.resolvedFromBeatSaver,
                matchedToPoolMap: matchedMapScore?.matchedToPoolMap,
                matchSimilarity: matchedMapScore?.matchSimilarity
            });
        });
        
        // Sort by flowOrder
        sequenced.sort((a, b) => a.flowOrder - b.flowOrder);
        sequencedMaps = sequenced;
        
        // Find maps that were played but not in the sequence (warmups, unknown)
        const unknownEntries: SequencedMapEntry[] = [];
        mapScoresMap.forEach((mapScore, mapKey) => {
            if (!accountedMapKeys.has(mapKey)) {
                unknownEntries.push({
                    type: 'unknown',
                    mapGuid: mapScore.mapGuid,
                    mapHash: mapScore.mapHashIfNotMap,
                    mapName: mapScore.mapName,
                    mapImage: mapScore.mapImage,
                    actionedByTeamGuid: null,
                    flowOrder: 9999,
                    pickBanEntry: null,
                    mapScore,
                    hasScores: mapScore.rounds.length > 0 && (mapScore.rounds[0].total1 > 0 || mapScore.rounds[0].total2 > 0),
                    expanded: mapScore.expanded,
                    isResolving: isResolvingMaps && !!mapScore.mapHashIfNotMap && !resolvedMapsCache.has(mapScore.mapHashIfNotMap),
                    resolvedFromBeatSaver: mapScore.resolvedFromBeatSaver,
                    matchedToPoolMap: mapScore.matchedToPoolMap,
                    matchSimilarity: mapScore.matchSimilarity
                });
            }
        });
        unknownMaps = unknownEntries;
    }
    
    function calculateScores() {
        if (!match || !match.results || !match.results.scores) {
            mapScoresMap = new Map();
            return;
        }
        
        const mapsMap = new Map<string, MapScore>();

        allPlayers = [
            match.sides.team1.captain,
            ...match.sides.team1.members.map((x: any) => x.teamMember),
            match.sides.team2.captain,
            ...match.sides.team2.members.map((x: any) => x.teamMember),
        ];

        console.log("all players", allPlayers);
        
        // Get all unique maps
        match.results.scores.forEach((score: any) => {
            const mapKey = score.mapGuid || score.mapHashIfNotMap || 'unknown';
            
            if (!mapsMap.has(mapKey)) {
                let mapName = 'Unknown Map';
                let mapImage = '';
                
                if (score.mapGuid && match.mapPool) {
                    const poolMap = match.mapPool.maps?.find((m: any) => m.guid === score.mapGuid);
                    if (poolMap) {
                        mapName = poolMap.name;
                        mapImage = poolMap.imageUrl;
                    }
                }
                
                mapsMap.set(mapKey, {
                    mapGuid: score.mapGuid,
                    mapHashIfNotMap: score.mapHashIfNotMap,
                    mapName: mapName,
                    mapImage: mapImage,
                    rounds: [],
                    winner: null,
                    expanded: false
                });
            }
        });
        
        // Group scores by map and identify replay boundaries
        const mapScoresArray: Array<any> = Array.from(mapsMap.values());
        const allTeam1Guids = [match.sides.team1.captain.guid, ...match.sides.team1.members.map((x: any) => x.teamMember.guid)];
        
        mapScoresArray.forEach(mapScore => {
            const mapKey = mapScore.mapGuid || mapScore.mapHashIfNotMap || 'unknown';
            
            // Get all scores for this map, sorted by timestamp
            const scoresForMap = match.results.scores
                .filter((s: any) => (s.mapGuid || s.mapHashIfNotMap || 'unknown') === mapKey)
                .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            // Find replay calls and group scores accordingly
            // A replay is called by a specific player, so we track when that happens
            const replayCalls: any[] = [];
            scoresForMap.forEach((score: any) => {
                if (score.isCallingReplay) {
                    const playerObject = allPlayers.find(x => x.guid == score.user.guid);
                    replayCalls.push({
                        timestamp: new Date(score.createdAt),
                        playerName: playerObject?.preferredName || 'Unknown',
                        playerGuid: score.user.guid
                    });
                }
            });
            
            // Find the replay call timestamps and which team called them
            const replayCallInfos: { timestamp: number; callerIsTeam1: boolean; playerName: string }[] = [];
            scoresForMap.forEach((score: any) => {
                if (score.isCallingReplay) {
                    const callerIsTeam1 = allTeam1Guids.includes(score.user.guid);
                    const playerObject = allPlayers.find(x => x.guid == score.user.guid);
                    replayCallInfos.push({
                        timestamp: new Date(score.createdAt).getTime(),
                        callerIsTeam1,
                        playerName: playerObject?.preferredName || 'Unknown'
                    });
                }
            });
            
            // Sort replay calls by timestamp
            replayCallInfos.sort((a, b) => a.timestamp - b.timestamp);
            
            // Group scores into rounds based on replay calls
            // A score belongs to round N if:
            // - It's before any replay call (round 0)
            // - It's after replay call N-1 but before replay call N (round N)
            // - BUT if it's from the opposing team within 10 seconds of a replay call, it belongs to the previous round
            const REPLAY_GRACE_PERIOD_MS = 10000; // 10 seconds
            
            mapScore.rounds = [];
            
            // Initialize first round
            mapScore.rounds[0] = {
                players1: [],
                players2: [],
                total1: 0,
                total2: 0,
                scoreToBeat: null,
                scoreToBeatAccuracy: null,
                roundNumber: 0,
                replayCalledByPlayerName: null
            };
            
            // First pass: determine which round each score belongs to
            // Note: isCallingReplay scores ARE still valid scores - they just also trigger a replay
            scoresForMap.forEach((score: any) => {
                const scoreTime = new Date(score.createdAt).getTime();
                const isTeam1 = allTeam1Guids.includes(score.user.guid);
                
                // Determine which round this score belongs to
                let roundIndex = 0;
                for (let i = 0; i < replayCallInfos.length; i++) {
                    const replayCall = replayCallInfos[i];
                    
                    // If this score IS the one that called the replay, it belongs to the round BEFORE the replay
                    // (i.e., the pre-replay round, not the replay round it creates)
                    if (score.isCallingReplay && scoreTime === replayCall.timestamp) {
                        // This score called the replay - it belongs to round i (before the replay it creates)
                        roundIndex = i;
                        break;
                    }
                    
                    if (scoreTime > replayCall.timestamp) {
                        // Score is after this replay call
                        // Check if it's within grace period AND from the opposing team
                        const isOpposingTeam = (replayCall.callerIsTeam1 && !isTeam1) || (!replayCall.callerIsTeam1 && isTeam1);
                        const withinGracePeriod = (scoreTime - replayCall.timestamp) <= REPLAY_GRACE_PERIOD_MS;
                        
                        if (isOpposingTeam && withinGracePeriod) {
                            // This score belongs to the previous round (pre-replay)
                            // Don't increment roundIndex
                        } else {
                            // This score belongs to the next round
                            roundIndex = i + 1;
                        }
                    }
                }
                
                // Initialize round if needed
                if (!mapScore.rounds[roundIndex]) {
                    const prevRound = mapScore.rounds[roundIndex - 1];
                    const prevWinnerIsTeam1 = prevRound.total1 > prevRound.total2;
                    const replayInfo = replayCallInfos[roundIndex - 1];
                    
                    mapScore.rounds[roundIndex] = {
                        players1: [],
                        players2: [],
                        total1: 0,
                        total2: 0,
                        scoreToBeat: prevWinnerIsTeam1 ? prevRound.total1 : prevRound.total2,
                        scoreToBeatAccuracy: prevWinnerIsTeam1 
                            ? (prevRound.players1.length > 0 ? prevRound.players1.reduce((s: any, p: any) => s + p.accuracy, 0) / prevRound.players1.length : 0)
                            : (prevRound.players2.length > 0 ? prevRound.players2.reduce((s: any, p: any) => s + p.accuracy, 0) / prevRound.players2.length : 0),
                        roundNumber: roundIndex,
                        replayCalledByPlayerName: replayInfo?.playerName || 'Unknown'
                    };
                }
                
                const playerObject = allPlayers.find(x => x.guid == score.user.guid);
                
                const playerEntry: PlayerScore = {
                    playerName: playerObject?.preferredName || 'Unknown',
                    score: Math.floor(score.score || 0),
                    accuracy: (score.accuracy || 0),
                    misses: score.misses || 0,
                    badCuts: score.badCuts || 0,
                    createdAt: new Date(score.createdAt),
                    isCallingReplay: score.isCallingReplay
                };
                
                if (isTeam1) {
                    mapScore.rounds[roundIndex].players1.push(playerEntry);
                    mapScore.rounds[roundIndex].total1 += playerEntry.score;
                } else {
                    mapScore.rounds[roundIndex].players2.push(playerEntry);
                    mapScore.rounds[roundIndex].total2 += playerEntry.score;
                }
            });
            
            // Recalculate scoreToBeat after all scores are assigned (since grace period might have added scores)
            // For stacked replays, the score to beat only goes UP - it's the max of:
            // 1. The previous score to beat
            // 2. The winning score from the previous round
            for (let i = 1; i < mapScore.rounds.length; i++) {
                const prevRound = mapScore.rounds[i - 1];
                const prevWinnerIsTeam1 = prevRound.total1 > prevRound.total2;
                const prevWinningScore = prevWinnerIsTeam1 ? prevRound.total1 : prevRound.total2;
                const prevScoreToBeat = prevRound.scoreToBeat || 0;
                
                // Score to beat is the maximum of the previous score to beat and the winning score
                // This ensures it keeps getting higher with stacked replays
                mapScore.rounds[i].scoreToBeat = Math.max(prevScoreToBeat, prevWinningScore);
                
                // Calculate accuracy to beat based on which team's score we're using
                const usingTeam1Score = mapScore.rounds[i].scoreToBeat === prevRound.total1 || 
                    (mapScore.rounds[i].scoreToBeat === prevScoreToBeat && prevWinnerIsTeam1);
                
                if (mapScore.rounds[i].scoreToBeat === prevWinningScore) {
                    // Using the winning score from previous round
                    mapScore.rounds[i].scoreToBeatAccuracy = prevWinnerIsTeam1 
                        ? (prevRound.players1.length > 0 ? prevRound.players1.reduce((s: any, p: any) => s + p.accuracy, 0) / prevRound.players1.length : 0)
                        : (prevRound.players2.length > 0 ? prevRound.players2.reduce((s: any, p: any) => s + p.accuracy, 0) / prevRound.players2.length : 0);
                } else {
                    // Keeping the previous score to beat's accuracy
                    mapScore.rounds[i].scoreToBeatAccuracy = prevRound.scoreToBeatAccuracy;
                }
            }
            
            // Determine final winner from the last round
            const lastRound = mapScore.rounds[mapScore.rounds.length - 1];
            if (lastRound) {
                if (mapScore.rounds.length > 1) {
                    // There were replays - the team that called the replay must beat the score to beat
                    // Get info about who called the replay that created this final round
                    const lastReplayInfo = replayCallInfos[mapScore.rounds.length - 2];
                    const replayCallerIsTeam1 = lastReplayInfo?.callerIsTeam1;
                    
                    if (lastRound.total1 > 0 && lastRound.total2 > 0) {
                        // Both teams have submitted scores in the replay round
                        const replayCallerScore = replayCallerIsTeam1 ? lastRound.total1 : lastRound.total2;
                        const opponentScore = replayCallerIsTeam1 ? lastRound.total2 : lastRound.total1;
                        const scoreToBeat = lastRound.scoreToBeat || 0;
                        
                        // The team that called the replay must beat both the new score of the opponent and the score to beat
                        if (replayCallerScore > scoreToBeat && replayCallerScore > opponentScore) {
                            mapScore.winner = replayCallerIsTeam1 ? match.sides?.team1?.guid : match.sides?.team2?.guid;
                        } else {
                            // Replay caller didn't beat score to beat, so the other team wins
                            mapScore.winner = replayCallerIsTeam1 ? match.sides?.team2?.guid : match.sides?.team1?.guid;
                        }
                    } else if (lastRound.total1 > 0 || lastRound.total2 > 0) {
                        // Only one team has submitted scores so far (replay in progress)
                        const submittedIsTeam1 = lastRound.total1 > 0;
                        const submittedScore = submittedIsTeam1 ? lastRound.total1 : lastRound.total2;
                        const scoreToBeat = lastRound.scoreToBeat || 0;
                        
                        // Check if the team that submitted is the one that called the replay
                        if (submittedIsTeam1 === replayCallerIsTeam1) {
                            // The replay caller has submitted their score
                            if (submittedScore > scoreToBeat) {
                                // Replay caller beat the score to beat - they win!
                                mapScore.winner = replayCallerIsTeam1 ? match.sides?.team1?.guid : match.sides?.team2?.guid;
                            } else {
                                // Replay caller didn't beat score to beat - they lose
                                mapScore.winner = replayCallerIsTeam1 ? match.sides?.team2?.guid : match.sides?.team1?.guid;
                            }
                        } else {
                            // The non-caller has submitted, still waiting for the caller's score
                            mapScore.winner = null;
                        }
                    } else {
                        // No scores yet in replay round
                        mapScore.winner = null;
                    }
                } else {
                    // No replays - simple comparison
                    if (lastRound.total1 > lastRound.total2) {
                        mapScore.winner = match.sides?.team1?.guid;
                    } else if (lastRound.total2 > lastRound.total1) {
                        mapScore.winner = match.sides?.team2?.guid;
                    } else {
                        // Tied
                        mapScore.winner = null;
                    }
                }
            }
        });
        
        mapScoresMap = mapsMap;
    }
    
    function toggleSequencedMapExpansion(index: number, isUnknown: boolean = false) {
        if (isUnknown) {
            unknownMaps[index].expanded = !unknownMaps[index].expanded;
            unknownMaps = [...unknownMaps];
        } else {
            sequencedMaps[index].expanded = !sequencedMaps[index].expanded;
            sequencedMaps = [...sequencedMaps];
        }
    }
    
    function getTeamName(teamGuid: string): string {
        if (!match) return 'Team';
        const team = teamGuid === match.sides?.team1?.guid ? match.sides.team1 : match.sides.team2;
        return team.isSolo ? team.captain.preferredName : team.name;
    }
    
    function getTeamColor(teamGuid: string): string {
        return teamGuid === match.sides?.team1?.guid ? '#667eea' : '#764ba2';
    }
    
    function getTeamAvatar(teamGuid: string): string {
        if (!match) return '';
        const team = teamGuid === match.sides?.team1?.guid ? match.sides.team1 : match.sides.team2;
        return team.isSolo ? team.captain.avatarUrl : team.imageUrl;
    }
    
    function formatScore(score: number): string {
        return score.toLocaleString();
    }
    
    function getTotalScore(round: ReplayRound, teamGuid: string): number {
        const isTeam1 = teamGuid === match.sides?.team1?.guid;
        return isTeam1 ? round.total1 : round.total2;
    }
    
    function getTeamAccuracy(round: ReplayRound, teamGuid: string): number {
        const isTeam1 = teamGuid === match.sides?.team1?.guid;
        const players = isTeam1 ? round.players1 : round.players2;
        return players.length > 0 
            ? players.reduce((sum, p) => sum + p.accuracy, 0) / players.length 
            : 0;
    }
</script>

{#if match}
    <div class="match-summary">
        <!-- Match Header -->
        <!-- <div class="match-header">
            <div class="team-card team-1">
                <img src={getTeamAvatar(match.sides?.team1?.guid)} alt="Team 1" class="team-avatar" />
                <div class="team-info">
                    <h3>{getTeamName(match.sides?.team1?.guid)}</h3>
                    <div class="match-score">{match.results.team1Score}</div>
                </div>
            </div>
            
            <div class="match-status">
                <div class="status-text">
                    {#if match.results.team1Score === match.results.team2Score && sequencedMaps.filter(m => m.hasScores).length > 0}
                        <span class="status-tied">TIED</span>
                    {:else if match.results.team1Score > match.results.team2Score}
                        <span class="status-leading">Leading</span>
                    {:else if match.results.team2Score > match.results.team1Score}
                        <span class="status-behind">Trailing</span>
                    {:else}
                        <span class="status-pending">Pending</span>
                    {/if}
                </div>
                <div class="maps-played">
                    {sequencedMaps.filter(m => m.hasScores).length} of {match.picksBans?.filter((pb: any) => pb.isPick || pb.isTB).length || '?'} maps
                </div>
            </div>
            
            <div class="team-card team-2">
                <div class="team-info team-info-right">
                    <h3>{getTeamName(match.sides?.team2?.guid)}</h3>
                    <div class="match-score">{match.results.team2Score}</div>
                </div>
                <img src={getTeamAvatar(match.sides?.team2?.guid)} alt="Team 2" class="team-avatar" />
            </div>
        </div> -->
        
        <!-- Maps List - Sequenced by Picks/Bans -->
        {#if sequencedMaps.length > 0 || unknownMaps.length > 0}
            <div class="maps-grid">
                {#each sequencedMaps as entry, idx}
                    <div class="map-card {entry.type === 'ban' ? 'banned' : ''}" class:picked={entry.type === 'pick'} class:tiebreaker={entry.type === 'tiebreaker'}>
                        <!-- Map Header -->
                        <div 
                            class="map-header {entry.type === 'ban' ? 'banned-header' : ''}" 
                            on:click={() => entry.type !== 'ban' && toggleSequencedMapExpansion(idx)} 
                            on:keydown={(e) => e.key === 'Enter' && entry.type !== 'ban' && toggleSequencedMapExpansion(idx)} 
                            role="button" 
                            tabindex="0"
                            class:non-expandable={entry.type === 'ban'}
                        >
                            <div class="map-basic-info">
                                <img src={entry.mapImage} alt={entry.mapName} class="map-thumb" />
                                <div class="map-details">
                                    <h4>{entry.mapName}</h4>
                                    <span class="map-order">#{entry.flowOrder}</span>
                                    {#if entry.matchedToPoolMap && entry.matchSimilarity}
                                        <span class="version-mismatch-badge" title="Map version differs from pool - matched with {(entry.matchSimilarity * 100).toFixed(0)}% similarity">
                                            <i class="pi pi-exclamation-circle"></i> Version Updated
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="map-labels">
                                <!-- Pick/Ban/Tiebreaker Label -->
                                {#if entry.type === 'ban'}
                                    <div class="action-label banned-label">
                                        <i class="pi pi-ban"></i>
                                        <span>Banned by {entry.actionedByTeamGuid ? getTeamName(entry.actionedByTeamGuid) : 'Unknown'}</span>
                                    </div>
                                {:else if entry.type === 'tiebreaker'}
                                    <div class="action-label tiebreaker-label">
                                        <i class="pi pi-star"></i>
                                        <span>Tiebreaker</span>
                                    </div>
                                {:else if entry.type === 'pick'}
                                    <div class="action-label picked-label">
                                        <i class="pi pi-check-circle"></i>
                                        <span>Picked by {entry.actionedByTeamGuid ? getTeamName(entry.actionedByTeamGuid) : 'Unknown'}</span>
                                    </div>
                                {/if}
                                
                                <!-- Winner/Status Label (only for picks and tiebreakers) -->
                                {#if entry.type !== 'ban'}
                                    {#if entry.mapScore?.winner}
                                        <div class="map-winner-indicator winner">
                                            <i class="pi pi-trophy"></i>
                                            <span>{getTeamName(entry.mapScore.winner)}</span>
                                        </div>
                                    {:else if !entry.hasScores}
                                        <div class="map-winner-indicator pending">
                                            <i class="pi pi-clock"></i>
                                            <span>Awaiting Scores...</span>
                                        </div>
                                    {:else}
                                        <div class="map-winner-indicator tied">
                                            <i class="pi pi-equals"></i>
                                            <span>Tied</span>
                                        </div>
                                    {/if}
                                    
                                    {#if entry.mapScore && entry.mapScore.rounds.length > 1}
                                        <div class="replay-indicator-compact">
                                            <i class="pi pi-refresh"></i>
                                            <span>{entry.mapScore.rounds.length - 1} Replay{entry.mapScore.rounds.length > 2 ? 's' : ''}</span>
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                            
                            {#if entry.type !== 'ban'}
                                <div class="expand-arrow">
                                    <i class="pi pi-chevron-{entry.expanded ? 'up' : 'down'}"></i>
                                </div>
                            {/if}
                        </div>
                        
                        <!-- Expanded Details (only for picks/tiebreakers with scores) -->
                        {#if entry.expanded && entry.mapScore && entry.type !== 'ban'}
                            <div class="map-details-expanded" transition:slide={{ duration: 300, easing: cubicOut }}>
                                <!-- Display each round (initial play + all replays) -->
                                {#each entry.mapScore.rounds as round, roundIdx}
                                    <div class="round-section">
                                        {#if roundIdx > 0}
                                            <div class="replay-divider">
                                                <div class="divider-line"></div>
                                                <div class="replay-badge">
                                                    <i class="pi pi-refresh"></i>
                                                    REPLAY {roundIdx} by {round.replayCalledByPlayerName}
                                                </div>
                                                {#if round.scoreToBeat !== null}
                                                    <div class="score-to-beat-info">
                                                        Score to Beat: <span class="beat-score">{formatScore(round.scoreToBeat)}</span> @ <span class="beat-accuracy">{round.scoreToBeatAccuracy?.toFixed(2)}%</span>
                                                    </div>
                                                {/if}
                                                <div class="divider-line"></div>
                                            </div>
                                        {/if}
                                        
                                        <!-- Scores side by side -->
                                        <div class="scores-container">
                                            <!-- Team 1 Scores (Left) -->
                                            <div class="team-scores team-1-scores">
                                                <div class="team-header">
                                                    <h5>{getTeamName(match.sides?.team1?.guid)}</h5>
                                                </div>
                                                <div class="players-list">
                                                    {#each round.players1 as player}
                                                        <div class="player-row player-row-left">
                                                            <div class="player-edge">
                                                                <img src={allPlayers.find(p => p.preferredName === player.playerName)?.avatarUrl || ''} alt={player.playerName} class="player-avatar" />
                                                                <span class="player-name">{player.playerName}</span>
                                                            </div>
                                                            <span class="player-score">{formatScore(player.score)}</span>
                                                            <span class="player-accuracy">{player.accuracy.toFixed(2)}%</span>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                            
                                            <!-- Team 2 Scores (Right) -->
                                            <div class="team-scores team-2-scores">
                                                <div class="team-header">
                                                    <h5>{getTeamName(match.sides?.team2?.guid)}</h5>
                                                </div>
                                                <div class="players-list">
                                                    {#each round.players2 as player}
                                                        <div class="player-row player-row-right">
                                                            <span class="player-accuracy">{player.accuracy.toFixed(2)}%</span>
                                                            <span class="player-score">{formatScore(player.score)}</span>
                                                            <div class="player-edge">
                                                                <span class="player-name">{player.playerName}</span>
                                                                <img src={allPlayers.find(p => p.preferredName === player.playerName)?.avatarUrl || ''} alt={player.playerName} class="player-avatar" />
                                                            </div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Team Summary Section -->
                                        <div class="team-summary-container">
                                            <div class="team-summary team-1-summary">
                                                <span class="summary-total">{formatScore(round.total1)}</span>
                                                <span class="summary-accuracy">{getTeamAccuracy(round, match.sides?.team1?.guid).toFixed(2)}%</span>
                                            </div>
                                            <div class="team-summary team-2-summary">
                                                <span class="summary-accuracy">{getTeamAccuracy(round, match.sides?.team2?.guid).toFixed(2)}%</span>
                                                <span class="summary-total">{formatScore(round.total2)}</span>
                                            </div>
                                        </div>
                                        
                                        <!-- Difference Section (Full Width) -->
                                        <div class="round-difference-section">
                                            <div class="difference-stat">
                                                <span class="diff-label">Accuracy Diff</span>
                                                <span class="diff-value">{Math.abs(getTeamAccuracy(round, match.sides?.team1?.guid) - getTeamAccuracy(round, match.sides?.team2?.guid)).toFixed(2)}%</span>
                                            </div>
                                            <div class="difference-stat">
                                                <span class="diff-label">Score Diff</span>
                                                <span class="diff-value">{Math.abs(round.total1 - round.total2).toLocaleString()} pts</span>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                                
                                <!-- Final Result -->
                                {#if entry.mapScore.winner}
                                    <div class="final-result">
                                        <span class="winner-text">Won by {getTeamName(entry.mapScore.winner)}</span>
                                    </div>
                                {:else if entry.mapScore.rounds.length > 1}
                                    <div class="final-result pending">
                                        <span class="winner-text">Result Pending</span>
                                    </div>
                                {:else}
                                    <div class="final-result tied">
                                        <span class="winner-text">Tied</span>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/each}
                
                <!-- Unknown/Warmup Maps Section -->
                {#if unknownMaps.length > 0}
                    <div class="unknown-maps-section">
                        <div class="section-divider">
                            <div class="divider-line warning"></div>
                            <span class="section-title">
                                <i class="pi pi-exclamation-triangle"></i>
                                Unknown Sequence Maps
                            </span>
                            <div class="divider-line warning"></div>
                        </div>
                        
                        {#each unknownMaps as entry, idx}
                            <div class="map-card unknown">
                                <div 
                                    class="map-header" 
                                    on:click={() => toggleSequencedMapExpansion(idx, true)} 
                                    on:keydown={(e) => e.key === 'Enter' && toggleSequencedMapExpansion(idx, true)} 
                                    role="button" 
                                    tabindex="0"
                                >
                                    <div class="map-basic-info">
                                        {#if entry.mapImage}
                                            <img src={entry.mapImage} alt={entry.mapName} class="map-thumb" />
                                        {:else}
                                            <div class="map-thumb-placeholder">
                                                <i class="pi pi-image"></i>
                                            </div>
                                        {/if}
                                        <div class="map-details">
                                            <h4>{entry.mapName}</h4>
                                            <span class="map-order">
                                                {#if entry.isResolving}
                                                    <i class="pi pi-spin pi-spinner"></i> Resolving...
                                                {:else if entry.resolvedFromBeatSaver}
                                                    <i class="pi pi-check"></i> Resolved from BeatSaver
                                                {:else}
                                                    Warmup/Unknown
                                                {/if}
                                            </span>
                                            {#if entry.mapHash}
                                                <span class="map-hash" title={entry.mapHash}>
                                                    Hash: {entry.mapHash.substring(0, 8)}...
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                    
                                    <div class="map-labels">
                                        <div class="action-label warning-label">
                                            <i class="pi pi-exclamation-triangle"></i>
                                            <span>Unknown Playing Sequence</span>
                                        </div>
                                        
                                        {#if entry.mapScore?.winner}
                                            <div class="map-winner-indicator winner">
                                                <i class="pi pi-trophy"></i>
                                                <span>{getTeamName(entry.mapScore.winner)}</span>
                                            </div>
                                        {:else if !entry.hasScores}
                                            <div class="map-winner-indicator pending">
                                                <i class="pi pi-clock"></i>
                                                <span>Awaiting Scores...</span>
                                            </div>
                                        {:else}
                                            <div class="map-winner-indicator tied">
                                                <i class="pi pi-equals"></i>
                                                <span>Tied</span>
                                            </div>
                                        {/if}
                                        
                                        {#if entry.mapScore && entry.mapScore.rounds.length > 1}
                                            <div class="replay-indicator-compact">
                                                <i class="pi pi-refresh"></i>
                                                <span>{entry.mapScore.rounds.length - 1} Replay{entry.mapScore.rounds.length > 2 ? 's' : ''}</span>
                                            </div>
                                        {/if}
                                    </div>
                                    
                                    <div class="expand-arrow">
                                        <i class="pi pi-chevron-{entry.expanded ? 'up' : 'down'}"></i>
                                    </div>
                                </div>
                                
                                <!-- Expanded Details -->
                                {#if entry.expanded && entry.mapScore}
                                    <div class="map-details-expanded" transition:slide={{ duration: 300, easing: cubicOut }}>
                                        {#each entry.mapScore.rounds as round, roundIdx}
                                            <div class="round-section">
                                                {#if roundIdx > 0}
                                                    <div class="replay-divider">
                                                        <div class="divider-line"></div>
                                                        <div class="replay-badge">
                                                            <i class="pi pi-refresh"></i>
                                                            REPLAY {roundIdx} by {round.replayCalledByPlayerName}
                                                        </div>
                                                        {#if round.scoreToBeat !== null}
                                                            <div class="score-to-beat-info">
                                                                Score to Beat: <span class="beat-score">{formatScore(round.scoreToBeat)}</span> @ <span class="beat-accuracy">{round.scoreToBeatAccuracy?.toFixed(2)}%</span>
                                                            </div>
                                                        {/if}
                                                        <div class="divider-line"></div>
                                                    </div>
                                                {/if}
                                                
                                                <div class="scores-container">
                                                    <div class="team-scores team-1-scores">
                                                        <div class="team-header">
                                                            <h5>{getTeamName(match.sides?.team1?.guid)}</h5>
                                                        </div>
                                                        <div class="players-list">
                                                            {#each round.players1 as player}
                                                                <div class="player-row player-row-left">
                                                                    <div class="player-edge">
                                                                        <img src={allPlayers.find(p => p.preferredName === player.playerName)?.avatarUrl || ''} alt={player.playerName} class="player-avatar" />
                                                                        <span class="player-name">{player.playerName}</span>
                                                                    </div>
                                                                    <span class="player-score">{formatScore(player.score)}</span>
                                                                    <span class="player-accuracy">{player.accuracy.toFixed(2)}%</span>
                                                                </div>
                                                            {/each}
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="team-scores team-2-scores">
                                                        <div class="team-header">
                                                            <h5>{getTeamName(match.sides?.team2?.guid)}</h5>
                                                        </div>
                                                        <div class="players-list">
                                                            {#each round.players2 as player}
                                                                <div class="player-row player-row-right">
                                                                    <span class="player-accuracy">{player.accuracy.toFixed(2)}%</span>
                                                                    <span class="player-score">{formatScore(player.score)}</span>
                                                                    <div class="player-edge">
                                                                        <span class="player-name">{player.playerName}</span>
                                                                        <img src={allPlayers.find(p => p.preferredName === player.playerName)?.avatarUrl || ''} alt={player.playerName} class="player-avatar" />
                                                                    </div>
                                                                </div>
                                                            {/each}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="team-summary-container">
                                                    <div class="team-summary team-1-summary">
                                                        <span class="summary-total">{formatScore(round.total1)}</span>
                                                        <span class="summary-accuracy">{getTeamAccuracy(round, match.sides?.team1?.guid).toFixed(2)}%</span>
                                                    </div>
                                                    <div class="team-summary team-2-summary">
                                                        <span class="summary-accuracy">{getTeamAccuracy(round, match.sides?.team2?.guid).toFixed(2)}%</span>
                                                        <span class="summary-total">{formatScore(round.total2)}</span>
                                                    </div>
                                                </div>
                                                
                                                <div class="round-difference-section">
                                                    <div class="difference-stat">
                                                        <span class="diff-label">Accuracy Diff</span>
                                                        <span class="diff-value">{Math.abs(getTeamAccuracy(round, match.sides?.team1?.guid) - getTeamAccuracy(round, match.sides?.team2?.guid)).toFixed(2)}%</span>
                                                    </div>
                                                    <div class="difference-stat">
                                                        <span class="diff-label">Score Diff</span>
                                                        <span class="diff-value">{Math.abs(round.total1 - round.total2).toLocaleString()} pts</span>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                        
                                        {#if entry.mapScore.winner}
                                            <div class="final-result">
                                                <span class="winner-text">Won by {getTeamName(entry.mapScore.winner)}</span>
                                            </div>
                                        {:else if entry.mapScore.rounds.length > 1}
                                            <div class="final-result pending">
                                                <span class="winner-text">Result Pending</span>
                                            </div>
                                        {:else}
                                            <div class="final-result tied">
                                                <span class="winner-text">Tied</span>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {:else}
            <div class="no-scores">
                <i class="pi pi-inbox"></i>
                <p>No picks, bans, or scores yet</p>
            </div>
        {/if}
    </div>
{/if}

<style>
    .match-summary {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        color: #ffffff;
        border-radius: 12px;
    }
    
    .match-header {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 1.5rem;
        align-items: center;
        padding: 1.5rem;
        background: linear-gradient(135deg, #1a1d29 0%, #0f111a 100%);
        border: 1px solid #2a2f42;
        border-radius: 12px;
    }
    
    .team-card {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .team-card.team-2 {
        flex-direction: row-reverse;
    }
    
    .team-avatar {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        border: 2px solid #4c6ef5;
        object-fit: cover;
    }
    
    .team-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .team-info-right {
        align-items: flex-end;
    }
    
    .team-info h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #ffffff;
    }
    
    .match-score {
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    .match-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }
    
    .status-leading { color: #51cf66; }
    .status-behind { color: #ff6b6b; }
    .status-tied { color: #ffc107; }
    .status-pending { color: #6c757d; }
    
    .maps-played {
        font-size: 0.75rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Compact Grid Layout */
    .maps-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .map-card {
        background: #12141c;
        border: 1px solid #2a2f42;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.2s ease;
    }
    
    .map-card:hover {
        border-color: #4c6ef5;
    }
    
    .map-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        cursor: pointer;
        background: #16182a;
        transition: background-color 0.2s ease;
        gap: 1.5rem;
    }
    
    .map-header:hover {
        background: #1a1d29;
    }
    
    .map-basic-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
        min-width: 200px;
    }
    
    .map-thumb {
        width: 48px;
        height: 48px;
        border-radius: 6px;
        object-fit: cover;
        border: 2px solid #4c6ef5;
        flex-shrink: 0;
    }
    
    .map-details h4 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        color: #ffffff;
    }
    
    .map-order {
        font-size: 0.7rem;
        color: #6c757d;
        text-transform: uppercase;
    }
    
    .map-order i {
        margin-right: 0.25rem;
    }
    
    .map-hash {
        font-size: 0.65rem;
        color: #4c6ef5;
        font-family: 'Courier New', monospace;
        opacity: 0.7;
    }
    
    .version-mismatch-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.65rem;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.15);
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        border: 1px solid rgba(255, 193, 7, 0.3);
        margin-top: 0.25rem;
    }
    
    .version-mismatch-badge i {
        font-size: 0.6rem;
    }
    
    .map-thumb-placeholder {
        width: 48px;
        height: 48px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px dashed rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.3);
        flex-shrink: 0;
    }
    
    .map-thumb-placeholder i {
        font-size: 1.2rem;
    }
    
    /* Map Winner Indicator (collapsed view) */
    .map-winner-indicator {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
    }
    
    .map-winner-indicator.winner {
        background: rgba(81, 207, 102, 0.15);
        color: #51cf66;
        border: 1px solid rgba(81, 207, 102, 0.3);
    }
    
    .map-winner-indicator.pending {
        background: rgba(255, 193, 7, 0.15);
        color: #ffc107;
        border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    .map-winner-indicator.tied {
        background: rgba(108, 117, 125, 0.15);
        color: #a5a5a5;
        border: 1px solid rgba(108, 117, 125, 0.3);
    }
    
    /* Replay indicator in collapsed view */
    .replay-indicator-compact {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.6rem;
        background: rgba(255, 107, 107, 0.15);
        color: #ff6b6b;
        border: 1px solid rgba(255, 107, 107, 0.3);
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 600;
        white-space: nowrap;
    }
    
    /* Map Labels Container */
    .map-labels {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: flex-end;
        flex: 1;
    }
    
    /* Action Labels (Pick/Ban/Tiebreaker) */
    .action-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.8rem;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: 600;
        white-space: nowrap;
    }
    
    .picked-label {
        background: rgba(81, 207, 102, 0.15);
        color: #51cf66;
        border: 1px solid rgba(81, 207, 102, 0.3);
    }
    
    .banned-label {
        background: rgba(255, 107, 107, 0.2);
        color: #ff6b6b;
        border: 1px solid rgba(255, 107, 107, 0.4);
    }
    
    .tiebreaker-label {
        background: rgba(255, 193, 7, 0.15);
        color: #ffc107;
        border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    .warning-label {
        background: rgba(255, 152, 0, 0.15);
        color: #ff9800;
        border: 1px solid rgba(255, 152, 0, 0.3);
    }
    
    /* Banned Map Card */
    .map-card.banned {
        opacity: 0.65;
    }
    
    .map-card.banned .map-header {
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.08) 0%, #16182a 100%);
        border-left: 3px solid rgba(255, 107, 107, 0.5);
    }
    
    .map-card.banned .map-thumb {
        border-color: rgba(255, 107, 107, 0.5);
        filter: grayscale(40%);
    }
    
    .map-card.banned .map-header:hover {
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.12) 0%, #1a1d29 100%);
        cursor: default;
    }
    
    .map-header.non-expandable {
        cursor: default;
    }
    
    /* Unknown Map Card */
    .map-card.unknown {
        border-color: rgba(255, 152, 0, 0.4);
    }
    
    .map-card.unknown .map-header {
        background: linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, #16182a 100%);
        border-left: 3px solid rgba(255, 152, 0, 0.5);
    }
    
    .map-card.unknown .map-thumb {
        border-color: rgba(255, 152, 0, 0.5);
    }
    
    /* Unknown Maps Section */
    .unknown-maps-section {
        margin-top: 1.5rem;
    }
    
    .section-divider {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .section-divider .divider-line {
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 152, 0, 0.5), transparent);
    }
    
    .section-divider .divider-line.warning {
        background: linear-gradient(90deg, transparent, rgba(255, 152, 0, 0.5), transparent);
    }
    
    .section-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #ff9800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
    }
    
    .expand-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6c757d;
        font-size: 1rem;
        padding: 0.5rem;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }
    
    .expand-arrow i {
        transition: transform 0.3s ease;
    }
    
    .map-header:hover .expand-arrow {
        color: #4c6ef5;
    }
    
    /* Expanded Details */
    .map-details-expanded {
        padding: 1.5rem;
        background: #0f111a;
        overflow: hidden;
    }
    
    /* Round Section */
    .round-section {
        margin-bottom: 1.5rem;
    }
    
    .round-section:last-child {
        margin-bottom: 0;
    }
    
    /* Replay Divider */
    .replay-divider {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem 0;
    }
    
    .divider-line {
        flex: 1;
        height: 2px;
        background: linear-gradient(90deg, transparent, #ff6b6b, transparent);
        border-radius: 1px;
    }
    
    .replay-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #ff6b6b;
        color: white;
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
    }
    
    .score-to-beat-info {
        font-size: 0.75rem;
        color: #ffffff;
        font-weight: 500;
        padding: 0.5rem 0.8rem;
        background: rgba(255, 107, 107, 0.1);
        border-radius: 4px;
    }
    
    .beat-score {
        color: #ffc107;
        font-weight: 700;
    }
    
    .beat-accuracy {
        color: #ffc107;
        font-weight: 600;
    }
    
    /* Scores Container - 2 column layout (no center) */
    .scores-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        align-items: stretch;
        margin-bottom: 1rem;
    }
    
    .team-scores {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .team-header h5 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: #ffffff;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid rgba(102, 126, 234, 0.3);
    }
    
    .team-2-scores .team-header h5 {
        border-bottom-color: rgba(118, 75, 162, 0.3);
    }
    
    .players-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .player-row {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.5rem 0.6rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        font-size: 0.85rem;
    }
    
    .player-row-left {
        justify-content: flex-start;
    }
    
    .player-row-right {
        justify-content: flex-start;
    }
    
    .player-edge {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex: 1;
        min-width: 0;
    }
    
    .player-row-right .player-edge {
        justify-content: flex-end;
    }
    
    .player-row-right .player-name {
        text-align: right;
    }
    
    .player-accuracy {
        color: #667eea;
        font-size: 0.85rem;
        font-weight: 600;
        min-width: 55px;
        text-align: center;
    }
    
    .player-score {
        color: #a5a5a5;
        font-weight: 500;
        min-width: 65px;
        text-align: right;
    }
    
    .player-row-right .player-score {
        text-align: left;
    }
    
    .player-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1.5px solid #4c6ef5;
        object-fit: cover;
        flex-shrink: 0;
    }
    
    .player-name {
        color: #ffffff;
        font-weight: 500;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.85rem;
    }
    
    /* Team Summary Container */
    .team-summary-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
    
    .team-summary {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: rgba(102, 126, 234, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(102, 126, 234, 0.2);
    }
    
    .team-1-summary {
        justify-content: flex-end;
    }
    
    .team-2-summary {
        justify-content: flex-start;
        background: rgba(118, 75, 162, 0.1);
        border-color: rgba(118, 75, 162, 0.2);
    }
    
    .summary-accuracy {
        font-size: 1.4rem;
        font-weight: 700;
        color: #667eea;
    }
    
    .team-2-summary .summary-accuracy {
        color: #764ba2;
    }
    
    .summary-total {
        font-size: 0.9rem;
        font-weight: 600;
        color: #888;
    }
    
    /* Difference Section - Full Width */
    .round-difference-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        padding: 1rem 0.8rem;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
        border: 1px solid rgba(102, 126, 234, 0.25);
        border-radius: 8px;
        margin-bottom: 1rem;
    }
    
    .difference-stat {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        align-items: center;
    }
    
    .diff-label {
        font-size: 0.7rem;
        color: #a5a5a5;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        font-weight: 600;
    }
    
    .diff-value {
        font-size: 1rem;
        font-weight: 700;
        color: #667eea;
    }
    
    /* Final Result */
    .final-result {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
        margin-top: 1rem;
        background: rgba(81, 207, 102, 0.15);
        border: 1px solid rgba(81, 207, 102, 0.3);
        border-radius: 8px;
    }
    
    .final-result.pending {
        background: rgba(255, 193, 7, 0.15);
        border-color: rgba(255, 193, 7, 0.3);
    }
    
    .final-result.tied {
        background: rgba(108, 117, 125, 0.15);
        border-color: rgba(108, 117, 125, 0.3);
    }
    
    .winner-text {
        font-size: 0.9rem;
        font-weight: 600;
        color: #51cf66;
    }
    
    .final-result.pending .winner-text {
        color: #ffc107;
    }
    
    .final-result.tied .winner-text {
        color: #a5a5a5;
    }
    
    .no-scores {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: #6c757d;
    }
    
    .no-scores i {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
        .match-header {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
        
        .team-card.team-2 {
            flex-direction: row;
        }
        
        .map-header {
            flex-wrap: wrap;
            gap: 0.75rem;
        }
        
        .map-basic-info {
            min-width: auto;
            flex: 1 1 100%;
        }
        
        .map-labels {
            flex: 1 1 100%;
            justify-content: flex-start;
        }
        
        .action-label {
            font-size: 0.65rem;
            padding: 0.3rem 0.6rem;
        }
        
        .map-winner-indicator,
        .replay-indicator-compact {
            flex: 0 0 auto;
        }
        
        .expand-arrow {
            margin-left: auto;
        }
        
        .scores-container {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
        
        .team-summary-container {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
        
        .team-1-summary,
        .team-2-summary {
            justify-content: center;
        }
        
        .round-difference-section {
            grid-template-columns: 1fr;
        }
        
        .player-row {
            font-size: 0.8rem;
        }
        
        .player-avatar {
            width: 24px;
            height: 24px;
        }
        
        .section-divider {
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .section-title {
            flex: 1 1 100%;
            justify-content: center;
            margin-bottom: 0.5rem;
        }
    }
</style>