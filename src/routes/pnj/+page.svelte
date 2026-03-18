<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatText } from '$lib/utils/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let selected = $state<typeof data.npcs[0] | null>(null);

	const visLabels: Record<string, string> = {
		dm_only: '🔒 MJ uniquement',
		players: '👥 Joueurs',
		public: '🌐 Public'
	};
	const visNext: Record<string, string> = {
		dm_only: 'players',
		players: 'public',
		public: 'dm_only'
	};

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) selected = null;
	}

	function statusEmoji(status: string): string {
		const s = (status ?? '').toLowerCase();
		if (s === 'mort') return '💀';
		if (s === 'malade') return '🤢';
		if (s === 'pétrifié') return '🪨';
		if (s === 'prisonnière' || s === 'prisonnier') return '⛓️';
		return '';
	}
</script>

<div class="container">
	<div class="page-header">
		<h1>PNJ</h1>
		<p class="subtitle">{data.npcs.length} personnage{data.npcs.length > 1 ? 's' : ''} non-joueur{data.npcs.length > 1 ? 's' : ''}</p>
	</div>

	<div class="npc-grid">
		{#each data.npcs as npc}
			<button class="npc-card" onclick={() => (selected = npc)}>
				<div class="npc-portrait">
					{#if npc.image_url}
						<img src={npc.image_url} alt={npc.name} class:dimmed={(npc.status ?? 'vivant').toLowerCase() !== 'vivant'} />
					{:else}
						<div class="portrait-placeholder">🎭</div>
					{/if}
					{#if statusEmoji(npc.status)}
						<span class="status-emoji">{statusEmoji(npc.status)}</span>
					{/if}
					{#if data.isDM}
						<span class="vis-badge-card" class:shared={npc.visibility !== 'dm_only'}>
							{npc.visibility === 'dm_only' ? '🔒' : npc.visibility === 'players' ? '👥' : '🌐'}
						</span>
					{/if}
				</div>
				<div class="npc-footer">
					<span class="npc-name">{npc.name}</span>
					<span class="npc-role">{npc.role}</span>
					<span class="npc-status status-{(npc.status ?? 'vivant').toLowerCase()}">{statusEmoji(npc.status ?? 'vivant')} {npc.status ?? 'Vivant'}</span>
				</div>
			</button>
		{/each}
	</div>

	{#if data.npcs.length === 0}
		<div class="empty">Aucun PNJ {data.isDM ? '' : 'partagé '}pour l'instant.</div>
	{/if}
</div>

<!-- Modal -->
{#if selected}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => (selected = null)}>✕</button>

			<div class="modal-layout">
				<div class="modal-img-col">
					{#if selected.image_url}
						<img src={selected.image_url} alt={selected.name} class="modal-img" />
					{:else}
						<div class="modal-img-placeholder">🎭</div>
					{/if}

					{#if data.isDM}
						<form method="POST" action="?/toggleVisibility" use:enhance>
							<input type="hidden" name="id" value={selected.id} />
							<input type="hidden" name="visibility" value={visNext[selected.visibility]} />
							<button type="submit" class="vis-toggle visibility-badge vis-{selected.visibility.replace('_only','')}">
								{visLabels[selected.visibility]}
							</button>
						</form>
					{:else}
						<span class="visibility-badge vis-{selected.visibility.replace('_only','')}">
							{visLabels[selected.visibility]}
						</span>
					{/if}
				</div>

				<div class="modal-content">
					<div class="modal-header">
						<h2>{selected.name}</h2>
						<span class="status-label" class:dead={selected.status?.toLowerCase().includes('mort')}>
							{selected.status}
						</span>
					</div>

					<p class="modal-role">{selected.role}</p>
					{#if selected.affiliation}
						<p class="modal-affil">📍 {selected.affiliation}</p>
					{/if}

					{#if selected.description}
						<p class="modal-desc">{@html formatText(selected.description)}</p>
					{/if}

					{#if selected.abilities?.length}
						<div class="modal-abilities">
							{#each selected.abilities as ab}
								<span class="ability-tag">{ab}</span>
							{/each}
						</div>
					{/if}

					{#if data.isDM && selected.dm_notes}
						<div class="dm-notes">
							<span class="dm-label">🎲 Notes MJ</span>
							<p>{@html formatText(selected.dm_notes)}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.subtitle {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		letter-spacing: 0.06em;
		color: rgba(240,237,234,0.4);
		margin-top: 0.5rem;
	}

	/* Grid de portraits */
	.npc-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 1rem;
	}

	.npc-card {
		background: rgba(10,10,10,0.6);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 6px;
		overflow: hidden;
		cursor: pointer;
		padding: 0;
		text-align: left;
		transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
	}
	.npc-card:hover {
		border-color: #C2374A;
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(194,55,74,0.2);
	}

	.npc-portrait {
		position: relative;
		width: 100%;
		aspect-ratio: 3/4;
		overflow: hidden;
	}
	.npc-portrait img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
		display: block;
	}
	.portrait-placeholder {
		width: 100%;
		height: 100%;
		background: #1A1A1A;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
	}

	.status-emoji {
		position: absolute;
		bottom: 0.4rem;
		right: 0.4rem;
		font-size: 1.6rem;
		line-height: 1;
		filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8));
	}
	.npc-portrait img.dimmed { filter: grayscale(60%) brightness(0.7); }

	.npc-status {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #5CB85C;
		margin-top: 0.1rem;
	}
	.npc-status.status-mort { color: #C2374A; }
	.npc-status.status-malade { color: #E0A030; }
	.npc-status.status-pétrifié { color: #8080A0; }
	.npc-status.status-prisonnière { color: #E0A030; }

	.vis-badge-card {
		position: absolute; top: 0.4rem; left: 0.4rem;
		font-size: 1rem; line-height: 1;
		filter: drop-shadow(0 1px 3px rgba(0,0,0,0.9));
		opacity: 0.85;
	}

	.npc-footer {
		padding: 0.65rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.npc-name {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #FFF;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.npc-role {
		font-size: 0.78rem;
		color: rgba(240,237,234,0.45);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.75);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.modal {
		background: rgba(12,12,12,0.97);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 8px;
		max-width: 760px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		position: relative;
		padding: 2rem;
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: transparent;
		border: 1px solid rgba(255,255,255,0.15);
		color: rgba(240,237,234,0.5);
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		cursor: pointer;
		font-size: 0.75rem;
		transition: color 0.2s, border-color 0.2s;
	}
	.modal-close:hover { color: #FFF; border-color: #C2374A; }

	.modal-layout {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
	}

	.modal-img-col {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	.modal-img {
		width: 180px;
		height: 240px;
		object-fit: cover;
		object-position: top;
		border-radius: 4px;
		border: 1px solid rgba(255,255,255,0.1);
	}
	.modal-img-placeholder {
		width: 180px;
		height: 240px;
		background: #1A1A1A;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 4rem;
	}

	.modal-content { flex: 1; min-width: 0; }

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	.modal-header h2 {
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.05em;
		color: #FFF;
	}

	.status-label {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #5CB85C;
		white-space: nowrap;
		margin-top: 0.3rem;
	}
	.status-label.dead { color: #C2374A; }

	.modal-role { font-size: 1rem; color: rgba(240,237,234,0.6); margin-bottom: 0.25rem; }
	.modal-affil { font-size: 0.9rem; color: rgba(240,237,234,0.45); margin-bottom: 1rem; }

	.modal-desc {
		font-size: 1rem;
		color: rgba(240,237,234,0.8);
		line-height: 1.7;
		margin-bottom: 1rem;
		border-top: 1px solid rgba(255,255,255,0.07);
		padding-top: 1rem;
	}

	.modal-abilities { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
	.ability-tag {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		color: rgba(240,237,234,0.7);
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.8rem;
	}

	.vis-toggle {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: opacity 0.2s;
	}
	.vis-toggle:hover { opacity: 0.7; }

	.dm-notes {
		background: rgba(10,5,8,0.8);
		border: 1px solid #C2374A33;
		border-radius: 3px;
		padding: 0.75rem;
	}
	.dm-label {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #C2374A;
		display: block;
		margin-bottom: 0.35rem;
	}
	.dm-notes p { font-size: 0.9rem; color: rgba(240,237,234,0.7); }

	.empty {
		text-align: center;
		padding: 4rem;
		color: rgba(240,237,234,0.3);
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	@media (max-width: 600px) {
		.modal-layout { flex-direction: column; }
		.modal-img, .modal-img-placeholder { width: 100%; height: 200px; }
		.npc-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
	}
</style>
