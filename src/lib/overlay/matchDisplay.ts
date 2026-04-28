export type ParticipantDisplay = {
    guid: string | null;
    name: string;
    avatarUrl: string | null;
    isPlaceholder: boolean;
};

function getMatchGuid(match: any): string | null {
    return match?.guid ?? match?.matchGuid ?? null;
}

export function getMatchStartMs(match: any): number {
    const value = Date.parse(match?.scheduledTime ?? '');
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function getTeamName(team: any): string {
    if (!team) {
        return 'TBD';
    }

    if (team.isSolo) {
        return team?.captain?.preferredName ?? team?.name ?? 'TBD';
    }

    return team?.name ?? team?.captain?.preferredName ?? 'TBD';
}

function getTeamAvatar(team: any): string | null {
    if (!team) {
        return null;
    }

    if (team.isSolo) {
        return team?.captain?.avatarUrl ?? team?.imageUrl ?? null;
    }

    return team?.imageUrl ?? team?.captain?.avatarUrl ?? null;
}

function toParticipant(team: any): ParticipantDisplay | null {
    if (!team) {
        return null;
    }

    return {
        guid: team?.guid ?? null,
        name: getTeamName(team),
        avatarUrl: getTeamAvatar(team),
        isPlaceholder: false
    };
}

function getFeederLabels(match: any, allMatches: any[]): string[] {
    const targetGuid = getMatchGuid(match);

    if (!targetGuid) {
        return [];
    }

    return allMatches
        .filter((candidate: any) => {
            const candidateGuid = getMatchGuid(candidate);
            if (!candidateGuid || candidateGuid === targetGuid) {
                return false;
            }
            return candidate?.nextMatchGuid === targetGuid || candidate?.loserMatchGuid === targetGuid;
        })
        .sort((a: any, b: any) => getMatchStartMs(a) - getMatchStartMs(b))
        .map((candidate: any) => {
            const matchNumber = candidate?.matchNumber ?? '?';

            if (candidate?.nextMatchGuid === targetGuid) {
                return `Winner of Match ${matchNumber}`;
            }

            return `Loser of Match ${matchNumber}`;
        });
}

function placeholderParticipant(name: string): ParticipantDisplay {
    return {
        guid: null,
        name,
        avatarUrl: null,
        isPlaceholder: true
    };
}

export function resolveMatchParticipants(match: any, allMatches: any[]): [ParticipantDisplay, ParticipantDisplay] {
    const team1 = toParticipant(match?.sides?.team1);
    const team2 = toParticipant(match?.sides?.team2);
    const feederLabels = getFeederLabels(match, allMatches);

    let feederIndex = 0;
    const side1 = team1 ?? placeholderParticipant(feederLabels[feederIndex++] ?? 'TBD');
    const side2 = team2 ?? placeholderParticipant(feederLabels[feederIndex++] ?? 'TBD');

    return [side1, side2];
}

export function pickPreviousAndUpcoming(matches: any[], nowMs: number, nPrev: number = 1, nUpc: number = 1): { previous: any[] | null; upcoming: any[] } {
    const sorted = [...matches]
        .filter((match: any) => Number.isFinite(getMatchStartMs(match)))
        .sort((a: any, b: any) => getMatchStartMs(a) - getMatchStartMs(b));

    const previous = [...sorted].reverse().filter((match: any) => getMatchStartMs(match) <= nowMs).slice(0, nPrev) ?? null;
    const upcoming = sorted.filter((match: any) => getMatchStartMs(match) > nowMs).slice(0, nUpc);

    return { previous, upcoming };
}

export function formatGMTTime(matchStartMs: number): string {
    return `${new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(matchStartMs))} GMT`;
}

export function formatRelativeTime(matchStartMs: number, nowMs: number): string {
    const diffMs = matchStartMs - nowMs;

    if (diffMs <= 0) {
        return 'starting soon';
    }

    const totalMinutes = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
        return `in ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
        return `in ${hours}h`;
    }

    return `in ${minutes}m`;
}
