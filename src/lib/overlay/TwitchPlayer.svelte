<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    export let channel: string | undefined;
    export let isMuted: boolean = false;
    export let volume: number = 100;
    export let fillMode: 'contain' | 'cover' = 'contain';

    let containerEl: HTMLDivElement | null = null;
    let embed: any = null;
    let player: any = null;
    let sdkLoaded = false;

    function loadSdk(): Promise<void> {
        return new Promise((resolve) => {
            if ((window as any).Twitch) {
                sdkLoaded = true;
                resolve();
                return;
            }

            const s = document.createElement('script');
            s.src = 'https://embed.twitch.tv/embed/v1.js';
            s.async = true;
            s.onload = () => {
                sdkLoaded = true;
                resolve();
            };
            document.body.appendChild(s);
        });
    }

    async function initEmbed() {
        if (!channel || !containerEl) return;
        await loadSdk();

        try {
            const parentHost = window.location.hostname;
            const opts: any = {
                width: '100%',
                height: '100%',
                channel,
                autoplay: true,
                muted: isMuted,
                parent: [parentHost],
                layout: 'video'
            };

            // @ts-ignore
            embed = new (window as any).Twitch.Embed(containerEl, opts);

            // Wait for embed to be ready and grab the player
            embed.addEventListener((window as any).Twitch.Embed.VIDEO_READY, () => {
                try {
                    player = embed.getPlayer();
                    // normalize volume range 0-100
                    if (player && typeof player.setVolume === 'function') {
                        player.setVolume(Math.max(0, Math.min(1, volume / 100)));
                    }
                    if (player && typeof player.setMuted === 'function') {
                        player.setMuted(isMuted);
                    }
                } catch (e) {
                    console.warn('Twitch embed ready, but player API not available', e);
                }
            });
        } catch (e) {
            console.error('Failed to init Twitch embed', e);
        }
    }

    function destroyEmbed() {
        try {
            if (embed && typeof embed.remove === 'function') {
                embed.remove();
            }
            embed = null;
            player = null;
        } catch (e) {
            // ignore
        }
    }

    $: if (sdkLoaded && containerEl && channel) {
        // If channel changes recreate embed
        destroyEmbed();
        initEmbed();
    }

    $: if (player) {
        if (typeof player.setMuted === 'function') player.setMuted(isMuted);
        if (typeof player.setVolume === 'function' && !isMuted) player.setVolume(Math.max(0, Math.min(1, volume / 100)));
    }

    onMount(() => {
        initEmbed();
    });

    onDestroy(() => {
        destroyEmbed();
    });
</script>

<div
    bind:this={containerEl}
    class="twitch-player-container"
    class:fill-contain={fillMode === 'contain'}
    class:fill-cover={fillMode === 'cover'}
>
    {#if !channel}
        <div class="no-channel">No Twitch channel</div>
    {/if}
</div>

<style>
    .twitch-player-container {
        width: 100%;
        height: 100%;
        background: #000;
        position: relative;
        display: block;
        min-height: 200px;
        min-width: 200px;
    }

    .fill-contain {
        object-fit: contain;
    }

    .fill-cover {
        object-fit: cover;
    }

    .no-channel {
        color: #fff;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
</style>
