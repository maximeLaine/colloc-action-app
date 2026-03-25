<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { PageData, ActionData } from './$types';
	import ImageUpload from '$lib/components/ImageUpload.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Monster {
		id: string; name: string; type: string | null; cr: string | null;
		hp: number | null; ac: number | null; notes: string | null; image_url: string | null;
		description: string | null; actions: string | null; special_abilities: string | null;
		size: string | null; alignment: string | null; speed: string | null;
		str_score: number | null; dex_score: number | null; con_score: number | null;
		int_score: number | null; wis_score: number | null; cha_score: number | null;
		saving_throws: string | null; skills_text: string | null;
		damage_resistances: string | null; damage_immunities: string | null;
		condition_immunities: string | null; senses: string | null; languages: string | null;
		legendary_actions: string | null; reactions: string | null;
		source_url: string | null;
	}

	function mod(score: number | null): string {
		if (score == null) return '';
		const m = Math.floor((score - 10) / 2);
		return m >= 0 ? `+${m}` : `${m}`;
	}

	let showForm = $state(false);
	let editMonster = $state<Monster | null>(null);
	let search = $state('');
	let filterType = $state('');

	const TYPES = ['Aberration', 'Bête', 'Céleste', 'Construction', 'Dragon', 'Élémentaire',
		'Fée', 'Fiélon', 'Géant', 'Humanoïde', 'Mort-vivant', 'Plante', 'Vase'];

	const countByType = $derived(
		TYPES.reduce((acc, t) => { acc[t] = data.monsters.filter((m: Monster) => m.type === t).length; return acc; }, {} as Record<string, number>)
	);

	const filtered = $derived(
		data.monsters.filter((m: Monster) => {
			const matchSearch = search.trim() === '' ||
				m.name.toLowerCase().includes(search.toLowerCase()) ||
				(m.type ?? '').toLowerCase().includes(search.toLowerCase());
			const matchType = filterType === '' || m.type === filterType;
			return matchSearch && matchType;
		})
	);

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editMonster = null;
	}

	onMount(() => {
		const editId = $page.url.searchParams.get('edit');
		if (editId) {
			const m = data.monsters.find((m: Monster) => m.id === editId);
			if (m) editMonster = m as Monster;
		}
	});
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Gérer les Monstres</h1>
				<p class="subtitle">Bibliothèque de monstres pour les combats</p>
			</div>
			<div class="header-btns">
				<a href="/admin" class="btn-secondary">← Admin</a>
				<button class="btn-primary" onclick={() => (showForm = !showForm)}>
					{showForm ? 'Annuler' : '+ Nouveau monstre'}
				</button>
			</div>
		</div>
	</div>

	{#if showForm}
		<div class="form-panel card">
			<h2>Nouveau Monstre</h2>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form method="POST" action="?/create" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') showForm = false;
				update();
			}}>
				<div class="form-grid">
					<div class="field required">
						<label for="name">Nom</label>
						<input id="name" name="name" type="text" required placeholder="Ex: Gobelin" />
					</div>
					<div class="field">
						<label for="type">Type</label>
						<select id="type" name="type">
							<option value="">— Aucun —</option>
							{#each TYPES as t}<option value={t}>{t}</option>{/each}
						</select>
					</div>
					<div class="field">
						<label for="cr">Facteur de puissance (FP)</label>
						<input id="cr" name="cr" type="text" placeholder="Ex: 1/4" />
					</div>
					<div class="field">
						<label for="hp">Points de vie</label>
						<input id="hp" name="hp" type="number" min="1" placeholder="Ex: 7" />
					</div>
					<div class="field">
						<label for="ac">Classe d'armure</label>
						<input id="ac" name="ac" type="number" min="1" placeholder="Ex: 15" />
					</div>
					<div class="field full">
						<label>Image</label>
						<ImageUpload name="image_url" placeholder="/img/monstres/nom.png" />
					</div>
					<div class="field full">
						<label for="notes">Notes / Attaques</label>
						<textarea id="notes" name="notes" rows="3" placeholder="Attaques, capacités spéciales..."></textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn-primary">Créer le monstre</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="filters">
		<input class="search-input" type="text" bind:value={search} placeholder="🔍 Rechercher…" />
		<div class="type-filters">
			<button class="type-btn" class:active={filterType === ''} onclick={() => filterType = ''}>
				Tous <span class="type-count">{data.monsters.length}</span>
			</button>
			{#each TYPES as t}
				<button class="type-btn" class:active={filterType === t} onclick={() => filterType = t}
					class:type-empty={!countByType[t]}>
					{t} {#if countByType[t]}<span class="type-count">{countByType[t]}</span>{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="monster-list">
		{#if data.monsters.length === 0}
			<div class="empty">Aucun monstre. Ajoute le premier !</div>
		{:else}
			<div class="list-header">{filtered.length} / {data.monsters.length} monstre{data.monsters.length > 1 ? 's' : ''}</div>
			<div class="monster-grid">
				{#each filtered as m}
					<div class="monster-card card">
						{#if m.image_url}
							<img src={m.image_url} alt={m.name} class="monster-card-img" loading="lazy" />
						{:else}
							<div class="monster-card-placeholder">🐉</div>
						{/if}
						<div class="monster-card-body">
							<div class="monster-name">{m.name}</div>
							<div class="monster-meta">
								{#if m.type}<span class="tag">{m.type}</span>{/if}
								{#if m.cr}<span class="tag cr">FP {m.cr}</span>{/if}
							</div>
							<div class="monster-stats">
								{#if m.hp}<span class="stat">❤️ {m.hp} PV</span>{/if}
								{#if m.ac}<span class="stat">🛡️ {m.ac} CA</span>{/if}
							</div>
						</div>
						<div class="card-actions">
							<button class="btn-edit" onclick={() => editMonster = m as Monster}>Modifier</button>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={m.id} />
								<button type="submit" class="btn-delete-small"
									onclick={(e) => { if (!confirm(`Supprimer "${m.name}" ?`)) e.preventDefault(); }}>✕</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if editMonster}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => editMonster = null}>✕</button>
			<h2>Modifier — {editMonster.name}</h2>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form method="POST" action="?/update" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') editMonster = null;
				update();
			}}>
				<input type="hidden" name="id" value={editMonster.id} />
				<div class="form-grid">
					<div class="field required">
						<label>Nom</label>
						<input name="name" type="text" required value={editMonster.name} />
					</div>
					<div class="field">
						<label>Type</label>
						<select name="type">
							<option value="">— Aucun —</option>
							{#each TYPES as t}
								<option value={t} selected={editMonster.type === t}>{t}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label>Taille</label>
						<input name="size" type="text" value={editMonster.size ?? ''} placeholder="Grande, Moyenne…" />
					</div>
					<div class="field">
						<label>Alignement</label>
						<input name="alignment" type="text" value={editMonster.alignment ?? ''} placeholder="loyal mauvais…" />
					</div>
					<div class="field">
						<label>FP</label>
						<input name="cr" type="text" value={editMonster.cr ?? ''} />
					</div>
					<div class="field">
						<label>Points de vie</label>
						<input name="hp" type="number" min="1" value={editMonster.hp ?? ''} />
					</div>
					<div class="field">
						<label>Classe d'armure</label>
						<input name="ac" type="number" min="1" value={editMonster.ac ?? ''} />
					</div>
					<div class="field">
						<label>Vitesse</label>
						<input name="speed" type="text" value={editMonster.speed ?? ''} placeholder="9 m, nage 12 m…" />
					</div>

					<div class="field full">
						<label>Caractéristiques</label>
						<div class="ability-grid">
							{#each [['FOR','str_score'],['DEX','dex_score'],['CON','con_score'],['INT','int_score'],['SAG','wis_score'],['CHA','cha_score']] as [lbl, field]}
								<div class="ability-box">
									<span class="ability-lbl">{lbl}</span>
									<input name={field} type="number" min="1" max="30"
										value={(editMonster as Record<string,unknown>)[field] ?? ''}
										placeholder="—" />
								</div>
							{/each}
						</div>
					</div>

					<div class="field">
						<label>Jets de sauvegarde</label>
						<input name="saving_throws" type="text" value={editMonster.saving_throws ?? ''} placeholder="Con +6, Int +8…" />
					</div>
					<div class="field">
						<label>Compétences</label>
						<input name="skills_text" type="text" value={editMonster.skills_text ?? ''} placeholder="Histoire +12, Perception +10…" />
					</div>
					<div class="field">
						<label>Résistances aux dégâts</label>
						<input name="damage_resistances" type="text" value={editMonster.damage_resistances ?? ''} />
					</div>
					<div class="field">
						<label>Immunités aux dégâts</label>
						<input name="damage_immunities" type="text" value={editMonster.damage_immunities ?? ''} />
					</div>
					<div class="field">
						<label>Immunités aux états</label>
						<input name="condition_immunities" type="text" value={editMonster.condition_immunities ?? ''} />
					</div>
					<div class="field">
						<label>Sens</label>
						<input name="senses" type="text" value={editMonster.senses ?? ''} placeholder="vision dans le noir 36 m…" />
					</div>
					<div class="field">
						<label>Langues</label>
						<input name="languages" type="text" value={editMonster.languages ?? ''} />
					</div>

					<div class="field full">
						<label>Image</label>
						<ImageUpload name="image_url" value={editMonster.image_url ?? ''} placeholder="/img/monstres/nom.png" />
					</div>
					<div class="field full">
						<label>Description</label>
						<textarea name="description" rows="3">{editMonster.description ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Capacités spéciales</label>
						<textarea name="special_abilities" rows="4">{editMonster.special_abilities ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Actions</label>
						<textarea name="actions" rows="5">{editMonster.actions ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Réactions</label>
						<textarea name="reactions" rows="3">{editMonster.reactions ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Actions légendaires</label>
						<textarea name="legendary_actions" rows="5">{editMonster.legendary_actions ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Notes DM</label>
						<textarea name="notes" rows="3">{editMonster.notes ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Lien source (ex: AideDD)</label>
						<input name="source_url" type="url" value={editMonster.source_url ?? ''} placeholder="https://www.aidedd.org/dnd/monstres.php?vf=..." />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={() => editMonster = null}>Annuler</button>
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

	label { font-family: 'Cinzel', serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.55); }
	input, select, textarea { background: #0A0A0A; border: 1px solid #2A2A2A; color: #F0EDEA; padding: 0.55rem 0.75rem; border-radius: 3px; font-family: 'Crimson Text', serif; font-size: 1rem; transition: border-color 0.2s; width: 100%; }
	input:focus, select:focus, textarea:focus { outline: none; border-color: #C2374A; }
	textarea { resize: vertical; }
	select option { background: #111; }
	.form-actions { margin-top: 1.25rem; display: flex; gap: 0.75rem; justify-content: flex-end; }
	.ability-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; }
	.ability-box { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
	.ability-lbl { font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; color: rgba(240,237,234,0.45); text-transform: uppercase; }
	.ability-box input { text-align: center; padding: 0.4rem 0.2rem; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }

	.filters { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.25rem; }
	.search-input { width: 100%; }
	.type-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.type-btn {
		background: transparent; border: 1px solid #2A2A2A; color: rgba(240,237,234,0.45);
		padding: 0.25rem 0.65rem; border-radius: 3px;
		font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 700;
		letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
		transition: all 0.2s;
	}
	.type-btn:hover { border-color: #C2374A; color: #E05060; }
	.type-btn.active { background: rgba(194,55,74,0.15); border-color: #C2374A; color: #E05060; }
	.type-btn.type-empty { opacity: 0.35; }
	.type-count { background: rgba(255,255,255,0.1); border-radius: 3px; padding: 0 0.3rem; font-size: 0.55rem; margin-left: 0.2rem; }
	.type-btn.active .type-count { background: rgba(194,55,74,0.3); }

	.list-header { font-family: 'Cinzel', serif; font-size: 0.72rem; color: rgba(240,237,234,0.3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.75rem; }

	.monster-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
	.monster-card { display: flex; flex-direction: column; overflow: hidden; padding: 0; }
	.monster-card-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-bottom: 1px solid #1A1A1A; }
	.monster-card-placeholder { width: 100%; aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; background: #0A0A0A; border-bottom: 1px solid #1A1A1A; }
	.monster-card-body { padding: 0.75rem; flex: 1; }
	.monster-name { font-family: 'Cinzel', serif; font-size: 0.82rem; font-weight: 700; color: #FFF; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 0.35rem; }
	.monster-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
	.monster-stats { display: flex; gap: 0.75rem; }
	.tag { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(240,237,234,0.6); padding: 0.12rem 0.4rem; border-radius: 3px; font-size: 0.7rem; }
	.tag.cr { background: rgba(194,55,74,0.1); border-color: rgba(194,55,74,0.3); color: #C2374A; font-weight: 700; }
	.stat { font-size: 0.78rem; color: rgba(240,237,234,0.5); }
	.card-actions { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-top: 1px solid #1A1A1A; }
	.btn-edit { background: transparent; border: 1px solid #2A3A4A; color: rgba(240,237,234,0.5); padding: 0.22rem 0.55rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
	.btn-edit:hover { border-color: #2B8FD4; color: #2B8FD4; }
	.btn-delete-small { background: transparent; border: 1px solid #2A2A2A; color: rgba(240,237,234,0.25); width: 24px; height: 24px; border-radius: 3px; font-size: 0.65rem; cursor: pointer; transition: all 0.15s; }
	.btn-delete-small:hover { border-color: #C2374A; color: #E05060; }
	.empty { text-align: center; padding: 3rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }

	.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
	.modal { background: rgba(12,12,12,0.98); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; padding: 2rem; }
	.modal h2 { font-size: 1rem; font-weight: 900; color: #C2374A; margin-bottom: 1.5rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.modal-close { position: absolute; top: 1rem; right: 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: rgba(240,237,234,0.5); width: 2rem; height: 2rem; border-radius: 50%; cursor: pointer; font-size: 0.75rem; }
	.modal-close:hover { color: #FFF; border-color: #C2374A; }

	@media (max-width: 600px) {
		.form-grid { grid-template-columns: 1fr; }
		.header-row { flex-direction: column; gap: 1rem; }
	}
</style>
