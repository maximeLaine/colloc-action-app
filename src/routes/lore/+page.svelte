<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let expanded = $state<string | null>(null);
	const categories = $derived(Object.keys(data.grouped));
</script>

<div class="container">
	<div class="page-header">
		<h1>Lore</h1>
		<p class="subtitle">Histoire du monde d'Aerendor</p>
	</div>

	<!-- Carte du monde -->
	<div class="map-section">
		<img src="/img/carte-originale.jpg" alt="Carte du monde d'Aerendor" class="world-map" />
	</div>

	{#if categories.length === 0}
		<div class="empty">Aucune entrée de lore disponible pour l'instant.</div>
	{/if}

	{#each categories as cat}
		<section class="lore-section">
			<h2 class="category-title">{cat}</h2>
			<div class="lore-grid">
				{#each data.grouped[cat] ?? [] as entry}
					<div class="lore-card card" class:open={expanded === entry.id}>
						<button class="lore-header" onclick={() => expanded = expanded === entry.id ? null : entry.id}>
							<span class="entry-title">{entry.title}</span>
							<div class="entry-meta">
								{#if data.isDM}
									<span class="visibility-badge vis-{entry.visibility === 'dm_only' ? 'dm' : entry.visibility}">
										{entry.visibility === 'dm_only' ? '🔒' : entry.visibility === 'players' ? '👥' : '🌐'}
									</span>
								{/if}
								<span class="chevron">{expanded === entry.id ? '▲' : '▼'}</span>
							</div>
						</button>
						{#if expanded === entry.id}
							<div class="lore-body">
								<p>{entry.content}</p>
								{#if data.isDM && entry.dm_notes}
									<div class="dm-notes">
										<span class="dm-label">🎲 Notes MJ</span>
										<p>{entry.dm_notes}</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.map-section { margin-bottom: 2.5rem; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
	.world-map { display: block; width: 100%; height: auto; }
	.subtitle { font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.06em; color: rgba(240,237,234,0.4); margin-top: 0.5rem; }
	.lore-section { margin-bottom: 2.5rem; }
	.category-title { font-size: 1rem; letter-spacing: 0.1em; color: #C2374A; margin-bottom: 1rem; padding-left: 0.75rem; border-left: 3px solid #C2374A; }
	.lore-grid { display: flex; flex-direction: column; gap: 0.5rem; }
	.lore-card { padding: 0; overflow: hidden; }
	.lore-header { width: 100%; background: none; border: none; color: inherit; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; cursor: pointer; text-align: left; }
	.lore-header:hover { background: rgba(255,255,255,0.02); }
	.entry-title { font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
	.entry-meta { display: flex; align-items: center; gap: 0.5rem; }
	.chevron { color: rgba(240,237,234,0.3); font-size: 0.75rem; }
	.lore-body { padding: 0 1.25rem 1.25rem; border-top: 1px solid #1A1A1A; padding-top: 1rem; font-size: 1rem; color: rgba(240,237,234,0.75); line-height: 1.7; }
	.dm-notes { margin-top: 1rem; background: #0A0508; border: 1px solid #C2374A33; border-radius: 3px; padding: 0.75rem; }
	.dm-label { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #C2374A; display: block; margin-bottom: 0.35rem; }
	.empty { text-align: center; padding: 4rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }
</style>
