<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import ImageUpload from '$lib/components/ImageUpload.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Char {
		id: string; player_id: string | null; player_name: string | null;
		name: string; race: string; class: string; level: number;
		hp_max: number; hp_current: number; ac: number; image_url: string | null;
		visibility: string; backstory: string | null; dm_backstory: string | null;
		status: string;
	}

	let showForm = $state(false);
	let editChar = $state<Char | null>(null);

	const CLASSES = ['Barbare', 'Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Guerrier', 'Mage',
		'Moine', 'Occultiste', 'Paladin', 'Rôdeur', 'Roublard'];
	const RACES = ['Elfe', 'Nain', 'Halfelin', 'Humain', 'Tieffelin', 'Demi-Elfe', 'Gnome',
		'Demi-Orque', 'Draconide', 'Aasimar', 'Autre'];

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editChar = null;
	}
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Gérer les Personnages</h1>
				<p class="subtitle">Créer et gérer les fiches des personnages joueurs</p>
			</div>
			<div class="header-btns">
				<a href="/admin" class="btn-secondary">← Admin</a>
				<button class="btn-primary" onclick={() => (showForm = !showForm)}>
					{showForm ? 'Annuler' : '+ Nouveau PJ'}
				</button>
			</div>
		</div>
	</div>

	{#if showForm}
		<div class="form-panel card">
			<h2>Nouveau Personnage Joueur</h2>
			{#if form?.error}
				<div class="error-msg">{form.error}</div>
			{/if}
			<form method="POST" action="?/create" use:enhance={() => {
				return ({ result, update }) => {
					if (result.type === 'success') showForm = false;
					update();
				};
			}}>
				<div class="form-grid">
					<div class="field required">
						<label for="name">Nom du personnage</label>
						<input id="name" name="name" type="text" required placeholder="Ex: Gnoméo" />
					</div>
					<div class="field">
						<label for="player_id">Joueur</label>
						<select id="player_id" name="player_id">
							<option value="">— Sans joueur —</option>
							{#each data.players as player}
								<option value={player.id}>{player.display_name} ({player.email})</option>
							{/each}
						</select>
					</div>
					<div class="field required">
						<label for="race">Race</label>
						<input id="race" name="race" type="text" required list="race-list" placeholder="Ex: Gnome" />
						<datalist id="race-list">
							{#each RACES as r}<option value={r}></option>{/each}
						</datalist>
					</div>
					<div class="field required">
						<label for="class">Classe</label>
						<input id="class" name="class" type="text" required list="class-list" placeholder="Ex: Roublard" />
						<datalist id="class-list">
							{#each CLASSES as c}<option value={c}></option>{/each}
						</datalist>
					</div>
					<div class="field">
						<label for="level">Niveau</label>
						<input id="level" name="level" type="number" min="1" max="20" value="1" />
					</div>
					<div class="field">
						<label for="hp_max">PV max</label>
						<input id="hp_max" name="hp_max" type="number" min="1" value="10" />
					</div>
					<div class="field">
						<label for="ac">CA (Classe d'Armure)</label>
						<input id="ac" name="ac" type="number" min="1" value="10" />
					</div>
					<div class="field full">
						<label>Image</label>
						<ImageUpload name="image_url" placeholder="/img/pj/nom.png" />
					</div>
					<div class="field full">
						<label for="backstory">Historique (partagé avec le groupe)</label>
						<textarea id="backstory" name="backstory" rows="4" placeholder="Origine, motivations, personnalité..."></textarea>
					</div>
					<div class="field full">
						<label for="dm_backstory">Notes MJ (privées)</label>
						<textarea id="dm_backstory" name="dm_backstory" rows="3" placeholder="Éléments cachés, secrets..."></textarea>
					</div>
					<div class="field">
						<label for="status">Statut</label>
						<select id="status" name="status">
							<option value="vivant">✅ Vivant</option>
							<option value="mort">💀 Mort</option>
							<option value="malade">🤢 Malade</option>
							<option value="pétrifié">🪨 Pétrifié</option>
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn-primary">Créer le personnage</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="char-list">
		{#if data.characters.length === 0}
			<div class="empty">Aucun personnage. Crée le premier !</div>
		{:else}
			<div class="list-header"><span>{data.characters.length} personnage{data.characters.length > 1 ? 's' : ''}</span></div>
			{#each data.characters as char}
				<div class="char-row card">
					<div class="char-img-wrap">
						{#if char.image_url}
							<img src={char.image_url} alt={char.name} />
						{:else}
							<div class="img-placeholder">⚔️</div>
						{/if}
					</div>
					<div class="char-info">
						<div class="char-name">{char.name}</div>
						<div class="char-meta">
							<span class="class-race">{char.race} · {char.class}</span>
							<span class="sep">·</span>
							<span class="level">Niv. {char.level}</span>
							<span class="sep">·</span>
							<span class="hp">{char.hp_current}/{char.hp_max} PV</span>
							<span class="sep">·</span>
							<span class="ac">CA {char.ac}</span>
							{#if char.status && char.status !== 'vivant'}
								<span class="sep">·</span>
								<span class="status-tag">{char.status === 'mort' ? '💀' : char.status === 'malade' ? '🤢' : '🪨'} {char.status}</span>
							{/if}
						</div>
						{#if char.player_name}
							<div class="player-tag">👤 {char.player_name}</div>
						{:else}
							<div class="player-tag unassigned">Sans joueur</div>
						{/if}
					</div>
					<div class="char-actions">
						<form method="POST" action="?/share" use:enhance>
							<input type="hidden" name="id" value={char.id} />
							<input type="hidden" name="visibility" value={char.visibility === 'players' ? 'dm_only' : 'players'} />
							<button type="submit" class="btn-share" class:shared={char.visibility === 'players'}>
								{char.visibility === 'players' ? '👁 Visible' : '🔒 Masqué'}
							</button>
						</form>
						<button class="btn-edit" onclick={() => (editChar = char as Char)}>Modifier</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={char.id} />
							<button type="submit" class="btn-delete" onclick={(e) => {
								if (!confirm(`Supprimer "${char.name}" ?`)) e.preventDefault();
							}}>Supprimer</button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Modal édition -->
{#if editChar}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => (editChar = null)}>✕</button>
			<h2>Modifier — {editChar.name}</h2>

			<form method="POST" action="?/update" use:enhance={() => {
				return ({ result, update }) => {
					if (result.type === 'success') editChar = null;
					update();
				};
			}}>
				<input type="hidden" name="id" value={editChar.id} />
				<div class="form-grid">
					<div class="field required">
						<label for="e-name">Nom</label>
						<input id="e-name" name="name" type="text" required value={editChar.name} />
					</div>
					<div class="field">
						<label for="e-player">Joueur</label>
						<select id="e-player" name="player_id">
							<option value="">— Sans joueur —</option>
							{#each data.players as player}
								<option value={player.id} selected={player.id === editChar.player_id}>
									{player.display_name} ({player.email})
								</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="e-race">Race</label>
						<input id="e-race" name="race" type="text" list="race-list2" value={editChar.race} />
						<datalist id="race-list2">
							{#each RACES as r}<option value={r}></option>{/each}
						</datalist>
					</div>
					<div class="field">
						<label for="e-class">Classe</label>
						<input id="e-class" name="class" type="text" list="class-list2" value={editChar.class} />
						<datalist id="class-list2">
							{#each CLASSES as c}<option value={c}></option>{/each}
						</datalist>
					</div>
					<div class="field">
						<label for="e-level">Niveau</label>
						<input id="e-level" name="level" type="number" min="1" max="20" value={editChar.level} />
					</div>
					<div class="field">
						<label for="e-hp-max">PV max</label>
						<input id="e-hp-max" name="hp_max" type="number" min="1" value={editChar.hp_max} />
					</div>
					<div class="field">
						<label for="e-hp-cur">PV actuels</label>
						<input id="e-hp-cur" name="hp_current" type="number" min="0" value={editChar.hp_current} />
					</div>
					<div class="field">
						<label for="e-ac">CA</label>
						<input id="e-ac" name="ac" type="number" min="1" value={editChar.ac} />
					</div>
					<div class="field full">
						<label>Image</label>
						<ImageUpload name="image_url" value={editChar.image_url ?? ''} placeholder="/img/pj/nom.png" />
					</div>
					<div class="field full">
						<label for="e-backstory">Historique (partagé avec le groupe)</label>
						<textarea id="e-backstory" name="backstory" rows="4">{editChar.backstory ?? ''}</textarea>
					</div>
					<div class="field full">
						<label for="e-dm-backstory">Notes MJ (privées)</label>
						<textarea id="e-dm-backstory" name="dm_backstory" rows="3">{editChar.dm_backstory ?? ''}</textarea>
					</div>
					<div class="field">
						<label>Statut</label>
						<select name="status">
							<option value="vivant" selected={editChar.status === 'vivant'}>✅ Vivant</option>
							<option value="mort" selected={editChar.status === 'mort'}>💀 Mort</option>
							<option value="malade" selected={editChar.status === 'malade'}>🤢 Malade</option>
							<option value="pétrifié" selected={editChar.status === 'pétrifié'}>🪨 Pétrifié</option>
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={() => (editChar = null)}>Annuler</button>
					<button type="submit" class="btn-primary">Enregistrer</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
	.header-btns { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem; }
	.subtitle { font-family: 'Cinzel', serif; font-size: 0.8rem; color: rgba(240,237,234,0.4); margin-top: 0.4rem; letter-spacing: 0.05em; }

	.form-panel { margin-bottom: 2rem; }
	.form-panel h2 { font-size: 0.9rem; letter-spacing: 0.08em; margin-bottom: 1.25rem; color: #C2374A; }

	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.field { display: flex; flex-direction: column; gap: 0.35rem; }
	.field.full { grid-column: 1 / -1; }
	.field.required label::after { content: ' *'; color: #C2374A; }

	label {
		font-family: 'Cinzel', serif; font-size: 0.68rem; font-weight: 700;
		letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.55);
	}
	input, select, textarea {
		background: #0A0A0A; border: 1px solid #2A2A2A; color: #F0EDEA;
		padding: 0.55rem 0.75rem; border-radius: 3px; font-family: 'Crimson Text', serif;
		font-size: 1rem; transition: border-color 0.2s; width: 100%;
	}
	input:focus, select:focus, textarea:focus { outline: none; border-color: #C2374A; }
	textarea { resize: vertical; }
	select option { background: #111; }

	.form-actions { margin-top: 1.25rem; display: flex; gap: 0.75rem; justify-content: flex-end; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }

	.list-header { font-family: 'Cinzel', serif; font-size: 0.72rem; color: rgba(240,237,234,0.3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.75rem; }

	.char-row { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; margin-bottom: 0.5rem; }
	.char-img-wrap { flex-shrink: 0; }
	.char-img-wrap img, .img-placeholder {
		width: 52px; height: 52px; border-radius: 4px; object-fit: cover; border: 1px solid #2A2A2A;
	}
	.img-placeholder { background: #1A1A1A; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }

	.char-info { flex: 1; min-width: 0; }
	.char-name { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700; color: #FFF; letter-spacing: 0.05em; text-transform: uppercase; }
	.char-meta { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem; flex-wrap: wrap; }
	.class-race { font-size: 0.85rem; color: rgba(240,237,234,0.7); }
	.level, .hp, .ac { font-size: 0.82rem; color: rgba(240,237,234,0.5); }
	.sep { color: rgba(240,237,234,0.2); }
	.player-tag { font-family: 'Cinzel', serif; font-size: 0.65rem; letter-spacing: 0.06em; color: #2B8FD4; margin-top: 0.3rem; text-transform: uppercase; }
	.player-tag.unassigned { color: rgba(240,237,234,0.25); }

	.char-actions { flex-shrink: 0; display: flex; gap: 0.5rem; align-items: center; }
	.btn-share {
		background: transparent; border: 1px solid #2A3A2A; color: rgba(240,237,234,0.4);
		padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: border-color 0.2s, color 0.2s;
	}
	.btn-share.shared { border-color: #2A6A2A; color: #5CB85C; }
	.btn-share:hover { border-color: #5CB85C; color: #5CB85C; }

	.btn-edit {
		background: transparent; border: 1px solid #2A3A4A; color: rgba(240,237,234,0.5);
		padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: border-color 0.2s, color 0.2s;
	}
	.btn-edit:hover { border-color: #2B8FD4; color: #2B8FD4; }
	.btn-delete {
		background: transparent; border: 1px solid #3A1A1A; color: rgba(240,237,234,0.35);
		padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: border-color 0.2s, color 0.2s;
	}
	.btn-delete:hover { border-color: #C2374A; color: #E05060; }

	.empty { text-align: center; padding: 3rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }

	/* Modal */
	.modal-backdrop {
		position: fixed; inset: 0;
		background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
		z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
	}
	.modal {
		background: rgba(12,12,12,0.98);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 8px; max-width: 700px; width: 100%;
		max-height: 90vh; overflow-y: auto;
		position: relative; padding: 2rem;
	}
	.modal h2 { font-size: 1.1rem; font-weight: 900; color: #C2374A; margin-bottom: 1.5rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.modal-close {
		position: absolute; top: 1rem; right: 1rem;
		background: transparent; border: 1px solid rgba(255,255,255,0.15);
		color: rgba(240,237,234,0.5); width: 2rem; height: 2rem;
		border-radius: 50%; cursor: pointer; font-size: 0.75rem;
		transition: color 0.2s, border-color 0.2s;
	}
	.modal-close:hover { color: #FFF; border-color: #C2374A; }

	@media (max-width: 600px) {
		.form-grid { grid-template-columns: 1fr; }
		.header-row { flex-direction: column; gap: 1rem; }
	}
</style>
