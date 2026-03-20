<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ─── Combat tracker (client-side, DM seulement) ───────────────────
	interface Combatant {
		id: string;
		name: string;
		type: 'monster' | 'player' | 'ally';
		initiative: number;
		hp_max: number;
		hp_current: number;
		ac: number;
		conditions: string[];
	}

	let combatants = $state<Combatant[]>([]);
	let round = $state(1);
	let turnIndex = $state(0);

	// ─── Fiche monstre ────────────────────────────────────────────────
	type MonsterData = typeof data.monsters[0];
	let sheetMonster = $state<MonsterData | null>(null);

	function openSheet(name: string) {
		const m = data.monsters.find((m: MonsterData) => m.name === name);
		sheetMonster = m ?? null;
	}

	let showAddPanel = $state(false);
	let addType = $state<'monster' | 'custom'>('monster');
	let selectedMonsterId = $state('');
	let monsterHp = $state(10);
	let monsterAc = $state(10);
	let customName = $state('');
	let customHp = $state(10);
	let customAc = $state(10);
	let customType = $state<'monster' | 'ally'>('monster');
	let initiative = $state(0);

	$effect(() => {
		const m = data.monsters.find((m: { id: string }) => m.id === selectedMonsterId);
		if (m) { monsterHp = m.hp ?? 10; monsterAc = m.ac ?? 10; }
	});

	function addMonster() {
		const m = data.monsters.find((m: { id: string }) => m.id === selectedMonsterId);
		if (!m) return;
		combatants = [...combatants, {
			id: crypto.randomUUID(), name: m.name, type: 'monster',
			initiative, hp_max: monsterHp, hp_current: monsterHp, ac: monsterAc, conditions: []
		}];
		sortByInit(); showAddPanel = false;
	}

	function addCustom() {
		combatants = [...combatants, {
			id: crypto.randomUUID(), name: customName || 'Inconnu', type: customType,
			initiative, hp_max: customHp, hp_current: customHp, ac: customAc, conditions: []
		}];
		sortByInit(); showAddPanel = false; customName = ''; customHp = 10; customAc = 10;
	}

	function duplicate(id: string) {
		const c = combatants.find(c => c.id === id);
		if (!c) return;
		combatants = [...combatants, { ...c, id: crypto.randomUUID() }];
		sortByInit();
	}

	function sortByInit() {
		combatants = [...combatants].sort((a, b) => b.initiative - a.initiative);
	}

	function changeHp(id: string, delta: number) {
		combatants = combatants.map(c =>
			c.id === id ? { ...c, hp_current: Math.max(0, Math.min(c.hp_max, c.hp_current + delta)) } : c
		);
	}

	function nextTurn() {
		if (combatants.length === 0) return;
		turnIndex = (turnIndex + 1) % combatants.length;
		if (turnIndex === 0) round++;
	}

	function remove(id: string) {
		combatants = combatants.filter(c => c.id !== id);
		turnIndex = Math.min(turnIndex, Math.max(0, combatants.length - 1));
	}

	function hpPct(c: Combatant) { return Math.round((c.hp_current / c.hp_max) * 100); }
	function hpColor(pct: number) { return pct > 60 ? '#5CB85C' : pct > 25 ? '#F0A500' : '#C2374A'; }

	const selectedMonster = $derived(data.monsters.find((m: { id: string }) => m.id === selectedMonsterId));

	// ─── Kills ─────────────────────────────────────────────────────────
	let showKillForm = $state(false);

	const PJ_ORDER = ['Valtim', 'Upkik', 'Freedah', 'Kova', 'Elian Thorne', 'Zik'];

	const killsByPJ = $derived.by(() => {
		const map: Record<string, { session: number | null; monster: string; notes: string | null }[]> = {};
		for (const pj of PJ_ORDER) map[pj] = [];
		for (const k of data.kills) {
			if (map[k.killed_by]) map[k.killed_by].push({ session: k.session_number, monster: k.monster_name, notes: k.notes });
			else map[k.killed_by] = [{ session: k.session_number, monster: k.monster_name, notes: k.notes }];
		}
		for (const pj of Object.keys(map)) {
			map[pj].sort((a, b) => (a.session ?? 0) - (b.session ?? 0));
		}
		return map;
	});
