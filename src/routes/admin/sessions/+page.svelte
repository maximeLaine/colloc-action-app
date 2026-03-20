<script lang="ts">
	import { enhance } from '$app/forms';
	import FileAttachments from '$lib/components/FileAttachments.svelte';
	import type { PageData, ActionData } from './$types';

	interface Attachment { name: string; url: string; type: 'image' | 'pdf'; }
	let { data, form }: { data: PageData; form: ActionData } = $props();

	let editing = $state<typeof data.sessions[0] | null>(null);
	let showModal = $state(false);
	let attachments = $state<Attachment[]>([]);

	// AI summary state
	let aiRawNotes = $state('');
	let aiSummaryLoading = $state(false);
	let aiSummaryError = $state('');
	let generatedSummary = $state('');
	let showAiSection = $state(false);

	// Reference to the summary textarea
	let summaryEl = $state<HTMLTextAreaElement | null>(null);

	function openNew() { editing = null; attachments = []; showModal = true; aiRawNotes = ''; generatedSummary = ''; showAiSection = false; }
	function openEdit(s: typeof data.sessions[0]) {
		editing = s;
		attachments = (s.attachments as Attachment[]) ?? [];
		showModal = true;
		aiRawNotes = '';
		generatedSummary = '';
		showAiSection = false;
	}
	function closeForm() { editing = null; showModal = false; }

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('drawer-backdrop')) closeForm();
	}

	function formatDate(d: string | null) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	function toInputDate(d: string | null) {
		if (!d) return '';
		return new Date(d).toISOString().split('T')[0];
	}

	async function generateSummary() {
		if (!aiRawNotes.trim()) return;
		aiSummaryLoading = true;
		aiSummaryError = '';
		generatedSummary = '';
		try {
			const res = await fetch('/api/claude/summary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					raw_notes: aiRawNotes,
					session_number: editing?.number,
					title: editing?.title ?? ''
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				aiSummaryError = err.message ?? `Erreur ${res.status}`;
			} else {
				const d = await res.json();
				generatedSummary = d.summary ?? '';
			}
		} catch {
			aiSummaryError = 'Erreur réseau';
		} finally {
			aiSummaryLoading = false;
		}
	}

	function useSummary() {
		if (summaryEl) summaryEl.value = generatedSummary;
		generatedSummary = '';
		showAiSection = false;
	}
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Gérer les Sessions</h1>
				<p class="subtitle">Rédiger et partager les résumés</p>
			</div>
			<div class="header-btns">
				<a href="/admin" class="btn-secondary">← Admin</a>
				<button class="btn-primary" onclick={() => openNew()}>+ Nouvelle session</button>
			</div>
		</div>
	</div>

	<div class="sessions-list">
		{#if data.sessions.length === 0}
			<div class="empty">Aucune session. Crée la première !</div>
		{:else}
			{#each data.sessions as s}
				<div class="session-row card">
					<div class="session-num">{s.number}</div>
					<div class="session-info">
						<div class="session-title">{s.title}</div>
						<div class="session-meta">
							{#if s.date_played}<span class="date">{formatDate(s.date_played)}</span>{/if}
							{#if s.xp_awarded}<span class="xp">+{s.xp_awarded} XP</span>{/if}
							<span class="vis vis-{s.visibility === 'dm_only' ? 'dm' : s.visibility}">
								{s.visibility === 'dm_only' ? '🔒 MJ' : s.visibility === 'players' ? '👥 Joueurs' : '🌐 Public'}
							</span>
						</div>
						{#if s.summary}
							<p class="summary-preview">{s.summary.slice(0, 140)}{s.summary.length > 140 ? '…' : ''}</p>
						{/if}
					</div>
					<div class="session-actions">
						<form method="POST" action="?/share" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<input type="hidden" name="visibility" value={s.visibility === 'players' ? 'dm_only' : 'players'} />
							<button type="submit" class="btn-share" class:shared={s.visibility === 'players'}>
								{s.visibility === 'players' ? '👁 Visible' : '🔒 Masqué'}
							</button>
						</form>
						<button class="btn-edit" onclick={() => openEdit(s)}>Modifier</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<button type="submit" class="btn-delete" onclick={(e) => {
								if (!confirm(`Supprimer la session ${s.number} ?`)) e.preventDefault();
							}}>Supprimer</button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Drawer création / édition -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="drawer-backdrop" onclick={closeOnBackdrop}></div>
	<div class="drawer">
			<button class="modal-close" onclick={closeForm}>✕</button>
			<h2 class="modal-title">{editing ? `Session ${editing.number} — Modifier` : 'Nouvelle Session'}</h2>

			{#if form?.error}
				<div class="error-msg">{form.error}</div>
			{/if}

			<form method="POST" action="?/save" use:enhance={() => {
				return ({ result, update }) => {
					if (result.type === 'success') closeForm();
					update();
				};
			}}>
				{#if editing}
					<input type="hidden" name="id" value={editing.id} />
				{/if}

				<div class="form-grid">
					<div class="field">
						<label for="m-number">N° de session</label>
						<input id="m-number" name="number" type="number" min="1" value={editing?.number ?? (data.sessions.length + 1)} />
					</div>
					<div class="field">
						<label for="m-date">Date jouée</label>
						<input id="m-date" name="date_played" type="date" value={toInputDate(editing?.date_played ?? null)} />
					</div>
					<div class="field full">
						<label for="m-campaign">Campagne</label>
						<input id="m-campaign" name="campaign" type="text" value={(editing as any)?.campaign ?? 'Colloc-Action'} placeholder="Ex: Colloc-Action, Arc 2..." />
					</div>
					<div class="field full required">
						<label for="m-title">Titre</label>
						<input id="m-title" name="title" type="text" required value={editing?.title ?? ''} placeholder="Ex: L'Attaque dans la Forêt" />
					</div>
					<div class="field full">
						<div class="summary-field-header">
							<label for="m-summary">Résumé (visible joueurs)</label>
							<button type="button" class="btn-ai-toggle" onclick={() => showAiSection = !showAiSection}>
								{showAiSection ? '✕ IA' : '✨ Générer via IA'}
							</button>
						</div>
						{#if showAiSection}
							<div class="ai-summary-block">
								<textarea
									class="ai-notes-input"
									rows="4"
									placeholder="Collez vos notes brutes de session ici — l'IA rédigera un résumé narratif..."
									bind:value={aiRawNotes}
								></textarea>
								<div class="ai-sum-actions">
									<button type="button" class="btn-generate" onclick={generateSummary} disabled={aiSummaryLoading || !aiRawNotes.trim()}>
										{aiSummaryLoading ? '⏳ Rédaction…' : '✨ Rédiger le résumé'}
									</button>
								</div>
								{#if aiSummaryError}
									<div class="error-msg">{aiSummaryError}</div>
								{/if}
								{#if generatedSummary}
									<div class="ai-summary-preview">
										<p>{generatedSummary}</p>
										<button type="button" class="btn-use-summary" onclick={useSummary}>↳ Utiliser ce résumé</button>
									</div>
								{/if}
							</div>
						{/if}
						<textarea id="m-summary" name="summary" rows="7" placeholder="Ce que les joueurs ont vécu..." bind:this={summaryEl}>{editing?.summary ?? ''}</textarea>
					</div>
					<div class="field full">
						<label for="m-dm-notes">Notes MJ (privées)</label>
						<textarea id="m-dm-notes" name="dm_notes" rows="4" placeholder="Coulisses, révélations à venir...">{editing?.dm_notes ?? ''}</textarea>
					</div>
					<div class="field">
						<label for="m-xp">XP accordés</label>
						<input id="m-xp" name="xp_awarded" type="number" min="0" value={editing?.xp_awarded ?? 0} />
					</div>
					<div class="field">
						<label for="m-vis">Visibilité</label>
						<select id="m-vis" name="visibility">
							<option value="dm_only" selected={editing?.visibility === 'dm_only'}>🔒 MJ uniquement</option>
							<option value="players" selected={!editing || editing.visibility === 'players'}>👥 Joueurs</option>
							<option value="public" selected={editing?.visibility === 'public'}>🌐 Public</option>
						</select>
					</div>
					<div class="field full">
						<label>Images & Documents</label>
						<FileAttachments bind:value={attachments} uploadUrl="/api/upload/session" />
					</div>
				</div>

				<div class="form-actions">
					<button type="submit" class="btn-primary">{editing ? 'Enregistrer' : 'Créer'}</button>
					<button type="button" class="btn-secondary" onclick={closeForm}>Annuler</button>
				</div>
			</form>
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

	.form-actions { margin-top: 1.25rem; display: flex; gap: 0.75rem; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }

	.session-row { display: flex; align-items: flex-start; gap: 1.25rem; padding: 1rem 1.25rem; margin-bottom: 0.5rem; }
	.session-num { font-family: 'Cinzel Decorative', serif; font-size: 1.8rem; font-weight: 900; color: #C2374A; min-width: 2rem; line-height: 1.1; flex-shrink: 0; }
	.session-info { flex: 1; min-width: 0; }
	.session-title { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #FFF; margin-bottom: 0.3rem; }
	.session-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
	.date { font-size: 0.8rem; color: rgba(240,237,234,0.4); font-family: 'Cinzel', serif; }
	.xp { background: #0A2A12; color: #5CB85C; border: 1px solid #5CB85C44; padding: 0.1rem 0.4rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 700; }
	.vis { font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; padding: 0.1rem 0.4rem; border-radius: 3px; }
	.vis-dm { background: #3A0A12; color: #E05060; border: 1px solid #C2374A44; }
	.vis-players { background: #0A1A2A; color: #4AAAE8; border: 1px solid #2B8FD444; }
	.vis-public { background: #0A2A12; color: #5CB85C; border: 1px solid #5CB85C44; }
	.summary-preview { font-size: 0.88rem; color: rgba(240,237,234,0.45); line-height: 1.5; }

	.session-actions { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }
	.btn-share { background: transparent; border: 1px solid #2A3A2A; color: rgba(240,237,234,0.4); padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
	.btn-share.shared { border-color: #2A6A2A; color: #5CB85C; }
	.btn-share:hover { border-color: #5CB85C; color: #5CB85C; }
	.btn-edit { background: rgba(43,143,212,0.15); border: 1px solid #2B8FD444; color: #4AAAE8; padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
	.btn-edit:hover { background: rgba(43,143,212,0.3); }
	.btn-delete { background: transparent; border: 1px solid #3A1A1A; color: rgba(240,237,234,0.35); padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
	.btn-delete:hover { border-color: #C2374A; color: #E05060; }

	.empty { text-align: center; padding: 3rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }

	/* Drawer */
	.drawer-backdrop {
		position: fixed; inset: 0;
		background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
		z-index: 200;
	}
	.drawer {
		position: fixed; top: 0; right: 0; bottom: 0;
		width: 520px; max-width: 100vw;
		background: #0D0D0D;
		border-left: 1px solid rgba(194,55,74,0.25);
		z-index: 201;
		overflow-y: auto;
		padding: 2rem 1.75rem;
		box-shadow: -8px 0 32px rgba(0,0,0,0.7);
		animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes slideIn {
		from { transform: translateX(100%); }
		to   { transform: translateX(0); }
	}
	.modal-close {
		position: absolute; top: 1rem; right: 1rem;
		background: transparent; border: 1px solid rgba(255,255,255,0.15);
		color: rgba(240,237,234,0.5); width: 2rem; height: 2rem;
		border-radius: 50%; cursor: pointer; font-size: 0.75rem;
		transition: color 0.2s, border-color 0.2s;
	}
	.modal-close:hover { color: #FFF; border-color: #C2374A; }
	.modal-title { font-size: 1rem; letter-spacing: 0.08em; color: #C2374A; margin-bottom: 1.5rem; padding-right: 2rem; }

	/* AI summary integration */
	.summary-field-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; }
	.summary-field-header label { margin-bottom: 0; }
	.btn-ai-toggle {
		background: rgba(194,55,74,0.1); border: 1px solid rgba(194,55,74,0.35); color: #C2374A;
		padding: 0.2rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: background 0.2s;
	}
	.btn-ai-toggle:hover { background: rgba(194,55,74,0.2); }

	.ai-summary-block { background: rgba(194,55,74,0.04); border: 1px solid rgba(194,55,74,0.12); border-radius: 4px; padding: 0.85rem; margin-bottom: 0.5rem; }
	.ai-notes-input { background: #0A0A0A; border: 1px solid #2A2A2A; color: #F0EDEA; padding: 0.55rem 0.75rem; border-radius: 3px; font-family: 'Crimson Text', serif; font-size: 1rem; width: 100%; resize: vertical; }
	.ai-notes-input:focus { outline: none; border-color: #C2374A; }
	.ai-sum-actions { margin-top: 0.6rem; }
	.btn-generate {
		background: #C2374A; border: none; color: #fff; padding: 0.45rem 1rem;
		border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700;
		letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: background 0.2s;
	}
	.btn-generate:hover:not(:disabled) { background: #E04060; }
	.btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
	.ai-summary-preview { margin-top: 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 3px; padding: 0.75rem; }
	.ai-summary-preview p { font-size: 0.9rem; color: rgba(240,237,234,0.75); line-height: 1.6; white-space: pre-wrap; }
	.btn-use-summary {
		display: block; margin-top: 0.6rem; background: #C2374A; border: none; color: #fff;
		padding: 0.35rem 0.85rem; border-radius: 3px; font-family: 'Cinzel', serif;
		font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: background 0.2s;
	}
	.btn-use-summary:hover { background: #E04060; }

	@media (max-width: 600px) {
		.form-grid { grid-template-columns: 1fr; }
		.header-row { flex-direction: column; gap: 1rem; }
		.session-row { flex-wrap: wrap; }
	}
</style>
