<script lang="ts">
	import { page } from "$app/state";
    import Background from "$lib/overlay/Background.svelte";
    import Header from "$lib/overlay/Header.svelte";
    import PicksBansSongCard from "$lib/overlay/PicksBansSongCard.svelte";
    import Container from "$lib/Container.svelte";
	import { onMount } from "svelte";
    import { io, Socket } from 'socket.io-client';
    import { encode, decode } from "@msgpack/msgpack";
    import Loading from "$lib/Loading.svelte";
    import { PUBLIC_BK_WS_URL, PUBLIC_TOURNAMENT_GUID, PUBLIC_OVERLAY_GUID } from "$env/static/public";

    // Card dimensions & layout constants
    const CARD_W = 29.5 * 16;  // 472px
    const CARD_H = 8.5625 * 16; // 137px
    const CARD_GAP = 16;
    const ROW_GAP = 20;
    const PAD = 24;
    const CARDS_AREA_H = 720; // from header (180px) to casters area (900px)

    const query = page.url.searchParams;
    const authToken = query.get('token');

    let socket: Socket | null = $state(null);
    let loadingMessage: string | undefined = $state(undefined);
    let isLoading: boolean = $state(true);
    let overlay: any = $state(null);

    // Adaptive column count: 3 for ≤9 maps, 4 for 10+
    const cols = $derived.by(() => {
        const maps = overlay?.match?.mapPool?.maps ?? [];
        return maps.length >= 10 ? 4 : 3;
    });

    const nRows = $derived.by(() => {
        const maps = overlay?.match?.mapPool?.maps ?? [];
        return Math.ceil(maps.length / cols) || 1;
    });

    const cardScale = $derived.by(() => {
        const usableW = 1920 - PAD * 2;
        const usableH = CARDS_AREA_H - PAD * 2;

        const scaleByW = (usableW - CARD_GAP * (cols - 1)) / (cols * CARD_W);
        const scaleByH = (usableH - ROW_GAP * (nRows - 1)) / (nRows * CARD_H);

        return Math.min(1, scaleByW, scaleByH);
    });

    const slotW = $derived(CARD_W * cardScale);
    const slotH = $derived(CARD_H * cardScale);

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
        socket.on('tournamentOverlayUpdate:matchDetails', (data: any) => handleOverlayResponse(decode(data), false));
        socket.on('picksBansOverlayUpdate:state:addAction', (data: any) => handleOverlayResponse(decode(data), false));
    }

    function handleSocketConnect() {
        loadingMessage = `Websocket connected, authenticating`;
        socket?.emit('authenticate', encode({ token: `Bearer ${authToken}` }));
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
            // Not initial responses are using newOverlay
            overlay = data.newOverlay;
        } else {
            // While first responses like get-s use just .overlay
            overlay = data.overlay;
        }

        console.log("[OV_UPDATE] New Data: ", $state.snapshot(overlay))
        isLoading = false;
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

    function chunkArray<T>(arr: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
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

            <div class="cards-area">
                {#if overlay.match?.mapPool}
                    {@const rows = chunkArray(overlay.match.mapPool.maps, cols)}
                    <div class="cards-grid" style="gap: {ROW_GAP}px">
                        {#each rows as row}
                            <div class="cards-row" style="gap: {CARD_GAP}px">
                                {#each row as map}
                                    {@const mapObject = getCustomMapObject(map)}
                                    <div
                                        class="card-slot"
                                        style="width: {slotW}px; height: {slotH}px;"
                                    >
                                        <div
                                            class="card-scaler"
                                            style="transform: scale({cardScale}); transform-origin: top left;"
                                        >
                                            <PicksBansSongCard map={mapObject} />
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="casters-area">
                <Container width="350px" height="148px" />
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

    .cards-area {
        position: absolute;
        top: 180px;
        left: 0;
        right: 0;
        bottom: 180px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .cards-grid {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .cards-row {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: flex-start;
    }

    .card-slot {
        flex: 0 0 auto;
        overflow: hidden;
        position: relative;
    }

    .card-scaler {
        position: absolute;
        top: 0;
        left: 0;
    }

    .casters-area {
        position: absolute;
        bottom: 16px;
        left: 24px;
        z-index: 10;
    }
</style>