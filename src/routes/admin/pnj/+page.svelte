<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import ImageUpload from '$lib/components/ImageUpload.svelte';

	interface Npc { id: string; name: string; role: string; affiliation: string | null; status: string; description: string | null; dm_notes: string | null; image_url: string | null; visibility: string; }
	interface AiNpc { name: string; role: string; affiliation: string; status: string; description: string; dm_notes: string; personality: string; secret: string; motivation: string; }

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showForm = $state(false);
	let editNpc = $state<Npc | null>(null);

	// AI generation state
	let showAiPanel = $state(false);
	let aiConcept = $state('');
	let aiRole = $state('');
	let aiAffiliation = $state('');
	let aiExtra = $state('');
	let aiLoading = $state(false);
	let aiError = $state('');
	let aiResult = $state<AiNpc | null>(null);

	// Pre-fill form with AI result
	let prefillName = $state('');
	let prefillRole = $state('');
	let prefillAffiliation = $state('');
	let prefillDescription = $state('');
	let prefillDmNotes = $state('');

	const visLabels: Record<string, string> = {
		dm_only: '🔒 MJ',
		players: '👥 Joueurs',
		public: '🌐 Public'
	};

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editNpc = null;
	}

	async function generateNpc() {
		if (!aiConcept.trim()) return;
		aiLoading = true;
		aiError = '';
		aiResult = null;
		try {
			const res = await fetch('/api/claude/npc', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ concept: aiConcept, role: aiRole, affiliation: aiAffiliation, extra: aiExtra })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				aiError = err.message ?? `Erreur ${res.status}`;
			} else {
				const data = await res.json();
				aiResult = data.npc;
			}
		} catch (e) {
			aiError = 'Erreur réseau';
		} finally {
			aiLoading = false;
		}
	}

	function useAiResult() {
		if (!aiResult) return;
		prefillName = aiResult.name;
		prefillRole = aiResult.role;
		prefillAffiliation = aiResult.affiliation ?? '';
		prefillDescription = aiResult.description ?? '';
		prefillDmNotes = [
			aiResult.dm_notes ?? '',
			aiResult.personality ? `Personnalité: ${aiResult.personality}` : '',
			aiResult.secret ? `Secret: ${aiResult.secret}` : '',
			aiResult.motivation ? `Motivation: ${aiResult.motivation}` : ''
		].filter(Boolean).join('\n');
		showAiPanel = false;
		showForm = true;
	}
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Gérer les PNJ</h1>
				<p class="subtitle">Créer et supprimer des personnages non-joueurs</p>
			</div>
			<div class="header-btns">
				<a href="/admin" class="btn-secondary">← Admin</a>
				<button class="btn-ai" onclick={() => { showAiPanel = !showAiPanel; showForm = false; }}>
					{showAiPanel ? '✕ IA' : '✨ Générer via IA'}
				</button>
				<button class="btn-primary" onclick={() => { showForm = !showForm; showAiPanel = false; }}>
					{showForm ? 'Annuler' : '+ Nouveau PNJ'}
				</button>
			</div>
		</div>
	</div>

	{#if showAiPanel}
		<div class="ai-panel card">
			<div class="ai-panel-header">
				<span class="ai-label">✨ Générateur de PNJ IA</span>
				<span class="ai-hint">Décris le concept, l'IA crée le personnage</span>
			</div>
			<div class="form-grid">
				<div class="field full">
					<label for="ai-concept">Concept *</label>
					<input id="ai-concept" type="text" bind:value={aiConcept} placeholder="Ex: Forgeron nain grognon qui cache un lourd secret..." />
				</div>
				<div class="field">
					<label for="ai-role">Rôle (optionnel)</label>
					<input id="ai-role" type="text" bind:value={aiRole} placeholder="Ex: Allié, Marchand, Ennemi..." />
				</div>
				<div class="field">
					<label for="ai-affil">Affiliation (optionnel)</label>
					<input id="ai-affil" type="text" bind:value={aiAffiliation} placeholder="Ex: Guilde des Forgerons" />
				</div>
				<div class="field full">
					<label for="ai-extra">Notes supplémentaires (optionnel)</label>
					<input id="ai-extra" type="text" bind:value={aiExtra} placeholder="Ex: Doit connaître Maldrek, apparaît en session 5..." />
				</div>
			</div>
			<div class="ai-actions">
				<button class="btn-generate" onclick={generateNpc} disabled={aiLoading || !aiConcept.trim()}>
					{aiLoading ? '⏳ Génération…' : '✨ Générer'}
				</button>
			</div>
			{#if aiError}
				<div class="error-msg">{aiError}</div>
			{/if}
			{#if aiResult}
				<div class="ai-result">
					<div class="ai-result-header">
						<span class="ai-result-name">{aiResult.name}</span>
						<span class="ai-result-role">{aiResult.role}{aiResult.affiliation ? ' · ' + aiResult.affiliation : ''}</span>
					</div>
					{#if aiResult.description}
						<p class="ai-result-desc">{aiResult.description}</p>
					{/if}
					{#if aiResult.personality || aiResult.secret || aiResult.motivation}
						<div class="ai-result-dm">
							{#if aiResult.personality}<div class="ai-dm-line"><span class="ai-dm-key">Personnalité</span> {aiResult.personality}</div>{/if}
							{#if aiResult.motivation}<div class="ai-dm-line"><span class="ai-dm-key">Motivation</span> {aiResult.motivation}</div>{/if}
							{#if aiResult.secret}<div class="ai-dm-line ai-dm-secret"><span class="ai-dm-key">🔒 Secret</span> {aiResult.secret}</div>{/if}
						</div>
					{/if}
					<div class="ai-result-actions">
						<button class="btn-use-ai" onclick={useAiResult}>↳ Utiliser pour créer ce PNJ</button>
						<button class="btn-regen" onclick={generateNpc} disabled={aiLoading}>↺ Regénérer</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#if showForm}
		<div class="form-panel card">
			<h2>{prefillName ? `Nouveau PNJ — ${prefillName}` : 'Nouveau PNJ'}</h2>
			{#if form?.error}
				<div class="error-msg">{form.error}</div>
			{/if}
			<form method="POST" action="?/create" use:enhance={() => {
				return ({ result, update }) => {
					if (result.type === 'success') { showForm = false; prefillName = ''; }
					update();
				};
			}}>
				<div class="form-grid">
					<div class="field required">
						<label for="name">Nom</label>
						<input id="name" name="name" type="text" required placeholder="Ex: Comte Aldren" value={prefillName} />
					</div>
					<div class="field required">
						<label for="role">Rôle / Titre</label>
						<input id="role" name="role" type="text" required placeholder="Ex: Noble, Marchand, Ennemi..." value={prefillRole} />
					</div>
					<div class="field">
						<label for="affiliation">Affiliation</label>
						<input id="affiliation" name="affiliation" type="text" placeholder="Ex: Comté de Valombre" value={prefillAffiliation} />
					</div>
					<div class="field">
						<label for="status">Statut</label>
						<select id="status" name="status">
							<option value="vivant">✅ Vivant</option>
							<option value="mort">💀 Mort</option>
							<option value="malade">🤢 Malade</option>
							<option value="pétrifié">🪨 Pétrifié</option>
							<option value="prisonnière">⛓️ Prisonnier/ère</option>
						</select>
					</div>
					<div class="field">
						<label for="visibility">Visibilité</label>
						<select id="visibility" name="visibility">
							<option value="dm_only">🔒 MJ uniquement</option>
							<option value="players">👥 Joueurs</option>
							<option value="public">🌐 Public</option>
						</select>
					</div>
					<div class="field">
						<label>Image</label>
						<ImageUpload name="image_url" placeholder="/img/pnj/nom.png" />
					</div>
					<div class="field full">
						<label for="description">Description (visible joueurs)</label>
						<textarea id="description" name="description" rows="3" placeholder="Description publique du PNJ...">{prefillDescription}</textarea>
					</div>
					<div class="field full">
						<label for="dm_notes">Notes MJ (privées)</label>
						<textarea id="dm_notes" name="dm_notes" rows="3" placeholder="Notes secrètes, motivations, plans...">{prefillDmNotes}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn-primary">Créer le PNJ</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="npc-list">
		{#if data.npcs.length === 0}
			<div class="empty">Aucun PNJ. Crée le premier !</div>
		{:else}
			<div class="list-header">
				<span>{data.npcs.length} PNJ</span>
			</div>
			{#each data.npcs as npc}
				<div class="npc-row card">
					<div class="npc-img-wrap">
						{#if npc.image_url}
							<img src={npc.image_url} alt={npc.name} />
						{:else}
							<div class="img-placeholder">🎭</div>
						{/if}
					</div>
					<div class="npc-info">
						<div class="npc-name">{npc.name}</div>
						<div class="npc-meta">
							<span class="role">{npc.role}</span>
							{#if npc.affiliation}<span class="sep">·</span><span class="affil">{npc.affiliation}</span>{/if}
							<span class="sep">·</span>
							<span class="vis-badge vis-{npc.visibility.replace('_only', '')}">
								{visLabels[npc.visibility]}
							</span>
						</div>
						{#if npc.description}
							<p class="npc-desc">{npc.description.slice(0, 120)}{npc.description.length > 120 ? '…' : ''}</p>
						{/if}
					</div>
					<div class="npc-actions">
						<span class="status-tag" class:dead={npc.status?.toLowerCase().includes('mort')}>
							{npc.status}
						</span>
						{#if npc.visibility === 'dm_only'}
							<form method="POST" action="?/share" use:enhance>
								<input type="hidden" name="id" value={npc.id} />
								<input type="hidden" name="visibility" value="players" />
								<button type="submit" class="btn-share">👥 Partager</button>
							</form>
						{:else if npc.visibility === 'players'}
							<form method="POST" action="?/share" use:enhance>
								<input type="hidden" name="id" value={npc.id} />
								<input type="hidden" name="visibility" value="dm_only">
								<button type="submit" class="btn-unshare">🔒 Masquer</button>
							</form>
						{/if}
						<button class="btn-edit" onclick={() => editNpc = npc as Npc}>Modifier</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={npc.id} />
							<button type="submit" class="btn-delete" onclick={(e) => {
								if (!confirm(`Supprimer "${npc.name}" ?`)) e.preventDefault();
							}}>Supprimer</button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

{#if editNpc}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => editNpc = null}>✕</button>
			<h2>Modifier — {editNpc.name}</h2>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form method="POST" action="?/update" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') editNpc = null;
				update();
			}}>
				<input type="hidden" name="id" value={editNpc.id} />
				<div class="form-grid">
					<div class="field required">
						<label>Nom</label>
						<input name="name" type="text" required value={editNpc.name} />
					</div>
					<div class="field required">
						<label>Rôle / Titre</label>
						<input name="role" type="text" required value={editNpc.role} />
					</div>
					<div class="field">
						<label>Affiliation</label>
						<input name="affiliation" type="text" value={editNpc.affiliation ?? ''} />
					</div>
					<div class="field">
						<label>Statut</label>
						<select name="status">
							<option value="vivant" selected={editNpc.status === 'vivant'}>✅ Vivant</option>
							<option value="mort" selected={editNpc.status === 'mort'}>💀 Mort</option>
							<option value="malade" selected={editNpc.status === 'malade'}>🤢 Malade</option>
							<option value="pétrifié" selected={editNpc.status === 'pétrifié'}>🪨 Pétrifié</option>
							<option value="prisonnière" selected={editNpc?.status === 'prisonnière'}>⛓️ Prisonnier/ère</option>
						</select>
					</div>
					<div class="field">
						<label>Visibilité</label>
						<select name="visibility">
							<option value="dm_only" selected={editNpc.visibility === 'dm_only'}>🔒 MJ uniquement</option>
							<option value="players" selected={editNpc.visibility === 'players'}>👥 Joueurs</option>
							<option value="public" selected={editNpc.visibility === 'public'}>🌐 Public</option>
						</select>
					</div>
					<div class="field">
						<label>Image</label>
						<ImageUpload name="image_url" placeholder="/img/pnj/nom.png" value={editNpc.image_url ?? ''} />
					</div>
					<div class="field full">
						<label>Description (visible joueurs)</label>
						<textarea name="description" rows="3">{editNpc.description ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Notes MJ (privées)</label>
						<textarea name="dm_notes" rows="3">{editNpc.dm_notes ?? ''}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={() => editNpc = null}>Annuler</button>
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

	/* AI button */
	.btn-ai {
		background: rgba(194,55,74,0.1); border: 1px solid rgba(194,55,74,0.4); color: #C2374A;
		padding: 0.5rem 1rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: background 0.2s, border-color 0.2s;
	}
	.btn-ai:hover { background: rgba(194,55,74,0.2); border-color: #C2374A; }

	/* AI panel */
	.ai-panel { margin-bottom: 1.5rem; border-color: rgba(194,55,74,0.2); }
	.ai-panel-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.25rem; }
	.ai-label { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700; color: #C2374A; letter-spacing: 0.06em; text-transform: uppercase; }
	.ai-hint { font-size: 0.8rem; color: rgba(240,237,234,0.35); }
	.ai-actions { margin-top: 1rem; }
	.btn-generate {
		background: #C2374A; border: none; color: #fff; padding: 0.55rem 1.25rem;
		border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 700;
		letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: background 0.2s;
	}
	.btn-generate:hover:not(:disabled) { background: #E04060; }
	.btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }

	/* AI result */
	.ai-result { margin-top: 1.25rem; background: rgba(194,55,74,0.05); border: 1px solid rgba(194,55,74,0.15); border-radius: 4px; padding: 1rem 1.25rem; }
	.ai-result-header { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.6rem; }
	.ai-result-name { font-family: 'Cinzel', serif; font-size: 0.95rem; font-weight: 900; color: #FFF; letter-spacing: 0.05em; text-transform: uppercase; }
	.ai-result-role { font-size: 0.82rem; color: rgba(240,237,234,0.5); }
	.ai-result-desc { font-size: 0.9rem; color: rgba(240,237,234,0.7); line-height: 1.55; margin-bottom: 0.75rem; }
	.ai-result-dm { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
	.ai-dm-line { font-size: 0.82rem; color: rgba(240,237,234,0.5); }
	.ai-dm-line.ai-dm-secret { color: rgba(194,55,74,0.8); }
	.ai-dm-key { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(240,237,234,0.35); margin-right: 0.4rem; }
	.ai-result-actions { display: flex; gap: 0.75rem; }
	.btn-use-ai {
		background: #C2374A; border: none; color: #fff; padding: 0.4rem 1rem;
		border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700;
		letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: background 0.2s;
	}
	.btn-use-ai:hover { background: #E04060; }
	.btn-regen {
		background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(240,237,234,0.5);
		padding: 0.4rem 0.75rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.65rem;
		font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.2s;
	}
	.btn-regen:hover:not(:disabled) { border-color: #C2374A; color: #C2374A; }
	.btn-regen:disabled { opacity: 0.4; cursor: not-allowed; }

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

	.form-actions { margin-top: 1.25rem; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }

	.list-header { font-family: 'Cinzel', serif; font-size: 0.72rem; color: rgba(240,237,234,0.3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.75rem; }

	.npc-row {
		display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; margin-bottom: 0.5rem;
	}
	.npc-img-wrap { flex-shrink: 0; }
	.npc-img-wrap img, .img-placeholder {
		width: 52px; height: 52px; border-radius: 4px; object-fit: cover;
		border: 1px solid #2A2A2A;
	}
	.img-placeholder { background: #1A1A1A; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }

	.npc-info { flex: 1; min-width: 0; }
	.npc-name { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700; color: #FFF; letter-spacing: 0.05em; text-transform: uppercase; }
	.npc-meta { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem; flex-wrap: wrap; }
	.role { font-size: 0.85rem; color: rgba(240,237,234,0.6); }
	.affil { font-size: 0.82rem; color: rgba(240,237,234,0.45); }
	.sep { color: rgba(240,237,234,0.2); }
	.npc-desc { font-size: 0.85rem; color: rgba(240,237,234,0.45); margin-top: 0.3rem; line-height: 1.4; }

	.vis-badge {
		font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700;
		letter-spacing: 0.07em; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 3px;
	}
	.vis-dm { background: #3A0A12; color: #E05060; border: 1px solid #C2374A44; }
	.vis-players { background: #0A1A2A; color: #4AAAE8; border: 1px solid #2B8FD444; }
	.vis-public { background: #0A2A12; color: #5CB85C; border: 1px solid #5CB85C44; }

	.npc-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; flex-shrink: 0; }
	.status-tag { font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: #5CB85C; }
	.status-tag.dead { color: #C2374A; }

	.btn-share {
		background: rgba(43,143,212,0.15); border: 1px solid #2B8FD444; color: #4AAAE8;
		padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: background 0.2s;
	}
	.btn-share:hover { background: rgba(43,143,212,0.3); }

	.btn-unshare {
		background: rgba(194,55,74,0.1); border: 1px solid #C2374A44; color: #C2374A;
		padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: background 0.2s;
	}
	.btn-unshare:hover { background: rgba(194,55,74,0.25); }

	.btn-delete {
		background: transparent; border: 1px solid #3A1A1A; color: rgba(240,237,234,0.35);
		padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: border-color 0.2s, color 0.2s;
	}
	.btn-delete:hover { border-color: #C2374A; color: #E05060; }

	.btn-edit { background: transparent; border: 1px solid #2A3A4A; color: rgba(240,237,234,0.5); padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
	.btn-edit:hover { border-color: #2B8FD4; color: #2B8FD4; }

	.empty { text-align: center; padding: 3rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }

	.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: flex-start; justify-content: center; padding: 1.5rem; overflow-y: auto; }
	.modal { background: rgba(12,12,12,0.98); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; max-width: 700px; width: 100%; position: relative; padding: 2rem; margin: auto; }
	.modal h2 { font-size: 1rem; font-weight: 900; color: #C2374A; margin-bottom: 1.5rem; letter-spacing: 0.05em; text-transform: uppercase; padding-right: 2rem; }
	.modal-close { position: absolute; top: 1rem; right: 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: rgba(240,237,234,0.5); width: 2rem; height: 2rem; border-radius: 50%; cursor: pointer; font-size: 0.75rem; }
	.modal-close:hover { color: #FFF; border-color: #C2374A; }
	.form-actions { margin-top: 1.25rem; display: flex; gap: 0.75rem; justify-content: flex-end; }

	@media (max-width: 600px) {
		.form-grid { grid-template-columns: 1fr; }
		.header-row { flex-direction: column; gap: 1rem; }
	}
</style>
