<script lang="ts">
    // Compute video URLs based on userGuid and playbackType
    // Only construct URLs when userGuid is valid (non-empty)
    // WebRTC uses MediaMTX WHEP endpoint
    // webrtcUrl = userGuid ? `https://webrtc.egress.stream.beatkhana.com/live/${userGuid}/whep` : '';
    // LLHLS uses OvenMediaEngine HLS endpoint
    // llhlsUrl = userGuid ? `https://hls.egress.stream.beatkhana.com/live/${userGuid}/index.m3u8` : '';
    import { onMount, onDestroy } from 'svelte';

    export let videoUrl: string; // WHEP endpoint URL
    export let isMuted: boolean = false;
    export let hideButtons: boolean = true;
    export let autoPlay: boolean = true;
    export let volume: number = 100;
    export let fillMode: 'contain' | 'cover' = 'contain';

    let videoElement: HTMLVideoElement;
    let peerConnection: RTCPeerConnection | null = null;
    let isInitialized = false;
    let connectionState: string = 'disconnected';
    let retryCount = 0;
    const maxRetries = 3;
    let currentUrl: string = '';

    onMount(() => {
        if (videoUrl && autoPlay) {
            currentUrl = videoUrl;
            initializePlayer();
        }
    });

    onDestroy(() => {
        cleanup();
    });

    function cleanup() {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        isInitialized = false;
        connectionState = 'disconnected';
    }

    async function initializePlayer() {
        cleanup();

        if (!videoUrl) {
            console.warn('No video URL provided');
            return;
        }

        try {
            connectionState = 'connecting';
            
            // Create RTCPeerConnection with STUN servers
            peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Set up event handlers
            peerConnection.ontrack = (event) => {
                console.log('Received track:', event.track.kind);
                if (videoElement && event.streams[0]) {
                    videoElement.srcObject = event.streams[0];
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                connectionState = peerConnection?.iceConnectionState || 'disconnected';
                console.log('ICE connection state:', connectionState);
                
                if (connectionState === 'failed' || connectionState === 'disconnected') {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Retrying connection (${retryCount}/${maxRetries})...`);
                        setTimeout(() => initializePlayer(), 2000);
                    }
                } else if (connectionState === 'connected') {
                    retryCount = 0;
                }
            };

            peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', peerConnection?.connectionState);
            };

            // Add transceivers for receiving audio and video
            peerConnection.addTransceiver('video', { direction: 'recvonly' });
            peerConnection.addTransceiver('audio', { direction: 'recvonly' });

            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Wait for ICE gathering to complete or timeout
            await waitForIceGathering(peerConnection, 2000);

            // Send offer to WHEP endpoint
            const response = await fetch(videoUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/sdp'
                },
                body: peerConnection.localDescription?.sdp
            });

            if (!response.ok) {
                throw new Error(`WHEP request failed: ${response.status} ${response.statusText}`);
            }

            const answerSdp = await response.text();
            
            // Set remote description with the answer
            await peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp
            });

            isInitialized = true;
            console.log('WebRTC WHEP player initialized for:', videoUrl);

        } catch (error) {
            console.error('Error initializing WHEP player:', error);
            connectionState = 'failed';
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying connection (${retryCount}/${maxRetries})...`);
                setTimeout(() => initializePlayer(), 2000);
            }
        }
    }

    function waitForIceGathering(pc: RTCPeerConnection, timeout: number): Promise<void> {
        return new Promise((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
                return;
            }

            const timeoutId = setTimeout(() => {
                resolve();
            }, timeout);

            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') {
                    clearTimeout(timeoutId);
                    resolve();
                }
            };
        });
    }

    // Handle mute changes
    $: if (videoElement) {
        videoElement.muted = isMuted;
    }

    // Handle volume changes
    $: if (videoElement && !isMuted) {
        videoElement.volume = Math.max(0, Math.min(1, volume / 100));
    }

    // Handle URL changes - reinitialize player when URL actually changes
    $: if (videoUrl && videoUrl !== currentUrl) {
        currentUrl = videoUrl;
        retryCount = 0; // Reset retry count for new URL
        initializePlayer();
    }
</script>

<div 
    class="webrtc-player-container" 
    class:fill-contain={fillMode === 'contain'}
    class:fill-cover={fillMode === 'cover'}
>
    <video
        bind:this={videoElement}
        autoplay={autoPlay}
        muted={isMuted}
        playsinline
        controls={!hideButtons}
        class="webrtc-video"
    ></video>
    
    {#if connectionState === 'connecting'}
        <div class="loading-indicator">
            <span>Connecting...</span>
        </div>
    {:else if connectionState === 'failed'}
        <div class="error-indicator">
            <span>Connection failed</span>
        </div>
    {/if}
</div>

<style>
    .webrtc-player-container {
        width: 100%;
        height: 100%;
        background: #000;
        position: relative;
        display: block;
        min-height: 200px;
        min-width: 200px;
    }

    .webrtc-video {
        width: 100%;
        height: 100%;
        display: block;
    }

    .fill-contain .webrtc-video {
        object-fit: contain;
    }

    .fill-cover .webrtc-video {
        object-fit: cover;
    }

    .loading-indicator,
    .error-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 14px;
        background: rgba(0, 0, 0, 0.7);
        padding: 8px 16px;
        border-radius: 4px;
        pointer-events: none;
    }

    .error-indicator {
        background: rgba(180, 0, 0, 0.8);
    }

    /* Hide controls when needed */
    .webrtc-video::-webkit-media-controls {
        display: none !important;
    }
</style>