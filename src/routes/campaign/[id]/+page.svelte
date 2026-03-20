<script lang="ts">
	import type { PageData } from './$types';

	interface Props { data: PageData }
	let { data }: Props = $props();

	const { campaign, sessions, npcs, isDm, profile } = data;

	// --- IA : état partagé ---
	let aiLoading = $state(false);
	let aiError = $state('');

	// Oracle règles
	let rulesQuestion = $state('');
	let rulesAnswer = $state('');

	async function askRules() {
		if (!rulesQuestion.trim()) return;
		aiLoading = true; aiError = '';
		try {
			const res = await fetch('/api/claude/rules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: rulesQuestion })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			rulesAnswer = (await res.json()).answer;
		} catch (e: unknown) {
			aiError = e instanceof Error ? e.message : 'Erreur inconnue';
		} finally {
			aiLoading = false;
		}
	}

	// Improvisation
	let improvSituation = $state('');
	let improvOptions: { title: string; description: string; consequence: string }[] = $state([]);

	async function askImprov() {
		if (!improvSituation.trim()) return;
		aiLoading = true; aiError = '';
		try {
			const res = await fetch('/api/claude/improv', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ situation: improvSituation })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			improvOptions = (await res.json()).options ?? [];
		} catch (e: unknown) {
			aiError = e instanceof Error ? e.message : 'Erreur inconnue';
		} finally {
			aiLoading = false;
		}
	}

	// Générateur PNJ
	let npcRace = $state('');
	let npcRole = $state('');
	let npcLocation = $state('');
	let generatedNpc: Record<string, string> | null = $state(null);

	async function generateNpc() {
		aiLoading = true; aiError = '';
		try {
			const res = await fetch('/api/claude/npc', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ race: npcRace, role: npcRole, location: npcLocation })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			generatedNpc = (await res.json()).generated;
		} catch (e: unknown) {
			aiError = e instanceof Error ? e.message : 'Erreur inconnue';
		} finally {
			aiLoading = false;
		}
	}

	let activeTab = $state<'sessions' | 'npcs' | 'rules' | 'improv' | 'npc-gen'>('sessions');

	function statusEmoji(status: string) {
		const map: Record<string, string> = { alive: '🟢', dead: '💀', sick: '🤒', petrified: '🪨', unknown: '❓' };
		return map[status] ?? '❓';
	}
</script>

