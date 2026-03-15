/**
 * matchProcessor.ts
 *
 * Pure-logic service extracted from MatchSummaryWebsite.svelte.
 * Processes a BeatKhana match object into structured per-map results,
 * replay detection, score-to-beat calculation, and winner determination.
 *
 * Usage:
 *   const result = processMatch(overlay.match);
 *   result.mapScores        → Map<string, MapScore>
 *   result.sequencedMaps    → SequencedMapEntry[]
 *   result.unknownMaps      → SequencedMapEntry[]
 *   result.latestMapReplay  → { isReplay, toBeatAccuracy, toBeatScore }
 */


export type PlayerScore = {
    playerName: string;
    score: number;
    accuracy: number;
    misses: number;
    badCuts: number;
    createdAt: Date;
    isCallingReplay: boolean;
};

export type ReplayRound = {
    players1: PlayerScore[];
    players2: PlayerScore[];
    total1: number;
    total2: number;
    scoreToBeat: number | null;
    scoreToBeatAccuracy: number | null;
    roundNumber: number;
    replayCalledByPlayerName: string | null;
};

export type MapScore = {
    mapGuid: string | null;
    mapHashIfNotMap: string | null;
    mapName: string;
    mapImage: string;
    rounds: ReplayRound[];
    winner: string | null;
};

export type SequencedMapEntry = {
    type: 'pick' | 'ban' | 'tiebreaker' | 'unknown';
    mapGuid: string | null;
    mapHash: string | null;
    mapName: string;
    mapImage: string;
    actionedByTeamGuid: string | null;
    flowOrder: number;
    pickBanEntry: any | null;
    mapScore: MapScore | null;
    hasScores: boolean;
};

export type LatestMapReplayInfo = {
    isReplay: boolean;
    toBeatAccuracy: number;
    toBeatScore: number;
    replaySide: 'left' | 'right' | null;
};

export interface MatchProcessorResult {
    mapScores: Map<string, MapScore>;
    sequencedMaps: SequencedMapEntry[];
    unknownMaps: SequencedMapEntry[];
    allPlayers: any[];
    latestMapReplay: LatestMapReplayInfo;
}

function getAllPlayers(match: any): any[] {
    return [
        match.sides.team1.captain,
        ...match.sides.team1.members.map((x: any) => x.teamMember),
        match.sides.team2.captain,
        ...match.sides.team2.members.map((x: any) => x.teamMember),
    ];
}

function getTeam1Guids(match: any): string[] {
    return [
        match.sides.team1.captain.guid,
        ...match.sides.team1.members.map((x: any) => x.teamMember.guid),
    ];
}

