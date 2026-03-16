<script lang="ts">
	import { enhance } from '$app/forms';
	import FileAttachments from '$lib/components/FileAttachments.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Attachment { name: string; url: string; type: 'image' | 'pdf'; }
	interface LoreEntry { id: string; title: string; category: string; content: string; dm_notes: string | null; visibility: string; attachments?: Attachment[]; }

	let showForm = $state(false);
	let editEntry = $state<LoreEntry | null>(null);
	let search = $state('');
	let newAttachments = $state<Attachment[]>([]);
	let editAttachments = $state<Attachment[]>([]);

	const CATEGORIES = ['Monde', 'Pays', 'Confédération d\'Orde', 'Guildes & Factions', 'Panthéon', 'Histoire', 'Personnages', 'Magie', 'Divers'];

	const filtered = $derived(
		search.trim() === ''
			? data.entries
			: data.entries.filter((e: LoreEntry) =>
				e.title.toLowerCase().includes(search.toLowerCase()) ||
				e.category.toLowerCase().includes(search.toLowerCase())
			)
	);

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editEntry = null;
	}

	function openEdit(entry: LoreEntry) {
		editEntry = entry;
		editAttachments = (entry.attachments ?? []) as Attachment[];
	}
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Gérer le Lore</h1>
				<p class="subtitle">Entrées de lore, histoire du monde</p>
			</div>
			<div class="header-btns">
				<a href="/admin" class="btn-secondary">← Admin</a>
				<button class="btn-primary" onclick={() => { showForm = !showForm; newAttachments = []; }}>
					{showForm ? 'Annuler' : '+ Nouvelle entrée'}
				</button>
			</div>
		</div>
	</div>

	{#if showForm}
		<div class="form-panel card">
			<h2>Nouvelle entrée</h2>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form method="POST" action="?/save" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') showForm = false;
				update();
			}}>
				<div class="form-grid">
					<div class="field required">
						<label for="title">Titre</label>
						<input id="title" name="title" type="text" required placeholder="Ex: Le Duché de Valambrais" />
					</div>
					<div class="field required">
						<label for="category">Catégorie</label>
						<input id="category" name="category" type="text" required list="cat-list" placeholder="Ex: Géographie" />
						<datalist id="cat-list">{#each CATEGORIES as c}<option value={c}></option>{/each}</datalist>
					</div>
					<div class="field">
						<label for="visibility">Visibilité</label>
						<select id="visibility" name="visibility">
							<option value="players">👥 Joueurs</option>
							<option value="dm_only">🔒 MJ seulement</option>
						</select>
					</div>
					<div class="field full">
						<label for="content">Contenu</label>
						<textarea id="content" name="content" rows="5" placeholder="Description visible par les joueurs..."></textarea>
					</div>
					<div class="field full">
						<label for="dm_notes">Notes MJ (privées)</label>
						<textarea id="dm_notes" name="dm_notes" rows="3" placeholder="Notes secrètes, contexte caché..."></textarea>
					</div>
					<div class="field full">
						<label>Images & Documents</label>
						<FileAttachments bind:value={newAttachments} uploadUrl="/api/upload/lore" />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn-primary">Créer l'entrée</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="search-bar">
		<input type="text" bind:value={search} placeholder="🔍 Rechercher…" />
	</div>

	<div class="lore-list">
		{#if data.entries.length === 0}
			<div class="empty">Aucune entrée de lore.</div>
		{:else}
			<div class="list-header">{filtered.length} / {data.entries.length} entrée{data.entries.length > 1 ? 's' : ''}</div>
			{#each filtered as entry}
				<div class="lore-row card">
					<div class="lore-info">
						<div class="lore-title">{entry.title}</div>
						<div class="lore-meta">
							<span class="tag">{entry.category}</span>
							<span class="vis vis-{entry.visibility === 'dm_only' ? 'dm' : 'pub'}">
								{entry.visibility === 'dm_only' ? '🔒 MJ' : '👥 Joueurs'}
							</span>
						</div>
						{#if entry.content}<p class="lore-preview">{entry.content.slice(0, 120)}{entry.content.length > 120 ? '…' : ''}</p>{/if}
					</div>
					<div class="row-actions">
						<button class="btn-edit" onclick={() => openEdit(entry as LoreEntry)}>Modifier</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={entry.id} />
							<button type="submit" class="btn-delete"
								onclick={(e) => { if (!confirm(`Supprimer "${entry.title}" ?`)) e.preventDefault(); }}>
								Supprimer
							</button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

{#if editEntry}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => (editEntry = null)}>✕</button>
			<h2>Modifier — {editEntry.title}</h2>
			<form method="POST" action="?/save" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') editEntry = null;
				update();
			}}>
				<input type="hidden" name="id" value={editEntry.id} />
				<div class="form-grid">
					<div class="field required">
						<label>Titre</label>
						<input name="title" type="text" required value={editEntry.title} />
					</div>
					<div class="field required">
						<label>Catégorie</label>
						<input name="category" type="text" required list="cat-list2" value={editEntry.category} />
						<datalist id="cat-list2">{#each CATEGORIES as c}<option value={c}></option>{/each}</datalist>
					</div>
					<div class="field">
						<label>Visibilité</label>
						<select name="visibility">
							<option value="players" selected={editEntry.visibility === 'players'}>👥 Joueurs</option>
							<option value="dm_only" selected={editEntry.visibility === 'dm_only'}>🔒 MJ seulement</option>
						</select>
					</div>
					<div class="field full">
						<label>Contenu</label>
						<textarea name="content" rows="6">{editEntry.content}</textarea>
					</div>
					<div class="field full">
						<label>Notes MJ (privées)</label>
						<textarea name="dm_notes" rows="3">{editEntry.dm_notes ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Images & Documents</label>
						<FileAttachments bind:value={editAttachments} uploadUrl="/api/upload/lore" />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={() => (editEntry = null)}>Annuler</button>
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
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }
	.search-bar { margin-bottom: 1rem; }
	.list-header { font-family: 'Cinzel', serif; font-size: 0.72rem; color: rgba(240,237,234,0.3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.75rem; }
	.lore-row { display: flex; align-items: flex-start; gap: 1rem; padding: 0.85rem 1rem; margin-bottom: 0.5rem; }
	.lore-info { flex: 1; }
	.lore-title { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700; color: #FFF; letter-spacing: 0.04em; text-transform: uppercase; }
	.lore-meta { display: flex; gap: 0.5rem; margin-top: 0.3rem; align-items: center; flex-wrap: wrap; }
	.tag { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(240,237,234,0.6); padding: 0.15rem 0.45rem; border-radius: 3px; font-size: 0.75rem; }
	.vis { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em; }
	.vis-pub { color: #5CB85C; }
	.vis-dm { color: #C2374A; }
	.lore-preview { font-size: 0.83rem; color: rgba(240,237,234,0.4); margin-top: 0.35rem; line-height: 1.5; }
	.row-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
	.btn-edit { background: transparent; border: 1px solid #2A3A4A; color: rgba(240,237,234,0.5); padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
	.btn-edit:hover { border-color: #2B8FD4; color: #2B8FD4; }
	.btn-delete { background: transparent; border: 1px solid #3A1A1A; color: rgba(240,237,234,0.35); padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
	.btn-delete:hover { border-color: #C2374A; color: #E05060; }
	.empty { text-align: center; padding: 3rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }
	.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
	.modal { background: rgba(12,12,12,0.98); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; padding: 2rem; }
	.modal h2 { font-size: 1rem; font-weight: 900; color: #C2374A; margin-bottom: 1.5rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.modal-close { position: absolute; top: 1rem; right: 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: rgba(240,237,234,0.5); width: 2rem; height: 2rem; border-radius: 50%; cursor: pointer; font-size: 0.75rem; }
	.modal-close:hover { color: #FFF; border-color: #C2374A; }
	@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .header-row { flex-direction: column; gap: 1rem; } }
</style>