</script>

<div class="container combat-page">
	<div class="page-header">
		<div class="header-row">
			<h1>Combat</h1>
			{#if data.isDM}
				<div class="header-actions">
					<span class="round-badge">Round {round}</span>
					<button class="btn-primary" onclick={() => (showAddPanel = !showAddPanel)}>+ Ajouter</button>
					{#if combatants.length > 0}
						<button class="btn-secondary" onclick={nextTurn}>Tour suivant ▶</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if data.isDM}
		<!-- Panneau d'ajout combattant -->
		{#if showAddPanel}
			<div class="add-panel card">
				<div class="add-tabs">
					<button class="tab" class:active={addType === 'monster'} onclick={() => (addType = 'monster')}>🐉 Monstre</button>
					<button class="tab" class:active={addType === 'custom'} onclick={() => (addType = 'custom')}>✏️ Personnalisé</button>
				</div>
				<div class="initiative-row">
					<label>Initiative</label>
					<input type="number" bind:value={initiative} style="width:70px" />
				</div>
				{#if addType === 'monster'}
					<select bind:value={selectedMonsterId}>
						<option value="">Choisir un monstre…</option>
						{#each data.monsters as m}
							<option value={m.id}>{m.name} — PV {m.hp} CA {m.ac} (FP {m.cr})</option>
						{/each}
					</select>
					{#if selectedMonster}
						<div class="monster-override">
							<div class="override-field">
								<label>PV</label>
								<input type="number" bind:value={monsterHp} min="1" style="width:70px" />
							</div>
							<div class="override-field">
								<label>CA</label>
								<input type="number" bind:value={monsterAc} min="1" style="width:70px" />
							</div>
							<span class="fp-badge">FP {selectedMonster.cr}</span>
						</div>
						{#if selectedMonster.notes}<p class="notes">{selectedMonster.notes}</p>{/if}
					{/if}
					<button class="btn-primary mt" onclick={addMonster} disabled={!selectedMonsterId}>Ajouter au combat</button>
				{:else}
					<div class="custom-form">
						<input placeholder="Nom" bind:value={customName} />
						<div class="two-col">
							<div><label>PV</label><input type="number" bind:value={customHp} /></div>
							<div><label>CA</label><input type="number" bind:value={customAc} /></div>
						</div>
						<div class="type-toggle">
							<button type="button" class="toggle-opt" class:active={customType === 'monster'} onclick={() => customType = 'monster'}>🐉 Ennemi</button>
							<button type="button" class="toggle-opt" class:active={customType === 'ally'} onclick={() => customType = 'ally'}>🛡️ Allié</button>
						</div>
						<button class="btn-primary" onclick={addCustom}>Ajouter</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Liste combattants -->
		{#if combatants.length > 0}
			<div class="combatants">
				{#each combatants as c, i (c.id)}
					<div class="combatant-row" class:active={i === turnIndex} class:dead={c.hp_current === 0}>
						<div class="init-col">
							<input type="number" value={c.initiative}
								onchange={(e) => { c.initiative = +(e.target as HTMLInputElement).value; sortByInit(); }}
								style="width:52px;text-align:center" />
						</div>
						<button class="c-type-btn" title="Basculer ennemi/allié"
						onclick={() => c.type = c.type === 'monster' ? 'ally' : 'monster'}>
						{c.type === 'monster' ? '🐉' : c.type === 'ally' ? '🛡️' : '⚔️'}
					</button>
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div class="c-name" class:clickable={c.type === 'monster'} onclick={() => c.type === 'monster' && openSheet(c.name)}>{c.name}</div>
						<div class="ac-badge">CA {c.ac}</div>
						<div class="hp-section">
							<div class="hp-bar-wrap">
								<div class="hp-bar" style="width:{hpPct(c)}%;background:{hpColor(hpPct(c))}"></div>
							</div>
							<div class="hp-controls">
								<button class="hp-btn dmg" onclick={() => changeHp(c.id, -5)}>-5</button>
								<button class="hp-btn dmg" onclick={() => changeHp(c.id, -1)}>-1</button>
								<span class="hp-text">{c.hp_current}/{c.hp_max}</span>
								<button class="hp-btn heal" onclick={() => changeHp(c.id, 1)}>+1</button>
								<button class="hp-btn heal" onclick={() => changeHp(c.id, 5)}>+5</button>
							</div>
						</div>
						<button class="dup-btn" title="Dupliquer" onclick={() => duplicate(c.id)}>⧉</button>
					<button class="remove-btn" onclick={() => remove(c.id)}>✕</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-combat">⚔️ Aucun combattant — utilisez <strong>+ Ajouter</strong></div>
		{/if}

		<hr class="section-sep" />

		<!-- Tableau des kills -->
		<div class="kills-section">
			<div class="kills-header">
				<h2>Tableau des kills</h2>
				<button class="btn-primary" onclick={() => (showKillForm = !showKillForm)}>
					{showKillForm ? 'Annuler' : '+ Ajouter un kill'}
				</button>
			</div>

			{#if showKillForm}
				<div class="kill-form card">
					{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
					<form method="POST" action="?/addKill" use:enhance={() => ({ result, update }) => {
						if (result.type === 'success') showKillForm = false;
						update();
					}}>
						<div class="form-grid">
							<div class="field required">
								<label for="monster_name">Monstre tué</label>
								<input id="monster_name" name="monster_name" type="text" required
									list="monster-list" placeholder="Ex: Gobelin" />
								<datalist id="monster-list">
									{#each data.monsters as m}<option value={m.name}></option>{/each}
								</datalist>
							</div>
							<div class="field required">
								<label for="killed_by">Par qui</label>
								<input id="killed_by" name="killed_by" type="text" required placeholder="Ex: Gnoméo" />
							</div>
							<div class="field">
								<label for="session_number">Session n°</label>
								<input id="session_number" name="session_number" type="number" min="1" />
							</div>
							<div class="field">
								<label for="notes">Notes</label>
								<input id="notes" name="notes" type="text" placeholder="Ex: coup fatal à l'épée" />
							</div>
						</div>
						<div class="form-actions">
							<button type="submit" class="btn-primary">Enregistrer</button>
						</div>
					</form>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Fiche monstre (panneau latéral) -->
	{#if sheetMonster}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="sheet-backdrop" onclick={() => sheetMonster = null}></div>
		<div class="monster-sheet">
			<button class="sheet-close" onclick={() => sheetMonster = null}>✕</button>
			{#if sheetMonster.image_url}
				<img src={sheetMonster.image_url} alt={sheetMonster.name} class="sheet-img" />
			{/if}
			<div class="sheet-header">
				<h3 class="sheet-name">{sheetMonster.name}</h3>
				{#if sheetMonster.type}<p class="sheet-type">{sheetMonster.type}</p>{/if}
			</div>
			<div class="sheet-stats">
				{#if sheetMonster.cr}<div class="sheet-stat"><span class="stat-label">FP</span><span class="stat-val">{sheetMonster.cr}</span></div>{/if}
				{#if sheetMonster.hp}<div class="sheet-stat"><span class="stat-label">PV</span><span class="stat-val">{sheetMonster.hp}</span></div>{/if}
				{#if sheetMonster.ac}<div class="sheet-stat"><span class="stat-label">CA</span><span class="stat-val">{sheetMonster.ac}</span></div>{/if}
			</div>
			{#if sheetMonster.description}
				<div class="sheet-section">
					<p class="sheet-text">{sheetMonster.description}</p>
				</div>
			{/if}
			{#if sheetMonster.special_abilities}
				<div class="sheet-section">
					<h4 class="sheet-section-title">Capacités spéciales</h4>
					<p class="sheet-text">{sheetMonster.special_abilities}</p>
				</div>
			{/if}
			{#if sheetMonster.actions}
				<div class="sheet-section">
					<h4 class="sheet-section-title">Actions</h4>
					<p class="sheet-text">{sheetMonster.actions}</p>
				</div>
			{/if}
			{#if sheetMonster.notes}
				<div class="sheet-section">
					<h4 class="sheet-section-title">Notes</h4>
					<p class="sheet-text">{sheetMonster.notes}</p>
				</div>
			{/if}
		</div>
	{/if}

	<div class="kills-table-wrap">
		{#if !data.isDM}<h2 class="kills-title">⚔️ Tableau des kills</h2>{/if}
		{#if data.kills.length === 0}
			<div class="empty-kills">Aucun kill enregistré pour le moment.</div>
		{:else}
			<div class="pj-kills-grid">
				{#each PJ_ORDER as pj}
					{@const pjKills = killsByPJ[pj] ?? []}
					<div class="pj-kills-card card">
						<div class="pj-kills-header">
							<span class="pj-name">{pj}</span>
							<span class="pj-total">{pjKills.length} kill{pjKills.length !== 1 ? 's' : ''}</span>
						</div>
						{#if pjKills.length === 0}
							<p class="pj-no-kills">—</p>
						{:else}
							<ul class="pj-kill-list">
								{#each pjKills as k}
									<li class:friendly-fire={k.notes === 'kill allié'}>
										<span class="kill-session">{k.session ? `E${k.session}` : '?'}</span>
										<span class="kill-monster">{k.monster}</span>
										{#if k.notes === 'kill allié'}<span class="ff-badge">🤝</span>{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</div>

			{#if data.isDM}
				<details class="kills-detail">
					<summary>Liste complète</summary>
					<table class="kills-table">
						<thead>
							<tr><th>Session</th><th>Monstre</th><th>Tué par</th><th>Notes</th><th></th></tr>
						</thead>
						<tbody>
							{#each data.kills as kill}
								<tr>
									<td class="session-num">{kill.session_number ? `#${kill.session_number}` : '—'}</td>
									<td class="monster-name">{kill.monster_name}</td>
									<td class="killer-name">{kill.killed_by}</td>
									<td class="kill-notes">{kill.notes ?? ''}</td>
									<td>
										<form method="POST" action="?/deleteKill" use:enhance>
											<input type="hidden" name="id" value={kill.id} />
											<button class="btn-delete-small" type="submit"
												onclick={(e) => { if (!confirm('Supprimer ce kill ?')) e.preventDefault(); }}>✕</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</details>
			{/if}
		{/if}
	</div>
</div>

<style>
	.combat-page { padding-bottom: 3rem; }
	.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
	.header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
	.round-badge { background: #C2374A; color: #fff; font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.4rem 1rem; border-radius: 3px; }

	.add-panel { margin-bottom: 1.5rem; }
	.add-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
	.tab { background: transparent; border: 1px solid #333; color: rgba(240,237,234,0.5); padding: 0.4rem 0.85rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; transition: all 0.15s; cursor: pointer; }
	.tab.active { background: #C2374A; border-color: #C2374A; color: #fff; }
	.initiative-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
	.initiative-row label { font-family: 'Cinzel', serif; font-size: 0.7rem; text-transform: uppercase; color: rgba(240,237,234,0.5); }

	select, input[type="number"], input[type="text"] { background: #0A0A0A; border: 1px solid #333; color: #F0EDEA; padding: 0.5rem 0.75rem; border-radius: 3px; font-family: 'Crimson Text', serif; font-size: 1rem; width: 100%; }
	select:focus, input:focus { outline: none; border-color: #C2374A; }

	.monster-preview { background: #0A0A0A; border: 1px solid #2A2A2A; border-radius: 3px; padding: 0.75rem; margin: 0.75rem 0; display: flex; gap: 1.5rem; font-size: 0.9rem; flex-wrap: wrap; }
	.monster-preview strong { color: #FFF; }
	.notes { font-size: 0.85rem; color: rgba(240,237,234,0.5); margin-top: 0.5rem; grid-column: 1/-1; }
	.mt { margin-top: 0.75rem; }
	.custom-form { display: flex; flex-direction: column; gap: 0.75rem; }
	.type-toggle { display: flex; gap: 0.5rem; }
	.toggle-opt { flex: 1; background: transparent; border: 1px solid #333; color: rgba(240,237,234,0.45); padding: 0.4rem 0.5rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; cursor: pointer; transition: all 0.15s; }
	.toggle-opt.active { background: rgba(194,55,74,0.15); border-color: #C2374A; color: #E05060; }
	.toggle-opt:last-child.active { background: rgba(43,143,212,0.15); border-color: #2B8FD4; color: #2B8FD4; }
	.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
	.two-col label { font-family: 'Cinzel', serif; font-size: 0.65rem; text-transform: uppercase; color: rgba(240,237,234,0.4); display: block; margin-bottom: 0.25rem; }

	.combatants { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
	.combatant-row { display: flex; align-items: center; gap: 0.75rem; background: #111; border: 1px solid #222; border-radius: 4px; padding: 0.6rem 0.85rem; transition: border-color 0.2s; }
	.combatant-row.active { border-color: #C2374A; box-shadow: 0 0 0 1px #C2374A33; }
	.combatant-row.dead { opacity: 0.4; }
	.c-type-btn { background: none; border: none; font-size: 1.1rem; flex-shrink: 0; cursor: pointer; padding: 0 0.1rem; line-height: 1; transition: transform 0.15s; }
	.c-type-btn:hover { transform: scale(1.25); }
	.c-name { flex: 1; font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.ac-badge { font-family: 'Cinzel', serif; font-size: 0.7rem; font-weight: 700; color: rgba(240,237,234,0.5); white-space: nowrap; flex-shrink: 0; }
	.hp-section { display: flex; flex-direction: column; gap: 0.3rem; min-width: 160px; }
	.hp-bar-wrap { height: 3px; background: #222; border-radius: 2px; overflow: hidden; }
	.hp-bar { height: 100%; border-radius: 2px; transition: width 0.3s; }
	.hp-controls { display: flex; align-items: center; gap: 0.25rem; }
	.hp-btn { background: #1A1A1A; border: 1px solid #333; color: #F0EDEA; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.78rem; font-weight: 700; transition: background 0.15s; cursor: pointer; }
	.hp-btn.dmg:hover { background: #C2374A; border-color: #C2374A; }
	.hp-btn.heal:hover { background: #2A5C2A; border-color: #5CB85C; }
	.hp-text { font-size: 0.85rem; color: rgba(240,237,234,0.7); flex: 1; text-align: center; }
	.remove-btn { background: transparent; border: 1px solid #2A2A2A; color: rgba(240,237,234,0.3); width: 26px; height: 26px; border-radius: 3px; font-size: 0.7rem; flex-shrink: 0; transition: all 0.15s; cursor: pointer; }
	.remove-btn:hover { border-color: #C2374A; color: #E05060; }

	.empty-combat { text-align: center; padding: 2.5rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }

	.section-sep { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 2rem 0; }

	.kills-section { margin-bottom: 1.5rem; }
	.kills-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
	.kills-header h2, .kills-title { font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.6); margin-bottom: 1rem; }
	.kill-form { margin-bottom: 1.5rem; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.field { display: flex; flex-direction: column; gap: 0.35rem; }
	.field.required label::after { content: ' *'; color: #C2374A; }
	label { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.5); }
	.form-actions { margin-top: 1rem; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }

	.pj-kills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
	.pj-kills-card { padding: 0; overflow: hidden; }
	.pj-kills-header { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.9rem; border-bottom: 1px solid #1A1A1A; }
	.pj-name { font-family: 'Cinzel', serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #FFF; }
	.pj-total { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; color: #C2374A; }
	.pj-kill-list { list-style: none; padding: 0.5rem 0.9rem 0.75rem; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.pj-kill-list li { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.82rem; }
	.kill-session { font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 700; color: #C2374A; white-space: nowrap; flex-shrink: 0; }
	.kill-monster { color: rgba(240,237,234,0.7); }
	.friendly-fire .kill-session { color: #888; }
	.friendly-fire .kill-monster { color: #888; text-decoration: line-through; font-style: italic; }
	.ff-badge { font-size: 0.7rem; }
	.pj-no-kills { padding: 0.5rem 0.9rem 0.75rem; color: rgba(240,237,234,0.2); font-size: 0.82rem; margin: 0; }
	.kills-detail { margin-top: 1rem; }
	.kills-detail summary { font-family: 'Cinzel', serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(240,237,234,0.4); cursor: pointer; padding: 0.5rem 0; }
	.kills-detail summary:hover { color: rgba(240,237,234,0.7); }
	.kills-detail table { margin-top: 0.75rem; }
	.kills-table-wrap { overflow-x: auto; }
	.kills-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	.kills-table th { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.4); padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.07); text-align: left; }
	.kills-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.04); color: rgba(240,237,234,0.75); vertical-align: middle; }
	.kills-table tr:hover td { background: rgba(255,255,255,0.02); }
	.session-num { font-family: 'Cinzel', serif; font-size: 0.7rem; color: #C2374A; font-weight: 700; white-space: nowrap; }
	.monster-name { font-weight: 700; color: #FFF; }
	.killer-name { color: #2B8FD4; font-family: 'Cinzel', serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.kill-notes { color: rgba(240,237,234,0.4); font-size: 0.82rem; }
	.btn-delete-small { background: transparent; border: none; color: rgba(240,237,234,0.25); font-size: 0.8rem; cursor: pointer; padding: 0.2rem 0.5rem; transition: color 0.15s; }
	.btn-delete-small:hover { color: #E05060; }
	.empty-kills { text-align: center; padding: 2.5rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.06em; text-transform: uppercase; }

	/* Monster override fields */
	.monster-override { display: flex; align-items: center; gap: 1rem; margin: 0.75rem 0; flex-wrap: wrap; }
	.override-field { display: flex; flex-direction: column; gap: 0.25rem; }
	.override-field label { font-family: 'Cinzel', serif; font-size: 0.65rem; text-transform: uppercase; color: rgba(240,237,234,0.4); }
	.fp-badge { font-family: 'Cinzel', serif; font-size: 0.75rem; font-weight: 700; color: #C2374A; padding: 0.2rem 0.5rem; background: rgba(194,55,74,0.1); border: 1px solid rgba(194,55,74,0.25); border-radius: 3px; align-self: flex-end; margin-bottom: 2px; }

	/* Duplicate button */
	.dup-btn { background: transparent; border: 1px solid #2A3A2A; color: rgba(240,237,234,0.3); width: 26px; height: 26px; border-radius: 3px; font-size: 0.85rem; flex-shrink: 0; transition: all 0.15s; cursor: pointer; }
	.dup-btn:hover { border-color: #5CB85C; color: #5CB85C; }

	/* Clickable name */
	.c-name.clickable { cursor: pointer; transition: color 0.15s; }
	.c-name.clickable:hover { color: #C2374A; }

	/* Monster sheet panel */
	.sheet-backdrop { position: fixed; inset: 0; z-index: 299; }
	.monster-sheet {
		position: fixed; top: 0; right: 0; bottom: 0; width: 320px; max-width: 90vw;
		background: #0C0C0C; border-left: 1px solid rgba(194,55,74,0.3);
		z-index: 300; overflow-y: auto; padding: 1.5rem 1.25rem;
		box-shadow: -4px 0 24px rgba(0,0,0,0.6);
	}
	.sheet-close { position: absolute; top: 1rem; right: 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(240,237,234,0.4); width: 2rem; height: 2rem; border-radius: 50%; cursor: pointer; font-size: 0.75rem; transition: all 0.15s; }
	.sheet-close:hover { color: #FFF; border-color: #C2374A; }
	.sheet-img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #222; }
	.sheet-header { margin-bottom: 0.75rem; padding-right: 2.5rem; }
	.sheet-name { font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 900; color: #FFF; letter-spacing: 0.05em; text-transform: uppercase; margin: 0 0 0.2rem; }
	.sheet-type { font-size: 0.78rem; color: rgba(240,237,234,0.4); margin: 0; font-style: italic; }
	.sheet-stats { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
	.sheet-stat { background: #111; border: 1px solid #222; border-radius: 4px; padding: 0.4rem 0.75rem; text-align: center; }
	.stat-label { display: block; font-family: 'Cinzel', serif; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #C2374A; margin-bottom: 0.1rem; }
	.stat-val { font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 900; color: #FFF; }
	.sheet-section { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; margin-top: 0.75rem; }
	.sheet-section-title { font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.35); margin: 0 0 0.4rem; }
	.sheet-text { font-family: 'Crimson Text', serif; font-size: 0.95rem; color: rgba(240,237,234,0.7); line-height: 1.55; margin: 0; white-space: pre-wrap; }

	@media (max-width: 600px) {
		.form-grid { grid-template-columns: 1fr; }
		.header-row { flex-direction: column; align-items: flex-start; }
	}
</style>
