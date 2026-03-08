<script lang="ts">
    type FlowAction = 's1b' | 's1p' | 's2b' | 's2p' | 'tbSet';

    interface Flow {
        guid: string;
        picksBansFlow: FlowAction[];
    }

    interface MapInfo {
        guid: string;
        name: string;
        imageUrl: string;
    }

    interface PickBanEntry {
        guid: string;
        map: MapInfo;
        isPick: boolean;
        isBan: boolean;
        isTB: boolean;
        flowOrder: number;
    }

    let {
        side1,
        side2,
        flow = null,
        picksBansArray = [],
        compact = false,
        title = 'Picks & Bans',
    }: {
        side1: any;
        side2: any;
        flow?: Flow | null;
        picksBansArray?: PickBanEntry[];
        compact?: boolean;
        title?: string;
    } = $props();


    const actionToMeta = (action: FlowAction) => {
        if (action === 'tbSet') return { side: 'tb' as const, type: 'tb' };
        const side = action.startsWith('s1') ? 1 : 2;
        const type = action.endsWith('p') ? 'pick' : 'ban';
        return { side: side as 1 | 2, type };
    };

    const teamBySide = (side: 1 | 2) => (side === 1 ? side1 : side2);


    const rows = $derived(
        flow
            ? flow.picksBansFlow.map((act, idx) => {
                  const order = idx + 1;
                  const meta = actionToMeta(act);
                  const entry = picksBansArray?.find(e => e.flowOrder === order) ?? null;
                  const actualType = entry?.isTB ? 'tb' : entry?.isPick ? 'pick' : entry?.isBan ? 'ban' : null;
                  const team = meta.side === 'tb' ? null : teamBySide(meta.side);
                  return { order, meta, team, entry, actualType, pending: !entry };
              })
            : []
    );


    const accentOf = (type: string | null, pending: boolean) => {
        if (pending) return 'pending';
        if (type === 'pick') return 'pick';
        if (type === 'ban') return 'ban';
        if (type === 'tb') return 'tb';
        return 'pending';
    };

    const iconOf = (type: string | null, pending: boolean): string => {
        if (pending) return 'pi-minus';
        if (type === 'pick') return 'pi-check';
        if (type === 'ban') return 'pi-times';
        if (type === 'tb') return 'pi-star-fill';
        return 'pi-minus';
    };

    const labelOf = (meta: ReturnType<typeof actionToMeta>) => {
        if (meta.side === 'tb') return 'Tiebreaker';
        return meta.side === 1 ? 'Side 1' : 'Side 2';
    };
</script>

