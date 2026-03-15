<script lang="ts">
    let {
		map
	} = $props<{
		map: {
			songName: string;
			songAuthorName: string;
			levelAuthorName: string;
			coverImageUrl: string;
			difficulty: 'expertplus' | 'expert' | 'hard' | 'normal' | 'easy';
			isPicked: boolean;
			isBanned: boolean;
			isTB: boolean;
			sequenceNr?: number;
			key: string;
			actionerImageUrl?: string
		}
	}>();
</script>

<div class="song-card" class:picked={map.isPicked} class:banned={map.isBanned} class:tb={map.isTB}>
	<!-- Difficulty accent bar -->
	<div class="difficulty-notation {map.difficulty}"></div>

	<!-- Cover image area -->
	<div class="cover-wrapper">
		<img class="cover-image" src={map.coverImageUrl} alt="cover" />
		{#if map.sequenceNr && map.sequenceNr > 0}
			<div class="sequence">#{map.sequenceNr}</div>
		{/if}
	</div>

	<!-- Song info -->
	<div class="info">
		<div class="song-title">{map.songName}</div>
		<div class="song-author">{map.songAuthorName}</div>
		<div class="level-author">
			<i class="pi pi-user" style="font-size: 0.75rem; opacity: 0.6;"></i>
			{map.levelAuthorName}
		</div>
	</div>

	<!-- Right column: key + actioner -->
	<div class="right-col">
		<div class="key-badge">
			<i class="pi pi-key"></i>
			<span>{map.key}</span>
		</div>
		{#if map.actionerImageUrl && !map.isTB}
			<img
				class="actioner-pfp"
				class:pick={map.isPicked}
				class:ban={map.isBanned}
				src={map.actionerImageUrl}
				alt="actioner"
			/>
		{/if}
	</div>

	<!-- Banned grain overlay -->
	<div class="grain-overlay"></div>

	<!-- State icon overlay -->
	{#if map.isPicked || map.isBanned || map.isTB}
		<div class="state-icon" class:pick-icon={map.isPicked} class:ban-icon={map.isBanned} class:tb-icon={map.isTB}>
			{#if map.isPicked}
				<i class="pi pi-check"></i>
			{:else if map.isBanned}
				<i class="pi pi-times"></i>
			{:else if map.isTB}
				<i class="pi pi-star-fill"></i>
			{/if}
		</div>
	{/if}
</div>

<style>
	.song-card,
	.song-card * {
		box-sizing: border-box;
	}

	.song-card {
		background: #141414;
		border-radius: 0;
		width: 29.5rem;
		height: 8.5625rem;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: stretch;
		border: 1px solid rgba(255, 255, 255, 0.06);
		font-family: 'Geist', sans-serif;
		transition:
			box-shadow 0.4s ease,
			opacity 0.4s ease,
			filter 0.4s ease,
			border-color 0.4s ease;
	}

	.song-card::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 5;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.4s ease, box-shadow 0.4s ease;
	}

	.song-card.picked::before {
		opacity: 1;
		box-shadow:
			inset 0 0 0.4rem 0.2rem rgba(60, 179, 113, 0.9),
			0 0 0.8rem rgba(60, 179, 113, 0.3);
	}
	.song-card.picked {
		border-color: rgba(60, 179, 113, 0.4);
	}

	.song-card.banned::before {
		opacity: 1;
		box-shadow: inset 0 0 0.4rem 0.2rem rgba(255, 60, 60, 0.8);
	}
	.song-card.banned {
		border-color: rgba(255, 60, 60, 0.3);
		filter: saturate(0.35) brightness(0.65);
	}

	.song-card.tb::before {
		opacity: 1;
		box-shadow:
			inset 0 0 1.4rem 0rem rgba(255, 160, 30, 0.6),
			0 0 0.8rem rgba(255, 136, 0, 0.25);
	}
	.song-card.tb {
		border-color: rgba(255, 160, 30, 0.35);
	}

	.difficulty-notation {
		width: 3px;
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 2;
	}
	.difficulty-notation::after {
		content: '';
		position: absolute;
		inset: -0.25rem -0.5rem;
		width: 1.5rem;
		height: calc(100% + 0.5rem);
		filter: blur(0.5rem);
		background: inherit;
		opacity: 0.5;
	}
	.difficulty-notation.expertplus { background: #8b00ff; }
	.difficulty-notation.expert     { background: #c41e3a; }
	.difficulty-notation.hard       { background: #FF6347; }
	.difficulty-notation.normal     { background: #59B0F4; }
	.difficulty-notation.easy       { background: #3CB371; }

	.cover-wrapper {
		position: relative;
		flex: 0 0 auto;
		width: 8.5625rem;
		height: 8.5625rem;
		overflow: hidden;
	}

	.cover-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Soft fade from cover into info area */
	.cover-wrapper::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: 2.5rem;
		height: 100%;
		background: linear-gradient(to left, #141414, transparent);
		pointer-events: none;
	}

	.sequence {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		font-family: 'Bitcount Prop Double', system-ui;
		font-size: 3.2rem;
		font-weight: 400;
		text-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.7);
		background: rgba(0, 0, 0, 0.4);
		pointer-events: none;
	}

	.info {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0.5rem 0.5rem 0.5rem 0.4rem;
		gap: 0.15rem;
		z-index: 1;
	}

	.song-title {
		color: #ffffff;
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1.3;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		letter-spacing: 0.01em;
	}

	.song-author {
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.95rem;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.level-author {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.82rem;
		font-weight: 400;
		line-height: 1.3;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.right-col {
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.4rem 0.6rem;
		gap: 0.4rem;
		z-index: 2;
	}

	.key-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.55rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		width: fit-content;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.9rem;
	}

	.key-badge i {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.key-badge span {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.actioner-pfp {
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 2px;
		border: 2px solid rgba(255, 255, 255, 0.15);
		object-fit: cover;
		transition:
			border-color 0.4s ease,
			box-shadow 0.4s ease;
	}

	.actioner-pfp.pick {
		border-color: rgba(60, 179, 113, 0.7);
	}

	.actioner-pfp.ban {
		border-color: rgba(255, 60, 60, 0.7);
	}

	.state-icon {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 3;
		font-size: 0.7rem;
		color: #fff;
		animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.state-icon.pick-icon {
		background: rgba(60, 179, 113, 0.9);
	}

	.state-icon.ban-icon {
		background: rgba(220, 50, 50, 0.9);
	}

	.state-icon.tb-icon {
		background: rgba(255, 160, 30, 0.9);
	}

	@keyframes popIn {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.grain-overlay {
		position: absolute;
		inset: 0;
		z-index: 4;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.4s ease;
		mix-blend-mode: overlay;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
		background-size: 128px 128px;
	}

	.song-card.banned .grain-overlay {
		opacity: 0.5;
	}
</style>