<svelte:head>
	<title>{campaign.name} — Tableau de bord IA</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<p class="page-label">Tableau de bord — {profile?.display_name ?? ''}</p>
		<h1>{campaign.name}</h1>
	</div>

	<!-- Tabs -->
	<nav class="tabs">
		<button class="tab" class:active={activeTab === 'sessions'} onclick={() => activeTab = 'sessions'}>
			📖 Sessions
		</button>
		<button class="tab" class:active={activeTab === 'npcs'} onclick={() => activeTab = 'npcs'}>
			🎭 PNJ ({npcs.length})
		</button>
		{#if isDm}
			<button class="tab tab-ai" class:active={activeTab === 'rules'} onclick={() => activeTab = 'rules'}>
				📜 Oracle
			</button>
			<button class="tab tab-ai" class:active={activeTab === 'improv'} onclick={() => activeTab = 'improv'}>
				⚡ Improvisation
			</button>
			<button class="tab tab-ai" class:active={activeTab === 'npc-gen'} onclick={() => activeTab = 'npc-gen'}>
				✨ Générer PNJ
			</button>
		{/if}
	</nav>

	{#if aiError}
		<div class="error-banner">⚠️ {aiError}</div>
	{/if}

	<div class="content">

		<!-- Sessions -->
		{#if activeTab === 'sessions'}
			<div class="section-top">
				<h2>Dernières sessions</h2>
				{#if isDm}<a href="/admin/sessions" class="btn-primary">+ Session</a>{/if}
			</div>
			{#if sessions.length === 0}
				<p class="empty">Aucune session enregistrée.</p>
			{:else}
				<div class="grid-3">
					{#each sessions as s}
						<a href="/sessions/{s.id}" class="card session-card">
							<div class="card-meta">
								<span class="session-num">Session {s.number}</span>
								{#if s.visibility === 'dm_only'}
									<span class="visibility-badge vis-dm">DM</span>
								{/if}
							</div>
							<h3>{s.title || 'Sans titre'}</h3>
							{#if s.date_played}
								<p class="date">📅 {new Date(s.date_played).toLocaleDateString('fr-FR')}</p>
							{/if}
							{#if s.summary}
								<p class="summary">{s.summary.slice(0, 120)}{s.summary.length > 120 ? '…' : ''}</p>
							{/if}
						</a>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- PNJ -->
		{#if activeTab === 'npcs'}
			<div class="section-top">
				<h2>PNJ actifs</h2>
				{#if isDm}<a href="/admin/pnj" class="btn-primary">+ PNJ</a>{/if}
			</div>
			{#if npcs.length === 0}
				<p class="empty">Aucun PNJ enregistré.</p>
			{:else}
				<div class="grid-3">
					{#each npcs as npc}
						<a href="/pnj/{npc.id}" class="card npc-card">
							<div class="card-meta">
								<span>{statusEmoji(npc.status)}</span>
								{#if npc.generated_by_ai}
									<span class="visibility-badge" style="background:#1a0a2e;color:#a78bfa;border:1px solid #7c3aed44">✨ IA</span>
								{/if}
								{#if npc.visibility === 'dm_only'}
									<span class="visibility-badge vis-dm">DM</span>
								{/if}
							</div>
							<h3>{npc.name}</h3>
							{#if npc.role}<p class="npc-role">{npc.role}</p>{/if}
							{#if npc.affiliation}<p class="npc-affil">⚜️ {npc.affiliation}</p>{/if}
						</a>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- Oracle règles -->
		{#if activeTab === 'rules' && isDm}
			<div class="ai-panel">
				<div class="ai-panel-header">
					<h2>📜 Oracle de règles D&D 5e</h2>
					<p>Pose n'importe quelle question sur les règles, obtiens une réponse précise et citée.</p>
				</div>
				<div class="ai-input-row">
					<input
						type="text"
						bind:value={rulesQuestion}
						placeholder="Ex : Comment fonctionne l'avantage sur une attaque ?"
						class="ai-input"
						onkeydown={(e) => e.key === 'Enter' && askRules()}
					/>
					<button onclick={askRules} disabled={aiLoading} class="btn-primary">
						{aiLoading ? '…' : 'Demander'}
					</button>
				</div>
				{#if rulesAnswer}
					<div class="ai-result">
						<p>{rulesAnswer}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Improvisation -->
		{#if activeTab === 'improv' && isDm}
			<div class="ai-panel">
				<div class="ai-panel-header">
					<h2>⚡ Aide à l'improvisation</h2>
					<p>Décris la situation actuelle, obtiens 3 directions narratives avec contexte campagne.</p>
				</div>
				<textarea
					bind:value={improvSituation}
					placeholder="Ex : Les joueurs viennent de refuser de suivre le marchand et s'apprêtent à fouiller l'entrepôt..."
					class="ai-textarea"
					rows="4"
				></textarea>
				<button onclick={askImprov} disabled={aiLoading} class="btn-primary">
					{aiLoading ? 'Génération en cours…' : '⚡ Générer 3 options'}
				</button>
				{#if improvOptions.length > 0}
					<div class="improv-options">
						{#each improvOptions as opt, i}
							<div class="improv-card card">
								<div class="improv-num">{i + 1}</div>
								<div>
									<h4>{opt.title}</h4>
									<p>{opt.description}</p>
									<p class="consequence">→ {opt.consequence}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Générateur PNJ -->
		{#if activeTab === 'npc-gen' && isDm}
			<div class="ai-panel">
				<div class="ai-panel-header">
					<h2>✨ Générateur de PNJ</h2>
					<p>Laisse des champs vides pour laisser Claude improviser avec le contexte de la campagne.</p>
				</div>
				<div class="npc-form">
					<label>
						Race
						<input type="text" bind:value={npcRace} placeholder="Elfe, Humain, Nain…" class="ai-input" />
					</label>
					<label>
						Rôle
						<input type="text" bind:value={npcRole} placeholder="Aubergiste, Garde, Assassin…" class="ai-input" />
					</label>
					<label>
						Lieu
						<input type="text" bind:value={npcLocation} placeholder="Port-Hiver, Forêt…" class="ai-input" />
					</label>
				</div>
				<button onclick={generateNpc} disabled={aiLoading} class="btn-primary">
					{aiLoading ? 'Génération en cours…' : '✨ Générer le PNJ'}
				</button>
				{#if generatedNpc}
					<div class="npc-result card">
						<div class="npc-result-header">
							<h3>{generatedNpc.name}</h3>
							<span class="npc-meta">{generatedNpc.race} — {generatedNpc.role}</span>
						</div>
						<div class="npc-fields">
							<div class="npc-field">
								<span class="field-label">Personnalité</span>
								<p>{generatedNpc.personality}</p>
							</div>
							<div class="npc-field">
								<span class="field-label">Voix</span>
								<p>{generatedNpc.voice}</p>
							</div>
							<div class="npc-field secret-field">
								<span class="field-label">🔒 Secret</span>
								<p>{generatedNpc.secret}</p>
							</div>
							<div class="npc-field">
								<span class="field-label">Motivation</span>
								<p>{generatedNpc.motivation}</p>
							</div>
						</div>
						<p class="saved-note">✅ Sauvegardé dans la liste des PNJ</p>
					</div>
				{/if}
			</div>
		{/if}

	</div>
</div>

<style>
	.page-label {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #C2374A;
		margin-bottom: 0.5rem;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0.125rem;
		border-bottom: 1px solid #1A1A1A;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.tab {
		padding: 0.5rem 0.9rem;
		border: none;
		background: none;
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.45);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab:hover { color: rgba(240,237,234,0.8); }
	.tab.active { color: #FFFFFF; border-bottom-color: #C2374A; }
	.tab-ai { color: rgba(194,55,74,0.6); }
	.tab-ai.active { color: #E05060; border-bottom-color: #C2374A; }

	/* Error */
	.error-banner {
		background: #3A0A12;
		color: #E05060;
		border: 1px solid #C2374A44;
		padding: 0.75rem 1rem;
		border-radius: 3px;
		margin-bottom: 1.5rem;
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
	}

	/* Content */
	.content { padding-bottom: 4rem; }

	.section-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.section-top h2 { font-size: 1.1rem; }

	.empty {
		color: rgba(240,237,234,0.3);
		font-style: italic;
	}

	/* Cards */
	.session-card, .npc-card {
		display: block;
		text-decoration: none;
		color: inherit;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.session-num {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.4);
	}

	.card h3 {
		font-size: 0.95rem;
		margin-bottom: 0.3rem;
		color: #FFFFFF;
	}

	.date {
		font-size: 0.8rem;
		color: rgba(240,237,234,0.35);
		margin-bottom: 0.4rem;
	}

	.summary {
		font-size: 0.9rem;
		color: rgba(240,237,234,0.55);
		line-height: 1.5;
	}

	.npc-role {
		font-size: 0.85rem;
		color: rgba(240,237,234,0.5);
		margin-top: 0.2rem;
	}

	.npc-affil {
		font-size: 0.8rem;
		color: rgba(240,237,234,0.35);
		margin-top: 0.1rem;
	}

	/* AI panels */
	.ai-panel {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 760px;
	}

	.ai-panel-header h2 { font-size: 1.1rem; margin-bottom: 0.4rem; }

	.ai-panel-header p {
		font-size: 0.95rem;
		color: rgba(240,237,234,0.5);
	}

	.ai-input-row { display: flex; gap: 0.75rem; }

	.ai-input {
		flex: 1;
		padding: 0.6rem 0.875rem;
		background: #111111;
		border: 1px solid #2A2A2A;
		border-radius: 3px;
		color: #F0EDEA;
		font-family: 'Crimson Text', Georgia, serif;
		font-size: 1rem;
		transition: border-color 0.15s;
	}

	.ai-input:focus {
		outline: none;
		border-color: #C2374A;
	}

	.ai-input::placeholder { color: rgba(240,237,234,0.25); }

	.ai-textarea {
		width: 100%;
		padding: 0.6rem 0.875rem;
		background: #111111;
		border: 1px solid #2A2A2A;
		border-radius: 3px;
		color: #F0EDEA;
		font-family: 'Crimson Text', Georgia, serif;
		font-size: 1rem;
		resize: vertical;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	.ai-textarea:focus { outline: none; border-color: #C2374A; }
	.ai-textarea::placeholder { color: rgba(240,237,234,0.25); }

	.ai-result {
		background: #111111;
		border: 1px solid #2A2A2A;
		border-left: 3px solid #C2374A;
		border-radius: 3px;
		padding: 1.25rem;
		font-size: 1rem;
		line-height: 1.7;
		color: rgba(240,237,234,0.85);
	}

	/* Improv */
	.improv-options { display: flex; flex-direction: column; gap: 0.75rem; }

	.improv-card {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
	}

	.improv-num {
		font-family: 'Cinzel Decorative', serif;
		font-size: 1.5rem;
		font-weight: 900;
		color: #C2374A;
		flex-shrink: 0;
		line-height: 1;
		margin-top: 0.1rem;
	}

	.improv-card h4 {
		font-size: 0.9rem;
		margin-bottom: 0.35rem;
		color: #FFFFFF;
	}

	.improv-card p {
		font-size: 0.95rem;
		color: rgba(240,237,234,0.7);
		margin: 0.2rem 0;
	}

	.consequence { color: rgba(240,237,234,0.4) !important; font-style: italic; }

	/* NPC gen */
	.npc-form {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.npc-form label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.5);
	}

	.npc-result { display: flex; flex-direction: column; gap: 1rem; }

	.npc-result-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #2A2A2A;
	}

	.npc-result-header h3 { font-size: 1.25rem; color: #FFFFFF; }

	.npc-meta {
		font-size: 0.85rem;
		color: rgba(240,237,234,0.4);
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.npc-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.npc-field { display: flex; flex-direction: column; gap: 0.3rem; }

	.field-label {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.35);
	}

	.npc-field p {
		font-size: 0.95rem;
		color: rgba(240,237,234,0.75);
		line-height: 1.5;
		margin: 0;
	}

	.secret-field {
		background: #1A0A0D;
		border: 1px solid #C2374A22;
		border-radius: 3px;
		padding: 0.75rem;
	}

	.secret-field .field-label { color: #C2374A; }

	.saved-note {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		color: #5CB85C;
	}

	@media (max-width: 640px) {
		.npc-form { grid-template-columns: 1fr; }
		.npc-fields { grid-template-columns: 1fr; }
		.ai-input-row { flex-direction: column; }
	}
</style>