function calculateScores(match: any): { mapScores: Map<string, MapScore>; allPlayers: any[] } {
    const allPlayers = getAllPlayers(match);

    if (!match.results?.scores || match.results.scores.length === 0) {
        return { mapScores: new Map(), allPlayers };
    }

    const mapsMap = new Map<string, MapScore>();
    const allTeam1Guids = getTeam1Guids(match);

    // Discover unique maps
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
                mapName,
                mapImage,
                rounds: [],
                winner: null,
            });
        }
    });

    // Process each map's scores into rounds/replays
    mapsMap.forEach((mapScore) => {
        const mapKey = mapScore.mapGuid || mapScore.mapHashIfNotMap || 'unknown';

        const scoresForMap = match.results.scores
            .filter((s: any) => (s.mapGuid || s.mapHashIfNotMap || 'unknown') === mapKey)
            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Collect replay call info
        const replayCallInfos: { timestamp: number; callerIsTeam1: boolean; playerName: string }[] = [];
        scoresForMap.forEach((score: any) => {
            if (score.isCallingReplay) {
                const callerIsTeam1 = allTeam1Guids.includes(score.user.guid);
                const playerObject = allPlayers.find((x: any) => x.guid === score.user.guid);
                replayCallInfos.push({
                    timestamp: new Date(score.createdAt).getTime(),
                    callerIsTeam1,
                    playerName: playerObject?.preferredName || 'Unknown',
                });
            }
        });
        replayCallInfos.sort((a, b) => a.timestamp - b.timestamp);

        const REPLAY_GRACE_PERIOD_MS = 10_000;

        // Initialise round 0
        mapScore.rounds = [
            {
                players1: [],
                players2: [],
                total1: 0,
                total2: 0,
                scoreToBeat: null,
                scoreToBeatAccuracy: null,
                roundNumber: 0,
                replayCalledByPlayerName: null,
            },
        ];

        // Assign each score to the correct round
        scoresForMap.forEach((score: any) => {
            const scoreTime = new Date(score.createdAt).getTime();
            const isTeam1 = allTeam1Guids.includes(score.user.guid);

            let roundIndex = 0;
            for (let i = 0; i < replayCallInfos.length; i++) {
                const rc = replayCallInfos[i];

                if (score.isCallingReplay && scoreTime === rc.timestamp) {
                    roundIndex = i;
                    break;
                }

                if (scoreTime > rc.timestamp) {
                    const isOpposing = (rc.callerIsTeam1 && !isTeam1) || (!rc.callerIsTeam1 && isTeam1);
                    const withinGrace = scoreTime - rc.timestamp <= REPLAY_GRACE_PERIOD_MS;

                    if (isOpposing && withinGrace) {
                        // belongs to previous round
                    } else {
                        roundIndex = i + 1;
                    }
                }
            }

            // Create new round if needed
            if (!mapScore.rounds[roundIndex]) {
                const prevRound = mapScore.rounds[roundIndex - 1];
                const prevWinnerT1 = prevRound.total1 > prevRound.total2;
                const replayInfo = replayCallInfos[roundIndex - 1];
                mapScore.rounds[roundIndex] = {
                    players1: [],
                    players2: [],
                    total1: 0,
                    total2: 0,
                    scoreToBeat: prevWinnerT1 ? prevRound.total1 : prevRound.total2,
                    scoreToBeatAccuracy: prevWinnerT1
                        ? avgAccuracy(prevRound.players1)
                        : avgAccuracy(prevRound.players2),
                    roundNumber: roundIndex,
                    replayCalledByPlayerName: replayInfo?.playerName || 'Unknown',
                };
            }

            const playerObject = allPlayers.find((x: any) => x.guid === score.user.guid);
            const entry: PlayerScore = {
                playerName: playerObject?.preferredName || 'Unknown',
                score: Math.floor(score.score || 0),
                accuracy: score.accuracy || 0,
                misses: score.misses || 0,
                badCuts: score.badCuts || 0,
                createdAt: new Date(score.createdAt),
                isCallingReplay: score.isCallingReplay,
            };

            if (isTeam1) {
                mapScore.rounds[roundIndex].players1.push(entry);
                mapScore.rounds[roundIndex].total1 += entry.score;
            } else {
                mapScore.rounds[roundIndex].players2.push(entry);
                mapScore.rounds[roundIndex].total2 += entry.score;
            }
        });

        // Recalculate scoreToBeat per stacked replay
        for (let i = 1; i < mapScore.rounds.length; i++) {
            const prev = mapScore.rounds[i - 1];
            const prevWinnerT1 = prev.total1 > prev.total2;
            const prevWinning = prevWinnerT1 ? prev.total1 : prev.total2;
            const prevSTB = prev.scoreToBeat || 0;

            mapScore.rounds[i].scoreToBeat = Math.max(prevSTB, prevWinning);

            if (mapScore.rounds[i].scoreToBeat === prevWinning) {
                mapScore.rounds[i].scoreToBeatAccuracy = prevWinnerT1
                    ? avgAccuracy(prev.players1)
                    : avgAccuracy(prev.players2);
            } else {
                mapScore.rounds[i].scoreToBeatAccuracy = prev.scoreToBeatAccuracy;
            }
        }

        // Determine winner
        const lastRound = mapScore.rounds[mapScore.rounds.length - 1];
        if (lastRound) {
            // If anyone in the last round called a replay, no winner yet — the map must be replayed
            const lastRoundHasReplayCall = [...lastRound.players1, ...lastRound.players2]
                .some(p => p.isCallingReplay);

            if (lastRoundHasReplayCall) {
                mapScore.winner = null; // replay called, winner TBD
            } else if (mapScore.rounds.length > 1) {
                const lastReplayInfo = replayCallInfos[mapScore.rounds.length - 2];
                const callerT1 = lastReplayInfo?.callerIsTeam1;

                if (lastRound.total1 > 0 && lastRound.total2 > 0) {
                    const callerScore = callerT1 ? lastRound.total1 : lastRound.total2;
                    const opponentScore = callerT1 ? lastRound.total2 : lastRound.total1;
                    const stb = lastRound.scoreToBeat || 0;

                    if (callerScore > stb && callerScore > opponentScore) {
                        mapScore.winner = callerT1 ? match.sides.team1.guid : match.sides.team2.guid;
                    } else {
                        mapScore.winner = callerT1 ? match.sides.team2.guid : match.sides.team1.guid;
                    }
                } else if (lastRound.total1 > 0 || lastRound.total2 > 0) {
                    const submittedT1 = lastRound.total1 > 0;
                    const submitted = submittedT1 ? lastRound.total1 : lastRound.total2;
                    const stb = lastRound.scoreToBeat || 0;

                    if (submittedT1 === callerT1) {
                        mapScore.winner = submitted > stb
                            ? (callerT1 ? match.sides.team1.guid : match.sides.team2.guid)
                            : (callerT1 ? match.sides.team2.guid : match.sides.team1.guid);
                    } else {
                        mapScore.winner = null; // still waiting
                    }
                } else {
                    mapScore.winner = null;
                }
            } else {
                if (lastRound.total1 > lastRound.total2) {
                    mapScore.winner = match.sides.team1.guid;
                } else if (lastRound.total2 > lastRound.total1) {
                    mapScore.winner = match.sides.team2.guid;
                } else {
                    mapScore.winner = null; // tied or no scores
                }
            }
        }
    });

    return { mapScores: mapsMap, allPlayers };
}

