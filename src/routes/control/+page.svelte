<script lang="ts">
    import { authTokenStore } from '$lib/stores';
    import { onMount } from 'svelte';

    let authToken = $state('');
    let authenticated = $state(false);
    let loading = $state(true);
    let copyFeedback: Record<string, boolean> = $state({});

    // Countdown picker state
    let cdH = $state(0);
    let cdM = $state(5);
    let cdS = $state(0);

    // Prize pool state
    let prizePool = $state(0);

    let useP1Twitch = $state(false);
    let useP2Twitch = $state(false);

    // const discordOAuthUrl = "https://discord.com/oauth2/authorize?client_id=1348291960552820757&response_type=token&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcontrol&scope=identify";
    const discordOAuthUrl = "https://discord.com/oauth2/authorize?client_id=1348291960552820757&response_type=token&redirect_uri=https%3A%2F%3af09.artemis.shyyluna.dev%2Fcontrol&scope=identify";

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // External links
    const manageUrl = 'https://beatkhana.com/overlay/manage/CBST2026/225a0293-3ea6-4614-b02f-ab3ec51165a9';
    const coordinateUrl = 'https://beatkhana.com/coordinate/CBST2026/225a0293-3ea6-4614-b02f-ab3ec51165a9';

    // Build overlay URLs
    let overlayUrls = $derived.by(() => {
        const t = authToken;
        const countdownParams = [
            cdH > 0 ? `h=${cdH}` : '',
            cdM > 0 ? `m=${cdM}` : '',
            cdS > 0 ? `s=${cdS}` : '',
        ].filter(Boolean).join('&');

        const extraParams: string[] = [];
        if (useP1Twitch) extraParams.push('p1s=twitch');
        if (useP2Twitch) extraParams.push('p2s=twitch');
        const extras = extraParams.length ? '&' + extraParams.join('&') : '';

        return [
            { label: 'Base Overlay', url: `${baseUrl}/overlay/base`, needsToken: false },
            { label: 'Casters Overlay', url: `${baseUrl}/overlay/casters`, needsToken: false },
            { label: 'Bracket', url: `${baseUrl}/overlay/bracket`, needsToken: false },
            { label: 'Countdown', url: `${baseUrl}/overlay/countdown${countdownParams ? '?' + countdownParams : ''}`, needsToken: false },
            { label: 'Winners', url: `${baseUrl}/overlay/winners/v1?total=${prizePool}`, needsToken: false },
            { label: 'Match Overlay', url: `${baseUrl}/overlay/match?token=${t}${extras}`, needsToken: true },
            { label: 'Picks & Bans', url: `${baseUrl}/overlay/picksbans?token=${t}${extras}`, needsToken: true },
            { label: 'Match Summary', url: `${baseUrl}/overlay/matchSummary?token=${t}${extras}`, needsToken: true },
        ];
    });

    

    async function copyToClipboard(url: string, key: string) {
        try {
            await navigator.clipboard.writeText(url);
            copyFeedback[key] = true;
            setTimeout(() => { copyFeedback[key] = false; }, 1500);
        } catch {
            // fallback
            const ta = document.createElement('textarea');
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copyFeedback[key] = true;
            setTimeout(() => { copyFeedback[key] = false; }, 1500);
        }
    }

    onMount(() => {
        // Subscribe to the store
        const unsub = authTokenStore.subscribe((value: string) => {
            authToken = value;
            if (value && value.length > 0) {
                authenticated = true;
                loading = false;
            }
        });

        // Check URL hash for OAuth callback
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const tokenType = params.get('token_type');
        const accessToken = params.get('access_token');

        if (!authToken || authToken === '') {
            if (!tokenType || !accessToken) {
                if (discordOAuthUrl) {
                    window.location.href = discordOAuthUrl;
                } else {
                    loading = false;
                }
            } else {
                fetch(`https://api.beatkhana.com/api/requestAuthToken`, {
                    headers: {
                        authorization: `${tokenType} ${accessToken}`,
                    },
                }).then(response => response.json()).then(async (data) => {
                    if (data.token) {
                        authTokenStore.set(`${data.token}`);
                        // Clear hash from URL
                        window.history.replaceState(null, '', window.location.pathname);
                    } else {
                        alert('Something went wrong retrieving an authentication token! Please try again.');
                        loading = false;
                    }
                }).catch(() => {
                    alert('Failed to authenticate. Please try again.');
                    loading = false;
                });
            }
        } else {
            loading = false;
        }

        return unsub;
    });

    function logout() {
        authTokenStore.set('');
        authToken = '';
        authenticated = false;
    }
