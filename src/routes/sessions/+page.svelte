<script lang="ts">
	import type { PageData } from './$types';
	import { formatText } from '$lib/utils/format';
	let { data }: { data: PageData } = $props();
	let expanded = $state<string | null>(null);

	const grouped = $derived(() => {
		const map: Record<string, typeof data.sessions> = {};
		for (const s of data.sessions) {
			const key = (s as any).campaign ?? 'Colloc-Action';
			if (!map[key]) map[key] = [];
			map[key].push(s);
		}
		return map;
	});
	const campaigns = $derived(Object.keys(grouped()));
</script>

<div class="container">
	<div class="page-header">
		<h1>Sessions</h1>
		<p class="subtitle">
			{data.sessions.length} session{data.sessions.length > 1 ? 's' : ''} jouée{data.sessions
				.length > 1
				? 's'
				: ''}
		</p>
	</div>

	{#each campaigns as campaign}
		{#if campaigns.length > 1}
			<h2 class="campaign-title">{campaign}</h2>
		{/if}
		<div class="sessions-list">
			{#each grouped()[campaign] as s}
				<div class="session-card card" class:open={expanded === s.id}>
					<button
						class="session-header"
						onclick={() => (expanded = expanded === s.id ? null : s.id)}
					>
						<div class="session-num">Session {s.number}</div>
						<div class="session-info">
							<h2 class="session-title">{s.title}</h2>
							{#if s.date_played}
								<span class="session-date"
									>{new Date(s.date_played).toLocaleDateString('fr-FR', {
										day: 'numeric',
										month: 'long',
										year: 'numeric'
									})}</span
								>
							{/if}
						</div>
						<div class="session-meta">
							{#if s.xp_awarded}
								<span class="xp-badge">+{s.xp_awarded} XP</span>
							{/if}
							{#if data.isDM}
								<span
									class="visibility-badge vis-{s.visibility === 'dm_only' ? 'dm' : s.visibility}"
								>
									{s.visibility === 'dm_only' ? '🔒' : s.visibility === 'players' ? '👥' : '🌐'}
								</span>
							{/if}
							<span class="chevron">{expanded === s.id ? '▲' : '▼'}</span>
						</div>
					</button>

					{#if expanded === s.id}
						<div class="session-body">
							<p class="summary">{@html formatText(s.summary)}</p>
							{#if data.isDM && s.dm_notes}
								<div class="dm-notes">
									<span class="dm-label">🎲 Notes MJ</span>
									<p>{@html formatText(s.dm_notes)}</p>
								</div>
							{/if}
							{#if s.attachments?.length}
								<div class="attachments">
									<span class="att-label">📎 Documents & Images</span>
									<div class="att-list">
										{#each s.attachments as att}
											{#if att.type === 'image'}
												<a href={att.url} target="_blank" class="att-img-link">
													<img
														src={att.url}
														alt={att.name}
														class="att-img"
														loading="lazy"
														decoding="async"
													/>
													<span class="att-caption">{att.name}</span>
												</a>
											{:else}
												<a href={att.url} target="_blank" class="att-pdf-link">
													<span class="att-pdf-icon">📄</span>
													<span class="att-pdf-name">{att.name}</span>
												</a>
											{/if}
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.subtitle {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		letter-spacing: 0.06em;
		color: rgba(240, 237, 234, 0.4);
		margin-top: 0.5rem;
	}
	.campaign-title {
		font-size: 1rem;
		letter-spacing: 0.1em;
		color: #c2374a;
		margin: 2rem 0 1rem;
		padding-left: 0.75rem;
		border-left: 3px solid #c2374a;
		font-family: 'Cinzel', serif;
		text-transform: uppercase;
	}
	.sessions-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}
	.session-card {
		padding: 0;
		overflow: hidden;
	}
	.session-header {
		width: 100%;
		background: none;
		border: none;
		color: inherit;
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1.25rem 1.5rem;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}
	.session-header:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	.session-num {
		font-family: 'Cinzel Decorative', serif;
		font-size: 1.5rem;
		font-weight: 900;
		color: #c2374a;
		min-width: 2.5rem;
		line-height: 1;
	}
	.session-info {
		flex: 1;
		min-width: 0;
	}
	.session-title {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.session-date {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.4);
		font-family: 'Cinzel', serif;
	}
	.session-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	.xp-badge {
		background: #0a2a12;
		color: #5cb85c;
		border: 1px solid #5cb85c44;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
	}
	.chevron {
		color: rgba(240, 237, 234, 0.3);
		font-size: 0.75rem;
	}
	.session-body {
		padding: 1.25rem 1.5rem 1.5rem;
		border-top: 1px solid #1a1a1a;
	}
	.summary {
		font-size: 1rem;
		color: rgba(240, 237, 234, 0.75);
		line-height: 1.7;
	}
	.summary :global(.magic-text) {
		font-family: 'Cinzel', serif;
		color: #c2374a;
		letter-spacing: 0.05em;
	}
	.dm-notes {
		margin-top: 1rem;
		background: #0a0508;
		border: 1px solid #c2374a33;
		border-radius: 3px;
		padding: 0.75rem;
	}
	.dm-label {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #c2374a;
		display: block;
		margin-bottom: 0.35rem;
	}

	/* Attachments */
	.attachments {
		margin-top: 1.25rem;
	}
	.att-label {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		display: block;
		margin-bottom: 0.6rem;
	}
	.att-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.att-img-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		text-decoration: none;
	}
	.att-img {
		width: 120px;
		height: 90px;
		object-fit: cover;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: border-color 0.2s;
	}
	.att-img-link:hover .att-img {
		border-color: #c2374a;
	}
	.att-caption {
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.4);
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.att-pdf-link {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		text-decoration: none;
		transition: border-color 0.2s;
	}
	.att-pdf-link:hover {
		border-color: #c2374a;
	}
	.att-pdf-icon {
		font-size: 1.2rem;
	}
	.att-pdf-name {
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.6);
	}
</style>