function avgAccuracy(players: PlayerScore[]): number {
    if (players.length === 0) return 0;
    return players.reduce((s, p) => s + p.accuracy, 0) / players.length;
}

function buildSequencedMaps(
    match: any,
    mapScoresMap: Map<string, MapScore>,
): { sequencedMaps: SequencedMapEntry[]; unknownMaps: SequencedMapEntry[] } {
    if (!match) return { sequencedMaps: [], unknownMaps: [] };

    const picksBans = match.picksBans || [];
    const accountedKeys = new Set<string>();
    const sequenced: SequencedMapEntry[] = [];

    picksBans.forEach((pb: any) => {
        const mapGuid = pb.map?.guid || null;

        let type: 'pick' | 'ban' | 'tiebreaker' = 'pick';
        if (pb.isTB) type = 'tiebreaker';
        else if (pb.isBan) type = 'ban';

        let actionedByTeamGuid: string | null = null;
        if (!pb.isTB && pb.actionerGuid) {
            actionedByTeamGuid = pb.actionerGuid;
        }

        let matchedMapScore: MapScore | null = mapGuid ? mapScoresMap.get(mapGuid) || null : null;
        if (!matchedMapScore && mapGuid) {
            mapScoresMap.forEach((ms) => {
                if ((ms as any).matchedToPoolMap?.guid === mapGuid) matchedMapScore = ms;
            });
        }

        const hasScores = matchedMapScore
            ? matchedMapScore.rounds.length > 0 && (matchedMapScore.rounds[0].total1 > 0 || matchedMapScore.rounds[0].total2 > 0)
            : false;

        if (mapGuid) accountedKeys.add(mapGuid);
        if (matchedMapScore?.mapHashIfNotMap) accountedKeys.add(matchedMapScore.mapHashIfNotMap);

        sequenced.push({
            type,
            mapGuid,
            mapHash: matchedMapScore?.mapHashIfNotMap || null,
            mapName: pb.map?.name || 'Unknown Map',
            mapImage: pb.map?.imageUrl || '',
            actionedByTeamGuid,
            flowOrder: pb.flowOrder || sequenced.length + 1,
            pickBanEntry: pb,
            mapScore: matchedMapScore,
            hasScores,
        });
    });

    sequenced.sort((a, b) => a.flowOrder - b.flowOrder);

    const unknownEntries: SequencedMapEntry[] = [];
    mapScoresMap.forEach((ms, key) => {
        if (!accountedKeys.has(key)) {
            unknownEntries.push({
                type: 'unknown',
                mapGuid: ms.mapGuid,
                mapHash: ms.mapHashIfNotMap,
                mapName: ms.mapName,
                mapImage: ms.mapImage,
                actionedByTeamGuid: null,
                flowOrder: 9999,
                pickBanEntry: null,
                mapScore: ms,
                hasScores: ms.rounds.length > 0 && (ms.rounds[0].total1 > 0 || ms.rounds[0].total2 > 0),
            });
        }
    });

    return { sequencedMaps: sequenced, unknownMaps: unknownEntries };
}

