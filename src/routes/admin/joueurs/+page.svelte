<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Player { id: string; email: string; display_name: string; role: string; created_at: string; }
	let editPlayer = $state<Player | null>(null);

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) editPlayer = null;
	}
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Gérer les Joueurs</h1>
				<p class="subtitle">Comptes joueurs et rôles</p>
			</div>
			<a href="/admin" class="btn-secondary">← Admin</a>
		</div>
	</div>

	{#if form?.error}<div class="error-msg">{form.error}</div>{/if}

	<div class="player-list">
		{#if data.players.length === 0}
			<div class="empty">Aucun joueur inscrit.</div>
		{:else}
			<div class="list-header">{data.players.length} compte{data.players.length > 1 ? 's' : ''}</div>
			{#each data.players as player}
				<div class="player-row card">
					<div class="player-avatar">{player.display_name?.[0]?.toUpperCase() ?? '?'}</div>
					<div class="player-info">
						<div class="player-name">{player.display_name}</div>
						<div class="player-email">{player.email}</div>
					</div>
					<div class="player-role role-{player.role}">
						{player.role === 'dm' ? '🎲 MJ' : '⚔️ Joueur'}
					</div>
					<button class="btn-edit" onclick={() => (editPlayer = player as Player)}>Modifier</button>
				</div>
			{/each}
		{/if}
	</div>
</div>

{#if editPlayer}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeOnBackdrop}>
		<div class="modal">
			<button class="modal-close" onclick={() => (editPlayer = null)}>✕</button>
			<h2>Modifier — {editPlayer.display_name}</h2>
			<p class="modal-email">{editPlayer.email}</p>
			<form method="POST" action="?/update" use:enhance={() => ({ result, update }) => {
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
	.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
	.subtitle { font-family: 'Cinzel', serif; font-size: 0.8rem; color: rgba(240,237,234,0.4); margin-top: 0.4rem; letter-spacing: 0.05em; }
	.error-msg { background: #1A0508; border: 1px solid #C2374A44; color: #E05060; padding: 0.6rem 0.85rem; border-radius: 3px; font-size: 0.9rem; margin-bottom: 1rem; }
	.list-header { font-family: 'Cinzel', serif; font-size: 0.72rem; color: rgba(240,237,234,0.3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.75rem; }
	.player-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.player-row { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; }
	.player-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(194,55,74,0.2); border: 1px solid rgba(194,55,74,0.4); display: flex; align-items: center; justify-content: center; font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 700; color: #C2374A; flex-shrink: 0; }
	.player-info { flex: 1; }
	.player-name { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700; color: #FFF; letter-spacing: 0.04em; text-transform: uppercase; }
	.player-email { font-size: 0.8rem; color: rgba(240,237,234,0.4); margin-top: 0.1rem; }
	.player-role { font-family: 'Cinzel', serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; padding: 0.2rem 0.6rem; border-radius: 3px; border: 1px solid; }
	.role-dm { color: #F0A500; border-color: rgba(240,165,0,0.4); background: rgba(240,165,0,0.08); }
	.role-player { color: #2B8FD4; border-color: rgba(43,143,212,0.4); background: rgba(43,143,212,0.08); }
	.btn-edit { background: transparent; border: 1px solid #2A3A4A; color: rgba(240,237,234,0.5); padding: 0.25rem 0.6rem; border-radius: 3px; font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
	.btn-edit:hover { border-color: #2B8FD4; color: #2B8FD4; }
	.empty { text-align: center; padding: 3rem; color: rgba(240,237,234,0.3); font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }
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
</style>
