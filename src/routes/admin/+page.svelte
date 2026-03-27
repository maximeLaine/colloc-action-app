<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';
	import type { Combatant } from '$lib/types/database';
	import FileAttachments from '$lib/components/FileAttachments.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const { sessions, npcs, campaign, stats, players } = data;

	$effect(() => {
		console.log('🐉 Monsters loaded:', data.monsters);
	});

	type Tab = 'dashboard' | 'sessions' | 'npcs' | 'pj' | 'combat' | 'ia' | 'monstres';
	const tabs: Tab[] = ['dashboard', 'sessions', 'npcs', 'pj', 'combat', 'ia', 'monstres'];
	const urlTab = $page.url.searchParams.get('tab') as Tab | null;
	let activeTab = $state<Tab>(urlTab && tabs.includes(urlTab) ? urlTab : 'dashboard');

	// ─── Players modal + invite ───
	interface Char {
		id: string;
		name: string;
		race: string;
		class: string;
		level: number;
		hp_current: number;
		hp_max: number;
		ac: number;
		status: string;
		visibility: string;
		player_id: string | null;
		player_name: string | null;
		image_url: string | null;
		backstory: string | null;
		dm_backstory: string | null;
	}
	interface CharWithPlayer extends Char {
		player_id: string | null;
	}
	interface Player {
		id: string;
		email: string;
		display_name: string;
		role: string;
		characters: Char[];
	}
	let editPlayer = $state<Player | null>(null);
	const unassignedChars = $derived(
		(data.allCharacters as CharWithPlayer[]).filter((c: CharWithPlayer) => !c.player_id)
	);
	let editChar = $state<Char | null>(null);
	let showInvite = $state(false);
	let inviteLink = $state<string | null>(null);

	// ─── Monsters ───
	interface Monster {
		id: string;
		name: string;
		type: string | null;
		cr: string | null;
		hp: number | null;
		ac: number | null;
		notes: string | null;
		image_url: string | null;
		description: string | null;
		actions: string | null;
		special_abilities: string | null;
		size: string | null;
		alignment: string | null;
		speed: string | null;
		str_score: number | null;
		dex_score: number | null;
		con_score: number | null;
		int_score: number | null;
		wis_score: number | null;
		cha_score: number | null;
		saving_throws: string | null;
		skills_text: string | null;
		damage_resistances: string | null;
		damage_immunities: string | null;
		condition_immunities: string | null;
		senses: string | null;
		languages: string | null;
		legendary_actions: string | null;
		reactions: string | null;
		source_url: string | null;
	}

	function mod(score: number | null): string {
		if (score == null) return '';
		const m = Math.floor((score - 10) / 2);
		return m >= 0 ? `+${m}` : `${m}`;
	}

	const TYPES = [
		'Aberration',
		'Bête',
		'Céleste',
		'Construction',
		'Dragon',
		'Élémentaire',
		'Fée',
		'Fiélon',
		'Géant',
		'Humanoïde',
		'Mort-vivant',
		'Plante',
		'Vase'
	];

	let monsterShowForm = $state(false);
	let monsterEdit = $state<Monster | null>(null);
	let monsterSearch = $state('');
	let monsterFilterType = $state('');

	const monsterCountByType = $derived(
		TYPES.reduce(
			(acc, t) => {
				acc[t] = data.monsters.filter((m: Monster) => m.type === t).length;
				return acc;
			},
			{} as Record<string, number>
		)
	);

	const monsterFiltered = $derived(
		data.monsters.filter((m: Monster) => {
			const matchSearch =
				monsterSearch.trim() === '' ||
				m.name.toLowerCase().includes(monsterSearch.toLowerCase()) ||
				(m.type ?? '').toLowerCase().includes(monsterSearch.toLowerCase());
			const matchType = monsterFilterType === '' || m.type === monsterFilterType;
			return matchSearch && matchType;
		})
	);

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editPlayer = null;
	}

	$effect(() => {
		if (form?.inviteToken) {
			inviteLink = `${window.location.origin}/invite/${form.inviteToken}`;
			showInvite = false;
		}
	});

	// ─── HP helpers ───
	function hpPct(cur: number, max: number) {
		return max > 0 ? Math.round((cur / max) * 100) : 0;
	}
	function hpColor(pct: number) {
		return pct > 60 ? '#5CB85C' : pct > 25 ? '#F0A500' : '#C2374A';
	}
	function statusColor(s: string) {
		return s === 'mort' ? '#C2374A' : s === 'vivant' ? '#5CB85C' : '#F0A500';
	}
	function formatDate(d: string | null) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
	function formatDateLong(d: string | null) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
	function toInputDate(d: string | null) {
		if (!d) return '';
		return new Date(d).toISOString().split('T')[0];
	}

	// ─── Sessions management ───
	interface Attachment {
		name: string;
		url: string;
		type: 'image' | 'pdf';
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Session = any;
	let sessionEditing = $state<Session | null>(null);
	let sessionShowModal = $state(false);
	let sessionAttachments = $state<Attachment[]>([]);
	let sessionAiRawNotes = $state('');
	let sessionAiLoading = $state(false);
	let sessionAiError = $state('');
	let sessionGeneratedSummary = $state('');
	let sessionShowAi = $state(false);
	let sessionSummaryEl = $state<HTMLTextAreaElement | null>(null);

	function openNewSession() {
		sessionEditing = null;
		sessionAttachments = [];
		sessionShowModal = true;
		sessionAiRawNotes = '';
		sessionGeneratedSummary = '';
		sessionShowAi = false;
	}
	function openEditSession(s: Session) {
		sessionEditing = s;
		sessionAttachments = (s.attachments as Attachment[]) ?? [];
		sessionShowModal = true;
		sessionAiRawNotes = '';
		sessionGeneratedSummary = '';
		sessionShowAi = false;
	}
	function closeSessionForm() {
		sessionEditing = null;
		sessionShowModal = false;
	}
	function closeSessionOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) closeSessionForm();
	}

	async function generateSessionSummary() {
		if (!sessionAiRawNotes.trim()) return;
		sessionAiLoading = true;
		sessionAiError = '';
		sessionGeneratedSummary = '';
		try {
			const res = await fetch('/api/claude/summary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					raw_notes: sessionAiRawNotes,
					session_number: sessionEditing?.number,
					title: sessionEditing?.title ?? ''
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				sessionAiError = err.message ?? `Erreur ${res.status}`;
			} else {
				const d = await res.json();
				sessionGeneratedSummary = d.summary ?? '';
			}
		} catch {
			sessionAiError = 'Erreur réseau';
		} finally {
			sessionAiLoading = false;
		}
	}

	function useSessionSummary() {
		if (sessionSummaryEl) sessionSummaryEl.value = sessionGeneratedSummary;
		sessionGeneratedSummary = '';
		sessionShowAi = false;
	}

	// ─── NPC management ───
	interface Npc {
		id: string;
		name: string;
		role: string;
		affiliation: string | null;
		status: string;
		description: string | null;
		dm_notes: string | null;
		image_url: string | null;
		visibility: string;
		hp: number | null;
		ac: number | null;
		str_score: number | null;
		dex_score: number | null;
		con_score: number | null;
		int_score: number | null;
		wis_score: number | null;
		cha_score: number | null;
		generated_by_ai?: boolean;
	}
	interface AiNpc {
		name: string;
		role: string;
		affiliation: string;
		status: string;
		description: string;
		dm_notes: string;
		personality: string;
		secret: string;
		motivation: string;
	}
	const visLabels: Record<string, string> = {
		dm_only: '🔒 MJ',
		players: '👥 Joueurs',
		public: '🌐 Public'
	};

	let npcShowForm = $state(false);
	let npcEditTarget = $state<Npc | null>(null);
	let npcShowAi = $state(false);
	let npcAiConcept = $state('');
	let npcAiRole = $state('');
	let npcAiAffil = $state('');
	let npcAiExtra = $state('');
	let npcAiLoading = $state(false);
	let npcAiError = $state('');
	let npcAiResult = $state<AiNpc | null>(null);
	let npcPrefillName = $state('');
	let npcPrefillRole = $state('');
	let npcPrefillAffil = $state('');
	let npcPrefillDesc = $state('');
	let npcPrefillDmNotes = $state('');

	function closeNpcOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) npcEditTarget = null;
	}

	async function generateNpcFromTab() {
		if (!npcAiConcept.trim()) return;
		npcAiLoading = true;
		npcAiError = '';
		npcAiResult = null;
		try {
			const res = await fetch('/api/claude/npc', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					concept: npcAiConcept,
					role: npcAiRole,
					affiliation: npcAiAffil,
					extra: npcAiExtra
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				npcAiError = err.message ?? `Erreur ${res.status}`;
			} else {
				const d = await res.json();
				npcAiResult = d.npc;
			}
		} catch {
			npcAiError = 'Erreur réseau';
		} finally {
			npcAiLoading = false;
		}
	}

	function useNpcAiResult() {
		if (!npcAiResult) return;
		npcPrefillName = npcAiResult.name;
		npcPrefillRole = npcAiResult.role;
		npcPrefillAffil = npcAiResult.affiliation ?? '';
		npcPrefillDesc = npcAiResult.description ?? '';
		npcPrefillDmNotes = [
			npcAiResult.dm_notes ?? '',
			npcAiResult.personality ? `Personnalité: ${npcAiResult.personality}` : '',
			npcAiResult.secret ? `Secret: ${npcAiResult.secret}` : '',
			npcAiResult.motivation ? `Motivation: ${npcAiResult.motivation}` : ''
		]
			.filter(Boolean)
			.join('\n');
		npcShowAi = false;
		npcShowForm = true;
	}

	// ─── Combat tracker ───
	interface CombatantLocal {
		id: string;
		name: string;
		type: 'monster' | 'player' | 'ally';
		initiative: number;
		hp_max: number;
		hp_current: number;
		ac: number;
		conditions: string[];
	}
	let trackerCombatants = $state<CombatantLocal[]>([]);
	let trackerRound = $state(1);
	let trackerTurn = $state(0);
	let showAddPanel = $state(false);
	let addType = $state<'monster' | 'custom' | 'pnj'>('monster');
	let selectedMonsterId = $state('');
	let monsterHp = $state(10);
	let monsterAc = $state(10);
	let customName = $state('');
	let customHp = $state(10);
	let customAc = $state(10);
	let customType = $state<'monster' | 'ally'>('monster');
	let selectedPnjId = $state('');
	let pnjHp = $state(10);
	let pnjAc = $state(10);
	let pnjType = $state<'monster' | 'ally'>('ally');
	let addInitiative = $state(0);
	let showKillForm = $state(false);

	const selectedMonster = $derived(
		data.monsters.find((m: { id: string }) => m.id === selectedMonsterId)
	);

	$effect(() => {
		const m = data.monsters.find((m: { id: string }) => m.id === selectedMonsterId);
		if (m) {
			monsterHp = m.hp ?? 10;
			monsterAc = m.ac ?? 10;
		}
	});
	$effect(() => {
		const p = data.npcs.find((n: { id: string }) => n.id === selectedPnjId);
		if (p) {
			pnjHp = (p as { hp?: number }).hp ?? 10;
			pnjAc = (p as { ac?: number }).ac ?? 10;
		}
	});

	function sortByInit() {
		trackerCombatants = [...trackerCombatants].sort((a, b) => b.initiative - a.initiative);
	}
	function addMonster() {
		const m = data.monsters.find((m: { id: string }) => m.id === selectedMonsterId);
		if (!m) return;
		trackerCombatants = [
			...trackerCombatants,
			{
				id: crypto.randomUUID(),
				name: m.name,
				type: 'monster',
				initiative: addInitiative,
				hp_max: monsterHp,
				hp_current: monsterHp,
				ac: monsterAc,
				conditions: []
			}
		];
		sortByInit();
		showAddPanel = false;
	}
	function addCustom() {
		trackerCombatants = [
			...trackerCombatants,
			{
				id: crypto.randomUUID(),
				name: customName || 'Inconnu',
				type: customType,
				initiative: addInitiative,
				hp_max: customHp,
				hp_current: customHp,
				ac: customAc,
				conditions: []
			}
		];
		sortByInit();
		showAddPanel = false;
		customName = '';
		customHp = 10;
		customAc = 10;
	}
	function addPnj() {
		const p = data.npcs.find((n: { id: string }) => n.id === selectedPnjId);
		if (!p) return;
		trackerCombatants = [
			...trackerCombatants,
			{
				id: crypto.randomUUID(),
				name: p.name,
				type: pnjType,
				initiative: addInitiative,
				hp_max: pnjHp,
				hp_current: pnjHp,
				ac: pnjAc,
				conditions: []
			}
		];
		sortByInit();
		showAddPanel = false;
		selectedPnjId = '';
		pnjHp = 10;
		pnjAc = 10;
	}
	function changeHp(id: string, delta: number) {
		trackerCombatants = trackerCombatants.map((c) =>
			c.id === id ? { ...c, hp_current: Math.max(0, Math.min(c.hp_max, c.hp_current + delta)) } : c
		);
	}
	function nextTrackerTurn() {
		if (!trackerCombatants.length) return;
		trackerTurn = (trackerTurn + 1) % trackerCombatants.length;
		if (trackerTurn === 0) trackerRound++;
	}
	function removeCombatant(id: string) {
		trackerCombatants = trackerCombatants.filter((c) => c.id !== id);
		trackerTurn = Math.min(trackerTurn, Math.max(0, trackerCombatants.length - 1));
	}
	function duplicateCombatant(id: string) {
		const c = trackerCombatants.find((c) => c.id === id);
		if (!c) return;
		trackerCombatants = [...trackerCombatants, { ...c, id: crypto.randomUUID() }];
		sortByInit();
	}
	function cHpPct(c: CombatantLocal) {
		return c.hp_max > 0 ? Math.round((c.hp_current / c.hp_max) * 100) : 0;
	}

	type MonsterData = (typeof data.monsters)[0];
	type NpcData = (typeof data.npcs)[0];
	let sheetMonster = $state<MonsterData | null>(null);
	let sheetNpc = $state<NpcData | null>(null);
	function openMonsterSheet(name: string) {
		const m = data.monsters.find((m: MonsterData) => m.name === name);
		if (m) {
			sheetMonster = m;
			sheetNpc = null;
			return;
		}
		const n = data.npcs.find((n: NpcData) => n.name === name);
		if (n) {
			sheetNpc = n;
			sheetMonster = null;
		}
	}

	const PJ_ORDER = ['Valtim', 'Upkik', 'Freedah', 'Kova', 'Elian Thorne', 'Zik'];
	const killsByPJ = $derived.by(() => {
		const map: Record<string, { session: number | null; monster: string; notes: string | null }[]> =
			{};
		for (const pj of PJ_ORDER) map[pj] = [];
		for (const k of data.kills) {
			if (map[k.killed_by])
				map[k.killed_by].push({
					session: k.session_number,
					monster: k.monster_name,
					notes: k.notes
				});
			else
				map[k.killed_by] = [{ session: k.session_number, monster: k.monster_name, notes: k.notes }];
		}
		for (const pj of Object.keys(map)) map[pj].sort((a, b) => (a.session ?? 0) - (b.session ?? 0));
		return map;
	});

	// ─── AI ───
	type AiSection = 'npc-gen' | 'enemies' | 'improv' | 'rules';
	let activeAi = $state<AiSection>('npc-gen');
	let aiLoading = $state(false);
	let aiError = $state('');

	// ─── Enemies proposal ───
	interface Encounter {
		name: string;
		type: string;
		cr: string;
		description: string;
		tactics: string;
		loot: string;
		hook: string;
	}
	let enemiesContext = $state('');
	let enemiesLevel = $state('');
	let enemiesTone = $state('');
	let enemiesResult = $state<Encounter[]>([]);
	async function proposeEnemies() {
		aiLoading = true;
		aiError = '';
		enemiesResult = [];
		try {
			const res = await fetch('/api/claude/enemies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					context: enemiesContext,
					party_level: enemiesLevel,
					session_tone: enemiesTone
				})
			});
			if (!res.ok) throw new Error((await res.json()).message);
			enemiesResult = (await res.json()).encounters ?? [];
		} catch (e: unknown) {
			aiError = e instanceof Error ? e.message : 'Erreur';
		} finally {
			aiLoading = false;
		}
	}
	const encounterTypeColor: Record<string, string> = {
		boss: '#C2374A',
		monstre: '#F0A500',
		groupe: '#E05060',
		piège: '#8B6CD4',
		social: '#2B8FD4'
	};

	let rulesQ = $state('');
	let rulesA = $state('');
	async function askRules() {
		if (!rulesQ.trim()) return;
		aiLoading = true;
		aiError = '';
		try {
			const res = await fetch('/api/claude/rules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: rulesQ })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			rulesA = (await res.json()).answer;
		} catch (e: unknown) {
			aiError = e instanceof Error ? e.message : 'Erreur';
		} finally {
			aiLoading = false;
		}
	}

	let improvSit = $state('');
	let improvOpts: { title: string; description: string; consequence: string }[] = $state([]);
	async function askImprov() {
		if (!improvSit.trim()) return;
		aiLoading = true;
		aiError = '';
		improvOpts = [];
		try {
			const res = await fetch('/api/claude/improv', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ situation: improvSit })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			improvOpts = (await res.json()).options ?? [];
		} catch (e: unknown) {
			aiError = e instanceof Error ? e.message : 'Erreur';
		} finally {
			aiLoading = false;
		}
	}

	let npcConcept = $state('');
	let npcRole = $state('');
	let npcAffil = $state('');
	let generatedNpc: Record<string, string> | null = $state(null);
	async function generateNpc() {
		if (!npcConcept.trim()) return;
		aiLoading = true;
		aiError = '';
		generatedNpc = null;
		try {
			const res = await fetch('/api/claude/npc', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ concept: npcConcept, role: npcRole, affiliation: npcAffil })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			generatedNpc = (await res.json()).npc;
		} catch (e: unknown) {
			aiError = e instanceof Error ? e.message : 'Erreur';
		} finally {
			aiLoading = false;
		}
	}

	// ─── PJ tab ───
	const CHAR_CLASSES = [
		'Barbare',
		'Barde',
		'Clerc',
		'Druide',
		'Ensorceleur',
		'Guerrier',
		'Mage',
		'Moine',
		'Occultiste',
		'Paladin',
		'Rôdeur',
		'Roublard'
	];
	const CHAR_RACES = [
		'Elfe',
		'Nain',
		'Halfelin',
		'Humain',
		'Tieffelin',
		'Demi-Elfe',
		'Gnome',
		'Demi-Orque',
		'Draconide',
		'Aasimar',
		'Autre'
	];
	let showCharForm = $state(false);
	function closeCharModal(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editChar = null;
	}
