<script lang="ts">
	import type { PageData } from './$types';
	import { formatText } from '$lib/utils/format';
	let { data }: { data: PageData } = $props();
	let expanded = $state<string | null>(null);

	const sectionNames = $derived(Object.keys(data.sections));
</script>

<div class="container">
	<div class="page-header">
		<h1>Lore</h1>
		<p class="subtitle">Histoire du monde d'Aerendor</p>
	</div>

	{#if sectionNames.length === 0}
		<div class="empty">Aucune entrée de lore disponible pour l'instant.</div>
	{/if}

	{#each sectionNames as sectionName}
		{@const categories = Object.keys(data.sections[sectionName])}
		<section class="lore-section">
			<h2 class="section-title">{sectionName}</h2>

			{#each categories as cat}
				{@const entries = data.sections[sectionName][cat] ?? []}
				{@const showCatHeader = cat !== sectionName}

				{#if showCatHeader}
					<h3 class="category-title">{cat}</h3>
				{/if}

				<div class="lore-grid">
					{#each entries as entry}
						<div class="lore-card card" class:open={expanded === entry.id}>
							<button
								class="lore-header"
								onclick={() => (expanded = expanded === entry.id ? null : entry.id)}
							>
								<span class="entry-title">{entry.title}</span>
								<div class="entry-meta">
									{#if data.isDM}
										<span
											class="visibility-badge vis-{entry.visibility === 'dm_only'
												? 'dm'
												: entry.visibility}"
										>
											{entry.visibility === 'dm_only'
												? '🔒'
												: entry.visibility === 'players'
													? '👥'
													: '🌐'}
										</span>
									{/if}
									<span class="chevron">{expanded === entry.id ? '▲' : '▼'}</span>
								</div>
							</button>
							{#if expanded === entry.id}
								<div class="lore-body">
									<p>{@html formatText(entry.content)}</p>
									{#if data.isDM && entry.dm_notes}
										<div class="dm-notes">
											<span class="dm-label">Notes MJ</span>
											<p>{@html formatText(entry.dm_notes)}</p>
										</div>
									{/if}
									{#if entry.attachments?.length}
										<div class="attachments">
											<span class="att-label">Documents & Images</span>
											<div class="att-list">
												{#each entry.attachments as att}
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
															<span>📄</span>
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
		</section>
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

	.lore-section {
		margin-bottom: 3rem;
	}

	.section-title {
		font-size: 1.1rem;
		letter-spacing: 0.12em;
		color: #fff;
		margin-bottom: 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #c2374a;
		font-family: 'Cinzel', serif;
		text-transform: uppercase;
	}

	.category-title {
		font-size: 0.85rem;
		letter-spacing: 0.1em;
		color: #c2374a;
		margin: 1.5rem 0 0.75rem;
		padding-left: 0.75rem;
		border-left: 3px solid #c2374a;
		font-family: 'Cinzel', serif;
		text-transform: uppercase;
		font-weight: 700;
	}

	.lore-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.lore-card {
		padding: 0;
		overflow: hidden;
	}
	.lore-header {
		width: 100%;
		background: none;
		border: none;
		color: inherit;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.25rem;
		cursor: pointer;
		text-align: left;
	}
	.lore-header:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	.entry-title {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.entry-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.chevron {
		color: rgba(240, 237, 234, 0.3);
		font-size: 0.75rem;
	}
	.lore-body {
		padding: 0 1.25rem 1.25rem;
		border-top: 1px solid #1a1a1a;
		padding-top: 1rem;
		font-size: 1rem;
		color: rgba(240, 237, 234, 0.75);
		line-height: 1.7;
	}
	.lore-body :global(.magic-text) {
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
	.empty {
		text-align: center;
		padding: 4rem;
		color: rgba(240, 237, 234, 0.3);
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

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
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}
	.att-img-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		text-decoration: none;
	}
	.att-img {
		width: 100%;
		height: 200px;
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
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
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
	.att-pdf-name {
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.6);
	}

	@media (max-width: 600px) {
		.lore-header {
			padding: 0.6rem 0.85rem;
		}
		.att-list {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		}
	}
</style>
