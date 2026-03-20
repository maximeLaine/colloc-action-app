<script lang="ts">
	import type { PageData } from './$types';
	import type { Combatant } from '$lib/types/database';

	let { data }: { data: PageData } = $props();
	const { sessions, npcs, campaign } = data;

	type Section = 'npc-gen' | 'improv' | 'rules';
	let activeSection = $state<Section>('npc-gen');

	// Combat
	let combatants = $state<Combatant[]>(
		(data.activeCombat?.combatants ?? []).slice().sort((a: Combatant, b: Combatant) => b.initiative - a.initiative)
	);
	let round = $state(data.activeCombat?.round ?? 1);
	let turnIndex = $state(data.activeCombat?.turn_index ?? 0);
	function nextTurn() {
		turnIndex = (turnIndex + 1) % (combatants.length || 1);
		if (turnIndex === 0) round++;
	}
	function hpPct(c: Combatant) { return c.hp_max > 0 ? Math.round((c.hp_current / c.hp_max) * 100) : 0; }
	function hpColor(pct: number) { return pct > 60 ? '#5CB85C' : pct > 25 ? '#F0A500' : '#C2374A'; }

	// AI state
	let aiLoading = $state(false);
	let aiError = $state('');

	// Oracle
	let rulesQ = $state('');
	let rulesA = $state('');
	async function askRules() {
		if (!rulesQ.trim()) return;
		aiLoading = true; aiError = '';
		try {
			const res = await fetch('/api/claude/rules', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: rulesQ })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			rulesA = (await res.json()).answer;
		} catch (e: unknown) { aiError = e instanceof Error ? e.message : 'Erreur'; }
		finally { aiLoading = false; }
	}

	// Improvisation
	let improvSit = $state('');
	let improvOpts: { title: string; description: string; consequence: string }[] = $state([]);
	async function askImprov() {
		if (!improvSit.trim()) return;
		aiLoading = true; aiError = ''; improvOpts = [];
		try {
			const res = await fetch('/api/claude/improv', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ situation: improvSit })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			improvOpts = (await res.json()).options ?? [];
		} catch (e: unknown) { aiError = e instanceof Error ? e.message : 'Erreur'; }
		finally { aiLoading = false; }
	}

	// Génération PNJ
	let npcConcept = $state('');
	let npcRole = $state('');
	let npcAffil = $state('');
	let generatedNpc: Record<string, string> | null = $state(null);
	async function generateNpc() {
		if (!npcConcept.trim()) return;
		aiLoading = true; aiError = ''; generatedNpc = null;
		try {
			const res = await fetch('/api/claude/npc', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ concept: npcConcept, role: npcRole, affiliation: npcAffil })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			generatedNpc = (await res.json()).npc;
		} catch (e: unknown) { aiError = e instanceof Error ? e.message : 'Erreur'; }
		finally { aiLoading = false; }
	}

	function formatDate(d: string | null) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	const statusColor = (s: string) =>
		s === 'mort' ? '#C2374A' : s === 'vivant' ? '#5CB85C' : '#F0A500';
</script>

<svelte:head><title>Console MJ — {campaign?.name ?? 'La Kolok-Action'}</title></svelte:head>

