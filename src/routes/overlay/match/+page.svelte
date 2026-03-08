<script lang="ts">
	import { page } from "$app/state";
    import Background from "$lib/overlay/Background.svelte";
    import Header from "$lib/overlay/Header.svelte";
    import PicksBansSongCard from "$lib/overlay/PicksBansSongCard.svelte";
    import TugOfWar from "$lib/overlay/TugOfWar.svelte";
    import ScoreDisplay from "$lib/overlay/ScoreDisplay.svelte";
    import Container from "$lib/Container.svelte";
    import { processMatch } from "$lib/services/matchProcessor";
	import { onMount } from "svelte";
    import { io, Socket } from 'socket.io-client';
    import { encode, decode } from "@msgpack/msgpack";
    import Loading from "$lib/Loading.svelte";
    import { PUBLIC_BK_WS_URL, PUBLIC_TOURNAMENT_GUID, PUBLIC_OVERLAY_GUID } from "$env/static/public";
    import WebRTCPlayer from "$lib/overlay/WebRTCPlayer.svelte";
    import ComboDisplay from "$lib/overlay/ComboDisplay.svelte";
    import MissCounter from "$lib/overlay/MissCounter.svelte";
    import { TAClient, Response_ResponseType, User_PlayStates, User, Match, RealtimeScore, Tournament, User_ClientTypes } from 'moons-ta-client';

    const query = page.url.searchParams;
    const authToken = query.get('token');

    let socket: Socket | null = $state(null);
    let loadingMessage: string | undefined = $state(undefined);
    let isLoading: boolean = $state(true);
    let overlay: any = $state(null);
    const client: TAClient = $state(new TAClient());
    let currentMatch: Match | undefined = $state(undefined);
    let currentSong: any = $state(undefined);

    let isReplay: boolean = $state(false);
    let toBeatAccuracy: number = $state(0);
    let toBeatScore: number = $state(0);

    $effect(() => {
        if (overlay?.match) {
            const result = processMatch(overlay.match);
            isReplay = result.latestMapReplay.isReplay;
            toBeatAccuracy = result.latestMapReplay.toBeatAccuracy;
            toBeatScore = result.latestMapReplay.toBeatScore;
        }
    });

    interface CustomPlayer {
        bkTeamLink: any;
        taUser: User | undefined;
        rts?: RealtimeScore;
    }

    let lp: CustomPlayer | undefined = $state(undefined);
    let rp: CustomPlayer | undefined = $state(undefined);

    // Safe accessors — always return numeric values so components can render with placeholders
    let lpAccuracy = $derived.by(() => lp?.rts?.accuracy ?? 0);
    let rpAccuracy = $derived.by(() => rp?.rts?.accuracy ?? 0);
    let lpScore = $derived.by(() => lp?.rts?.score ?? 0);
    let rpScore = $derived.by(() => rp?.rts?.score ?? 0);

    let lpCombo = $derived.by(() => lp?.rts?.combo ?? 0);
    let rpCombo = $derived.by(() => rp?.rts?.combo ?? 0);
    let lpNotesMissed = $derived.by(() => lp?.rts?.notesMissed ?? 0);
    let rpNotesMissed = $derived.by(() => rp?.rts?.notesMissed ?? 0);
    let lpBadCuts = $derived.by(() => lp?.rts?.badCuts ?? 0);
    let rpBadCuts = $derived.by(() => rp?.rts?.badCuts ?? 0);
    let lpWallHits = $derived.by(() => lp?.rts?.wallHits ?? 0);
    let rpWallHits = $derived.by(() => rp?.rts?.wallHits ?? 0);
    let lpBombHits = $derived.by(() => lp?.rts?.bombHits ?? 0);
    let rpBombHits = $derived.by(() => rp?.rts?.bombHits ?? 0);

    onMount(async() => {
        loadingMessage = `Attempting to connect to BeatKhana! websocket server`;
        await initialiseWebSocket();
    });

    async function initialiseWebSocket() {
        socket = io(PUBLIC_BK_WS_URL, { transports: ['websocket'] });

        socket.on('connect', handleSocketConnect);
        socket.on('authentication:response', handleAuthResponse);
        socket.on('getTournamentOverlay:response', (data: any) => handleOverlayResponse(decode(data), true));
        socket.on('tournamentOverlayUpdate:match', (data: any) => handleOverlayResponse(decode(data), true));
        socket.on('matchOverlayUpdate:scoreSubmit', (data: any) => handleOverlayResponse(decode(data), false));
        socket.on('tournamentOverlayUpdate:matchDetails', (data: any) => handleOverlayResponse(decode(data), false));
        socket.on('matchOverlayUpdate:TAData', (data: any) => {
            handleOverlayResponse(decode(data), false);
            initialiseTAConnection();
        });
    }

    function handleSocketConnect() {
        loadingMessage = `Websocket connected, authenticating`;
        socket?.emit('authenticate', encode({ token: `Bearer ${authToken}` }));
        client.setAuthToken(authToken!);
    }

    async function handleAuthResponse(data: any) {
        const decoded: any = decode(data);
        if (!decoded.success) {
            loadingMessage = `Auth unsuccessful. Check auth token`;
            socket?.disconnect();
        } else {
            loadingMessage = `Fetching overlay data`;
            socket?.emit('getTournamentOverlay', encode({
                tournamentGuid: PUBLIC_TOURNAMENT_GUID,
                overlayGuid: PUBLIC_OVERLAY_GUID
            }))
        }
    }

    async function handleOverlayResponse(data: any, isInitial: boolean) {
        if(!isInitial) {
            overlay = data.newOverlay;
        } else {
            overlay = data.overlay;
            isLoading = true;
            await initialiseTAConnection();
        }

        matchTAGuidsToUsers();
    }

    function getCustomMapObject(map: any) {
        const pickBanItem = overlay.match.picksBans.find((x: any) => x.mapGuid == map.guid);

        const newMapObject = {
            actionerImageUrl: pickBanItem ? pickBanItem.actioner.captain.avatarUrl : null,
            songName: map.name,
            songAuthorName: map.artist,
            levelAuthorName: map.mapper,
            coverImageUrl: map.imageUrl,
            flair: map.flair ? {
                color: map.flair.color,
                icon: map.flair.icon,
                name: map.flair.name
            } : undefined,
            key: map.key,
            sequenceNr: pickBanItem ? pickBanItem.flowOrder : null,
            isPicked: pickBanItem ? pickBanItem.isPick : false,
            isBanned: pickBanItem ? pickBanItem.isBan : false,
            isTB: pickBanItem ? pickBanItem.isTB : false,
            difficulty: map.difficulty.toLowerCase()
        }

        return newMapObject;
    }

    async function initialiseTAConnection() {
        if(!client.isConnected) {
            loadingMessage = `Connecting to TA Core Server`;
            const connectResult = await client.connect('server.tournamentassistant.net', '8676');
            if (connectResult.details.oneofKind === "connect" && connectResult.type === Response_ResponseType.Fail) {
                loadingMessage = `Failed to connect to TA Core Server`;
                console.error('Failed to connect to TA server');
            }
            loadingMessage = `Connected to TA Core Server`;
        }

        if (overlay.matchOverlay.taServerGuid) {
            client.stateManager.on('matchDeleted', handleMatchDeleted);
            client.stateManager.on('matchUpdated', handleMatchUpdated);
            client.stateManager.on('matchCreated', handleMatchCreated);
            client.on('realtimeScore', handleRealtimeScoreUpdate);
            loadingMessage = `Subscribed events`;
            if(client.stateManager.getTournament(overlay.matchOverlay.taServerGuid) && !client.stateManager.getTournament(overlay.matchOverlay.taServerGuid)?.users.some(x => x.guid == client.stateManager.getSelfGuid())) {
                loadingMessage = 'Trying to join tournament';
                const joinRes = await client.joinTournament(overlay.matchOverlay.taServerGuid);
                if (joinRes.type !== Response_ResponseType.Success) {
                    loadingMessage = `Failed to join tournament`;
                    return;
                }
            }

            loadingMessage = `Getting matches`;
            const matches = client.stateManager.getMatches(overlay.matchOverlay.taServerGuid);

            if(matches) {
                loadingMessage = `Matches found`;
                
                await Promise.all(matches.map(async(match) => {
                    if(checkIfMatchShouldBeCurrent(match)) {
                        currentMatch = match;
                        if (!match.associatedUsers.includes(client.stateManager.getSelfGuid())) {
                            const addUserToMatchRes = await client.addUserToMatch(overlay.matchOverlay.taServerGuid, currentMatch.guid, client.stateManager.getSelfGuid());
                            if (addUserToMatchRes.type !== Response_ResponseType.Success) {
                                console.error("Failed to join the match!", addUserToMatchRes);
                            }
                        }

                        matchTAGuidsToUsers(currentMatch);
                        await updateCurrentMapData(currentMatch);

                        isLoading = false;
                    }
                }));

                if(!currentMatch) {
                    loadingMessage = `No current match found`;
                }
            } else {
                loadingMessage = `No matches found on the tournament... Waiting for match creation`
            }
        }
    }

    function checkIfMatchShouldBeCurrent(match: Match): boolean {
        const allUsers = (client.stateManager.getUsers(overlay.matchOverlay.taServerGuid) || []).filter(user => user?.clientType == User_ClientTypes.Player);
        const hasTeam1 = allUsers.some(u => u?.platformId == overlay.match.sides.team1.captain.beatleaderId);
        const hasTeam2 = allUsers.some(u => u?.platformId == overlay.match.sides.team2.captain.beatleaderId);
        return hasTeam1 && hasTeam2;
    }

    function resolveTAUser(match: Match | undefined, beatleaderId: string): User | undefined {
        if (!match) return undefined;
        const allPlayers = match.associatedUsers
            .map(uid => client.stateManager.getUser(overlay.matchOverlay.taServerGuid, uid))
            .filter((u): u is User => u != null && u.clientType == User_ClientTypes.Player);
        return allPlayers.find(u => u.platformId == beatleaderId);
    }

    function matchTAGuidsToUsers(match?: Match) {
        const resolveMatch = match ?? currentMatch;

        if (overlay?.match?.sides?.team1) {
            const bkTeamLink = overlay.match.sides.team1.members[0];
            const taUser = resolveTAUser(resolveMatch, bkTeamLink?.teamMember?.beatleaderId ?? overlay.match.sides.team1.captain.beatleaderId);
            lp = { bkTeamLink, taUser, rts: lp?.rts };
        }

        if (overlay?.match?.sides?.team2) {
            const bkTeamLink = overlay.match.sides.team2.members[0];
            const taUser = resolveTAUser(resolveMatch, bkTeamLink?.teamMember?.beatleaderId ?? overlay.match.sides.team2.captain.beatleaderId);
            rp = { bkTeamLink, taUser, rts: rp?.rts };
        }
    }

    async function updateCurrentMapData(match: Match) {
        const currentLevelHash = match.selectedMap?.gameplayParameters?.beatmap?.levelId.toLowerCase().replace('custom_level_', '');
        currentSong = overlay.match.mapPool.maps.find((map: any) => map.hash === currentLevelHash) || undefined;
    }

    async function handleMatchCreated(params: [match: Match, tournament: Tournament]) {
        if(params[1].guid !== overlay.matchOverlay.taServerGuid) return;

        if(checkIfMatchShouldBeCurrent(params[0])) {
            isLoading = true;
            currentMatch = await client.stateManager.getMatch(overlay.matchOverlay.taServerGuid, params[0].guid);
            if (!currentMatch?.associatedUsers.includes(client.stateManager.getSelfGuid())) {
                const addUserToMatchRes = await client.addUserToMatch(overlay.matchOverlay.taServerGuid, params[0].guid, client.stateManager.getSelfGuid());
                if (addUserToMatchRes.type !== Response_ResponseType.Success) {
                    console.error("Failed to join the match!", addUserToMatchRes);
                }
            }

            if (!currentMatch) {
                console.error("No match found");
                return;
            }

            matchTAGuidsToUsers(currentMatch);
            await updateCurrentMapData(params[0]);
        }
        isLoading = false;
    }

    async function handleMatchUpdated(params: [match: Match, tournament: Tournament]) {
        if(params[0].guid !== currentMatch?.guid) return;

        matchTAGuidsToUsers(params[0]);
        await updateCurrentMapData(params[0]);
    }

    async function handleMatchDeleted(params: [match: Match, tournament: Tournament]) {
        if(params[0].guid === currentMatch?.guid) {
            currentMatch = undefined;
            lp = undefined;
            rp = undefined;
            isLoading = true;
        }
    }

    async function handleRealtimeScoreUpdate(rts: RealtimeScore) {
        console.log(rts);

        if (lp?.taUser?.guid === rts.userGuid) {
            lp = { ...lp, rts };
        } else if (rp?.taUser?.guid === rts.userGuid) {
            rp = { ...rp, rts };
        }
    }
