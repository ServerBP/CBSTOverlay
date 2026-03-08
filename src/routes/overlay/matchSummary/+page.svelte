<script lang="ts">
    import { page } from "$app/state";
    import Background from "$lib/overlay/Background.svelte";
    import Header from "$lib/overlay/Header.svelte";
    import Loading from "$lib/Loading.svelte";
    import MatchSummaryOverlay from "$lib/overlay/MatchSummaryOverlay.svelte";
    import { onMount } from "svelte";
    import { io, Socket } from 'socket.io-client';
    import { encode, decode } from "@msgpack/msgpack";
    import { PUBLIC_BK_WS_URL, PUBLIC_TOURNAMENT_GUID, PUBLIC_OVERLAY_GUID } from "$env/static/public";

    const query = page.url.searchParams;
    const authToken = query.get('token');

    let socket: Socket | null = $state(null);
    let loadingMessage: string | undefined = $state(undefined);
    let isLoading: boolean = $state(true);
    let overlay: any = $state(null);

    onMount(async () => {
        loadingMessage = 'Attempting to connect to BeatKhana! websocket server';
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
    }

    function handleSocketConnect() {
        loadingMessage = 'Websocket connected, authenticating';
        socket?.emit('authenticate', encode({ token: `Bearer ${authToken}` }));
    }

    async function handleAuthResponse(data: any) {
        const decoded: any = decode(data);
        if (!decoded.success) {
            loadingMessage = 'Auth unsuccessful. Check auth token';
            socket?.disconnect();
        } else {
            loadingMessage = 'Fetching overlay data';
            socket?.emit('getTournamentOverlay', encode({
                tournamentGuid: PUBLIC_TOURNAMENT_GUID,
                overlayGuid: PUBLIC_OVERLAY_GUID,
            }));
        }
    }

    async function handleOverlayResponse(data: any, isInitial: boolean) {
        if (!isInitial) {
            overlay = data.newOverlay;
        } else {
            overlay = data.overlay;
        }

        isLoading = false;
        console.log('[SUMMARY] Overlay data updated', overlay);
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

            <div class="body-area">
                <MatchSummaryOverlay match={overlay.match} />
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

    .body-area {
        position: absolute;
        top: 180px;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: stretch;
    }
</style>
