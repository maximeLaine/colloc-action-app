<script lang="ts">
	import { enhance } from '$app/forms';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Character = typeof data.characters[0];
	let selected = $state<Character | null>(null);
	let editOwn = $state<Character | null>(null);

	const statNames: Record<string, string> = {
		for: 'FOR', dex: 'DEX', con: 'CON', int: 'INT', sag: 'SAG', cha: 'CHA'
	};

	function modifier(val: number) {
		const mod = Math.floor((val - 10) / 2);
		return mod >= 0 ? `+${mod}` : `${mod}`;
	}

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
			selected = null;
			editOwn = null;
		}
	}
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Personnages</h1>
				<p class="subtitle">{data.characters.length} personnage{data.characters.length > 1 ? 's' : ''}</p>
			</div>
			{#if data.isDM}
				<a href="/admin/personnages" class="btn-primary">+ Gérer les PJ</a>
			{/if}
		</div>
	</div>

	{#if data.characters.length === 0}
		<div class="empty">
			<p>Aucune fiche personnage disponible.</p>
			{#if data.isDM}<p class="empty-hint">Créez des fiches depuis le panneau MJ.</p>{/if}
		</div>
	{:else}
		<div class="char-grid">
			{#each data.characters as c}
				<div class="char-card-wrap">
					<button class="char-card" onclick={() => (selected = c)}>
						<div class="char-portrait">
							{#if c.image_url}
								<img src={c.image_url} alt={c.name} />
							{:else}
								<div class="portrait-placeholder">⚔️</div>
							{/if}
							<div class="char-level">Niv. {c.level}</div>
						</div>
						<div class="char-footer">
							<span class="char-name">{c.name}</span>
							<span class="char-meta">{c.race} · {c.class}</span>
							<div class="char-stats">
								<span>❤️ {c.hp_current}/{c.hp_max}</span>
								<span>🛡️ {c.ac}</span>
							</div>
						</div>
					</button>
					{#if c.player_id === data.userId || data.isDM}
						<button class="btn-edit-own" onclick={() => (editOwn = c)}>✏️ Modifier</button>
					{/if}
				</div>
			{/each}
		</div>
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
						<div class="modal-img-placeholder">⚔️</div>
					{/if}
					<div class="level-badge">Niveau {selected.level}</div>
				</div>

				<div class="modal-content">
					<h2>{selected.name}</h2>
					<p class="modal-meta">{selected.race} · {selected.class}</p>

					<div class="hp-bar-wrap">
						<div class="hp-label">
							<span>Points de vie</span>
							<span>{selected.hp_current} / {selected.hp_max}</span>
						</div>
						<div class="hp-bar">
							<div class="hp-fill" style="width:{Math.max(0, Math.min(100, (selected.hp_current / selected.hp_max) * 100))}%"></div>
						</div>
					</div>

					<div class="combat-row">
						<div class="combat-stat">
							<span class="cs-label">Classe d'armure</span>
							<span class="cs-val">{selected.ac}</span>
						</div>
						<div class="combat-stat">
							<span class="cs-label">Initiative</span>
							<span class="cs-val">{modifier(selected.stats?.dex ?? 10)}</span>
						</div>
						<div class="combat-stat">
							<span class="cs-label">Vitesse</span>
							<span class="cs-val">9m</span>
						</div>
					</div>

					{#if selected.stats && Object.keys(selected.stats).length > 0}
						<div class="stats-grid">
							{#each Object.entries(selected.stats) as [key, val]}
								<div class="stat-box">
									<span class="stat-name">{statNames[key] ?? key.toUpperCase()}</span>
									<span class="stat-mod">{modifier(val as number)}</span>
									<span class="stat-val">{val}</span>
								</div>
							{/each}
						</div>
					{/if}

					{#if selected.abilities?.length}
						<div class="abilities">
							{#each selected.abilities as ab}
								<span class="ability-tag">{ab}</span>
							{/each}
						</div>
					{/if}

					{#if selected.backstory}
						<div class="backstory">
							<span class="bs-label">Historique</span>
							<p>{selected.backstory}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal modification propre personnage -->
{#if editOwn}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => (editOwn = null)}>✕</button>
			<h2>Modifier — {editOwn.name}</h2>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form method="POST" action="?/updateOwn" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') editOwn = null;
				update();
			}}>
				<input type="hidden" name="char_id" value={editOwn.id} />
				<div class="edit-form-grid">
					<div class="field">
						<label>Image</label>
						<ImageUpload name="image_url" value={editOwn.image_url ?? ''} placeholder="URL ou upload" />
					</div>
					<div class="field-group">
						<div class="field">
							<label>Niveau</label>
							<input name="level" type="number" min="1" max="20" value={editOwn.level} />
						</div>
						<div class="field">
							<label>PV max</label>
							<input name="hp_max" type="number" min="1" value={editOwn.hp_max} />
						</div>
						<div class="field">
							<label>PV actuels</label>
							<input name="hp_current" type="number" value={editOwn.hp_current} />
						</div>
						<div class="field">
							<label>CA</label>
							<input name="ac" type="number" min="1" value={editOwn.ac} />
						</div>
					</div>
					<div class="field full">
						<label>Historique / Backstory</label>
						<textarea name="backstory" rows="5">{editOwn.backstory ?? ''}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={() => (editOwn = null)}>Annuler</button>
					<button type="submit" class="btn-primary">Enregistrer</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
	.subtitle { font-family: 'Cinzel', serif; font-size: 0.8rem; color: rgba(240,237,234,0.4); margin-top: 0.4rem; letter-spacing: 0.05em; }

	.char-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
	}

	.char-card {
		background: rgba(10,10,10,0.6);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 6px;
		overflow: hidden;
		cursor: pointer;
		padding: 0;
		text-align: left;
		transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
	}
	.char-card:hover {
		border-color: #C2374A;
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(194,55,74,0.2);
	}

	.char-portrait {
		position: relative;
		width: 100%;
		aspect-ratio: 3/4;
		overflow: hidden;
	}
	.char-portrait img {
		width: 100%; height: 100%;
		object-fit: cover; object-position: top;
		display: block;
	}
	.portrait-placeholder {
		width: 100%; height: 100%;
		background: #1A1A1A;
		display: flex; align-items: center; justify-content: center;
		font-size: 3rem;
	}
	.char-level {
		position: absolute; bottom: 0.5rem; right: 0.5rem;
		background: rgba(0,0,0,0.7); border: 1px solid rgba(194,55,74,0.5);
		color: #C2374A; font-family: 'Cinzel', serif; font-size: 0.6rem;
		font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
		padding: 0.15rem 0.4rem; border-radius: 3px;
	}
	.char-footer { padding: 0.65rem 0.75rem; display: flex; flex-direction: column; gap: 0.2rem; }
	.char-name { font-family: 'Cinzel', serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #FFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.char-meta { font-size: 0.75rem; color: rgba(240,237,234,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.char-stats { display: flex; gap: 0.75rem; font-size: 0.78rem; color: rgba(240,237,234,0.6); margin-top: 0.1rem; }

	/* Modal */
	.modal-backdrop {
		position: fixed; inset: 0;
		background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
		z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
	}
	.modal {
		background: rgba(12,12,12,0.98);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 8px; max-width: 800px; width: 100%;
		max-height: 90vh; overflow-y: auto;
		position: relative; padding: 2rem;
	}
	.modal-close {
		position: absolute; top: 1rem; right: 1rem;
		background: transparent; border: 1px solid rgba(255,255,255,0.15);
		color: rgba(240,237,234,0.5); width: 2rem; height: 2rem;
		border-radius: 50%; cursor: pointer; font-size: 0.75rem;
		transition: color 0.2s, border-color 0.2s;
	}
	.modal-close:hover { color: #FFF; border-color: #C2374A; }

	.modal-layout { display: flex; gap: 2rem; align-items: flex-start; }
	.modal-img-col { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
	.modal-img { width: 180px; height: 240px; object-fit: cover; object-position: top; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); }
	.modal-img-placeholder { width: 180px; height: 240px; background: #1A1A1A; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
	.level-badge { font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #C2374A; border: 1px solid #C2374A44; padding: 0.2rem 0.6rem; border-radius: 3px; }

	.modal-content { flex: 1; min-width: 0; }
	.modal-content h2 { font-size: 1.6rem; font-weight: 900; color: #FFF; margin-bottom: 0.25rem; }
	.modal-meta { font-family: 'Cinzel', serif; font-size: 0.78rem; color: rgba(240,237,234,0.5); letter-spacing: 0.06em; margin-bottom: 1.25rem; }

	.hp-bar-wrap { margin-bottom: 1rem; }
	.hp-label { display: flex; justify-content: space-between; font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(240,237,234,0.5); margin-bottom: 0.35rem; }
	.hp-bar { background: rgba(255,255,255,0.07); border-radius: 2px; height: 6px; overflow: hidden; }
	.hp-fill { height: 100%; background: linear-gradient(to right, #5CB85C, #8BC34A); border-radius: 2px; transition: width 0.3s; }

	.combat-row { display: flex; gap: 1rem; margin-bottom: 1.25rem; }
	.combat-stat { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 0.5rem; text-align: center; }
	.cs-label { display: block; font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.4); margin-bottom: 0.2rem; }
	.cs-val { font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 700; color: #FFF; }

	.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; margin-bottom: 1.25rem; }
	.stat-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 0.4rem; text-align: center; }
	.stat-name { display: block; font-family: 'Cinzel', serif; font-size: 0.55rem; letter-spacing: 0.08em; color: rgba(240,237,234,0.4); text-transform: uppercase; }
	.stat-mod { display: block; font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 700; color: #FFF; }
	.stat-val { display: block; font-size: 0.7rem; color: rgba(240,237,234,0.4); }

	.abilities { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
	.ability-tag { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(240,237,234,0.7); padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.8rem; }

	.backstory { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 1rem; }
	.bs-label { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.4); display: block; margin-bottom: 0.4rem; }
	.backstory p { font-size: 0.95rem; color: rgba(240,237,234,0.7); line-height: 1.7; }

	.empty { text-align: center; padding: 4rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }
	.empty-hint { font-size: 0.8rem; margin-top: 0.5rem; color: rgba(240,237,234,0.2); }

	.char-card-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
	.btn-edit-own { background: transparent; border: 1px solid rgba(194,55,74,0.3); color: #C2374A; padding: 0.3rem 0.5rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; width: 100%; }
	.btn-edit-own:hover { background: rgba(194,55,74,0.1); border-color: #C2374A; }

	/* Edit modal */
	.edit-form-grid { display: flex; flex-direction: column; gap: 1rem; }
	.field-group { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
	.field { display: flex; flex-direction: column; gap: 0.35rem; }
	.field.full { grid-column: 1 / -1; }
	label { font-family: 'Cinzel', serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.55); }
	input[type="number"], textarea { background: #0A0A0A; border: 1px solid #2A2A2A; color: #F0EDEA; padding: 0.55rem 0.75rem; border-radius: 3px; font-family: 'Crimson Text', serif; font-size: 1rem; width: 100%; }
	input[type="number"]:focus, textarea:focus { outline: none; border-color: #C2374A; }
	textarea { resize: vertical; }
	.form-actions { margin-top: 1.25rem; display: flex; gap: 0.75rem; justify-content: flex-end; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }
	.modal h2 { font-size: 1rem; font-weight: 900; color: #C2374A; margin-bottom: 1.25rem; letter-spacing: 0.05em; text-transform: uppercase; }

	@media (max-width: 600px) {
		.modal-layout { flex-direction: column; }
		.modal-img, .modal-img-placeholder { width: 100%; height: 200px; }
		.stats-grid { grid-template-columns: repeat(3, 1fr); }
		.combat-row { flex-wrap: wrap; }
	}
</style>