<div class="pbo" class:compact>
    <!-- header -->
    <header class="pbo-header">
        <i class="pi pi-list-check"></i>
        <span>{title}</span>
    </header>

    {#if !flow}
        <div class="pbo-empty">
            <i class="pi pi-hourglass"></i>
            <span>Awaiting flow</span>
        </div>
    {:else}
        <ul class="pbo-list">
            {#each rows as row (row.order)}
                {@const accent = accentOf(row.actualType, row.pending)}
                {@const icon = iconOf(row.actualType, row.pending)}
                <li class="row accent-{accent}">
                    <!-- order -->
                    <span class="order">{row.order}</span>

                    <!-- team -->
                    <div class="team">
                        {#if row.meta.side === 'tb'}
                            <div class="avatar neutral">
                                <i class="pi pi-star-fill"></i>
                            </div>
                            <span class="team-name">Tiebreaker</span>
                        {:else}
                            <div class="avatar">
                                {#if row.team?.captain?.avatarUrl}
                                    <img src={row.team.captain.avatarUrl} alt={row.team?.captain?.preferredName ?? ''} />
                                {:else}
                                    <span class="avatar-init">{row.meta.side === 1 ? 'S1' : 'S2'}</span>
                                {/if}
                            </div>
                            <span class="team-name">
                                {row.team?.captain?.preferredName ?? labelOf(row.meta)}
                            </span>
                        {/if}
                    </div>

                    <!-- divider -->
                    <span class="sep"><i class="pi pi-chevron-right"></i></span>

                    <!-- action -->
                    <div class="action">
                        <span class="action-icon accent-icon-{accent}">
                            <i class="pi {icon}"></i>
                        </span>
                        {#if row.pending}
                            <span class="action-label muted">
                                {row.meta.type === 'pick' ? 'Awaiting pick' : row.meta.type === 'tb' ? 'Awaiting tiebreaker' : 'Awaiting ban'}
                            </span>
                        {:else}
                            {#if row.entry?.map?.imageUrl}
                                <div class="map-thumb">
                                    <img src={row.entry.map.imageUrl} alt={row.entry.map.name} />
                                </div>
                            {/if}
                            <span class="action-label">{row.entry?.map?.name ?? 'Unknown'}</span>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .pbo {
        --bg:        rgba(10, 12, 18, 0.55);
        --surface:   rgba(20, 23, 32, 0.45);
        --border:    rgba(255 255 255 / 0.09);
        --text:      #edf0f7;
        --muted:     #7a8499;
        --c-pick:    #3ddc84;
        --c-ban:     #f04f5e;
        --c-tb:      #e8b84b;
        --c-pending: rgba(255 255 255 / 0.06);
        --radius:    12px;
    }

    .pbo {
        width: 420px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        font-family: inherit;
        color: var(--text);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .pbo-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
    }
    .pbo-header .pi { font-size: 0.9rem; }

    .pbo-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 36px;
        color: var(--muted);
        font-size: 0.95rem;
        font-weight: 500;
    }

    .pbo-list {
        list-style: none;
        margin: 0;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .row {
        display: grid;
        grid-template-columns: 28px 1fr 18px 1.7fr;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: var(--surface);
        border-radius: 9px;
        border: 1px solid var(--border);
        border-left: 3px solid var(--accent-color, var(--c-pending));
        transition: border-color 0.2s;
    }

    .accent-pick    { --accent-color: var(--c-pick); }
    .accent-ban     { --accent-color: var(--c-ban); }
    .accent-tb      { --accent-color: var(--c-tb); }
    .accent-pending { --accent-color: rgba(255 255 255 / 0.12); }

    .order {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--muted);
        text-align: center;
        font-variant-numeric: tabular-nums;
    }

    .team {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
    }

    .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255 255 255 / 0.06);
        border: 1px solid var(--border);
        display: grid;
        place-items: center;
        flex-shrink: 0;
        overflow: hidden;
    }
    .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .avatar-init {
        font-size: 0.68rem;
        font-weight: 800;
        color: var(--muted);
    }
    .avatar.neutral {
        background: rgba(232 184 75 / 0.1);
        border-color: rgba(232 184 75 / 0.25);
        color: var(--c-tb);
        font-size: 0.72rem;
    }

    .team-name {
        font-size: 0.95rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .sep {
        display: grid;
        place-items: center;
        color: rgba(255 255 255 / 0.15);
        font-size: 0.65rem;
    }

    .action {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
    }

    .action-icon {
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        flex-shrink: 0;
        background: rgba(255 255 255 / 0.05);
    }
    .action-icon .pi { font-size: 0.75rem; }

    .accent-icon-pick    { color: var(--c-pick);  background: rgba(61 220 132 / 0.12); }
    .accent-icon-ban     { color: var(--c-ban);   background: rgba(240 79  94 / 0.12); }
    .accent-icon-tb      { color: var(--c-tb);    background: rgba(232 184 75 / 0.12); }
    .accent-icon-pending { color: var(--muted);   background: transparent; }

    .action-label {
        font-size: 0.92rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .action-label.muted {
        color: var(--muted);
        font-weight: 400;
        font-style: italic;
        font-size: 0.85rem;
    }

    .map-thumb {
        width: 36px;
        height: 36px;
        border-radius: 5px;
        overflow: hidden;
        border: 1px solid var(--border);
        flex-shrink: 0;
    }
    .map-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .compact .pbo-header { padding: 10px 14px; font-size: 0.72rem; }
    .compact .pbo-list   { gap: 5px; padding: 8px; }
    .compact .row        { padding: 8px 10px; gap: 8px; grid-template-columns: 22px 1fr 14px 1.6fr; }
    .compact .order      { font-size: 0.7rem; }
    .compact .avatar, .compact .map-thumb { width: 26px; height: 26px; }
    .compact .team-name  { font-size: 0.82rem; }
    .compact .action-label { font-size: 0.8rem; }
    .compact .action-icon  { width: 22px; height: 22px; }
</style>