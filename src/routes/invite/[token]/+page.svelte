<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="invite-wrap">
	{#if data.invalid}
		<div class="invite-card card">
			<div class="inv-icon">⚠️</div>
			<h1>Invitation invalide</h1>
			<p class="inv-sub">Ce lien d'invitation est invalide ou a expiré.</p>
			<a href="/login" class="btn-primary">Aller à la connexion</a>
		</div>
	{:else}
		<div class="invite-card card">
			<div class="inv-icon">⚔️</div>
			<h1>Rejoindre la Kolok-Action</h1>
			<p class="inv-sub">
				Vous avez été invité à rejoindre la campagne en tant que <strong
					>{data.role === 'dm' ? 'Maître du Jeu' : 'Joueur'}</strong
				>.
			</p>

			{#if form?.error}
				<div class="error-msg">{form.error}</div>
			{/if}

			<form method="POST" action="?/register" use:enhance>
				<input type="hidden" name="email" value={data.email} />

				<div class="field">
					<label for="email-disp">Email</label>
					<input id="email-disp" type="email" value={data.email} disabled />
				</div>
				<div class="field">
					<label for="display_name">Nom affiché</label>
					<input
						id="display_name"
						name="display_name"
						type="text"
						required
						placeholder="Comment vous appelle-t-on ?"
					/>
				</div>
				<div class="field">
					<label for="password">Mot de passe</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						placeholder="Minimum 6 caractères"
					/>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn-primary">Créer mon compte</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	.invite-wrap {
		min-height: calc(100vh - 4rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
	}
	.invite-card {
		width: 100%;
		max-width: 440px;
		padding: 2.5rem;
		text-align: center;
	}
	.inv-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}
	h1 {
		font-size: 1.4rem;
		margin-bottom: 0.5rem;
	}
	.inv-sub {
		font-size: 0.95rem;
		color: rgba(240, 237, 234, 0.6);
		margin-bottom: 1.75rem;
	}
	.inv-sub strong {
		color: #c2374a;
		font-weight: 600;
	}
	.error-msg {
		background: #1a0508;
		border: 1px solid #c2374a44;
		color: #e05060;
		padding: 0.6rem 0.85rem;
		border-radius: 3px;
		font-size: 0.9rem;
		margin-bottom: 1rem;
		text-align: left;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 1rem;
		text-align: left;
	}
	label {
		font-family: 'Cinzel', serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.55);
	}
	input {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		color: #f0edea;
		padding: 0.55rem 0.75rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 1rem;
		width: 100%;
	}
	input:focus {
		outline: none;
		border-color: #c2374a;
	}
	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.form-actions {
		margin-top: 1.5rem;
	}
	.form-actions .btn-primary {
		width: 100%;
	}
</style>