</script>

<svelte:head><title>Console MJ — {campaign?.name ?? 'La Kolok-Action'}</title></svelte:head>

<div class="container admin-page">
	<!-- Header -->
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Console MJ</h1>
				<p class="subtitle">{campaign?.name ?? 'La Kolok-Action'} · Tableau de bord</p>
			</div>
			{#if data.activeCombat}
				<div class="combat-live-badge">
					<span class="dot-live"></span> Combat en cours — Round {data.activeCombat.round}
				</div>
			{/if}
		</div>
	</div>

	<!-- Stats -->
	<div class="stats-row">
		{#each [{ val: stats.sessions_count, label: 'Sessions' }, { val: stats.characters_count, label: 'Personnages' }, { val: stats.pnj_count, label: 'PNJ' }, { val: stats.lore_count, label: 'Lore' }, { val: stats.monsters_count, label: 'Monstres' }, { val: stats.kills_count, label: 'Kills' }] as s}
			<div class="stat-card card">
				<span class="stat-val">{s.val}</span>
				<span class="stat-label">{s.label}</span>
			</div>
		{/each}
	</div>

	<!-- Tabs -->
	<div class="tabs">
		<button
			class="tab"
			class:tab-active={activeTab === 'dashboard'}
			onclick={() => (activeTab = 'dashboard')}>👥 Joueurs</button
		>
		<button
			class="tab"
			class:tab-active={activeTab === 'sessions'}
			onclick={() => (activeTab = 'sessions')}
			>📜 Sessions <span class="tab-count">{sessions.length}</span></button
		>
		<button class="tab" class:tab-active={activeTab === 'npcs'} onclick={() => (activeTab = 'npcs')}
			>🎭 PNJ <span class="tab-count">{npcs.length}</span></button
		>
		<button class="tab" class:tab-active={activeTab === 'pj'} onclick={() => (activeTab = 'pj')}
			>⚔️ PJ <span class="tab-count">{data.allCharacters.length}</span></button
		>
		<button
			class="tab"
			class:tab-active={activeTab === 'combat'}
			onclick={() => (activeTab = 'combat')}>🎯 Combat</button
		>
		<button class="tab" class:tab-active={activeTab === 'ia'} onclick={() => (activeTab = 'ia')}
			>✨ Outils IA</button
		>
		<button
			class="tab"
			class:tab-active={activeTab === 'monstres'}
			onclick={() => (activeTab = 'monstres')}
			>🐉 Monstres <span class="tab-count">{data.monsters.length}</span></button
		>
	</div>

	<!-- ═══ JOUEURS ═══ -->
	{#if activeTab === 'dashboard'}
		<!-- Gestion utilisateurs -->
		<div class="users-toolbar">
			<span class="users-count">{players.length} compte{players.length !== 1 ? 's' : ''}</span>
			<button
				class="btn-primary btn-sm"
				onclick={() => {
					showInvite = !showInvite;
					inviteLink = null;
				}}
			>
				{showInvite ? '✕ Annuler' : '+ Inviter un joueur'}
			</button>
		</div>

		{#if showInvite}
			<div class="invite-panel card">
				<div class="invite-panel-title">Inviter un joueur</div>
				{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
				<form method="POST" action="?/invite" use:enhance>
					<div class="invite-form-row">
						<div class="field">
							<label for="inv-email">Adresse email</label>
							<input
								id="inv-email"
								name="email"
								type="email"
								required
								placeholder="joueur@exemple.com"
							/>
						</div>
						<div class="field field-role">
							<label for="inv-role">Rôle</label>
							<select id="inv-role" name="role">
								<option value="player">⚔️ Joueur</option>
								<option value="dm">🎲 Maître du Jeu</option>
							</select>
						</div>
						<button type="submit" class="btn-primary btn-invite-submit">Générer le lien</button>
					</div>
				</form>
			</div>
		{/if}

		{#if inviteLink}
			<div class="invite-result card">
				<span class="inv-label">Lien d'invitation (valable 7 jours)</span>
				<div class="inv-link-row">
					<input
						type="text"
						readonly
						value={inviteLink}
						class="inv-link-input"
						onclick={(e) => (e.target as HTMLInputElement).select()}
					/>
					<button class="btn-copy" onclick={() => navigator.clipboard.writeText(inviteLink!)}
						>Copier</button
					>
				</div>
			</div>
		{/if}

		{#if data.invitations?.length}
			<div class="subsection-title">Invitations en attente</div>
			<div class="inv-list">
				{#each data.invitations as inv}
					<div class="inv-row card">
						<div class="inv-info">
							<span class="inv-email">{inv.email}</span>
							<span class="role-badge role-{inv.role}"
								>{inv.role === 'dm' ? '🎲 MJ' : '⚔️ Joueur'}</span
							>
						</div>
						<div class="inv-actions">
							<span class="inv-expires"
								>expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}</span
							>
							<form method="POST" action="?/deleteInvitation" use:enhance>
								<input type="hidden" name="id" value={inv.id} />
								<button
									class="btn-delete-small"
									type="submit"
									onclick={(e) => {
										if (!confirm('Supprimer cette invitation ?')) e.preventDefault();
									}}>✕</button
								>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="subsection-title">Comptes actifs</div>
		<div class="player-grid">
			{#each players as player}
				<div class="player-card card">
					<div class="player-top">
						<div class="player-avatar">{player.display_name?.[0]?.toUpperCase() ?? '?'}</div>
						<div class="player-identity">
							<div class="player-name">{player.display_name}</div>
							<div class="player-email">{player.email}</div>
						</div>
						<span class="role-badge role-{player.role}"
							>{player.role === 'dm' ? '🎲 MJ' : '⚔️ Joueur'}</span
						>
						<button class="btn-icon" onclick={() => (editPlayer = player as Player)}>✏️</button>
					</div>
					{#if player.characters.length > 0}
						<div class="char-list">
							{#each player.characters as c}
								<div class="char-item">
									<div class="char-head">
										<span class="char-name">{c.name}</span>
										<span class="char-class">{c.class} niv.{c.level}</span>
										<span class="vis-dot" class:vis-pub={c.visibility === 'players'}>●</span>
										<button class="btn-char-edit" onclick={() => (editChar = c)} title="Modifier"
											>✏️</button
										>
									</div>
									<div class="hp-bar-wrap">
										<div
											class="hp-bar"
											style="width:{hpPct(c.hp_current, c.hp_max)}%;background:{hpColor(
												hpPct(c.hp_current, c.hp_max)
											)}"
										></div>
									</div>
									<div class="hp-text">{c.hp_current}/{c.hp_max} PV · CA {c.ac}</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="no-char">Aucun personnage lié</p>
					{/if}
				</div>
			{/each}
		</div>

		<!-- ═══ COMBAT ═══ -->
	{:else if activeTab === 'combat'}
		<div class="subsection-title">⚔️ Tracker de combat — Round {trackerRound}</div>
		<div class="combat-layout">
			<div class="combat-tracker card">
				<div class="card-section-head">
					<div style="display:flex;gap:0.5rem">
						<button class="btn-secondary btn-sm" onclick={() => (showAddPanel = !showAddPanel)}
							>+ Ajouter</button
						>
						{#if trackerCombatants.length > 0}
							<button class="btn-primary btn-sm" onclick={nextTrackerTurn}>Suivant ▶</button>
						{/if}
					</div>
				</div>

				{#if showAddPanel}
					<div class="add-panel">
						<div class="add-tabs">
							<button
								class="add-tab"
								class:add-tab-active={addType === 'monster'}
								onclick={() => (addType = 'monster')}>🐉 Monstre</button
							>
							<button
								class="add-tab"
								class:add-tab-active={addType === 'custom'}
								onclick={() => (addType = 'custom')}>✏️ Personnalisé</button
							>
							<button
								class="add-tab"
								class:add-tab-active={addType === 'pnj'}
								onclick={() => (addType = 'pnj')}>🧑 PNJ</button
							>
						</div>
						<div class="field-inline">
							<label>Initiative</label>
							<input type="number" bind:value={addInitiative} style="width:70px" />
						</div>
						{#if addType === 'monster'}
							<select bind:value={selectedMonsterId}>
								<option value="">Choisir un monstre…</option>
								{#each data.monsters as m}
									<option value={m.id}>{m.name} — PV {m.hp} CA {m.ac} (FP {m.cr})</option>
								{/each}
							</select>
							{#if selectedMonster}
								<div class="monster-preview">
									<div class="monster-override">
										<label>PV</label>
										<input type="number" bind:value={monsterHp} style="width:60px" />
									</div>
									<div class="monster-override">
										<label>CA</label>
										<input type="number" bind:value={monsterAc} style="width:60px" />
									</div>
									<span style="align-self:center">FP <strong>{selectedMonster.cr}</strong></span>
								</div>
							{/if}
							<button
								class="btn-primary btn-sm"
								style="margin-top:0.5rem"
								onclick={addMonster}
								disabled={!selectedMonsterId}>Ajouter au combat</button
							>
						{:else if addType === 'pnj'}
							<div class="custom-grid">
								<select bind:value={selectedPnjId}>
									<option value="">Choisir un PNJ…</option>
									{#each data.npcs as pnj}
										<option value={pnj.id}>{pnj.name}{pnj.role ? ` — ${pnj.role}` : ''}</option>
									{/each}
								</select>
								{#if selectedPnjId}
									<div class="two-col">
										<div><label>PV</label><input type="number" bind:value={pnjHp} /></div>
										<div><label>CA</label><input type="number" bind:value={pnjAc} /></div>
									</div>
								{/if}
								<div class="type-toggle">
									<button
										class="toggle-opt"
										class:toggle-enemy={pnjType === 'monster'}
										onclick={() => (pnjType = 'monster')}>🐉 Ennemi</button
									>
									<button
										class="toggle-opt"
										class:toggle-ally={pnjType === 'ally'}
										onclick={() => (pnjType = 'ally')}>🛡️ Allié</button
									>
								</div>
								<button class="btn-primary btn-sm" onclick={addPnj} disabled={!selectedPnjId}
									>Ajouter</button
								>
							</div>
						{/if}
					</div>
				{/if}

				{#if trackerCombatants.length > 0}
					<div class="combatants">
						{#each trackerCombatants as c, i (c.id)}
							<div
								class="combatant-row"
								class:combatant-active={i === trackerTurn}
								class:combatant-dead={c.hp_current === 0}
							>
								<input
									type="number"
									value={c.initiative}
									style="width:46px;text-align:center"
									onchange={(e) => {
										c.initiative = +(e.target as HTMLInputElement).value;
										sortByInit();
									}}
								/>
								<button
									class="c-type-btn"
									onclick={() => (c.type = c.type === 'monster' ? 'ally' : 'monster')}
								>
									{c.type === 'monster' ? '🐉' : c.type === 'ally' ? '🛡️' : '⚔️'}
								</button>
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<div class="c-name" onclick={() => openMonsterSheet(c.name)} style="cursor:pointer">
									{c.name}
								</div>
								<div class="ac-badge">CA {c.ac}</div>
								<div class="hp-section">
									<div class="c-hp-bar-wrap">
										<div
											class="c-hp-bar"
											style="width:{cHpPct(c)}%;background:{hpColor(cHpPct(c))}"
										></div>
									</div>
									<div class="hp-controls">
										<button class="hp-btn hp-dmg" onclick={() => changeHp(c.id, -5)}>-5</button>
										<button class="hp-btn hp-dmg" onclick={() => changeHp(c.id, -1)}>-1</button>
										<span class="hp-text">{c.hp_current}/{c.hp_max}</span>
										<button class="hp-btn hp-heal" onclick={() => changeHp(c.id, 1)}>+1</button>
										<button class="hp-btn hp-heal" onclick={() => changeHp(c.id, 5)}>+5</button>
									</div>
								</div>
								<button class="dup-btn" title="Dupliquer" onclick={() => duplicateCombatant(c.id)}
									>⧉</button
								>
								<button class="remove-btn" onclick={() => removeCombatant(c.id)}>✕</button>
							</div>
						{/each}
					</div>
				{:else}
					<p class="empty-state" style="margin-top:1rem">
						Aucun combattant — cliquez <strong>+ Ajouter</strong>
					</p>
				{/if}
			</div>

			<!-- Kills -->
			<div class="kills-section card">
				<div class="card-section-head">
					<span class="card-section-title"
						>💀 Kills <span class="count-badge">{data.kills.length}</span></span
					>
					<button class="btn-secondary btn-sm" onclick={() => (showKillForm = !showKillForm)}>
						{showKillForm ? 'Annuler' : '+ Ajouter'}
					</button>
				</div>

				{#if showKillForm}
					<div class="kill-form">
						{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
						<form
							method="POST"
							action="?/addKill"
							use:enhance={() =>
								({ result, update }) => {
									if (result.type === 'success') showKillForm = false;
									update();
								}}
						>
							<div class="kill-form-grid">
								<div class="field">
									<label>Monstre tué *</label>
									<input
										name="monster_name"
										type="text"
										required
										list="monster-list"
										placeholder="Ex: Gobelin"
									/>
									<datalist id="monster-list"
										>{#each data.monsters as m}<option value={m.name}></option>{/each}</datalist
									>
								</div>
								<div class="field">
									<label>Par qui *</label>
									<input name="killed_by" type="text" required placeholder="Ex: Valtim" />
								</div>
								<div class="field">
									<label>Session n°</label>
									<input name="session_number" type="number" min="1" />
								</div>
								<div class="field">
									<label>Notes</label>
									<input name="notes" type="text" placeholder="Ex: coup fatal" />
								</div>
							</div>
							<button type="submit" class="btn-primary btn-sm" style="margin-top:0.75rem"
								>Enregistrer</button
							>
						</form>
					</div>
				{/if}

				{#if data.kills.length === 0}
					<p class="empty-state">Aucun kill enregistré.</p>
				{:else}
					<div class="pj-kills-grid">
						{#each PJ_ORDER as pj}
							{@const pjKills = killsByPJ[pj] ?? []}
							<div class="pj-kills-card">
								<div class="pj-kills-header">
									<span class="pj-name">{pj}</span>
									<span class="pj-total">{pjKills.length}k</span>
								</div>
								{#if pjKills.length === 0}
									<p class="pj-no-kills">—</p>
								{:else}
									<ul class="pj-kill-list">
										{#each pjKills as k}
											<li class:friendly-fire={k.notes === 'kill allié'}>
												<span class="kill-session">{k.session ? `E${k.session}` : '?'}</span>
												<span class="kill-monster">{k.monster}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
					<details class="kills-detail">
						<summary>Liste complète</summary>
						<table class="kills-table">
							<thead
								><tr><th>Session</th><th>Monstre</th><th>Tué par</th><th>Notes</th><th></th></tr
								></thead
							>
							<tbody>
								{#each data.kills as kill}
									<tr>
										<td class="k-session"
											>{kill.session_number ? `#${kill.session_number}` : '—'}</td
										>
										<td class="k-monster">{kill.monster_name}</td>
										<td class="k-killer">{kill.killed_by}</td>
										<td class="k-notes">{kill.notes ?? ''}</td>
										<td>
											<form method="POST" action="?/deleteKill" use:enhance>
												<input type="hidden" name="id" value={kill.id} />
												<button
													class="btn-del"
													type="submit"
													onclick={(e) => {
														if (!confirm('Supprimer ?')) e.preventDefault();
													}}>✕</button
												>
											</form>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</details>
				{/if}
			</div>
		</div>

		<!-- ═══ SESSIONS ═══ -->
	{:else if activeTab === 'sessions'}
		<div class="section-actions">
			<button class="btn-primary" onclick={() => openNewSession()}>+ Nouvelle session</button>
		</div>

		{#if sessions.length === 0}
			<div class="empty-state">Aucune session. Créez la première !</div>
		{:else}
			<div class="sessions-list">
				{#each sessions as s}
					<div class="session-row card">
						<div class="session-num">{s.number}</div>
						<div class="session-info">
							<div class="session-title">{s.title}</div>
							<div class="session-meta">
								{#if s.date_played}<span class="s-date-plain">{formatDateLong(s.date_played)}</span
									>{/if}
								{#if s.xp_awarded}<span class="xp-badge-sm">+{s.xp_awarded} XP</span>{/if}
								<span class="vis-badge vis-{s.visibility === 'dm_only' ? 'dm' : s.visibility}">
									{s.visibility === 'dm_only'
										? '🔒 MJ'
										: s.visibility === 'players'
											? '👥 Joueurs'
											: '🌐 Public'}
								</span>
							</div>
							{#if s.summary}
								<p class="summary-preview">
									{s.summary.slice(0, 140)}{s.summary.length > 140 ? '…' : ''}
								</p>
							{/if}
						</div>
						<div class="session-actions">
							<form method="POST" action="?/shareSession" use:enhance>
								<input type="hidden" name="id" value={s.id} />
								<input
									type="hidden"
									name="visibility"
									value={s.visibility === 'players' ? 'dm_only' : 'players'}
								/>
								<button type="submit" class="btn-share" class:shared={s.visibility === 'players'}>
									{s.visibility === 'players' ? '👁 Visible' : '🔒 Masqué'}
								</button>
							</form>
							<button class="btn-edit-row" onclick={() => openEditSession(s)}>Modifier</button>
							<form method="POST" action="?/deleteSession" use:enhance>
								<input type="hidden" name="id" value={s.id} />
								<button
									type="submit"
									class="btn-delete-row"
									onclick={(e) => {
										if (!confirm(`Supprimer la session ${s.number} ?`)) e.preventDefault();
									}}>Supprimer</button
								>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- ═══ PNJ ═══ -->
	{:else if activeTab === 'npcs'}
		<div class="section-actions" style="display:flex;gap:0.75rem;align-items:center;">
			<button
				class="btn-ai-sm"
				onclick={() => {
					npcShowAi = !npcShowAi;
					npcShowForm = false;
				}}
			>
				{npcShowAi ? '✕ IA' : '✨ Générer via IA'}
			</button>
			<button
				class="btn-primary"
				onclick={() => {
					npcShowForm = !npcShowForm;
					npcShowAi = false;
					if (!npcShowForm) {
						npcPrefillName = '';
						npcPrefillRole = '';
						npcPrefillAffil = '';
						npcPrefillDesc = '';
						npcPrefillDmNotes = '';
					}
				}}
			>
				{npcShowForm ? 'Annuler' : '+ Nouveau PNJ'}
			</button>
		</div>

		{#if npcShowAi}
			<div class="npc-ai-panel card">
				<div class="ai-panel-header">
					<span class="ai-panel-label">✨ Générateur de PNJ IA</span>
					<span class="ai-panel-hint">Décris le concept, l'IA crée le personnage</span>
				</div>
				<div class="form-grid">
					<div class="field full">
						<label for="nai-concept">Concept *</label>
						<input
							id="nai-concept"
							type="text"
							bind:value={npcAiConcept}
							placeholder="Ex: Forgeron nain grognon qui cache un lourd secret…"
						/>
					</div>
					<div class="field">
						<label for="nai-role">Rôle (optionnel)</label>
						<input
							id="nai-role"
							type="text"
							bind:value={npcAiRole}
							placeholder="Ex: Allié, Marchand, Ennemi…"
						/>
					</div>
					<div class="field">
						<label for="nai-affil">Affiliation (optionnel)</label>
						<input
							id="nai-affil"
							type="text"
							bind:value={npcAiAffil}
							placeholder="Ex: Guilde des Forgerons"
						/>
					</div>
					<div class="field full">
						<label for="nai-extra">Notes supplémentaires (optionnel)</label>
						<input
							id="nai-extra"
							type="text"
							bind:value={npcAiExtra}
							placeholder="Ex: Doit connaître Maldrek, apparaît en session 5…"
						/>
					</div>
				</div>
				<div class="ai-actions-row">
					<button
						class="btn-generate"
						onclick={generateNpcFromTab}
						disabled={npcAiLoading || !npcAiConcept.trim()}
					>
						{npcAiLoading ? '⏳ Génération…' : '✨ Générer'}
					</button>
				</div>
				{#if npcAiError}<div class="error-msg">{npcAiError}</div>{/if}
				{#if npcAiResult}
					<div class="npc-ai-result">
						<div class="npc-ai-result-header">
							<span class="npc-ai-name">{npcAiResult.name}</span>
							<span class="npc-ai-sub"
								>{npcAiResult.role}{npcAiResult.affiliation
									? ' · ' + npcAiResult.affiliation
									: ''}</span
							>
						</div>
						{#if npcAiResult.description}<p class="npc-ai-desc">{npcAiResult.description}</p>{/if}
						<div class="npc-ai-dm">
							{#if npcAiResult.personality}<div class="npc-dm-line">
									<span class="npc-dm-key">Personnalité</span>
									{npcAiResult.personality}
								</div>{/if}
							{#if npcAiResult.motivation}<div class="npc-dm-line">
									<span class="npc-dm-key">Motivation</span>
									{npcAiResult.motivation}
								</div>{/if}
							{#if npcAiResult.secret}<div class="npc-dm-line npc-dm-secret">
									<span class="npc-dm-key">🔒 Secret</span>
									{npcAiResult.secret}
								</div>{/if}
						</div>
						<div class="npc-ai-actions">
							<button class="btn-use-ai" onclick={useNpcAiResult}
								>↳ Utiliser pour créer ce PNJ</button
							>
							<button class="btn-regen" onclick={generateNpcFromTab} disabled={npcAiLoading}
								>↺ Regénérer</button
							>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if npcShowForm}
			<div class="npc-form-panel card">
				<div class="npc-form-title">
					{npcPrefillName ? `Nouveau PNJ — ${npcPrefillName}` : 'Nouveau PNJ'}
				</div>
				{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
				<form
					method="POST"
					action="?/createNpc"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') {
								npcShowForm = false;
								npcPrefillName = '';
							}
							update();
						}}
				>
					<div class="form-grid">
						<div class="field required">
							<label for="nf-name">Nom</label>
							<input
								id="nf-name"
								name="name"
								type="text"
								required
								value={npcPrefillName}
								placeholder="Ex: Comte Aldren"
							/>
						</div>
						<div class="field required">
							<label for="nf-role">Rôle / Titre</label>
							<input
								id="nf-role"
								name="role"
								type="text"
								required
								value={npcPrefillRole}
								placeholder="Ex: Noble, Marchand, Ennemi…"
							/>
						</div>
						<div class="field">
							<label for="nf-affil">Affiliation</label>
							<input
								id="nf-affil"
								name="affiliation"
								type="text"
								value={npcPrefillAffil}
								placeholder="Ex: Comté de Valombre"
							/>
						</div>
						<div class="field">
							<label for="nf-status">Statut</label>
							<select id="nf-status" name="status">
								<option value="vivant">✅ Vivant</option>
								<option value="mort">💀 Mort</option>
								<option value="malade">🤢 Malade</option>
								<option value="pétrifié">🪨 Pétrifié</option>
								<option value="prisonnière">⛓️ Prisonnier/ère</option>
							</select>
						</div>
						<div class="field">
							<label for="nf-vis">Visibilité</label>
							<select id="nf-vis" name="visibility">
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
							<label for="nf-desc">Description (visible joueurs)</label>
							<textarea
								id="nf-desc"
								name="description"
								rows="3"
								placeholder="Description publique du PNJ…">{npcPrefillDesc}</textarea
							>
						</div>
						<div class="field full">
							<label for="nf-dm">Notes MJ (privées)</label>
							<textarea
								id="nf-dm"
								name="dm_notes"
								rows="3"
								placeholder="Notes secrètes, motivations, plans…">{npcPrefillDmNotes}</textarea
							>
						</div>
						<div class="field full npc-stats-section">
							<div class="npc-stats-label">
								Stats de combat <span class="npc-stats-hint">(optionnel)</span>
							</div>
							<div class="npc-stats-grid">
								<div class="field">
									<label>PV</label><input name="hp" type="number" min="1" placeholder="—" />
								</div>
								<div class="field">
									<label>CA</label><input name="ac" type="number" min="1" placeholder="—" />
								</div>
								<div class="field">
									<label>FOR</label><input
										name="str_score"
										type="number"
										min="1"
										max="30"
										placeholder="—"
									/>
								</div>
								<div class="field">
									<label>DEX</label><input
										name="dex_score"
										type="number"
										min="1"
										max="30"
										placeholder="—"
									/>
								</div>
								<div class="field">
									<label>CON</label><input
										name="con_score"
										type="number"
										min="1"
										max="30"
										placeholder="—"
									/>
								</div>
								<div class="field">
									<label>INT</label><input
										name="int_score"
										type="number"
										min="1"
										max="30"
										placeholder="—"
									/>
								</div>
								<div class="field">
									<label>SAG</label><input
										name="wis_score"
										type="number"
										min="1"
										max="30"
										placeholder="—"
									/>
								</div>
								<div class="field">
									<label>CHA</label><input
										name="cha_score"
										type="number"
										min="1"
										max="30"
										placeholder="—"
									/>
								</div>
							</div>
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn-primary">Créer le PNJ</button>
						<button type="button" class="btn-secondary" onclick={() => (npcShowForm = false)}
							>Annuler</button
						>
					</div>
				</form>
			</div>
		{/if}

		{#if data.npcs.length === 0 && !npcShowForm}
			<div class="empty-state">Aucun PNJ. Crée le premier !</div>
		{:else}
			<div class="npc-mgmt-list">
				{#each data.npcs as npc}
					<div class="npc-row-full card">
						<div class="npc-img-wrap">
							{#if npc.image_url}
								<img src={npc.image_url} alt={npc.name} />
							{:else}
								<div class="npc-img-placeholder">🎭</div>
							{/if}
						</div>
						<div class="npc-row-info">
							<div class="npc-row-name">
								{npc.name}
								{#if npc.generated_by_ai}<span class="ai-badge-sm">✨</span>{/if}
							</div>
							<div class="npc-row-meta">
								<span class="npc-meta-role">{npc.role}</span>
								{#if npc.affiliation}<span class="npc-meta-sep">·</span><span class="npc-meta-affil"
										>{npc.affiliation}</span
									>{/if}
								<span class="npc-meta-sep">·</span>
								<span class="vis-badge vis-{npc.visibility?.replace('_only', '')}">
									{visLabels[npc.visibility] ?? npc.visibility}
								</span>
							</div>
							{#if npc.description}
								<p class="npc-row-desc">
									{npc.description.slice(0, 120)}{npc.description.length > 120 ? '…' : ''}
								</p>
							{/if}
							{#if npc.hp != null || npc.ac != null || npc.str_score != null}
								<div class="npc-combat-badges">
									{#if npc.hp != null}<span class="npc-stat-badge">❤ {npc.hp} PV</span>{/if}
									{#if npc.ac != null}<span class="npc-stat-badge">🛡 CA {npc.ac}</span>{/if}
									{#each [['FOR', npc.str_score], ['DEX', npc.dex_score], ['CON', npc.con_score], ['INT', npc.int_score], ['SAG', npc.wis_score], ['CHA', npc.cha_score]] as [lbl, val]}{#if val != null}<span
												class="npc-stat-badge npc-stat-ability"
												>{lbl} {val} ({val >= 10 ? '+' : ''}{Math.floor((val - 10) / 2)})</span
											>{/if}{/each}
								</div>
							{/if}
						</div>
						<div class="npc-row-actions">
							<span
								class="npc-status-tag"
								class:npc-dead={npc.status?.toLowerCase().includes('mort')}>{npc.status}</span
							>
							{#if npc.visibility === 'dm_only'}
								<form method="POST" action="?/shareNpc" use:enhance>
									<input type="hidden" name="id" value={npc.id} />
									<input type="hidden" name="visibility" value="players" />
									<button type="submit" class="btn-npc-share">👥 Partager</button>
								</form>
							{:else if npc.visibility === 'players'}
								<form method="POST" action="?/shareNpc" use:enhance>
									<input type="hidden" name="id" value={npc.id} />
									<input type="hidden" name="visibility" value="dm_only" />
									<button type="submit" class="btn-npc-unshare">🔒 Masquer</button>
								</form>
							{/if}
							<button class="btn-edit-row" onclick={() => (npcEditTarget = npc as Npc)}
								>Modifier</button
							>
							<form method="POST" action="?/deleteNpc" use:enhance>
								<input type="hidden" name="id" value={npc.id} />
								<button
									type="submit"
									class="btn-delete-row"
									onclick={(e) => {
										if (!confirm(`Supprimer "${npc.name}" ?`)) e.preventDefault();
									}}>Supprimer</button
								>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- ═══ PJ ═══ -->
	{:else if activeTab === 'pj'}
		<div class="section-head-row">
			<div class="subsection-title">⚔️ Personnages Joueurs</div>
			<button class="btn-primary btn-sm" onclick={() => (showCharForm = !showCharForm)}>
				{showCharForm ? 'Annuler' : '+ Nouveau PJ'}
			</button>
		</div>

		{#if showCharForm}
			<div class="card form-card">
				<div class="form-card-title">Nouveau Personnage Joueur</div>
				{#if form?.error}
					<div class="form-error">{form.error}</div>
				{/if}
				<form
					method="POST"
					action="?/createChar"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') showCharForm = false;
							update();
						}}
				>
					<div class="form-grid2">
						<div class="field required">
							<label for="cf-name">Nom</label>
							<input id="cf-name" name="name" type="text" required placeholder="Ex: Gnoméo" />
						</div>
						<div class="field">
							<label for="cf-player">Joueur</label>
							<select id="cf-player" name="player_id">
								<option value="">— Sans joueur —</option>
								{#each data.players as player}
									<option value={player.id}>{player.display_name} ({player.email})</option>
								{/each}
							</select>
						</div>
						<div class="field required">
							<label for="cf-race">Race</label>
							<input
								id="cf-race"
								name="race"
								type="text"
								required
								list="char-race-list"
								placeholder="Ex: Gnome"
							/>
							<datalist id="char-race-list"
								>{#each CHAR_RACES as r}<option value={r}></option>{/each}</datalist
							>
						</div>
						<div class="field required">
							<label for="cf-class">Classe</label>
							<input
								id="cf-class"
								name="class"
								type="text"
								required
								list="char-class-list"
								placeholder="Ex: Roublard"
							/>
							<datalist id="char-class-list"
								>{#each CHAR_CLASSES as c}<option value={c}></option>{/each}</datalist
							>
						</div>
						<div class="field">
							<label for="cf-level">Niveau</label>
							<input id="cf-level" name="level" type="number" min="1" max="20" value="1" />
						</div>
						<div class="field">
							<label for="cf-hp">PV max</label>
							<input id="cf-hp" name="hp_max" type="number" min="1" value="10" />
						</div>
						<div class="field">
							<label for="cf-ac">CA</label>
							<input id="cf-ac" name="ac" type="number" min="1" value="10" />
						</div>
						<div class="field">
							<label for="cf-status">Statut</label>
							<select id="cf-status" name="status">
								<option value="vivant">✅ Vivant</option>
								<option value="mort">💀 Mort</option>
								<option value="malade">🤢 Malade</option>
								<option value="pétrifié">🪨 Pétrifié</option>
								<option value="prisonnière">⛓️ Prisonnier/ère</option>
							</select>
						</div>
						<div class="field full">
							<label for="cf-backstory">Historique (partagé)</label>
							<textarea
								id="cf-backstory"
								name="backstory"
								rows="3"
								placeholder="Origine, motivations…"
							></textarea>
						</div>
						<div class="field full">
							<label for="cf-dm">Notes MJ (privées)</label>
							<textarea
								id="cf-dm"
								name="dm_backstory"
								rows="2"
								placeholder="Secrets, éléments cachés…"
							></textarea>
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn-primary">Créer le PJ</button>
					</div>
				</form>
			</div>
		{/if}

		<div class="char-list">
			{#if data.allCharacters.length === 0}
				<div class="empty-state">Aucun personnage. Crée le premier !</div>
			{:else}
				<div class="list-count">
					{data.allCharacters.length} personnage{data.allCharacters.length > 1 ? 's' : ''}
				</div>
				{#each data.allCharacters as char}
					<div class="char-row card">
						<div class="char-info">
							<div class="char-name">{char.name}</div>
							<div class="char-meta">
								<span>{char.race} · {char.class}</span>
								<span class="sep">·</span>
								<span>Niv. {char.level}</span>
								<span class="sep">·</span>
								<span>{char.hp_current}/{char.hp_max} PV · CA {char.ac}</span>
								{#if char.status && char.status !== 'vivant'}
									<span class="sep">·</span>
									<span class="status-chip"
										>{char.status === 'mort' ? '💀' : char.status === 'malade' ? '🤢' : '🪨'}
										{char.status}</span
									>
								{/if}
							</div>
							{#if char.player_name}
								<div class="char-player">👤 {char.player_name}</div>
							{:else}
								<div class="char-player unassigned">Sans joueur</div>
							{/if}
						</div>
						<div class="char-actions">
							<form method="POST" action="?/shareChar" use:enhance>
								<input type="hidden" name="id" value={char.id} />
								<input
									type="hidden"
									name="visibility"
									value={char.visibility === 'players' ? 'dm_only' : 'players'}
								/>
								<button type="submit" class="btn-vis" class:vis-on={char.visibility === 'players'}>
									{char.visibility === 'players' ? '👁 Visible' : '🔒 Masqué'}
								</button>
							</form>
							<button class="btn-edit-sm" onclick={() => (editChar = char as Char)}>Modifier</button
							>
							<form method="POST" action="?/deleteChar" use:enhance>
								<input type="hidden" name="id" value={char.id} />
								<button
									type="submit"
									class="btn-del-sm"
									onclick={(e) => {
										if (!confirm(`Supprimer "${char.name}" ?`)) e.preventDefault();
									}}>Supprimer</button
								>
							</form>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- ═══ IA ═══ -->
	{:else if activeTab === 'ia'}
		<div class="ia-tabs-bar">
			<button
				class="ia-tab"
				class:ia-tab-active={activeAi === 'npc-gen'}
				onclick={() => (activeAi = 'npc-gen')}>✨ Générer PNJ</button
			>
			<button
				class="ia-tab"
				class:ia-tab-active={activeAi === 'enemies'}
				onclick={() => (activeAi = 'enemies')}>⚔️ Ennemis session</button
			>
			<button
				class="ia-tab"
				class:ia-tab-active={activeAi === 'improv'}
				onclick={() => (activeAi = 'improv')}>⚡ Improvisation</button
			>
			<button
				class="ia-tab"
				class:ia-tab-active={activeAi === 'rules'}
				onclick={() => (activeAi = 'rules')}>📖 Oracle règles</button
			>
		</div>

		{#if aiError}<div class="error-msg">{aiError}</div>{/if}

		{#if activeAi === 'enemies'}
			<div class="ia-content card">
				<p class="ia-desc">
					Propose des ennemis et rencontres cohérents avec le fil narratif de la campagne.
				</p>
				<div class="ia-form-grid" style="grid-template-columns:1fr 1fr">
					<div class="field">
						<label for="en-level">Niveau du groupe</label>
						<input
							id="en-level"
							type="text"
							bind:value={enemiesLevel}
							placeholder="Ex: 5, ou 4-6"
						/>
					</div>
					<div class="field">
						<label for="en-tone">Ton souhaité</label>
						<input
							id="en-tone"
							type="text"
							bind:value={enemiesTone}
							placeholder="Ex: sombre, épique, mystérieux…"
						/>
					</div>
				</div>
				<div class="field" style="margin-top:0.5rem">
					<label for="en-ctx">Contexte de la prochaine session (optionnel)</label>
					<textarea
						id="en-ctx"
						rows="3"
						bind:value={enemiesContext}
						placeholder="Ex: Les joueurs arrivent à la ville assiégée, cherchent le traître au sein de la garde…"
					></textarea>
				</div>
				<button
					class="btn-generate"
					onclick={proposeEnemies}
					disabled={aiLoading}
					style="margin-top:0.75rem"
				>
					{aiLoading ? '⏳ Génération…' : '⚔️ Proposer des ennemis'}
				</button>
				{#if aiError}<div class="error-msg" style="margin-top:0.75rem">{aiError}</div>{/if}
				{#if enemiesResult.length > 0}
					<div class="enemies-list">
						{#each enemiesResult as enc}
							<div class="enemy-card">
								<div class="enemy-header">
									<span
										class="enemy-type-badge"
										style="background:{encounterTypeColor[enc.type] ??
											'#555'}22;border-color:{encounterTypeColor[enc.type] ??
											'#555'}55;color:{encounterTypeColor[enc.type] ?? '#aaa'}">{enc.type}</span
									>
									<span class="enemy-name">{enc.name}</span>
									{#if enc.cr}<span class="enemy-cr">FP {enc.cr}</span>{/if}
								</div>
								<p class="enemy-desc">{enc.description}</p>
								{#if enc.tactics}
									<div class="enemy-detail">
										<span class="enemy-detail-key">Tactiques</span>
										{enc.tactics}
									</div>
								{/if}
								{#if enc.hook}
									<div class="enemy-detail enemy-hook">
										<span class="enemy-detail-key">Accroche</span>
										{enc.hook}
									</div>
								{/if}
								{#if enc.loot}
									<div class="enemy-detail">
										<span class="enemy-detail-key">Butin</span>
										{enc.loot}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="ia-content card">
				{#if activeAi === 'npc-gen'}
					<p class="ia-desc">
						Génère un PNJ cohérent avec le contexte de la campagne (sessions récentes, PNJ actifs).
					</p>
					<div class="ia-form-grid">
						<div class="field">
							<label>Concept *</label>
							<input
								bind:value={npcConcept}
								placeholder="Ex: Forgeron nain grognon qui cache un secret…"
							/>
						</div>
						<div class="field">
							<label>Rôle</label>
							<input bind:value={npcRole} placeholder="Ex: Allié, Marchand, Ennemi…" />
						</div>
						<div class="field">
							<label>Affiliation</label>
							<input bind:value={npcAffil} placeholder="Ex: Guilde des Forgerons…" />
						</div>
					</div>
					<div class="form-actions">
						<button
							class="btn-primary"
							onclick={generateNpc}
							disabled={aiLoading || !npcConcept.trim()}
						>
							{aiLoading ? '⏳ Génération…' : '✨ Générer avec contexte campagne'}
						</button>
					</div>
					{#if generatedNpc}
						<div class="ia-result">
							<div class="ia-result-header">
								<span class="ia-result-name">{generatedNpc.name}</span>
								<span class="ia-result-sub"
									>{generatedNpc.role}{generatedNpc.affiliation
										? ' · ' + generatedNpc.affiliation
										: ''}</span
								>
							</div>
							{#if generatedNpc.description}<p class="ia-result-desc">
									{generatedNpc.description}
								</p>{/if}
							<div class="ia-traits">
								{#if generatedNpc.personality}<div class="ia-trait">
										<span class="ia-trait-key">Personnalité</span>{generatedNpc.personality}
									</div>{/if}
								{#if generatedNpc.motivation}<div class="ia-trait">
										<span class="ia-trait-key">Motivation</span>{generatedNpc.motivation}
									</div>{/if}
								{#if generatedNpc.secret}<div class="ia-trait ia-secret">
										<span class="ia-trait-key">🔒 Secret</span>{generatedNpc.secret}
									</div>{/if}
							</div>
							<div class="form-actions">
								<a href="/admin/pnj" class="btn-primary">↗ Créer ce PNJ</a>
								<button class="btn-secondary" onclick={generateNpc} disabled={aiLoading}
									>↺ Regénérer</button
								>
							</div>
						</div>
					{/if}
				{:else if activeAi === 'improv'}
					<p class="ia-desc">
						Décris la situation actuelle — l'IA propose 3 pistes narratives avec leurs conséquences.
					</p>
					<div class="field">
						<label>Situation</label>
						<textarea
							bind:value={improvSit}
							rows="4"
							placeholder="Ex: Les joueurs viennent de trahir leur allié et sont coincés dans la forteresse ennemie…"
						></textarea>
					</div>
					<div class="form-actions">
						<button
							class="btn-primary"
							onclick={askImprov}
							disabled={aiLoading || !improvSit.trim()}
						>
							{aiLoading ? '⏳ Réflexion…' : '⚡ Générer 3 options'}
						</button>
					</div>
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
				{:else if activeAi === 'rules'}
					<p class="ia-desc">
						Pose une question sur les règles D&D 5e — l'oracle répond en contexte de campagne.
					</p>
					<div class="field">
						<label>Question</label>
						<input
							bind:value={rulesQ}
							placeholder="Ex: Comment fonctionne la surprise en combat ?"
							onkeydown={(e) => e.key === 'Enter' && askRules()}
						/>
					</div>
					<div class="form-actions">
						<button class="btn-primary" onclick={askRules} disabled={aiLoading || !rulesQ.trim()}>
							{aiLoading ? '⏳ Consultation…' : "📖 Demander à l'oracle"}
						</button>
					</div>
					{#if rulesA}
						<div class="ia-result">
							<p class="ia-result-desc">{rulesA}</p>
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- ═══ MONSTRES ═══ -->
	{:else if activeTab === 'monstres'}
		<div class="monstres-container">
			{#if monsterShowForm}
				<div class="form-panel card">
					<h2>Nouveau Monstre</h2>
					{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
					<form
						method="POST"
						action="?/createMonster"
						use:enhance={() =>
							({ result, update }) => {
								if (result.type === 'success') monsterShowForm = false;
								update();
							}}
					>
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
								<textarea
									id="notes"
									name="notes"
									rows="3"
									placeholder="Attaques, capacités spéciales..."
								></textarea>
							</div>
						</div>
						<div class="form-actions">
							<button type="submit" class="btn-primary">Créer le monstre</button>
						</div>
					</form>
				</div>
			{/if}

			<div class="monstres-toolbar">
				<button
					class="btn-primary btn-sm"
					onclick={() => {
						monsterShowForm = !monsterShowForm;
					}}
				>
					{monsterShowForm ? '✕ Annuler' : '+ Nouveau monstre'}
				</button>
			</div>

			<div class="filters">
				<input
					class="search-input"
					type="text"
					bind:value={monsterSearch}
					placeholder="🔍 Rechercher…"
				/>
				<div class="type-filters">
					<button
						class="type-btn"
						class:active={monsterFilterType === ''}
						onclick={() => (monsterFilterType = '')}
					>
						Tous <span class="type-count">{data.monsters.length}</span>
					</button>
					{#each TYPES as t}
						<button
							class="type-btn"
							class:active={monsterFilterType === t}
							onclick={() => (monsterFilterType = t)}
							class:type-empty={!monsterCountByType[t]}
						>
							{t}
							{#if monsterCountByType[t]}<span class="type-count">{monsterCountByType[t]}</span
								>{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="monster-list">
				{#if data.monsters.length === 0}
					<div class="empty">Aucun monstre. Ajoute le premier !</div>
				{:else}
					<div class="list-header">
						{monsterFiltered.length} / {data.monsters.length} monstre{data.monsters.length > 1
							? 's'
							: ''}
					</div>
					<div class="monster-grid">
						{#each monsterFiltered as m}
							<div class="monster-card card">
								{#if m.image_url}
									<img
										src={m.image_url}
										alt={m.name}
										class="monster-card-img"
										loading="lazy"
										decoding="async"
									/>
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
									<button class="btn-edit" onclick={() => (monsterEdit = m as Monster)}
										>Modifier</button
									>
									<form method="POST" action="?/deleteMonster" use:enhance>
										<input type="hidden" name="id" value={m.id} />
										<button
											type="submit"
											class="btn-delete-small"
											onclick={(e) => {
												if (!confirm(`Supprimer "${m.name}" ?`)) e.preventDefault();
											}}>✕</button
										>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if monsterEdit}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				class="modal-backdrop"
				onclick={(e) => {
					if ((e.target as HTMLElement).classList.contains('modal-backdrop')) monsterEdit = null;
				}}
			>
				<div class="modal">
					<button class="modal-close" onclick={() => (monsterEdit = null)}>✕</button>
					<h2>Modifier — {monsterEdit.name}</h2>
					{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
					<form
						method="POST"
						action="?/updateMonster"
						use:enhance={() =>
							({ result, update }) => {
								if (result.type === 'success') monsterEdit = null;
								update();
							}}
					>
						<input type="hidden" name="id" value={monsterEdit.id} />
						<div class="form-grid">
							<div class="field required">
								<label>Nom</label>
								<input name="name" type="text" required value={monsterEdit.name} />
							</div>
							<div class="field">
								<label>Type</label>
								<select name="type">
									<option value="">— Aucun —</option>
									{#each TYPES as t}
										<option value={t} selected={monsterEdit.type === t}>{t}</option>
									{/each}
								</select>
							</div>
							<div class="field">
								<label>Taille</label>
								<input
									name="size"
									type="text"
									value={monsterEdit.size ?? ''}
									placeholder="Grande, Moyenne…"
								/>
							</div>
							<div class="field">
								<label>Alignement</label>
								<input
									name="alignment"
									type="text"
									value={monsterEdit.alignment ?? ''}
									placeholder="loyal mauvais…"
								/>
							</div>
							<div class="field">
								<label>FP</label>
								<input name="cr" type="text" value={monsterEdit.cr ?? ''} />
							</div>
							<div class="field">
								<label>Points de vie</label>
								<input name="hp" type="number" min="1" value={monsterEdit.hp ?? ''} />
							</div>
							<div class="field">
								<label>Classe d'armure</label>
								<input name="ac" type="number" min="1" value={monsterEdit.ac ?? ''} />
							</div>
							<div class="field">
								<label>Vitesse</label>
								<input
									name="speed"
									type="text"
									value={monsterEdit.speed ?? ''}
									placeholder="9 m, nage 12 m…"
								/>
							</div>

							<div class="field full">
								<label>Caractéristiques</label>
								<div class="ability-grid">
									{#each [['FOR', 'str_score'], ['DEX', 'dex_score'], ['CON', 'con_score'], ['INT', 'int_score'], ['SAG', 'wis_score'], ['CHA', 'cha_score']] as [lbl, field]}
										<div class="ability-box">
											<span class="ability-lbl">{lbl}</span>
											<input
												name={field}
												type="number"
												min="1"
												max="30"
												value={(monsterEdit as Record<string, unknown>)[field] ?? ''}
												placeholder="—"
											/>
										</div>
									{/each}
								</div>
							</div>

							<div class="field">
								<label>Jets de sauvegarde</label>
								<input
									name="saving_throws"
									type="text"
									value={monsterEdit.saving_throws ?? ''}
									placeholder="Con +6, Int +8…"
								/>
							</div>
							<div class="field">
								<label>Compétences</label>
								<input
									name="skills_text"
									type="text"
									value={monsterEdit.skills_text ?? ''}
									placeholder="Histoire +12, Perception +10…"
								/>
							</div>
							<div class="field">
								<label>Résistances aux dégâts</label>
								<input
									name="damage_resistances"
									type="text"
									value={monsterEdit.damage_resistances ?? ''}
								/>
							</div>
							<div class="field">
								<label>Immunités aux dégâts</label>
								<input
									name="damage_immunities"
									type="text"
									value={monsterEdit.damage_immunities ?? ''}
								/>
							</div>
							<div class="field">
								<label>Immunités aux états</label>
								<input
									name="condition_immunities"
									type="text"
									value={monsterEdit.condition_immunities ?? ''}
								/>
							</div>
							<div class="field">
								<label>Sens</label>
								<input
									name="senses"
									type="text"
									value={monsterEdit.senses ?? ''}
									placeholder="vision dans le noir 36 m…"
								/>
							</div>
							<div class="field">
								<label>Langues</label>
								<input name="languages" type="text" value={monsterEdit.languages ?? ''} />
							</div>

							<div class="field full">
								<label>Image</label>
								<ImageUpload
									name="image_url"
									value={monsterEdit.image_url ?? ''}
									placeholder="/img/monstres/nom.png"
								/>
							</div>
							<div class="field full">
								<label>Description</label>
								<textarea name="description" rows="3">{monsterEdit.description ?? ''}</textarea>
							</div>
							<div class="field full">
								<label>Capacités spéciales</label>
								<textarea name="special_abilities" rows="4"
									>{monsterEdit.special_abilities ?? ''}</textarea
								>
							</div>
							<div class="field full">
								<label>Actions</label>
								<textarea name="actions" rows="5">{monsterEdit.actions ?? ''}</textarea>
							</div>
							<div class="field full">
								<label>Réactions</label>
								<textarea name="reactions" rows="3">{monsterEdit.reactions ?? ''}</textarea>
							</div>
							<div class="field full">
								<label>Actions légendaires</label>
								<textarea name="legendary_actions" rows="5"
									>{monsterEdit.legendary_actions ?? ''}</textarea
								>
							</div>
							<div class="field full">
								<label>Notes DM</label>
								<textarea name="notes" rows="3">{monsterEdit.notes ?? ''}</textarea>
							</div>
							<div class="field full">
								<label>Lien source (ex: AideDD)</label>
								<input
									name="source_url"
									type="url"
									value={monsterEdit.source_url ?? ''}
									placeholder="https://www.aidedd.org/dnd/monstres.php?vf=..."
								/>
							</div>
						</div>
						<div class="form-actions">
							<button type="button" class="btn-secondary" onclick={() => (monsterEdit = null)}
								>Annuler</button
							>
							<button type="submit" class="btn-primary">Enregistrer</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Modal modifier PNJ -->
{#if npcEditTarget}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeNpcOnBackdrop}>
		<div class="modal modal-lg">
			<button class="modal-close" onclick={() => (npcEditTarget = null)}>✕</button>
			<h2 class="modal-title">Modifier — {npcEditTarget.name}</h2>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form
				method="POST"
				action="?/updateNpc"
				use:enhance={() =>
					({ result, update }) => {
						if (result.type === 'success') npcEditTarget = null;
						update();
					}}
			>
				<input type="hidden" name="id" value={npcEditTarget.id} />
				<div class="form-grid">
					<div class="field required">
						<label>Nom</label>
						<input name="name" type="text" required value={npcEditTarget.name} />
					</div>
					<div class="field required">
						<label>Rôle / Titre</label>
						<input name="role" type="text" required value={npcEditTarget.role} />
					</div>
					<div class="field">
						<label>Affiliation</label>
						<input name="affiliation" type="text" value={npcEditTarget.affiliation ?? ''} />
					</div>
					<div class="field">
						<label>Statut</label>
						<select name="status">
							<option value="vivant" selected={npcEditTarget.status === 'vivant'}>✅ Vivant</option>
							<option value="mort" selected={npcEditTarget.status === 'mort'}>💀 Mort</option>
							<option value="malade" selected={npcEditTarget.status === 'malade'}>🤢 Malade</option>
							<option value="pétrifié" selected={npcEditTarget.status === 'pétrifié'}
								>🪨 Pétrifié</option
							>
							<option value="prisonnière" selected={npcEditTarget.status === 'prisonnière'}
								>⛓️ Prisonnier/ère</option
							>
						</select>
					</div>
					<div class="field">
						<label>Visibilité</label>
						<select name="visibility">
							<option value="dm_only" selected={npcEditTarget.visibility === 'dm_only'}
								>🔒 MJ uniquement</option
							>
							<option value="players" selected={npcEditTarget.visibility === 'players'}
								>👥 Joueurs</option
							>
							<option value="public" selected={npcEditTarget.visibility === 'public'}
								>🌐 Public</option
							>
						</select>
					</div>
					<div class="field">
						<label>Image</label>
						<ImageUpload
							name="image_url"
							placeholder="/img/pnj/nom.png"
							value={npcEditTarget.image_url ?? ''}
						/>
					</div>
					<div class="field full">
						<label>Description (visible joueurs)</label>
						<textarea name="description" rows="3">{npcEditTarget.description ?? ''}</textarea>
					</div>
					<div class="field full">
						<label>Notes MJ (privées)</label>
						<textarea name="dm_notes" rows="3">{npcEditTarget.dm_notes ?? ''}</textarea>
					</div>
					<div class="field full npc-stats-section">
						<div class="npc-stats-label">
							Stats de combat <span class="npc-stats-hint">(optionnel)</span>
						</div>
						<div class="npc-stats-grid">
							<div class="field">
								<label>PV</label><input
									name="hp"
									type="number"
									min="1"
									value={npcEditTarget.hp ?? ''}
									placeholder="—"
								/>
							</div>
							<div class="field">
								<label>CA</label><input
									name="ac"
									type="number"
									min="1"
									value={npcEditTarget.ac ?? ''}
									placeholder="—"
								/>
							</div>
							<div class="field">
								<label>FOR</label><input
									name="str_score"
									type="number"
									min="1"
									max="30"
									value={npcEditTarget.str_score ?? ''}
									placeholder="—"
								/>
							</div>
							<div class="field">
								<label>DEX</label><input
									name="dex_score"
									type="number"
									min="1"
									max="30"
									value={npcEditTarget.dex_score ?? ''}
									placeholder="—"
								/>
							</div>
							<div class="field">
								<label>CON</label><input
									name="con_score"
									type="number"
									min="1"
									max="30"
									value={npcEditTarget.con_score ?? ''}
									placeholder="—"
								/>
							</div>
							<div class="field">
								<label>INT</label><input
									name="int_score"
									type="number"
									min="1"
									max="30"
									value={npcEditTarget.int_score ?? ''}
									placeholder="—"
								/>
							</div>
							<div class="field">
								<label>SAG</label><input
									name="wis_score"
									type="number"
									min="1"
									max="30"
									value={npcEditTarget.wis_score ?? ''}
									placeholder="—"
								/>
							</div>
							<div class="field">
								<label>CHA</label><input
									name="cha_score"
									type="number"
									min="1"
									max="30"
									value={npcEditTarget.cha_score ?? ''}
									placeholder="—"
								/>
							</div>
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn-primary">Enregistrer</button>
					<button type="button" class="btn-secondary" onclick={() => (npcEditTarget = null)}
						>Annuler</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal session création / édition -->
{#if sessionShowModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeSessionOnBackdrop}>
		<div class="modal modal-lg">
			<button class="modal-close" onclick={closeSessionForm}>✕</button>
			<h2 class="modal-title">
				{sessionEditing ? `Session ${sessionEditing.number} — Modifier` : 'Nouvelle Session'}
			</h2>

			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}

			<form
				method="POST"
				action="?/saveSession"
				use:enhance={() =>
					({ result, update }) => {
						if (result.type === 'success') closeSessionForm();
						update();
					}}
			>
				{#if sessionEditing}<input type="hidden" name="id" value={sessionEditing.id} />{/if}

				<div class="form-grid">
					<div class="field">
						<label for="s-number">N° de session</label>
						<input
							id="s-number"
							name="number"
							type="number"
							min="1"
							value={sessionEditing?.number ?? sessions.length + 1}
						/>
					</div>
					<div class="field">
						<label for="s-date">Date jouée</label>
						<input
							id="s-date"
							name="date_played"
							type="date"
							value={toInputDate(sessionEditing?.date_played ?? null)}
						/>
					</div>
					<div class="field full">
						<label for="s-campaign">Campagne</label>
						<input
							id="s-campaign"
							name="campaign"
							type="text"
							value={sessionEditing?.campaign ?? 'Colloc-Action'}
							placeholder="Ex: Colloc-Action, Arc 2…"
						/>
					</div>
					<div class="field full required">
						<label for="s-title">Titre</label>
						<input
							id="s-title"
							name="title"
							type="text"
							required
							value={sessionEditing?.title ?? ''}
							placeholder="Ex: L'Attaque dans la Forêt"
						/>
					</div>
					<div class="field full">
						<div class="summary-field-header">
							<label for="s-summary">Résumé (visible joueurs)</label>
							<button
								type="button"
								class="btn-ai-toggle"
								onclick={() => (sessionShowAi = !sessionShowAi)}
							>
								{sessionShowAi ? '✕ IA' : '✨ Générer via IA'}
							</button>
						</div>
						{#if sessionShowAi}
							<div class="ai-summary-block">
								<textarea
									class="ai-notes-input"
									rows="4"
									placeholder="Collez vos notes brutes de session ici — l'IA rédigera un résumé narratif…"
									bind:value={sessionAiRawNotes}
								></textarea>
								<div class="ai-sum-actions">
									<button
										type="button"
										class="btn-generate"
										onclick={generateSessionSummary}
										disabled={sessionAiLoading || !sessionAiRawNotes.trim()}
									>
										{sessionAiLoading ? '⏳ Rédaction…' : '✨ Rédiger le résumé'}
									</button>
								</div>
								{#if sessionAiError}<div class="error-msg">{sessionAiError}</div>{/if}
								{#if sessionGeneratedSummary}
									<div class="ai-summary-preview">
										<p>{sessionGeneratedSummary}</p>
										<button type="button" class="btn-use-summary" onclick={useSessionSummary}
											>↳ Utiliser ce résumé</button
										>
									</div>
								{/if}
							</div>
						{/if}
						<textarea
							id="s-summary"
							name="summary"
							rows="7"
							placeholder="Ce que les joueurs ont vécu…"
							bind:this={sessionSummaryEl}>{sessionEditing?.summary ?? ''}</textarea
						>
					</div>
					<div class="field full">
						<label for="s-dm-notes">Notes MJ (privées)</label>
						<textarea
							id="s-dm-notes"
							name="dm_notes"
							rows="4"
							placeholder="Coulisses, révélations à venir…"
							>{sessionEditing?.dm_notes ?? ''}</textarea
						>
					</div>
					<div class="field">
						<label for="s-xp">XP accordés</label>
						<input
							id="s-xp"
							name="xp_awarded"
							type="number"
							min="0"
							value={sessionEditing?.xp_awarded ?? 0}
						/>
					</div>
					<div class="field">
						<label for="s-vis">Visibilité</label>
						<select id="s-vis" name="visibility">
							<option value="dm_only" selected={sessionEditing?.visibility === 'dm_only'}
								>🔒 MJ uniquement</option
							>
							<option
								value="players"
								selected={!sessionEditing || sessionEditing.visibility === 'players'}
								>👥 Joueurs</option
							>
							<option value="public" selected={sessionEditing?.visibility === 'public'}
								>🌐 Public</option
							>
						</select>
					</div>
					<div class="field full">
						<label>Images & Documents</label>
						<FileAttachments bind:value={sessionAttachments} uploadUrl="/api/upload/session" />
					</div>
				</div>

				<div class="form-actions">
					<button type="submit" class="btn-primary"
						>{sessionEditing ? 'Enregistrer' : 'Créer'}</button
					>
					<button type="button" class="btn-secondary" onclick={closeSessionForm}>Annuler</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Fiche monstre (panneau latéral) -->
{#if sheetMonster}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="drawer-backdrop" onclick={() => (sheetMonster = null)}></div>
	<div class="char-drawer monster-sheet-drawer">
		<button class="modal-close" onclick={() => (sheetMonster = null)}>✕</button>
		<a href="/admin/monstres?edit={sheetMonster.id}" class="btn-edit-monster"
			>✏️ Modifier ce monstre</a
		>
		{#if sheetMonster.image_url}
			<img src={sheetMonster.image_url} alt={sheetMonster.name} class="sheet-img" />
		{/if}
		<h2 class="drawer-title">{sheetMonster.name}</h2>
		{#if sheetMonster.size || sheetMonster.type || sheetMonster.alignment}
			<p class="sheet-subtitle">
				{[sheetMonster.size, sheetMonster.type, sheetMonster.alignment].filter(Boolean).join(' · ')}
			</p>
		{/if}
		<div class="sheet-stats-row">
			{#if sheetMonster.cr}<div class="sheet-stat-box">
					<span class="stat-lbl">FP</span><span class="stat-val">{sheetMonster.cr}</span>
				</div>{/if}
			{#if sheetMonster.hp}<div class="sheet-stat-box">
					<span class="stat-lbl">PV</span><span class="stat-val">{sheetMonster.hp}</span>
				</div>{/if}
			{#if sheetMonster.ac}<div class="sheet-stat-box">
					<span class="stat-lbl">CA</span><span class="stat-val">{sheetMonster.ac}</span>
				</div>{/if}
			{#if sheetMonster.speed}<div class="sheet-stat-box">
					<span class="stat-lbl">VIT</span><span class="stat-val" style="font-size:0.75rem"
						>{sheetMonster.speed}</span
					>
				</div>{/if}
		</div>
		{#if sheetMonster.str_score || sheetMonster.dex_score || sheetMonster.con_score || sheetMonster.int_score || sheetMonster.wis_score || sheetMonster.cha_score}
			<div class="ability-scores">
				{#each [['FOR', sheetMonster.str_score], ['DEX', sheetMonster.dex_score], ['CON', sheetMonster.con_score], ['INT', sheetMonster.int_score], ['SAG', sheetMonster.wis_score], ['CHA', sheetMonster.cha_score]] as [lbl, val]}
					<div class="ability-score">
						<span class="as-lbl">{lbl}</span>
						<span class="as-val">{val ?? '—'}</span>
						{#if val != null}<span class="as-mod"
								>({Math.floor((val - 10) / 2) >= 0 ? '+' : ''}{Math.floor((val - 10) / 2)})</span
							>{/if}
					</div>
				{/each}
			</div>
		{/if}
		<div class="sheet-props">
			{#if sheetMonster.saving_throws}<p>
					<span class="prop-lbl">Jets de sauvegarde</span>
					{sheetMonster.saving_throws}
				</p>{/if}
			{#if sheetMonster.skills_text}<p>
					<span class="prop-lbl">Compétences</span>
					{sheetMonster.skills_text}
				</p>{/if}
			{#if sheetMonster.damage_resistances}<p>
					<span class="prop-lbl">Résistances</span>
					{sheetMonster.damage_resistances}
				</p>{/if}
			{#if sheetMonster.damage_immunities}<p>
					<span class="prop-lbl">Immunités (dégâts)</span>
					{sheetMonster.damage_immunities}
				</p>{/if}
			{#if sheetMonster.condition_immunities}<p>
					<span class="prop-lbl">Immunités (états)</span>
					{sheetMonster.condition_immunities}
				</p>{/if}
			{#if sheetMonster.senses}<p><span class="prop-lbl">Sens</span> {sheetMonster.senses}</p>{/if}
			{#if sheetMonster.languages}<p>
					<span class="prop-lbl">Langues</span>
					{sheetMonster.languages}
				</p>{/if}
		</div>
		{#if sheetMonster.description}<p class="sheet-text">{sheetMonster.description}</p>{/if}
		{#if sheetMonster.special_abilities}
			<h4 class="sheet-section-title">Capacités spéciales</h4>
			<p class="sheet-text">{sheetMonster.special_abilities}</p>
		{/if}
		{#if sheetMonster.actions}
			<h4 class="sheet-section-title">Actions</h4>
			<p class="sheet-text">{sheetMonster.actions}</p>
		{/if}
		{#if sheetMonster.reactions}
			<h4 class="sheet-section-title">Réactions</h4>
			<p class="sheet-text">{sheetMonster.reactions}</p>
		{/if}
		{#if sheetMonster.legendary_actions}
			<h4 class="sheet-section-title">Actions légendaires</h4>
			<p class="sheet-text">{sheetMonster.legendary_actions}</p>
		{/if}
		{#if sheetMonster.notes}
			<h4 class="sheet-section-title">Notes DM</h4>
			<p class="sheet-text">{sheetMonster.notes}</p>
		{/if}
		{#if sheetMonster.source_url}
			<a
				href={sheetMonster.source_url}
				target="_blank"
				rel="noopener noreferrer"
				class="sheet-source-link">🔗 Voir la fiche complète</a
			>
		{/if}
	</div>
{/if}

<!-- Fiche PNJ (panneau latéral) -->
{#if sheetNpc}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="drawer-backdrop" onclick={() => (sheetNpc = null)}></div>
	<div class="char-drawer monster-sheet-drawer">
		<button class="modal-close" onclick={() => (sheetNpc = null)}>✕</button>
		{#if sheetNpc.image_url}
			<img src={sheetNpc.image_url} alt={sheetNpc.name} class="sheet-img" />
		{/if}
		<h2 class="drawer-title">{sheetNpc.name}</h2>
		{#if sheetNpc.role}<p class="sheet-subtitle">
				{sheetNpc.role}{sheetNpc.affiliation ? ` · ${sheetNpc.affiliation}` : ''}
			</p>{/if}
		{#if sheetNpc.hp || sheetNpc.ac}
			<div class="sheet-stats-row">
				{#if sheetNpc.hp}<div class="sheet-stat-box">
						<span class="stat-lbl">PV</span><span class="stat-val">{sheetNpc.hp}</span>
					</div>{/if}
				{#if sheetNpc.ac}<div class="sheet-stat-box">
						<span class="stat-lbl">CA</span><span class="stat-val">{sheetNpc.ac}</span>
					</div>{/if}
				{#if sheetNpc.str_score}<div class="sheet-stat-box">
						<span class="stat-lbl">FOR</span><span class="stat-val">{sheetNpc.str_score}</span>
					</div>{/if}
				{#if sheetNpc.dex_score}<div class="sheet-stat-box">
						<span class="stat-lbl">DEX</span><span class="stat-val">{sheetNpc.dex_score}</span>
					</div>{/if}
				{#if sheetNpc.con_score}<div class="sheet-stat-box">
						<span class="stat-lbl">CON</span><span class="stat-val">{sheetNpc.con_score}</span>
					</div>{/if}
				{#if sheetNpc.int_score}<div class="sheet-stat-box">
						<span class="stat-lbl">INT</span><span class="stat-val">{sheetNpc.int_score}</span>
					</div>{/if}
				{#if sheetNpc.wis_score}<div class="sheet-stat-box">
						<span class="stat-lbl">SAG</span><span class="stat-val">{sheetNpc.wis_score}</span>
					</div>{/if}
				{#if sheetNpc.cha_score}<div class="sheet-stat-box">
						<span class="stat-lbl">CHA</span><span class="stat-val">{sheetNpc.cha_score}</span>
					</div>{/if}
			</div>
		{/if}
		{#if sheetNpc.description}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Description</h4>
				<p class="sheet-text">{sheetNpc.description}</p>
			</div>
		{/if}
		{#if sheetNpc.personality}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Personnalité</h4>
				<p class="sheet-text">{sheetNpc.personality}</p>
			</div>
		{/if}
		{#if sheetNpc.motivation}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Motivation</h4>
				<p class="sheet-text">{sheetNpc.motivation}</p>
			</div>
		{/if}
		{#if sheetNpc.secret}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Secret</h4>
				<p class="sheet-text">{sheetNpc.secret}</p>
			</div>
		{/if}
		{#if sheetNpc.dm_notes}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Notes MJ</h4>
				<p class="sheet-text">{sheetNpc.dm_notes}</p>
			</div>
		{/if}
	</div>
{/if}

<!-- Drawer modifier PJ -->
{#if editChar}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="drawer-backdrop" onclick={closeCharModal}></div>
	<div class="char-drawer">
		<button class="modal-close" onclick={() => (editChar = null)}>✕</button>
		<h2 class="drawer-title">Modifier — {editChar.name}</h2>
		<p class="drawer-sub">{editChar.race} {editChar.class}</p>
		{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
		<form
			method="POST"
			action="?/updateCharFull"
			use:enhance={() =>
				({ result, update }) => {
					if (result.type === 'success') editChar = null;
					update();
				}}
		>
			<input type="hidden" name="id" value={editChar.id} />
			<div class="drawer-grid">
				<div class="field full">
					<label>Nom</label>
					<input name="name" type="text" value={editChar.name} />
				</div>
				<div class="field">
					<label>Race</label>
					<input name="race" type="text" list="ec-race-list" value={editChar.race} />
					<datalist id="ec-race-list"
						>{#each CHAR_RACES as r}<option value={r}></option>{/each}</datalist
					>
				</div>
				<div class="field">
					<label>Classe</label>
					<input name="class" type="text" list="ec-class-list" value={editChar.class} />
					<datalist id="ec-class-list"
						>{#each CHAR_CLASSES as c}<option value={c}></option>{/each}</datalist
					>
				</div>
				<div class="field">
					<label>Joueur</label>
					<select name="player_id">
						<option value="">— Sans joueur —</option>
						{#each data.players as player}
							<option value={player.id} selected={player.id === editChar.player_id}
								>{player.display_name}</option
							>
						{/each}
					</select>
				</div>
				<div class="field">
					<label>Niveau</label>
					<input name="level" type="number" min="1" max="20" value={editChar.level} />
				</div>
				<div class="field">
					<label>PV max</label>
					<input name="hp_max" type="number" min="1" value={editChar.hp_max} />
				</div>
				<div class="field">
					<label>PV actuels</label>
					<input name="hp_current" type="number" min="0" value={editChar.hp_current} />
				</div>
				<div class="field">
					<label>CA</label>
					<input name="ac" type="number" min="1" value={editChar.ac} />
				</div>
				<div class="field full">
					<label>Statut</label>
					<select name="status">
						<option value="vivant" selected={editChar.status === 'vivant'}>✅ Vivant</option>
						<option value="mort" selected={editChar.status === 'mort'}>💀 Mort</option>
						<option value="malade" selected={editChar.status === 'malade'}>🤢 Malade</option>
						<option value="pétrifié" selected={editChar.status === 'pétrifié'}>🪨 Pétrifié</option>
						<option value="prisonnière" selected={editChar.status === 'prisonnière'}
							>⛓️ Prisonnier/ère</option
						>
					</select>
				</div>
				<div class="field full">
					<label>Historique (partagé)</label>
					<textarea name="backstory" rows="3">{editChar.backstory ?? ''}</textarea>
				</div>
				<div class="field full">
					<label>Notes MJ (privées)</label>
					<textarea name="dm_backstory" rows="2">{editChar.dm_backstory ?? ''}</textarea>
				</div>
			</div>
			<div class="form-actions">
				<button type="button" class="btn-secondary" onclick={() => (editChar = null)}
					>Annuler</button
				>
				<button type="submit" class="btn-primary">Enregistrer</button>
			</div>
		</form>
	</div>
{/if}

<!-- Fiche PNJ (panneau latéral) -->
{#if sheetNpc}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="drawer-backdrop" onclick={() => (sheetNpc = null)}></div>
	<div class="char-drawer monster-sheet-drawer">
		<button class="modal-close" onclick={() => (sheetNpc = null)}>✕</button>
		{#if sheetNpc.image_url}
			<img src={sheetNpc.image_url} alt={sheetNpc.name} class="sheet-img" />
		{/if}
		<h2 class="drawer-title">{sheetNpc.name}</h2>
		{#if sheetNpc.role}<p class="sheet-subtitle">
				{sheetNpc.role}{sheetNpc.affiliation ? ` · ${sheetNpc.affiliation}` : ''}
			</p>{/if}
		{#if sheetNpc.hp || sheetNpc.ac}
			<div class="sheet-stats-row">
				{#if sheetNpc.hp}<div class="sheet-stat-box">
						<span class="stat-lbl">PV</span><span class="stat-val">{sheetNpc.hp}</span>
					</div>{/if}
				{#if sheetNpc.ac}<div class="sheet-stat-box">
						<span class="stat-lbl">CA</span><span class="stat-val">{sheetNpc.ac}</span>
					</div>{/if}
				{#if sheetNpc.str_score}<div class="sheet-stat-box">
						<span class="stat-lbl">FOR</span><span class="stat-val">{sheetNpc.str_score}</span>
					</div>{/if}
				{#if sheetNpc.dex_score}<div class="sheet-stat-box">
						<span class="stat-lbl">DEX</span><span class="stat-val">{sheetNpc.dex_score}</span>
					</div>{/if}
				{#if sheetNpc.con_score}<div class="sheet-stat-box">
						<span class="stat-lbl">CON</span><span class="stat-val">{sheetNpc.con_score}</span>
					</div>{/if}
				{#if sheetNpc.int_score}<div class="sheet-stat-box">
						<span class="stat-lbl">INT</span><span class="stat-val">{sheetNpc.int_score}</span>
					</div>{/if}
				{#if sheetNpc.wis_score}<div class="sheet-stat-box">
						<span class="stat-lbl">SAG</span><span class="stat-val">{sheetNpc.wis_score}</span>
					</div>{/if}
				{#if sheetNpc.cha_score}<div class="sheet-stat-box">
						<span class="stat-lbl">CHA</span><span class="stat-val">{sheetNpc.cha_score}</span>
					</div>{/if}
			</div>
		{/if}
		{#if sheetNpc.description}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Description</h4>
				<p class="sheet-text">{sheetNpc.description}</p>
			</div>
		{/if}
		{#if sheetNpc.personality}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Personnalité</h4>
				<p class="sheet-text">{sheetNpc.personality}</p>
			</div>
		{/if}
		{#if sheetNpc.motivation}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Motivation</h4>
				<p class="sheet-text">{sheetNpc.motivation}</p>
			</div>
		{/if}
		{#if sheetNpc.secret}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Secret</h4>
				<p class="sheet-text">{sheetNpc.secret}</p>
			</div>
		{/if}
		{#if sheetNpc.dm_notes}
			<div class="sheet-section">
				<h4 class="sheet-section-title">Notes MJ</h4>
				<p class="sheet-text">{sheetNpc.dm_notes}</p>
			</div>
		{/if}
	</div>
{/if}

<!-- Modal modifier joueur -->
{#if editPlayer}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => (editPlayer = null)}>✕</button>
			<h2>Modifier — {editPlayer.display_name}</h2>
			<p class="modal-email">{editPlayer.email}</p>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form
				method="POST"
				action="?/updatePlayer"
				use:enhance={() =>
					({ result, update }) => {
						if (result.type === 'success') editPlayer = null;
						update();
					}}
			>
				<input type="hidden" name="id" value={editPlayer.id} />
				<div class="form-grid">
					<div class="field">
						<label>Nom affiché</label><input
							name="display_name"
							type="text"
							value={editPlayer.display_name}
						/>
					</div>
					<div class="field">
						<label>Rôle</label>
						<select name="role">
							<option value="player" selected={editPlayer.role === 'player'}>⚔️ Joueur</option>
							<option value="dm" selected={editPlayer.role === 'dm'}>🎲 Maître du Jeu</option>
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={() => (editPlayer = null)}
						>Annuler</button
					>
					<button type="submit" class="btn-primary">Enregistrer</button>
				</div>
			</form>

			<div class="pj-section">
				<div class="pj-section-title">Personnages associés</div>
				{#if editPlayer.characters.length === 0}
					<p class="pj-empty">Aucun PJ associé.</p>
				{:else}
					{#each editPlayer.characters as c}
						<div class="pj-row">
							<span class="pj-name">{c.name}</span>
							<span class="pj-meta">{c.class} niv.{c.level}</span>
							<form method="POST" action="?/assignChar" use:enhance>
								<input type="hidden" name="char_id" value={c.id} />
								<input type="hidden" name="player_id" value="" />
								<button type="submit" class="btn-unassign" title="Désassocier">✕</button>
							</form>
						</div>
					{/each}
				{/if}
				{#if unassignedChars.length > 0}
					<form method="POST" action="?/assignChar" use:enhance class="assign-form">
						<input type="hidden" name="player_id" value={editPlayer.id} />
						<select name="char_id" class="assign-select">
							<option value="">Associer un PJ…</option>
							{#each unassignedChars as c}
								<option value={c.id}>{c.name} ({c.class} niv.{c.level})</option>
							{/each}
						</select>
						<button type="submit" class="btn-assign">Associer</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.admin-page {
		padding-bottom: 4rem;
	}

	/* Header */
	.page-header {
		padding: 3rem 0 1.5rem;
		border-bottom: 1px solid #1a1a1a;
		margin-bottom: 1.75rem;
	}
	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.subtitle {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.4);
		margin-top: 0.3rem;
		letter-spacing: 0.05em;
	}
	.combat-live-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(194, 55, 74, 0.12);
		border: 1px solid rgba(194, 55, 74, 0.35);
		color: #c2374a;
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.5rem 1rem;
		border-radius: 3px;
	}
	.dot-live {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #c2374a;
		display: inline-block;
		animation: pulse 1.5s infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	/* Stats */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.75rem;
		margin-bottom: 2rem;
	}
	.stat-card {
		text-align: center;
		padding: 1rem 0.75rem !important;
	}
	.stat-val {
		display: block;
		font-family: 'Cinzel', serif;
		font-size: 1.8rem;
		font-weight: 900;
		color: #c2374a;
		line-height: 1;
	}
	.stat-label {
		display: block;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		margin-top: 0.4rem;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid #1a1a1a;
		margin-bottom: 1.75rem;
	}
	.tab {
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: rgba(240, 237, 234, 0.45);
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		padding: 0.65rem 1.1rem;
		cursor: pointer;
		transition: color 0.15s;
		margin-bottom: -1px;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.tab:hover {
		color: rgba(240, 237, 234, 0.8);
	}
	.tab-active {
		color: #c2374a;
		border-bottom-color: #c2374a;
	}
	.tab-count {
		font-size: 0.58rem;
		background: rgba(255, 255, 255, 0.07);
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		color: rgba(240, 237, 234, 0.35);
	}

	.section-actions {
		margin-bottom: 1.25rem;
	}
	.empty-state {
		text-align: center;
		padding: 3rem;
		color: rgba(240, 237, 234, 0.3);
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* Users management toolbar */
	.users-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}
	.users-count {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.35);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.subsection-title {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.28);
		margin-bottom: 0.75rem;
		margin-top: 1.5rem;
	}

	.invite-panel {
		margin-bottom: 1.25rem;
		padding: 1.25rem;
	}
	.invite-panel-title {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #c2374a;
		margin-bottom: 1rem;
	}
	.invite-form-row {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
	}
	.invite-form-row .field {
		flex: 1;
	}
	.field-role {
		max-width: 180px;
	}
	.btn-invite-submit {
		align-self: flex-end;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.invite-result {
		margin-bottom: 1.25rem;
		padding: 1rem 1.25rem;
	}
	.inv-label {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.35);
		display: block;
		margin-bottom: 0.55rem;
	}
	.inv-link-row {
		display: flex;
		gap: 0.5rem;
	}
	.inv-link-input {
		flex: 1;
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.5rem 0.75rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 0.88rem;
	}
	.btn-copy {
		background: transparent;
		border: 1px solid #2a3a4a;
		color: rgba(240, 237, 234, 0.5);
		padding: 0.4rem 0.85rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}
	.btn-copy:hover {
		border-color: #5cb85c;
		color: #5cb85c;
	}

	.inv-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}
	.inv-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 1rem;
	}
	.inv-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.inv-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.inv-email {
		font-size: 0.85rem;
		color: rgba(240, 237, 234, 0.6);
	}
	.inv-expires {
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.28);
		font-family: 'Cinzel', serif;
		letter-spacing: 0.03em;
	}
	.error-msg {
		background: #1a0508;
		border: 1px solid rgba(194, 55, 74, 0.3);
		color: #e05060;
		padding: 0.5rem 0.75rem;
		border-radius: 3px;
		font-size: 0.88rem;
		margin-bottom: 0.75rem;
	}

	/* Players */
	.player-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}
	.player-card {
		padding: 1rem;
	}
	.player-top {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-bottom: 0.65rem;
	}
	.player-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(194, 55, 74, 0.15);
		border: 1px solid rgba(194, 55, 74, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Cinzel', serif;
		font-size: 0.9rem;
		font-weight: 700;
		color: #c2374a;
		flex-shrink: 0;
	}
	.player-identity {
		flex: 1;
		min-width: 0;
	}
	.player-name {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.player-email {
		font-size: 0.75rem;
		color: rgba(240, 237, 234, 0.35);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.role-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.55rem;
		border-radius: 3px;
		border: 1px solid;
		white-space: nowrap;
	}
	.role-dm {
		color: #f0a500;
		border-color: rgba(240, 165, 0, 0.4);
		background: rgba(240, 165, 0, 0.08);
	}
	.role-player {
		color: #2b8fd4;
		border-color: rgba(43, 143, 212, 0.4);
		background: rgba(43, 143, 212, 0.08);
	}
	.btn-icon {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(240, 237, 234, 0.4);
		width: 28px;
		height: 28px;
		border-radius: 4px;
		font-size: 0.75rem;
		flex-shrink: 0;
		transition: all 0.15s;
	}
	.btn-icon:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.char-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		padding-top: 0.75rem;
	}
	.char-item {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: 0.2rem 0.75rem;
	}
	.char-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		grid-column: 1;
	}
	.char-name {
		font-family: 'Cinzel', serif;
		font-size: 0.75rem;
		font-weight: 700;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.char-class {
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.45);
	}
	.vis-dot {
		font-size: 0.6rem;
		color: rgba(240, 237, 234, 0.2);
	}
	.vis-dot.vis-pub {
		color: #5cb85c;
	}
	.hp-bar-wrap {
		height: 3px;
		background: #1a1a1a;
		border-radius: 2px;
		overflow: hidden;
		grid-column: 1;
	}
	.hp-bar {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s;
	}
	.hp-text {
		font-size: 0.68rem;
		color: rgba(240, 237, 234, 0.4);
		grid-column: 2;
		grid-row: 1 / 3;
		align-self: center;
		white-space: nowrap;
	}
	.no-char {
		font-size: 0.75rem;
		color: rgba(240, 237, 234, 0.2);
		font-style: italic;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		padding-top: 0.6rem;
	}

	/* Sessions */
	.sessions-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.session-row {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		padding: 1rem 1.25rem;
	}
	.session-num {
		font-family: 'Cinzel Decorative', serif;
		font-size: 1.8rem;
		font-weight: 900;
		color: #c2374a;
		min-width: 2rem;
		line-height: 1.1;
		flex-shrink: 0;
	}
	.session-info {
		flex: 1;
		min-width: 0;
	}
	.session-title {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #fff;
		margin-bottom: 0.3rem;
	}
	.session-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.4rem;
	}
	.s-date-plain {
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.4);
		font-family: 'Cinzel', serif;
	}
	.xp-badge-sm {
		background: #0a2a12;
		color: #5cb85c;
		border: 1px solid rgba(92, 184, 92, 0.3);
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
	}
	.vis-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}
	.vis-dm {
		background: #3a0a12;
		color: #e05060;
		border: 1px solid rgba(194, 55, 74, 0.3);
	}
	.vis-players {
		background: #0a1a2a;
		color: #4aaae8;
		border: 1px solid rgba(43, 143, 212, 0.3);
	}
	.vis-public {
		background: #0a2a12;
		color: #5cb85c;
		border: 1px solid rgba(92, 184, 92, 0.3);
	}
	.summary-preview {
		font-size: 0.88rem;
		color: rgba(240, 237, 234, 0.45);
		line-height: 1.5;
	}
	.session-actions {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.btn-share {
		background: transparent;
		border: 1px solid #2a3a2a;
		color: rgba(240, 237, 234, 0.4);
		padding: 0.25rem 0.6rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s;
	}
	.btn-share.shared {
		border-color: #2a6a2a;
		color: #5cb85c;
	}
	.btn-share:hover {
		border-color: #5cb85c;
		color: #5cb85c;
	}
	.btn-edit-row {
		background: rgba(43, 143, 212, 0.15);
		border: 1px solid rgba(43, 143, 212, 0.3);
		color: #4aaae8;
		padding: 0.25rem 0.6rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-edit-row:hover {
		background: rgba(43, 143, 212, 0.3);
	}
	.btn-delete-row {
		background: transparent;
		border: 1px solid #3a1a1a;
		color: rgba(240, 237, 234, 0.35);
		padding: 0.25rem 0.6rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s;
	}
	.btn-delete-row:hover {
		border-color: #c2374a;
		color: #e05060;
	}

	/* Session modal */
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.field.full {
		grid-column: 1 / -1;
	}
	.field.required label::after {
		content: ' *';
		color: #c2374a;
	}
	.form-actions {
		margin-top: 1.25rem;
		display: flex;
		gap: 0.75rem;
	}
	.summary-field-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}
	.summary-field-header label {
		margin-bottom: 0;
	}
	.btn-ai-toggle {
		background: rgba(194, 55, 74, 0.1);
		border: 1px solid rgba(194, 55, 74, 0.35);
		color: #c2374a;
		padding: 0.2rem 0.6rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-ai-toggle:hover {
		background: rgba(194, 55, 74, 0.2);
	}
	.ai-summary-block {
		background: rgba(194, 55, 74, 0.04);
		border: 1px solid rgba(194, 55, 74, 0.12);
		border-radius: 4px;
		padding: 0.85rem;
		margin-bottom: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.ai-notes-input {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.55rem 0.75rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 1rem;
		width: 100%;
		resize: vertical;
	}
	.ai-notes-input:focus {
		outline: none;
		border-color: #c2374a;
	}
	.ai-sum-actions {
	}
	.btn-generate {
		background: #c2374a;
		border: none;
		color: #fff;
		padding: 0.45rem 1rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-generate:hover:not(:disabled) {
		background: #e04060;
	}
	.btn-generate:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.ai-summary-preview {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		padding: 0.75rem;
	}
	.ai-summary-preview p {
		font-size: 0.9rem;
		color: rgba(240, 237, 234, 0.75);
		line-height: 1.6;
		white-space: pre-wrap;
	}
	.btn-use-summary {
		display: block;
		margin-top: 0.6rem;
		background: #c2374a;
		border: none;
		color: #fff;
		padding: 0.35rem 0.85rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-use-summary:hover {
		background: #e04060;
	}

	/* NPCs management */
	.btn-ai-sm {
		background: rgba(194, 55, 74, 0.1);
		border: 1px solid rgba(194, 55, 74, 0.4);
		color: #c2374a;
		padding: 0.5rem 1rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-ai-sm:hover {
		background: rgba(194, 55, 74, 0.2);
	}

	.npc-ai-panel {
		margin-bottom: 1.25rem;
		border-color: rgba(194, 55, 74, 0.2);
	}
	.ai-panel-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.ai-panel-label {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		color: #c2374a;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.ai-panel-hint {
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.35);
	}
	.ai-actions-row {
		margin-top: 1rem;
	}
	.npc-ai-result {
		margin-top: 1.25rem;
		background: rgba(194, 55, 74, 0.05);
		border: 1px solid rgba(194, 55, 74, 0.15);
		border-radius: 4px;
		padding: 1rem 1.25rem;
	}
	.npc-ai-result-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.6rem;
	}
	.npc-ai-name {
		font-family: 'Cinzel', serif;
		font-size: 0.95rem;
		font-weight: 900;
		color: #fff;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.npc-ai-sub {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.5);
	}
	.npc-ai-desc {
		font-size: 0.9rem;
		color: rgba(240, 237, 234, 0.7);
		line-height: 1.55;
		margin-bottom: 0.75rem;
	}
	.npc-ai-dm {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}
	.npc-dm-line {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.5);
	}
	.npc-dm-line.npc-dm-secret {
		color: rgba(194, 55, 74, 0.8);
	}
	.npc-dm-key {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.35);
		margin-right: 0.4rem;
	}
	.npc-ai-actions {
		display: flex;
		gap: 0.75rem;
	}
	.btn-use-ai {
		background: #c2374a;
		border: none;
		color: #fff;
		padding: 0.4rem 1rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-use-ai:hover {
		background: #e04060;
	}
	.btn-regen {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(240, 237, 234, 0.5);
		padding: 0.4rem 0.75rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-regen:hover:not(:disabled) {
		border-color: #c2374a;
		color: #c2374a;
	}
	.btn-regen:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.npc-form-panel {
		margin-bottom: 1.5rem;
	}
	.npc-form-title {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		color: #c2374a;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 1.25rem;
	}

	.npc-mgmt-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.npc-row-full {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1rem;
	}
	.npc-img-wrap {
		flex-shrink: 0;
	}
	.npc-img-wrap img,
	.npc-img-placeholder {
		width: 52px;
		height: 52px;
		border-radius: 4px;
		object-fit: cover;
		border: 1px solid #2a2a2a;
	}
	.npc-img-placeholder {
		background: #1a1a1a;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.4rem;
	}
	.npc-row-info {
		flex: 1;
		min-width: 0;
	}
	.npc-row-name {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.ai-badge-sm {
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		color: #c2374a;
		border: 1px solid rgba(194, 55, 74, 0.35);
		padding: 0.05rem 0.3rem;
		border-radius: 2px;
	}
	.npc-row-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
		flex-wrap: wrap;
	}
	.npc-meta-role {
		font-size: 0.85rem;
		color: rgba(240, 237, 234, 0.6);
	}
	.npc-meta-affil {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.45);
	}
	.npc-meta-sep {
		color: rgba(240, 237, 234, 0.2);
	}
	.npc-row-desc {
		font-size: 0.85rem;
		color: rgba(240, 237, 234, 0.45);
		margin-top: 0.3rem;
		line-height: 1.4;
	}
	.npc-combat-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.35rem;
	}
	.npc-stat-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		background: rgba(194, 55, 74, 0.08);
		border: 1px solid rgba(194, 55, 74, 0.25);
		color: rgba(240, 237, 234, 0.6);
	}
	.npc-stat-ability {
		background: rgba(43, 143, 212, 0.06);
		border-color: rgba(43, 143, 212, 0.2);
		color: rgba(43, 143, 212, 0.8);
	}
	.npc-stats-section {
		margin-top: 0.25rem;
	}
	.npc-stats-label {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		margin-bottom: 0.6rem;
	}
	.npc-stats-hint {
		font-weight: 400;
		color: rgba(240, 237, 234, 0.25);
	}
	.npc-stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	@media (max-width: 600px) {
		.npc-stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	.npc-row-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.45rem;
		flex-shrink: 0;
	}
	.npc-status-tag {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: #5cb85c;
	}
	.npc-status-tag.npc-dead {
		color: #c2374a;
	}
	.btn-npc-share {
		background: rgba(43, 143, 212, 0.15);
		border: 1px solid rgba(43, 143, 212, 0.3);
		color: #4aaae8;
		padding: 0.25rem 0.6rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-npc-share:hover {
		background: rgba(43, 143, 212, 0.3);
	}
	.btn-npc-unshare {
		background: rgba(194, 55, 74, 0.1);
		border: 1px solid rgba(194, 55, 74, 0.3);
		color: #c2374a;
		padding: 0.25rem 0.6rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-npc-unshare:hover {
		background: rgba(194, 55, 74, 0.25);
	}

	/* Combat */
	.combat-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}
	.card-section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.card-section-title {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.5);
	}
	.count-badge {
		font-size: 0.6rem;
		background: rgba(255, 255, 255, 0.06);
		padding: 0.08rem 0.3rem;
		border-radius: 3px;
		color: rgba(240, 237, 234, 0.3);
		margin-left: 0.4rem;
	}
	.btn-sm {
		padding: 0.35rem 0.85rem !important;
		font-size: 0.68rem !important;
	}

	.add-panel {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #2a2a2a;
		border-radius: 3px;
		padding: 0.85rem;
		margin-bottom: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.add-tabs {
		display: flex;
		gap: 0.4rem;
	}
	.add-tab {
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.45);
		padding: 0.28rem 0.65rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s;
	}
	.add-tab-active {
		background: #c2374a;
		border-color: #c2374a;
		color: #fff;
	}
	.field-inline {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.field-inline label {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.45);
	}
	.add-panel select,
	.add-panel input[type='number'],
	.add-panel input[type='text'] {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.4rem 0.6rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 0.95rem;
		width: 100%;
	}
	.add-panel select:focus,
	.add-panel input:focus {
		outline: none;
		border-color: #c2374a;
	}
	.monster-preview {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid #1a1a1a;
		border-radius: 3px;
		padding: 0.45rem 0.7rem;
		font-size: 0.88rem;
	}
	.monster-preview strong {
		color: #fff;
	}
	.monster-override {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.monster-override label {
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.45);
	}
	.monster-override input {
		width: 60px;
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #fff;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-size: 0.88rem;
	}
	.custom-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	.two-col label {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		display: block;
		margin-bottom: 0.2rem;
	}
	.type-toggle {
		display: flex;
		gap: 0.4rem;
	}
	.toggle-opt {
		flex: 1;
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.4);
		padding: 0.3rem 0.5rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all 0.15s;
	}
	.toggle-enemy {
		background: rgba(194, 55, 74, 0.12);
		border-color: #c2374a;
		color: #e05060;
	}
	.toggle-ally {
		background: rgba(43, 143, 212, 0.12);
		border-color: #2b8fd4;
		color: #2b8fd4;
	}

	.combatants {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.combatant-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #1a1a1a;
		border-radius: 3px;
		padding: 0.45rem 0.7rem;
		transition: border-color 0.15s;
	}
	.combatant-active {
		border-color: #c2374a;
		box-shadow: 0 0 0 1px rgba(194, 55, 74, 0.15);
	}
	.combatant-dead {
		opacity: 0.35;
	}
	.combatant-row input[type='number'] {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #c2374a;
		border-radius: 3px;
		padding: 0.2rem;
		font-family: 'Cinzel', serif;
		font-size: 0.78rem;
		font-weight: 700;
	}
	.c-type-btn {
		background: none;
		border: none;
		font-size: 1rem;
		flex-shrink: 0;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		transition: transform 0.15s;
	}
	.c-type-btn:hover {
		transform: scale(1.2);
	}
	.c-name {
		flex: 1;
		font-family: 'Cinzel', serif;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #f0edea;
	}
	.ac-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(240, 237, 234, 0.45);
		white-space: nowrap;
		flex-shrink: 0;
	}
	.hp-section {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 140px;
		flex-shrink: 0;
	}
	.c-hp-bar-wrap {
		height: 3px;
		background: #1a1a1a;
		border-radius: 2px;
		overflow: hidden;
	}
	.c-hp-bar {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s;
	}
	.hp-controls {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}
	.hp-btn {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s;
	}
	.hp-dmg:hover {
		background: #c2374a;
		border-color: #c2374a;
	}
	.hp-heal:hover {
		background: #2a5c2a;
		border-color: #5cb85c;
	}
	.hp-text {
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.6);
		flex: 1;
		text-align: center;
	}
	.remove-btn {
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.25);
		width: 24px;
		height: 24px;
		border-radius: 3px;
		font-size: 0.65rem;
		flex-shrink: 0;
		cursor: pointer;
		transition: all 0.15s;
	}
	.remove-btn:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.dup-btn {
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.25);
		width: 24px;
		height: 24px;
		border-radius: 3px;
		font-size: 0.75rem;
		flex-shrink: 0;
		cursor: pointer;
		transition: all 0.15s;
	}
	.dup-btn:hover {
		border-color: #5577aa;
		color: #88aacc;
	}
	.sheet-img {
		width: 100%;
		object-fit: contain;
		border-radius: 3px;
		margin-bottom: 1rem;
		display: block;
	}
	.sheet-stats-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.sheet-stat-box {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid #1a1a1a;
		border-radius: 3px;
		padding: 0.4rem 0.75rem;
		text-align: center;
	}
	.stat-lbl {
		display: block;
		font-family: 'Cinzel', serif;
		font-size: 0.55rem;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		letter-spacing: 0.06em;
	}
	.stat-val {
		font-size: 1.1rem;
		font-weight: 700;
		color: #fff;
	}
	.sheet-section-title {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(240, 237, 234, 0.5);
		margin: 1rem 0 0.4rem;
	}
	.sheet-text {
		font-size: 0.9rem;
		color: rgba(240, 237, 234, 0.65);
		line-height: 1.6;
		white-space: pre-wrap;
	}
	.sheet-subtitle {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.45);
		margin-bottom: 1rem;
		font-style: italic;
	}
	.monster-sheet-drawer {
		width: 560px;
	}
	.ability-scores {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.4rem;
		margin: 0.75rem 0;
		border: 1px solid #1a1a1a;
		border-radius: 3px;
		padding: 0.6rem 0.4rem;
		background: rgba(0, 0, 0, 0.3);
	}
	.ability-score {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.as-lbl {
		font-family: 'Cinzel', serif;
		font-size: 0.55rem;
		font-weight: 700;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		letter-spacing: 0.06em;
	}
	.as-val {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
	}
	.as-mod {
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.5);
	}
	.sheet-props {
		margin: 0.75rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		border-top: 1px solid #1a1a1a;
		border-bottom: 1px solid #1a1a1a;
		padding: 0.6rem 0;
	}
	.sheet-props p {
		font-size: 0.85rem;
		color: rgba(240, 237, 234, 0.65);
		line-height: 1.5;
	}
	.prop-lbl {
		font-weight: 700;
		color: rgba(240, 237, 234, 0.85);
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-right: 0.3rem;
	}
	.sheet-source-link {
		display: inline-block;
		margin-top: 1.25rem;
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		color: rgba(194, 55, 74, 0.8);
		text-decoration: none;
		letter-spacing: 0.05em;
		border-bottom: 1px solid rgba(194, 55, 74, 0.3);
		padding-bottom: 0.1rem;
		transition: color 0.15s;
	}
	.sheet-source-link:hover {
		color: #e05060;
	}
	.btn-edit-monster {
		display: inline-block;
		margin-bottom: 1rem;
		background: transparent;
		border: 1px solid #2b8fd4;
		color: #2b8fd4;
		padding: 0.3rem 0.75rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-decoration: none;
		transition: all 0.2s;
	}
	.btn-edit-monster:hover {
		background: rgba(43, 143, 212, 0.15);
	}

	/* Kills */
	.kills-section {
		padding: 1.25rem;
	}
	.kill-form {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #2a2a2a;
		border-radius: 3px;
		padding: 0.85rem;
		margin-bottom: 0.85rem;
	}
	.kill-form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.kill-form input {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.4rem 0.6rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 0.95rem;
		width: 100%;
	}
	.kill-form input:focus {
		outline: none;
		border-color: #c2374a;
	}
	.pj-kills-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.pj-kills-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #1a1a1a;
		border-radius: 3px;
		overflow: hidden;
	}
	.pj-kills-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.45rem 0.65rem;
		border-bottom: 1px solid #1a1a1a;
	}
	.pj-name {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #fff;
	}
	.pj-total {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		color: #c2374a;
	}
	.pj-kill-list {
		list-style: none;
		padding: 0.35rem 0.65rem 0.5rem;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
	}
	.pj-kill-list li {
		display: flex;
		gap: 0.35rem;
		align-items: baseline;
		font-size: 0.75rem;
	}
	.kill-session {
		font-family: 'Cinzel', serif;
		font-size: 0.56rem;
		font-weight: 700;
		color: #c2374a;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.kill-monster {
		color: rgba(240, 237, 234, 0.65);
	}
	.friendly-fire .kill-monster {
		color: rgba(240, 237, 234, 0.3);
		text-decoration: line-through;
		font-style: italic;
	}
	.pj-no-kills {
		padding: 0.35rem 0.65rem;
		color: rgba(240, 237, 234, 0.18);
		font-size: 0.75rem;
		margin: 0;
	}
	.kills-detail {
		margin-top: 0.5rem;
	}
	.kills-detail summary {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.3);
		cursor: pointer;
		padding: 0.4rem 0;
	}
	.kills-detail summary:hover {
		color: rgba(240, 237, 234, 0.65);
	}
	.kills-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
		margin-top: 0.5rem;
	}
	.kills-table th {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.35);
		padding: 0.4rem 0.65rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		text-align: left;
	}
	.kills-table td {
		padding: 0.45rem 0.65rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		color: rgba(240, 237, 234, 0.7);
	}
	.kills-table tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}
	.k-session {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		color: #c2374a;
		font-weight: 700;
		white-space: nowrap;
	}
	.k-monster {
		font-weight: 700;
		color: #fff;
	}
	.k-killer {
		color: #2b8fd4;
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.k-notes {
		color: rgba(240, 237, 234, 0.38);
		font-size: 0.78rem;
	}
	.btn-del {
		background: transparent;
		border: none;
		color: rgba(240, 237, 234, 0.22);
		font-size: 0.78rem;
		cursor: pointer;
		padding: 0.15rem 0.4rem;
		transition: color 0.15s;
	}
	.btn-del:hover {
		color: #e05060;
	}

	/* Enemies */
	.enemies-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-top: 1.25rem;
	}
	.enemy-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #2a2a2a;
		border-radius: 4px;
		padding: 1rem 1.25rem;
	}
	.enemy-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.6rem;
	}
	.enemy-type-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		border: 1px solid;
		flex-shrink: 0;
	}
	.enemy-name {
		font-family: 'Cinzel', serif;
		font-size: 0.95rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		flex: 1;
	}
	.enemy-cr {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(240, 237, 234, 0.35);
		border: 1px solid #2a2a2a;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		flex-shrink: 0;
	}
	.enemy-desc {
		font-size: 0.9rem;
		color: rgba(240, 237, 234, 0.7);
		line-height: 1.6;
		margin-bottom: 0.5rem;
	}
	.enemy-detail {
		font-size: 0.85rem;
		color: rgba(240, 237, 234, 0.5);
		margin-top: 0.3rem;
		line-height: 1.45;
	}
	.enemy-detail.enemy-hook {
		color: rgba(43, 143, 212, 0.8);
	}
	.enemy-detail-key {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.3);
		margin-right: 0.4rem;
	}

	/* IA */
	.ia-tabs-bar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}
	.ia-tab {
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.45);
		padding: 0.45rem 1.1rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s;
	}
	.ia-tab:hover {
		border-color: #c2374a;
		color: #c2374a;
	}
	.ia-tab-active {
		background: rgba(194, 55, 74, 0.12);
		border-color: #c2374a;
		color: #c2374a;
	}
	.ia-content {
		max-width: 700px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.ia-desc {
		font-size: 0.92rem;
		color: rgba(240, 237, 234, 0.5);
		font-style: italic;
	}
	.ia-form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	label {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.5);
	}
	input,
	select,
	textarea {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.55rem 0.75rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 1rem;
		width: 100%;
		transition: border-color 0.2s;
	}
	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #c2374a;
	}
	textarea {
		resize: vertical;
	}
	.ia-result {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid #2a2a2a;
		border-radius: 3px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.ia-result-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}
	.ia-result-name {
		font-family: 'Cinzel', serif;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #fff;
	}
	.ia-result-sub {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.45);
	}
	.ia-result-desc {
		font-size: 0.95rem;
		color: rgba(240, 237, 234, 0.7);
		line-height: 1.6;
	}
	.ia-traits {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.ia-trait {
		font-size: 0.88rem;
		color: rgba(240, 237, 234, 0.55);
		line-height: 1.45;
	}
	.ia-secret {
		color: rgba(194, 55, 74, 0.75);
	}
	.ia-trait-key {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.3);
		margin-right: 0.4rem;
	}
	.improv-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.improv-item {
		display: flex;
		gap: 0.85rem;
	}
	.improv-num {
		font-family: 'Cinzel Decorative', serif;
		font-size: 1.5rem;
		font-weight: 900;
		color: #c2374a;
		flex-shrink: 0;
		line-height: 1.1;
	}
	.improv-title {
		font-family: 'Cinzel', serif;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #fff;
		margin-bottom: 0.3rem;
	}
	.improv-desc {
		font-size: 0.92rem;
		color: rgba(240, 237, 234, 0.65);
		line-height: 1.5;
	}
	.improv-consequence {
		font-size: 0.88rem;
		color: rgba(194, 55, 74, 0.75);
		margin-top: 0.3rem;
		font-style: italic;
	}

	/* Shared */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}
	.error-msg {
		background: #1a0508;
		border: 1px solid #c2374a44;
		color: #e05060;
		padding: 0.6rem 0.85rem;
		border-radius: 3px;
		font-size: 0.9rem;
	}

	/* Modal */
	/* Char edit button */
	.btn-char-edit {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0 0.1rem;
		opacity: 0.4;
		transition: opacity 0.15s;
		line-height: 1;
		margin-left: auto;
	}
	.btn-char-edit:hover {
		opacity: 1;
	}

	/* Char drawer */
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(3px);
		z-index: 200;
	}
	.char-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 400px;
		max-width: 100vw;
		background: #0d0d0d;
		border-left: 1px solid rgba(194, 55, 74, 0.25);
		z-index: 201;
		overflow-y: auto;
		padding: 2rem 1.5rem;
		box-shadow: -8px 0 32px rgba(0, 0, 0, 0.7);
		animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}
	.drawer-title {
		font-family: 'Cinzel', serif;
		font-size: 1rem;
		font-weight: 900;
		color: #c2374a;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin: 0 0 0.2rem;
		padding-right: 2.5rem;
	}
	.drawer-sub {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.4);
		margin: 0 0 1.5rem;
		font-style: italic;
	}
	.drawer-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.drawer-grid .full {
		grid-column: 1 / -1;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 1.5rem;
		overflow-y: auto;
	}
	.modal {
		background: rgba(12, 12, 12, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		max-width: 480px;
		width: 100%;
		position: relative;
		padding: 2rem;
		margin: auto;
	}
	.modal-lg {
		max-width: 720px;
	}
	.modal h2 {
		font-size: 1rem;
		font-weight: 900;
		color: #c2374a;
		margin-bottom: 0.25rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.modal-email {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.4);
		margin-bottom: 1.5rem;
	}
	.pj-section {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid #1a1a1a;
	}
	.pj-section-title {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		margin-bottom: 0.75rem;
	}
	.pj-empty {
		font-size: 0.82rem;
		color: rgba(240, 237, 234, 0.3);
		margin: 0 0 0.75rem;
	}
	.pj-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid #1a1a1a;
	}
	.pj-name {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		color: #fff;
		text-transform: uppercase;
		flex: 1;
	}
	.pj-meta {
		font-size: 0.78rem;
		color: rgba(240, 237, 234, 0.4);
		flex-shrink: 0;
	}
	.btn-unassign {
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.25);
		width: 22px;
		height: 22px;
		border-radius: 3px;
		font-size: 0.6rem;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	.btn-unassign:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.assign-form {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.assign-select {
		flex: 1;
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.45rem 0.6rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 0.9rem;
	}
	.assign-select:focus {
		outline: none;
		border-color: #c2374a;
	}
	.btn-assign {
		background: transparent;
		border: 1px solid #2b8fd4;
		color: #2b8fd4;
		padding: 0.4rem 0.85rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}
	.btn-assign:hover {
		background: rgba(43, 143, 212, 0.15);
	}
	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(240, 237, 234, 0.5);
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		cursor: pointer;
		font-size: 0.75rem;
	}
	.modal-close:hover {
		color: #fff;
		border-color: #c2374a;
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	/* PJ tab */
	.section-head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.form-card {
		margin-bottom: 1.25rem;
		padding: 1.25rem;
	}
	.form-card-title {
		font-family: 'Cinzel', serif;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #c2374a;
		margin-bottom: 1rem;
	}
	.form-grid2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}
	.form-grid2 .field.full {
		grid-column: 1 / -1;
	}
	.list-count {
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		color: rgba(240, 237, 234, 0.3);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 0.6rem;
	}
	.char-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
	}
	.char-info {
		flex: 1;
		min-width: 0;
	}
	.char-name {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.char-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.5);
	}
	.char-meta .sep {
		color: rgba(240, 237, 234, 0.2);
	}
	.status-chip {
		font-size: 0.75rem;
		color: #e05060;
	}
	.char-player {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		color: #2b8fd4;
		margin-top: 0.25rem;
		text-transform: uppercase;
	}
	.char-player.unassigned {
		color: rgba(240, 237, 234, 0.25);
	}
	.char-actions {
		flex-shrink: 0;
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}
	.btn-vis {
		background: transparent;
		border: 1px solid #2a3a2a;
		color: rgba(240, 237, 234, 0.4);
		padding: 0.22rem 0.55rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-vis.vis-on {
		border-color: #2a6a2a;
		color: #5cb85c;
	}
	.btn-vis:hover {
		border-color: #5cb85c;
		color: #5cb85c;
	}
	.btn-edit-sm {
		background: transparent;
		border: 1px solid #2a3a4a;
		color: rgba(240, 237, 234, 0.5);
		padding: 0.22rem 0.55rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-edit-sm:hover {
		border-color: #2b8fd4;
		color: #2b8fd4;
	}
	.btn-del-sm {
		background: transparent;
		border: 1px solid #3a1a1a;
		color: rgba(240, 237, 234, 0.35);
		padding: 0.22rem 0.55rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-del-sm:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.empty-state {
		text-align: center;
		padding: 3rem;
		color: rgba(240, 237, 234, 0.3);
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* Monstres tab */
	.monstres-container {
	}
	.monstres-toolbar {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		align-items: center;
	}
	.form-panel {
		margin-bottom: 2rem;
	}
	.form-panel h2 {
		font-size: 0.9rem;
		letter-spacing: 0.08em;
		margin-bottom: 1.25rem;
		color: #c2374a;
	}
	.field.required label::after {
		content: ' *';
		color: #c2374a;
	}
	label {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.55);
	}
	input,
	select,
	textarea {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.55rem 0.75rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 1rem;
		transition: border-color 0.2s;
		width: 100%;
	}
	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #c2374a;
	}
	textarea {
		resize: vertical;
	}
	select option {
		background: #111;
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1.25rem;
	}
	.search-input {
		width: 100%;
	}
	.type-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.type-btn {
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.45);
		padding: 0.25rem 0.65rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
	}
	.type-btn:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.type-btn.active {
		background: rgba(194, 55, 74, 0.15);
		border-color: #c2374a;
		color: #e05060;
	}
	.type-btn.type-empty {
		opacity: 0.35;
	}
	.type-count {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		padding: 0 0.3rem;
		font-size: 0.55rem;
		margin-left: 0.2rem;
	}
	.type-btn.active .type-count {
		background: rgba(194, 55, 74, 0.3);
	}

	.list-header {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.3);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 0.75rem;
	}

	.monster-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}
	.monster-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0;
	}
	.monster-card-img {
		width: 100%;
		aspect-ratio: 4/3;
		object-fit: cover;
		border-bottom: 1px solid #1a1a1a;
	}
	.monster-card-placeholder {
		width: 100%;
		aspect-ratio: 4/3;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		background: #0a0a0a;
		border-bottom: 1px solid #1a1a1a;
	}
	.monster-card-body {
		padding: 0.75rem;
		flex: 1;
	}
	.monster-name {
		font-family: 'Cinzel', serif;
		font-size: 0.82rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		margin-bottom: 0.35rem;
	}
	.monster-meta {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin-bottom: 0.4rem;
	}
	.monster-stats {
		display: flex;
		gap: 0.75rem;
	}
	.tag {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(240, 237, 234, 0.6);
		padding: 0.12rem 0.4rem;
		border-radius: 3px;
		font-size: 0.7rem;
	}
	.tag.cr {
		background: rgba(194, 55, 74, 0.1);
		border-color: rgba(194, 55, 74, 0.3);
		color: #c2374a;
		font-weight: 700;
	}
	.stat {
		font-size: 0.78rem;
		color: rgba(240, 237, 234, 0.5);
	}
	.card-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid #1a1a1a;
	}
	.btn-edit {
		background: transparent;
		border: 1px solid #2a3a4a;
		color: rgba(240, 237, 234, 0.5);
		padding: 0.22rem 0.55rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-edit:hover {
		border-color: #2b8fd4;
		color: #2b8fd4;
	}
	.btn-delete-small {
		background: transparent;
		border: 1px solid #2a2a2a;
		color: rgba(240, 237, 234, 0.25);
		width: 24px;
		height: 24px;
		border-radius: 3px;
		font-size: 0.65rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-delete-small:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.empty {
		text-align: center;
		padding: 3rem;
		color: rgba(240, 237, 234, 0.3);
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.ability-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
	}
	.ability-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.ability-lbl {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: rgba(240, 237, 234, 0.45);
		text-transform: uppercase;
	}
	.ability-box input {
		text-align: center;
		padding: 0.4rem 0.2rem;
	}

	@media (max-width: 900px) {
		.stats-row {
			grid-template-columns: repeat(3, 1fr);
		}
		.combat-layout {
			grid-template-columns: 1fr;
		}
		.ia-form-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 600px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}
		.tabs {
			overflow-x: auto;
		}
		.kill-form-grid {
			grid-template-columns: 1fr;
		}
		.form-grid2 {
			grid-template-columns: 1fr;
		}
	}
</style>