<div class="console">

	<!-- SIDEBAR -->
	<nav class="sidebar">
		<div class="sidebar-brand">
			<div class="brand-label">Maître du Jeu</div>
			<div class="brand-name">{campaign?.name ?? 'La Kolok-Action'}</div>
			{#if data.activeCombat}
				<div class="status-badge live"><span class="dot"></span> Combat actif</div>
			{:else}
				<div class="status-badge idle"><span class="dot"></span> Hors combat</div>
			{/if}
		</div>

		<div class="sidebar-nav">
			<div class="nav-group-label">Navigation</div>
			<a href="/admin" class="nav-link">◀ Console admin</a>
			<a href="/admin/sessions" class="nav-link">📜 Sessions <span class="nav-count">{sessions.length}</span></a>
			<a href="/admin/pnj" class="nav-link">🎭 PNJ <span class="nav-count">{npcs.length}</span></a>
			<a href="/combat" class="nav-link">⚔️ Combat</a>

			<div class="nav-group-label" style="margin-top:1.5rem">Modules IA</div>
			<button class="nav-link" class:nav-link-active={activeSection === 'npc-gen'} onclick={() => activeSection = 'npc-gen'}>
				✨ Générer PNJ
			</button>
			<button class="nav-link" class:nav-link-active={activeSection === 'improv'} onclick={() => activeSection = 'improv'}>
				⚡ Improvisation
			</button>
			<button class="nav-link" class:nav-link-active={activeSection === 'rules'} onclick={() => activeSection = 'rules'}>
				📖 Oracle règles
			</button>
		</div>
	</nav>

	<!-- MAIN -->
	<div class="main">
		<div class="topbar">
			<h1 class="topbar-title">Console MJ</h1>
			<div class="topbar-actions">
				<a href="/admin/sessions" class="btn-sm btn-ghost">📜 Sessions</a>
				<a href="/admin/pnj" class="btn-sm btn-ghost">🎭 PNJ</a>
				<a href="/combat" class="btn-sm btn-primary">⚔️ Combat</a>
			</div>
		</div>

		<div class="content">

			<!-- Sessions -->
			<section class="card">
				<div class="section-head">
					<span class="section-title">📜 Sessions <span class="section-count">{sessions.length}</span></span>
					<a href="/admin/sessions" class="link-action">Gérer →</a>
				</div>
				{#if sessions.length === 0}
					<p class="empty-note">Aucune session enregistrée.</p>
				{:else}
					<div class="session-cards">
						{#each sessions as s}
							<div class="s-card">
								<div class="s-card-header">
									<span class="s-num">{s.number}</span>
									<div class="s-meta">
										<span class="s-title">{s.title}</span>
										<div class="s-tags">
											{#if s.date_played}<span class="s-date">{formatDate(s.date_played)}</span>{/if}
											{#if s.xp_awarded}<span class="xp-badge">+{s.xp_awarded} XP</span>{/if}
										</div>
									</div>
									<a href="/admin/sessions" class="s-edit-btn" title="Modifier">✏</a>
								</div>
								{#if s.summary}
									<div class="s-section">
										<div class="s-section-label">Résumé</div>
										<p class="s-text">{s.summary}</p>
									</div>
								{/if}
								{#if s.dm_notes}
									<div class="s-section s-dm">
										<div class="s-section-label">🔒 Notes MJ</div>
										<p class="s-text s-text-dm">{s.dm_notes}</p>
									</div>
								{/if}
								{#if !s.summary && !s.dm_notes}
									<p class="s-empty">Aucun contenu rédigé.</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- PNJ -->
			<section class="card">
				<div class="section-head">
					<span class="section-title">🎭 PNJ</span>
					<a href="/admin/pnj" class="link-action">Gérer →</a>
				</div>
				{#if npcs.length === 0}
					<p class="empty-note">Aucun PNJ enregistré.</p>
				{:else}
					<div class="npc-grid">
						{#each npcs as npc}
							<a href="/admin/pnj" class="npc-chip">
								<span class="npc-dot" style="background:{statusColor(npc.status)}"></span>
								<div class="npc-chip-info">
									<div class="npc-chip-name">{npc.name}</div>
									<div class="npc-chip-role">{npc.role}{npc.affiliation ? ' · ' + npc.affiliation : ''}</div>
								</div>
								{#if npc.generated_by_ai}
									<span class="ai-badge">IA</span>
								{/if}
							</a>
						{/each}
						<button class="npc-chip npc-chip-gen" onclick={() => activeSection = 'npc-gen'}>
							<span class="npc-chip-name">✨ Générer</span>
						</button>
					</div>
				{/if}
			</section>

			<!-- Combat actif -->
			{#if combatants.length > 0}
				<section class="card">
					<div class="section-head">
						<span class="section-title">⚔️ Initiative — Round {round}</span>
						<button class="btn-sm btn-ghost" onclick={nextTurn}>Suivant →</button>
					</div>
					<div class="init-list">
						{#each combatants as c, i}
							<div class="init-row" class:init-active={i === turnIndex}>
								<span class="init-arrow">{i === turnIndex ? '›' : ' '}</span>
								<span class="init-val">{c.initiative}</span>
								<span class="init-name">{c.name}</span>
								<span class="init-type" class:type-pc={c.type === 'player'} class:type-enemy={c.type === 'monster'}>
									{c.type === 'player' ? 'PJ' : c.type === 'monster' ? 'ENI' : 'ALY'}
								</span>
								<div class="init-hp-wrap">
									<div class="init-hp-bar">
										<div class="init-hp-fill" style="width:{hpPct(c)}%;background:{hpColor(hpPct(c))}"></div>
									</div>
									<span class="init-hp-text">{c.hp_current}/{c.hp_max}</span>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

		</div>
	</div>

	<!-- PANEL IA -->
	<aside class="ia-panel">
		<div class="ia-header">
			<span class="ia-title">✦ Outils IA</span>
			<span class="ia-model">haiku · sonnet</span>
		</div>

		<div class="ia-tabs">
			<button class="ia-tab" class:active={activeSection === 'npc-gen'} onclick={() => activeSection = 'npc-gen'}>PNJ</button>
			<button class="ia-tab" class:active={activeSection === 'improv'} onclick={() => activeSection = 'improv'}>Impro</button>
			<button class="ia-tab" class:active={activeSection === 'rules'} onclick={() => activeSection = 'rules'}>Règles</button>
		</div>

		{#if aiError}
			<div class="ia-error">{aiError}</div>
		{/if}

		<!-- PNJ -->
		{#if activeSection === 'npc-gen'}
			<div class="ia-body">
				<label class="ia-label">Concept *</label>
				<input class="ia-input" bind:value={npcConcept} placeholder="Ex: Forgeron nain grognon…" />
				<label class="ia-label">Rôle</label>
				<input class="ia-input" bind:value={npcRole} placeholder="Ex: Allié, Marchand…" />
				<label class="ia-label">Affiliation</label>
				<input class="ia-input" bind:value={npcAffil} placeholder="Ex: Guilde des Forgerons…" />
				<button class="ia-btn" onclick={generateNpc} disabled={aiLoading || !npcConcept.trim()}>
					{aiLoading ? '⏳ Génération…' : '✨ Générer avec contexte'}
				</button>
				{#if generatedNpc}
					<div class="ia-result">
						<div class="ia-result-name">{generatedNpc.name}</div>
						<div class="ia-result-sub">{generatedNpc.role}{generatedNpc.affiliation ? ' · ' + generatedNpc.affiliation : ''}</div>
						{#if generatedNpc.description}<p class="ia-result-desc">{generatedNpc.description}</p>{/if}
						{#if generatedNpc.personality}<div class="ia-trait"><span class="ia-trait-key">Personnalité</span>{generatedNpc.personality}</div>{/if}
						{#if generatedNpc.motivation}<div class="ia-trait"><span class="ia-trait-key">Motivation</span>{generatedNpc.motivation}</div>{/if}
						{#if generatedNpc.secret}<div class="ia-trait secret"><span class="ia-trait-key">🔒 Secret</span>{generatedNpc.secret}</div>{/if}
						<div class="ia-result-actions">
							<a href="/admin/pnj" class="ia-btn-sm">↗ Créer ce PNJ</a>
							<button class="ia-btn-ghost" onclick={generateNpc} disabled={aiLoading}>↺</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Improv -->
		{#if activeSection === 'improv'}
			<div class="ia-body">
				<label class="ia-label">Situation actuelle</label>
				<textarea class="ia-textarea" bind:value={improvSit} rows="4" placeholder="Décris ce qui se passe…"></textarea>
				<button class="ia-btn" onclick={askImprov} disabled={aiLoading || !improvSit.trim()}>
					{aiLoading ? '⏳ Réflexion…' : '⚡ Générer 3 options'}
				</button>
				{#if improvOpts.length > 0}
					<div class="improv-list">
						{#each improvOpts as opt, i}
							<div class="improv-item">
								<span class="improv-num">{i + 1}</span>
								<div>
									<div class="improv-title">{opt.title}</div>
									<div class="improv-desc">{opt.description}</div>
									<div class="improv-consequence">→ {opt.consequence}</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Règles -->
		{#if activeSection === 'rules'}
			<div class="ia-body">
				<label class="ia-label">Question D&D 5e</label>
				<input class="ia-input" bind:value={rulesQ}
					placeholder="Ex: Comment fonctionne la surprise ?"
					onkeydown={(e) => e.key === 'Enter' && askRules()} />
				<button class="ia-btn" onclick={askRules} disabled={aiLoading || !rulesQ.trim()}>
					{aiLoading ? '⏳ Consultation…' : '📖 Demander à l\'oracle'}
				</button>
				{#if rulesA}
					<div class="ia-result">
						<p class="ia-result-desc">{rulesA}</p>
					</div>
				{/if}
			</div>
		{/if}

	</aside>

</div>

<style>
	/* Full-screen console layout */
	.console {
		display: flex;
		height: 100vh;
		background: #0A0A0A;
		color: #F0EDEA;
		font-family: 'Crimson Text', Georgia, serif;
		overflow: hidden;
	}

	/* ─── SIDEBAR ─── */
	.sidebar {
		width: 200px;
		flex-shrink: 0;
		background: #111111;
		border-right: 1px solid #1E1E1E;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.sidebar-brand {
		padding: 1.25rem 1rem 1rem;
		border-bottom: 1px solid #1E1E1E;
	}

	.brand-label {
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #C2374A;
		margin-bottom: 0.3rem;
	}

	.brand-name {
		font-family: 'Cinzel', serif;
		font-size: 0.82rem;
		font-weight: 700;
		color: #FFF;
		letter-spacing: 0.04em;
		line-height: 1.2;
		margin-bottom: 0.6rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
	}

	.status-badge.live { background: rgba(194,55,74,0.12); color: #C2374A; border: 1px solid rgba(194,55,74,0.3); }
	.status-badge.idle { background: rgba(255,255,255,0.04); color: rgba(240,237,234,0.35); border: 1px solid rgba(255,255,255,0.07); }

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
		display: inline-block;
	}

	.sidebar-nav { padding: 0.75rem 0 1rem; flex: 1; }

	.nav-group-label {
		font-family: 'Cinzel', serif;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.25);
		padding: 0.5rem 1rem 0.3rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.45rem 1rem;
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: rgba(240,237,234,0.55);
		text-decoration: none;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: color 0.15s, background 0.15s;
	}

	.nav-link:hover { color: #FFF; background: rgba(255,255,255,0.04); }
	.nav-link-active { color: #C2374A !important; background: rgba(194,55,74,0.08) !important; }

	.nav-count {
		margin-left: auto;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		color: rgba(240,237,234,0.3);
		background: rgba(255,255,255,0.05);
		padding: 0.05rem 0.35rem;
		border-radius: 3px;
	}

	/* ─── MAIN ─── */
	.main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.5rem;
		border-bottom: 1px solid #1E1E1E;
		flex-shrink: 0;
	}

	.topbar-title {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.6);
		margin: 0;
	}

	.topbar-actions { display: flex; gap: 0.5rem; }

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Cards */
	.card {
		background: #111111;
		border: 1px solid #1E1E1E;
		border-radius: 4px;
		padding: 1rem 1.25rem;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.85rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.05);
	}

	.section-title {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.45);
	}

	.link-action {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #C2374A;
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.link-action:hover { opacity: 0.75; }

	/* Sessions cards */
	.section-count {
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		color: rgba(240,237,234,0.3);
		background: rgba(255,255,255,0.05);
		padding: 0.05rem 0.35rem;
		border-radius: 3px;
		margin-left: 0.4rem;
	}

	.session-cards { display: flex; flex-direction: column; gap: 0.75rem; }

	.s-card {
		background: rgba(255,255,255,0.02);
		border: 1px solid #1E1E1E;
		border-radius: 3px;
		overflow: hidden;
	}

	.s-card-header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.6rem 0.85rem;
		border-bottom: 1px solid rgba(255,255,255,0.04);
	}

	.s-num {
		font-family: 'Cinzel Decorative', serif;
		font-size: 1.2rem;
		font-weight: 900;
		color: #C2374A;
		min-width: 2rem;
		flex-shrink: 0;
		line-height: 1;
	}

	.s-meta { flex: 1; min-width: 0; }

	.s-title {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #F0EDEA;
		display: block;
		margin-bottom: 0.2rem;
	}

	.s-tags { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

	.s-date { font-size: 0.7rem; color: rgba(240,237,234,0.35); }

	.xp-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.56rem;
		font-weight: 700;
		color: #5CB85C;
		background: rgba(92,184,92,0.1);
		border: 1px solid rgba(92,184,92,0.25);
		padding: 0.08rem 0.35rem;
		border-radius: 3px;
		white-space: nowrap;
	}

	.s-edit-btn {
		font-size: 0.7rem;
		color: rgba(240,237,234,0.2);
		text-decoration: none;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		transition: color 0.15s, background 0.15s;
		flex-shrink: 0;
	}

	.s-edit-btn:hover { color: #C2374A; background: rgba(194,55,74,0.08); }

	.s-section { padding: 0.6rem 0.85rem; }
	.s-section + .s-section { border-top: 1px solid rgba(255,255,255,0.04); }
	.s-section.s-dm { background: rgba(194,55,74,0.03); }

	.s-section-label {
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.25);
		margin-bottom: 0.4rem;
	}

	.s-text {
		font-size: 0.9rem;
		color: rgba(240,237,234,0.65);
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.s-text-dm { color: rgba(240,237,234,0.45); font-style: italic; }
	.s-empty { font-size: 0.8rem; color: rgba(240,237,234,0.2); font-style: italic; padding: 0.5rem 0.85rem; }

	/* NPC grid */
	.npc-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 0.5rem;
	}

	.npc-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.65rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid #1E1E1E;
		border-radius: 3px;
		text-decoration: none;
		transition: border-color 0.15s;
		min-width: 0;
	}

	.npc-chip:hover { border-color: rgba(194,55,74,0.4); }

	.npc-chip-gen {
		background: transparent;
		border-style: dashed;
		border-color: rgba(194,55,74,0.25);
		cursor: pointer;
		justify-content: center;
	}

	.npc-chip-gen:hover { border-color: #C2374A; }
	.npc-chip-gen .npc-chip-name { color: #C2374A; }

	.npc-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.npc-chip-info { flex: 1; min-width: 0; }

	.npc-chip-name {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #F0EDEA;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.npc-chip-role {
		font-size: 0.68rem;
		color: rgba(240,237,234,0.35);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ai-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.5rem;
		font-weight: 700;
		color: #C2374A;
		border: 1px solid rgba(194,55,74,0.4);
		padding: 0.05rem 0.25rem;
		border-radius: 2px;
		flex-shrink: 0;
	}

	/* Initiative */
	.init-list { display: flex; flex-direction: column; gap: 0.3rem; }

	.init-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.35rem 0.5rem;
		border-radius: 3px;
		transition: background 0.1s;
	}

	.init-active { background: rgba(194,55,74,0.08); border-left: 2px solid #C2374A; padding-left: 0.35rem; }

	.init-arrow { font-size: 1rem; color: #C2374A; width: 0.8rem; flex-shrink: 0; font-weight: 900; }
	.init-val { font-family: 'Cinzel', serif; font-size: 0.75rem; font-weight: 700; color: #C2374A; min-width: 1.4rem; }
	.init-name { flex: 1; font-size: 0.85rem; color: #F0EDEA; }
	.init-type { font-family: 'Cinzel', serif; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.06em; padding: 0.1rem 0.3rem; border-radius: 2px; }
	.type-pc { background: rgba(43,143,212,0.15); color: #4AAAE8; }
	.type-enemy { background: rgba(194,55,74,0.15); color: #E05060; }

	.init-hp-wrap { display: flex; align-items: center; gap: 0.5rem; min-width: 80px; }
	.init-hp-bar { flex: 1; height: 3px; background: #1E1E1E; border-radius: 2px; overflow: hidden; }
	.init-hp-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
	.init-hp-text { font-size: 0.68rem; color: rgba(240,237,234,0.4); white-space: nowrap; }

	/* Buttons */
	.btn-sm {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.3rem 0.75rem;
		border-radius: 3px;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		transition: all 0.15s;
		border: 1px solid transparent;
	}

	.btn-ghost { background: transparent; border-color: #2A2A2A; color: rgba(240,237,234,0.5); }
	.btn-ghost:hover { border-color: #C2374A; color: #C2374A; }
	.btn-primary { background: #C2374A; color: #fff; }
	.btn-primary:hover { background: #E04060; }

	.empty-note { font-size: 0.85rem; color: rgba(240,237,234,0.25); font-style: italic; }

	/* ─── PANEL IA ─── */
	.ia-panel {
		width: 280px;
		flex-shrink: 0;
		background: #111111;
		border-left: 1px solid #1E1E1E;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.ia-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid #1E1E1E;
		flex-shrink: 0;
	}

	.ia-title {
		font-family: 'Cinzel', serif;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #C2374A;
	}

	.ia-model {
		font-family: 'Cinzel', serif;
		font-size: 0.55rem;
		color: rgba(240,237,234,0.25);
		letter-spacing: 0.06em;
	}

	.ia-tabs {
		display: flex;
		border-bottom: 1px solid #1E1E1E;
		flex-shrink: 0;
	}

	.ia-tab {
		flex: 1;
		padding: 0.55rem 0.5rem;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		background: transparent;
		border: none;
		color: rgba(240,237,234,0.35);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: color 0.15s;
	}

	.ia-tab.active { color: #C2374A; border-bottom-color: #C2374A; }
	.ia-tab:hover:not(.active) { color: rgba(240,237,234,0.65); }

	.ia-body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ia-error { background: #1A0508; border: 1px solid rgba(194,55,74,0.3); color: #E05060; padding: 0.5rem 0.75rem; font-size: 0.82rem; margin: 0 1rem; border-radius: 3px; }

	.ia-label {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.4);
	}

	.ia-input, .ia-textarea {
		background: #0A0A0A;
		border: 1px solid #2A2A2A;
		color: #F0EDEA;
		padding: 0.45rem 0.65rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 0.95rem;
		width: 100%;
		transition: border-color 0.15s;
	}

	.ia-input:focus, .ia-textarea:focus { outline: none; border-color: #C2374A; }
	.ia-textarea { resize: vertical; }

	.ia-btn {
		background: #C2374A;
		border: none;
		color: #fff;
		padding: 0.5rem 1rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s;
		width: 100%;
	}

	.ia-btn:hover:not(:disabled) { background: #E04060; }
	.ia-btn:disabled { opacity: 0.45; cursor: not-allowed; }

	/* IA Result */
	.ia-result {
		background: rgba(255,255,255,0.03);
		border: 1px solid #2A2A2A;
		border-radius: 3px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.ia-result-name {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #FFF;
	}

	.ia-result-sub { font-size: 0.78rem; color: rgba(240,237,234,0.45); }
	.ia-result-desc { font-size: 0.88rem; color: rgba(240,237,234,0.7); line-height: 1.5; }

	.ia-trait { font-size: 0.8rem; color: rgba(240,237,234,0.55); line-height: 1.4; }
	.ia-trait.secret { color: rgba(194,55,74,0.75); }
	.ia-trait-key {
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.3);
		margin-right: 0.35rem;
	}

	.ia-result-actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }

	.ia-btn-sm {
		background: #C2374A;
		border: none;
		color: #fff;
		padding: 0.3rem 0.65rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		transition: background 0.15s;
	}

	.ia-btn-sm:hover { background: #E04060; }

	.ia-btn-ghost {
		background: transparent;
		border: 1px solid #2A2A2A;
		color: rgba(240,237,234,0.4);
		padding: 0.3rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.ia-btn-ghost:hover:not(:disabled) { border-color: #C2374A; color: #C2374A; }
	.ia-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }

	/* Improv */
	.improv-list { display: flex; flex-direction: column; gap: 0.6rem; }
	.improv-item { display: flex; gap: 0.65rem; }
	.improv-num {
		font-family: 'Cinzel Decorative', serif;
		font-size: 1rem;
		font-weight: 900;
		color: #C2374A;
		flex-shrink: 0;
		line-height: 1.2;
	}
	.improv-title { font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #FFF; margin-bottom: 0.2rem; }
	.improv-desc { font-size: 0.82rem; color: rgba(240,237,234,0.6); line-height: 1.45; }
	.improv-consequence { font-size: 0.78rem; color: rgba(194,55,74,0.7); margin-top: 0.2rem; font-style: italic; }
</style>
