<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Player {
		id: string;
		email: string;
		display_name: string;
		role: string;
		created_at: string;
	}
	interface Character {
		id: string;
		name: string;
		class: string;
		level: number;
		player_id: string | null;
	}
	let editPlayer = $state<Player | null>(null);
	let showInvite = $state(false);
	let inviteLink = $state<string | null>(null);
	let confirmDelete = $state(false);

	const characters = $derived(data.characters as Character[]);
	const assignedChars = $derived((p: Player) => characters.filter((c) => c.player_id === p.id));
	const unassignedChars = $derived(characters.filter((c) => !c.player_id));

	function closeOnBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
			editPlayer = null;
			confirmDelete = false;
		}
	}

	$effect(() => {
		if (form?.inviteToken) {
			inviteLink = `${window.location.origin}/invite/${form.inviteToken}`;
			showInvite = false;
		}
	});
</script>

<div class="container">
	<div class="page-header">
		<div class="header-row">
			<div>
				<h1>Gérer les Joueurs</h1>
				<p class="subtitle">Comptes joueurs et rôles</p>
			</div>
			<div class="header-btns">
				<a href="/admin" class="btn-secondary">← Admin</a>
				<button
					class="btn-primary"
					onclick={() => {
						showInvite = !showInvite;
						inviteLink = null;
					}}
				>
					{showInvite ? 'Annuler' : '+ Inviter'}
				</button>
			</div>
		</div>
	</div>

	{#if showInvite}
		<div class="invite-panel card">
			<h2>Inviter un joueur</h2>
			{#if form?.error}<div class="error-msg">{form.error}</div>{/if}
			<form method="POST" action="?/invite" use:enhance>
				<div class="form-grid">
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
					<div class="field">
						<label for="inv-role">Rôle</label>
						<select id="inv-role" name="role">
							<option value="player">⚔️ Joueur</option>
							<option value="dm">🎲 Maître du Jeu</option>
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn-primary">Générer le lien</button>
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
		<div class="section-title">Invitations en attente</div>
		<div class="inv-list">
			{#each data.invitations as inv}
				<div class="inv-row card">
					<div class="inv-info">
						<span class="inv-email">{inv.email}</span>
						<span class="inv-role role-{inv.role}">{inv.role === 'dm' ? '🎲 MJ' : '⚔️ Joueur'}</span
						>
					</div>
					<div class="inv-right">
						<span class="inv-expires"
							>expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}</span
						>
						<form method="POST" action="?/deleteInvite" use:enhance>
							<input type="hidden" name="id" value={inv.id} />
							<button type="submit" class="btn-delete-inv" title="Supprimer l'invitation">✕</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if form?.error && !showInvite}<div class="error-msg">{form.error}</div>{/if}

	<div class="player-list">
		{#if data.players.length === 0}
			<div class="empty">Aucun joueur inscrit.</div>
		{:else}
			<div class="list-header">
				{data.players.length} compte{data.players.length > 1 ? 's' : ''}
			</div>
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
			<button
				class="modal-close"
				onclick={() => {
					editPlayer = null;
					confirmDelete = false;
				}}>✕</button
			>
			<h2>Modifier — {editPlayer.display_name}</h2>
			<p class="modal-email">{editPlayer.email}</p>
			<form
				method="POST"
				action="?/update"
				use:enhance={() =>
					({ result, update }) => {
						if (result.type === 'success') {
							editPlayer = null;
							confirmDelete = false;
						}
						update();
					}}
			>
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
					<button type="button" class="btn-secondary" onclick={() => (editPlayer = null)}
						>Annuler</button
					>
					<button type="submit" class="btn-primary">Enregistrer</button>
				</div>
			</form>

			<div class="pj-section">
				<div class="pj-section-title">Personnages associés</div>
				{#if assignedChars(editPlayer).length === 0}
					<p class="pj-empty">Aucun PJ associé.</p>
				{:else}
					{#each assignedChars(editPlayer) as c}
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
			<div class="danger-zone">
				<div class="danger-title">Zone de danger</div>
				{#if !confirmDelete}
					<button class="btn-danger-outline" onclick={() => (confirmDelete = true)}>
						Supprimer ce compte
					</button>
				{:else}
					<p class="danger-confirm-text">
						Supprimer définitivement <strong>{editPlayer.display_name}</strong> ? Les personnages associés
						seront désassociés.
					</p>
					<div class="danger-actions">
						<button class="btn-secondary" onclick={() => (confirmDelete = false)}>Annuler</button>
						<form
							method="POST"
							action="?/deletePlayer"
							use:enhance={() => () => {
								editPlayer = null;
								confirmDelete = false;
							}}
						>
							<input type="hidden" name="id" value={editPlayer.id} />
							<button type="submit" class="btn-danger">Confirmer la suppression</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.header-btns {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-top: 0.5rem;
	}
	.invite-panel {
		margin-bottom: 1.5rem;
	}
	.invite-panel h2 {
		font-size: 0.9rem;
		letter-spacing: 0.08em;
		margin-bottom: 1.25rem;
		color: #c2374a;
	}
	.invite-result {
		margin-bottom: 1.5rem;
		padding: 1rem 1.25rem;
	}
	.inv-label {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.4);
		display: block;
		margin-bottom: 0.6rem;
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
		padding: 0.55rem 0.75rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 0.9rem;
	}
	.btn-copy {
		background: transparent;
		border: 1px solid #2a3a4a;
		color: rgba(240, 237, 234, 0.6);
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
	.section-title {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.3);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 0.5rem;
		margin-top: 1.5rem;
	}
	.inv-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 1.5rem;
	}
	.inv-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 1rem;
	}
	.inv-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.inv-email {
		font-size: 0.85rem;
		color: rgba(240, 237, 234, 0.7);
	}
	.inv-role {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		border: 1px solid;
	}
	.inv-expires {
		font-size: 0.75rem;
		color: rgba(240, 237, 234, 0.3);
		font-family: 'Cinzel', serif;
	}
	.inv-right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.btn-delete-inv {
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
	.btn-delete-inv:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.subtitle {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.4);
		margin-top: 0.4rem;
		letter-spacing: 0.05em;
	}
	.error-msg {
		background: #1a0508;
		border: 1px solid #c2374a44;
		color: #e05060;
		padding: 0.6rem 0.85rem;
		border-radius: 3px;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}
	.list-header {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		color: rgba(240, 237, 234, 0.3);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 0.75rem;
	}
	.player-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.player-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1rem;
	}
	.player-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(194, 55, 74, 0.2);
		border: 1px solid rgba(194, 55, 74, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Cinzel', serif;
		font-size: 1rem;
		font-weight: 700;
		color: #c2374a;
		flex-shrink: 0;
	}
	.player-info {
		flex: 1;
	}
	.player-name {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.player-email {
		font-size: 0.8rem;
		color: rgba(240, 237, 234, 0.4);
		margin-top: 0.1rem;
	}
	.player-role {
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.6rem;
		border-radius: 3px;
		border: 1px solid;
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
	.btn-edit {
		background: transparent;
		border: 1px solid #2a3a4a;
		color: rgba(240, 237, 234, 0.5);
		padding: 0.25rem 0.6rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}
	.btn-edit:hover {
		border-color: #2b8fd4;
		color: #2b8fd4;
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
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}
	.modal {
		background: rgba(12, 12, 12, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		max-width: 480px;
		width: 100%;
		position: relative;
		padding: 2rem;
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
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
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
	select {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.55rem 0.75rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 1rem;
		width: 100%;
	}
	input:focus,
	select:focus {
		outline: none;
		border-color: #c2374a;
	}
	select option {
		background: #111;
	}
	.form-actions {
		margin-top: 1.5rem;
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
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
	.danger-zone {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(194, 55, 74, 0.2);
	}
	.danger-title {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(194, 55, 74, 0.6);
		margin-bottom: 0.75rem;
	}
	.danger-confirm-text {
		font-size: 0.85rem;
		color: rgba(240, 237, 234, 0.6);
		margin-bottom: 0.75rem;
	}
	.danger-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}
	.btn-danger-outline {
		background: transparent;
		border: 1px solid rgba(194, 55, 74, 0.4);
		color: rgba(194, 55, 74, 0.7);
		padding: 0.35rem 0.75rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-danger-outline:hover {
		border-color: #c2374a;
		color: #e05060;
	}
	.btn-danger {
		background: rgba(194, 55, 74, 0.15);
		border: 1px solid #c2374a;
		color: #e05060;
		padding: 0.35rem 0.75rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-danger:hover {
		background: rgba(194, 55, 74, 0.3);
	}
</style>