</script>

<Background>
    {#if isLoading || !overlay}
        <Loading message={loadingMessage} />
    {:else}
        <div class="layout">
            <div class="header-area">
                <Header match={overlay.match} />
            </div>

            <div class="streams-row">
                <div class="stream-box">
                    <WebRTCPlayer
                        videoUrl={`https://webrtc.egress.stream.beatkhana.com/live/${overlay.match.sides.team1.captain.guid}/whep`}
                        isMuted={false}
                        hideButtons={true}
                        autoPlay={true}
                        volume={100}
                        fillMode={'cover'}
                    />
                    <MissCounter
                        notesMissed={lpNotesMissed}
                        badCuts={lpBadCuts}
                        wallHits={lpWallHits}
                        bombHits={lpBombHits}
                        side="left"
                    />
                    <ComboDisplay combo={lpCombo} side="left" />
                </div>
                <div class="stream-box">
                    <WebRTCPlayer
                        videoUrl={`https://webrtc.egress.stream.beatkhana.com/live/${overlay.match.sides.team2.captain.guid}/whep`}
                        isMuted={false}
                        hideButtons={true}
                        autoPlay={true}
                        volume={100}
                        fillMode={'cover'}
                    />
                    <ComboDisplay combo={rpCombo} side="right" />
                    <MissCounter
                        notesMissed={rpNotesMissed}
                        badCuts={rpBadCuts}
                        wallHits={rpWallHits}
                        bombHits={rpBombHits}
                        side="right"
                    />
                </div>
            </div>

            <div class="tow-area">
                <TugOfWar
                    leftAccuracy={lpAccuracy}
                    rightAccuracy={rpAccuracy}
                />
            </div>

            <div class="bottom-section">
                <div class="casters-area">
                    <Container width="350px" height="148px" />
                </div>

                <div class="songcard-area">
                    {#if currentSong}
                        <PicksBansSongCard
                            map={getCustomMapObject(currentSong)}
                        />
                    {/if}
                </div>
            </div>

            <div class="scores-area">
                <ScoreDisplay
                    leftAccuracy={lpAccuracy}
                    rightAccuracy={rpAccuracy}
                    leftScore={lpScore}
                    rightScore={rpScore}
                    isReplay={isReplay}
                    toBeatAccuracy={toBeatAccuracy}
                    toBeatScore={toBeatScore}
                />
            </div>
        </div>
    {/if}
</Background>

<style>
    .layout {
        position: absolute;
        inset: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
    }

    .header-area {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 180px;
        z-index: 100;
    }

    .streams-row {
        position: absolute;
        top: 180px;
        left: 0;
        right: 0;
        height: 720px;           /* 960 × 3 / 4 */
        display: flex;
    }

    .stream-box {
        position: relative;
        width: 960px;
        height: 720px;
        flex-shrink: 0;
        overflow: hidden;
    }

    .tow-area {
        position: absolute;
        top: 878px;              /* 180 + 720 − 22  →  overlaps boundary */
        left: 1px;
        right: 1px;
        z-index: 10;
    }

    .bottom-section {
        position: absolute;
        top: 900px;              /* header 180 + streams 720 */
        left: 0;
        right: 0;
        bottom: 0;               /* 180 px remaining */
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
    }

    .casters-area {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
    }

    .scores-area {
        position: absolute;
        top: 900px;
        left: 50%;
        transform: translateX(-50%);
        height: 180px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }

    .songcard-area {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
    }
</style>