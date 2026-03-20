<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Char { id: string; name: string; class: string; level: number; hp_current: number; hp_max: number; visibility: string; }
	interface Player { id: string; email: string; display_name: string; role: string; characters: Char[]; }

	let editPlayer = $state<Player | null>(null);

	const SECTIONS = [
		{ href: '/admin/personnages', icon: '⚔️', label: 'Personnages', desc: 'Fiches PJ' },
		{ href: '/admin/pnj',         icon: '🎭', label: 'PNJ',          desc: 'Personnages non-joueurs' },
		{ href: '/admin/sessions',    icon: '📜', label: 'Sessions',     desc: 'Comptes-rendus' },
		{ href: '/admin/lore',        icon: '📚', label: 'Lore',         desc: 'Histoire du monde' },
		{ href: '/admin/monstres',    icon: '🐉', label: 'Monstres',     desc: 'Bestiaire' },
	];

	function hpPct(c: Char) { return Math.round((c.hp_current / c.hp_max) * 100); }
	function hpColor(pct: number) { return pct > 60 ? '#5CB85C' : pct > 25 ? '#F0A500' : '#C2374A'; }

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editPlayer = null;
	}
</script>

<div class="container console">

	<!-- Header -->
	<div class="console-header">
		<div>
			<h1>Console MJ</h1>
			<p class="subtitle">Tableau de bord — Maître du Jeu</p>
		</div>
	</div>

	<!-- Stats -->
	<div class="stats-row">
		<div class="stat-card">
			<span class="stat-val">{data.stats.sessions_count}</span>
			<span class="stat-label">Sessions</span>
		</div>
		<div class="stat-card">
			<span class="stat-val">{data.stats.characters_count}</span>
			<span class="stat-label">Personnages</span>
		</div>
		<div class="stat-card">
			<span class="stat-val">{data.stats.pnj_count}</span>
			<span class="stat-label">PNJ</span>
		</div>
		<div class="stat-card">
			<span class="stat-val">{data.stats.lore_count}</span>
			<span class="stat-label">Lore</span>
		</div>
		<div class="stat-card">
			<span class="stat-val">{data.stats.monsters_count}</span>
			<span class="stat-label">Monstres</span>
		</div>
		<div class="stat-card">
			<span class="stat-val">{data.stats.kills_count}</span>
			<span class="stat-label">Kills</span>
		</div>
	</div>

	<!-- Accès rapide -->
	<div class="sections-bar">
		{#each SECTIONS as s}
			<a href={s.href} class="section-link card">
				<span class="section-icon">{s.icon}</span>
				<div class="section-info">
					<div class="section-label">{s.label}</div>
					<div class="section-desc">{s.desc}</div>
				</div>
			</a>
		{/each}
	</div>

	<!-- Joueurs & Personnages -->
	<section class="panel">
		<h2 class="panel-title">👥 Joueurs & Personnages</h2>
		<div class="player-grid">
			{#each data.players as player}
				<div class="player-card card">
					<div class="player-top">
						<div class="player-avatar">{player.display_name?.[0]?.toUpperCase() ?? '?'}</div>
						<div class="player-identity">
							<div class="player-name">{player.display_name}</div>
							<div class="player-email">{player.email}</div>
						</div>
						<span class="role-badge role-{player.role}">
							{player.role === 'dm' ? '🎲 MJ' : '⚔️ Joueur'}
						</span>
						<button class="btn-icon" title="Modifier" onclick={() => (editPlayer = player as Player)}>✏️</button>
					</div>

					{#if player.characters.length > 0}
						<div class="char-list">
							{#each player.characters as c}
								<div class="char-item">
									<div class="char-head">
										<span class="char-name">{c.name}</span>
										<span class="char-class">{c.class} niv.{c.level}</span>
										<span class="vis-dot" class:vis-pub={c.visibility === 'players'} title={c.visibility === 'players' ? 'Visible' : 'Masqué'}>●</span>
									</div>
									<div class="hp-bar-wrap">
										<div class="hp-bar" style="width:{hpPct(c)}%;background:{hpColor(hpPct(c))}"></div>
									</div>
									<div class="hp-text">{c.hp_current}/{c.hp_max} PV</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="no-char">Aucun personnage lié</p>
					{/if}
				</div>
			{/each}
		</div>
	</section>

</div>

<!-- Modal modifier joueur -->
{#if editPlayer}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => (editPlayer = null)}>✕</button>
			<h2>Modifier — {editPlayer.display_name}</h2>
			<p class="modal-email">{editPlayer.email}</p>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form method="POST" action="?/updatePlayer" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') editPlayer = null;
				update();
			}}>
				<input type="hidden" name="id" value={editPlayer.id} />
				<div class="form-grid">
					<div class="field">
						<label>Nom affiché</label>
						<input name="display_name" type="text" value={editPlayer.display_name} />
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
					<button type="button" class="btn-secondary" onclick={() => (editPlayer = null)}>Annuler</button>
					<button type="submit" class="btn-primary">Enregistrer</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.console { padding-bottom: 3rem; }
	.console-header { margin-bottom: 1.5rem; }
	.subtitle { font-family: 'Cinzel', serif; font-size: 0.8rem; color: rgba(240,237,234,0.4); margin-top: 0.3rem; letter-spacing: 0.05em; }

	/* Stats */
	.stats-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.75rem; margin-bottom: 2rem; }
	.stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 1rem 0.75rem; text-align: center; }
	.stat-val { display: block; font-family: 'Cinzel', serif; font-size: 1.8rem; font-weight: 900; color: #C2374A; line-height: 1; }
	.stat-label { display: block; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.4); margin-top: 0.4rem; }

	/* Sections bar */
	.sections-bar { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-bottom: 2rem; }
	.section-link { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 1rem 0.75rem; text-decoration: none; text-align: center; transition: border-color 0.2s; }
	.section-link:hover { border-color: rgba(194,55,74,0.5); }
	.section-icon { font-size: 1.4rem; }
	.section-label { font-family: 'Cinzel', serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #FFF; }
	.section-desc { font-size: 0.65rem; color: rgba(240,237,234,0.35); margin-top: 0.1rem; }

	/* Panel */
	.panel-title { font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(240,237,234,0.5); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); }

	/* Player cards */
	.player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
	.player-card { padding: 1rem; }
	.player-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
	.player-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(194,55,74,0.15); border: 1px solid rgba(194,55,74,0.3); display: flex; align-items: center; justify-content: center; font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 700; color: #C2374A; flex-shrink: 0; }
	.player-identity { flex: 1; min-width: 0; }
	.player-name { font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700; color: #FFF; letter-spacing: 0.04em; text-transform: uppercase; }
	.player-email { font-size: 0.75rem; color: rgba(240,237,234,0.35); margin-top: 0.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.role-badge { font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; padding: 0.2rem 0.55rem; border-radius: 3px; border: 1px solid; white-space: nowrap; }
	.role-dm { color: #F0A500; border-color: rgba(240,165,0,0.4); background: rgba(240,165,0,0.08); }
	.role-player { color: #2B8FD4; border-color: rgba(43,143,212,0.4); background: rgba(43,143,212,0.08); }
	.btn-icon { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(240,237,234,0.4); width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; transition: all 0.15s; flex-shrink: 0; }
	.btn-icon:hover { border-color: #C2374A; color: #E05060; }

	/* Characters */
	.char-list { display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; }
	.char-item { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; gap: 0.2rem 0.75rem; }
	.char-head { display: flex; align-items: center; gap: 0.5rem; grid-column: 1; }
	.char-name { font-family: 'Cinzel', serif; font-size: 0.75rem; font-weight: 700; color: #FFF; text-transform: uppercase; letter-spacing: 0.04em; }
	.char-class { font-size: 0.72rem; color: rgba(240,237,234,0.45); }
	.vis-dot { font-size: 0.6rem; color: rgba(240,237,234,0.2); }
	.vis-dot.vis-pub { color: #5CB85C; }
	.hp-bar-wrap { height: 3px; background: #1A1A1A; border-radius: 2px; overflow: hidden; grid-column: 1; }
	.hp-bar { height: 100%; border-radius: 2px; transition: width 0.3s; }
	.hp-text { font-size: 0.68rem; color: rgba(240,237,234,0.4); grid-column: 2; grid-row: 1 / 3; align-self: center; white-space: nowrap; }
	.no-char { font-size: 0.75rem; color: rgba(240,237,234,0.2); font-style: italic; margin: 0; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.6rem; }



	/* Modal */
	.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
	.modal { background: rgba(12,12,12,0.98); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; max-width: 480px; width: 100%; position: relative; padding: 2rem; }
	.modal h2 { font-size: 1rem; font-weight: 900; color: #C2374A; margin-bottom: 0.25rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.modal-email { font-size: 0.82rem; color: rgba(240,237,234,0.4); margin-bottom: 1.5rem; }
	.modal-close { position: absolute; top: 1rem; right: 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: rgba(240,237,234,0.5); width: 2rem; height: 2rem; border-radius: 50%; cursor: pointer; font-size: 0.75rem; }
	.modal-close:hover { color: #FFF; border-color: #C2374A; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.field { display: flex; flex-direction: column; gap: 0.35rem; }
	label { font-family: 'Cinzel', serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,234,0.55); }
	input, select { background: #0A0A0A; border: 1px solid #2A2A2A; color: #F0EDEA; padding: 0.55rem 0.75rem; border-radius: 3px; font-family: 'Crimson Text', serif; font-size: 1rem; width: 100%; }
	input:focus, select:focus { outline: none; border-color: #C2374A; }
	select option { background: #111; }
	.form-actions { margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: flex-end; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }

	@media (max-width: 900px) {
		.sections-bar { grid-template-columns: repeat(3, 1fr); }
		.stats-row { grid-template-columns: repeat(3, 1fr); }
	}
	@media (max-width: 500px) {
		.sections-bar { grid-template-columns: repeat(2, 1fr); }
		.stats-row { grid-template-columns: repeat(2, 1fr); }
	}
</style>