function detectLatestMapReplayStatus(
    match: any,
    _mapScoresMap: Map<string, MapScore>,
): LatestMapReplayInfo {
    const noReplay: LatestMapReplayInfo = { isReplay: false, toBeatAccuracy: 0, toBeatScore: 0, replaySide: null };

    if (!match?.results?.scores || match.results.scores.length === 0) return noReplay;

    const allTeam1Guids = getTeam1Guids(match);

    // Convert all scores to epoch and find the latest
    const scoresWithEpoch = match.results.scores.map((s: any) => ({
        ...s,
        epoch: new Date(s.createdAt).getTime(),
        mapKey: s.mapGuid || s.mapHashIfNotMap || 'unknown',
    }));

    const latestEpoch = Math.max(...scoresWithEpoch.map((s: any) => s.epoch));
    const latestScore = scoresWithEpoch.find((s: any) => s.epoch === latestEpoch);
    if (!latestScore) return noReplay;

    // Find all scores on the same map within ±10s of the latest
    const WINDOW_MS = 10_000;
    const nearbyScores = scoresWithEpoch.filter((s: any) =>
        s.mapKey === latestScore.mapKey && Math.abs(s.epoch - latestEpoch) <= WINDOW_MS
    );

    // Check if any have isCallingReplay
    const replayScore = nearbyScores.find((s: any) => s.isCallingReplay);
    if (!replayScore) return noReplay;

    // Determine which side the caller is on
    const callerIsTeam1 = allTeam1Guids.includes(replayScore.user?.guid);
    const replaySide: 'left' | 'right' = callerIsTeam1 ? 'left' : 'right';

    // Calculate score to beat from nearby scores
    let team1Total = 0, team2Total = 0;
    let team1AccSum = 0, team1Count = 0;
    let team2AccSum = 0, team2Count = 0;

    nearbyScores.forEach((s: any) => {
        if (allTeam1Guids.includes(s.user?.guid)) {
            team1Total += Math.floor(s.score || 0);
            team1AccSum += s.accuracy || 0;
            team1Count++;
        } else {
            team2Total += Math.floor(s.score || 0);
            team2AccSum += s.accuracy || 0;
            team2Count++;
        }
    });

    const winnerIsTeam1 = team1Total >= team2Total;
    const toBeatScore = winnerIsTeam1 ? team1Total : team2Total;
    const toBeatAccuracy = winnerIsTeam1
        ? (team1Count > 0 ? team1AccSum / team1Count : 0)
        : (team2Count > 0 ? team2AccSum / team2Count : 0);

    return { isReplay: true, toBeatAccuracy, toBeatScore, replaySide };
}

/**
 * Process a BeatKhana match object and return all derived data.
 * Call this whenever `overlay.match` changes.
 */
export function processMatch(match: any): MatchProcessorResult {
    if (!match || !match.sides) {
        return {
            mapScores: new Map(),
            sequencedMaps: [],
            unknownMaps: [],
            allPlayers: [],
            latestMapReplay: { isReplay: false, toBeatAccuracy: 0, toBeatScore: 0, replaySide: null },
        };
    }

    const { mapScores, allPlayers } = calculateScores(match);
    const { sequencedMaps, unknownMaps } = buildSequencedMaps(match, mapScores);
    const latestMapReplay = detectLatestMapReplayStatus(match, mapScores);

    return { mapScores, sequencedMaps, unknownMaps, allPlayers, latestMapReplay };
}