</script>

<div class="page">
    <div class="header-bar">
        <h1>CBST 2026 — Overlay Control Panel</h1>
        {#if authenticated}
            <button class="btn btn-small btn-danger" onclick={logout}>Logout</button>
        {/if}
    </div>

    {#if loading}
        <div class="loading">
            <div class="spinner"></div>
            <p>Authenticating with BeatKhana...</p>
        </div>
    {:else if !authenticated}
        <div class="card">
            <p class="muted">Not authenticated. Configure the Discord OAuth URL or provide a token manually.</p>
        </div>
    {:else}
        <!-- External Links -->
        <section class="card">
            <h2>BeatKhana Links</h2>
            <div class="link-row">
                <a href={manageUrl} target="_blank" rel="noopener" class="btn btn-external">
                    Overlay Manager ↗
                </a>
                <a href={coordinateUrl} target="_blank" rel="noopener" class="btn btn-external">
                    Coordinator Panel ↗
                </a>
            </div>
        </section>

        <!-- Countdown Picker -->
        <section class="card">
            <h2>Countdown Timer</h2>
            <p class="muted">Set the countdown duration, then copy the URL.</p>
            <div class="countdown-picker">
                <label>
                    <span>Hours</span>
                    <input type="number" min="0" max="24" bind:value={cdH} />
                </label>
                <span class="colon">:</span>
                <label>
                    <span>Minutes</span>
                    <input type="number" min="0" max="59" bind:value={cdM} />
                </label>
                <span class="colon">:</span>
                <label>
                    <span>Seconds</span>
                    <input type="number" min="0" max="59" bind:value={cdS} />
                </label>
            </div>
        </section>

        <!-- Prize Pool -->
        <section class="card">
            <h2>Priz Pool</h2>
            <p class="muted">Set how much the total prize pool is, then copy the URL.</p>
            <div class="countdown-picker">
                <label>
                    <span>Total CAD</span>
                    <input type="number" min="0" bind:value={prizePool} />
                </label>
            </div>
        </section>

        <!-- Overlay URLs -->
        <section class="card">
            <h2>Overlay URLs</h2>
            <div class="muted" style="margin-bottom: 0.75rem;">
                <label style="display:flex; gap:0.5rem; align-items:center;">
                    <input type="checkbox" bind:checked={useP1Twitch} />
                    <span>Use player1 twitch</span>
                </label>
                <label style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem;">
                    <input type="checkbox" bind:checked={useP2Twitch} />
                    <span>Use player2 twitch</span>
                </label>
            </div>

            <div class="url-list">
                {#each overlayUrls as item, i}
                    <div class="url-row">
                        <div class="url-info">
                            <span class="url-label">{item.label}</span>
                            <code class="url-text">{item.url}</code>
                        </div>
                        <div class="url-actions">
                            <button
                                class="btn btn-copy"
                                onclick={() => copyToClipboard(item.url, `url-${i}`)}
                            >
                                {copyFeedback[`url-${i}`] ? '✓ Copied' : 'Copy URL'}
                            </button>
                            <a href={item.url} target="_blank" rel="noopener" class="btn btn-open">
                                Open ↗
                            </a>
                        </div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Token Info -->
        <section class="card">
            <h2>Auth Token</h2>
            <div class="token-row">
                <code class="token-text">{authToken.substring(0, 30)}...</code>
                <button
                    class="btn btn-copy"
                    onclick={() => copyToClipboard(authToken, 'token')}
                >
                    {copyFeedback['token'] ? '✓ Copied' : 'Copy Token'}
                </button>
            </div>
        </section>
    {/if}
</div>

<style>
    :global(*),
    :global(*::before),
    :global(*::after) {
        box-sizing: border-box;
    }

    :global(html),
    :global(body) {
        margin: 0;
        padding: 0;
        width: 100% !important;
        height: auto !important;
        min-width: unset !important;
        min-height: 100vh !important;
        max-width: unset !important;
        max-height: unset !important;
        overflow: auto !important;
        background: #0e1117;
        color: #e6edf3;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Override the layout's fixed-size .content wrapper */
    :global(.content) {
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        min-height: 100vh !important;
        max-width: unset !important;
        max-height: unset !important;
        overflow: visible !important;
    }

    .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
    }

    .header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 1.6rem;
        font-weight: 600;
        margin: 0;
        background: linear-gradient(135deg, #d4c2c2, #c8c5cb);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    h2 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 1rem;
        color: #c9d1d9;
    }

    .card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 10px;
        padding: 1.5rem;
        margin-bottom: 1.25rem;
    }

    .muted {
        color: #8b949e;
        font-size: 0.9rem;
        margin: 0 0 1rem;
    }

    /* Buttons */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        border: 1px solid #30363d;
        border-radius: 6px;
        background: #21262d;
        color: #c9d1d9;
        font-size: 0.85rem;
        cursor: pointer;
        text-decoration: none;
        transition: background 0.15s, border-color 0.15s;
        white-space: nowrap;
    }

    .btn:hover {
        background: #30363d;
        border-color: #484f58;
    }

    .btn-copy {
        background: #1f6feb;
        border-color: #1f6feb;
        color: #fff;
        min-width: 5.5rem;
        justify-content: center;
    }

    .btn-copy:hover {
        background: #388bfd;
        border-color: #388bfd;
    }

    .btn-open {
        background: transparent;
    }

    .btn-external {
        background: #1c2128;
        border-color: #444c56;
        padding: 0.65rem 1.25rem;
        font-size: 0.9rem;
    }

    .btn-external:hover {
        background: #2d333b;
    }

    .btn-small {
        padding: 0.35rem 0.75rem;
        font-size: 0.8rem;
    }

    .btn-danger {
        border-color: #da3633;
        color: #f85149;
    }

    .btn-danger:hover {
        background: #da3633;
        color: #fff;
    }

    /* Links section */
    .link-row {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    /* Countdown picker */
    .countdown-picker {
        display: flex;
        align-items: flex-end;
        gap: 0.5rem;
    }

    .countdown-picker label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .countdown-picker label span {
        font-size: 0.75rem;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .countdown-picker input {
        width: 4.5rem;
        padding: 0.5rem 0.6rem;
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #e6edf3;
        font-size: 1.1rem;
        text-align: center;
        font-variant-numeric: tabular-nums;
    }

    .countdown-picker input:focus {
        outline: none;
        border-color: #1f6feb;
        box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.15);
    }

    .colon {
        font-size: 1.5rem;
        color: #484f58;
        padding-bottom: 0.35rem;
    }

    /* URL list */
    .url-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .url-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: #0d1117;
        border: 1px solid #21262d;
        border-radius: 8px;
    }

    .url-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
        flex: 1;
    }

    .url-label {
        font-weight: 600;
        font-size: 0.9rem;
        color: #e6edf3;
    }

    .url-text {
        font-size: 0.75rem;
        color: #8b949e;
        word-break: break-all;
        background: none;
        padding: 0;
    }

    .url-actions {
        display: flex;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    /* Token */
    .token-row {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .token-text {
        font-size: 0.85rem;
        color: #8b949e;
        background: #0d1117;
        padding: 0.4rem 0.75rem;
        border-radius: 4px;
        border: 1px solid #21262d;
    }

    /* Loading */
    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 4rem 0;
        color: #8b949e;
    }

    .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid #30363d;
        border-top-color: #58a6ff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>