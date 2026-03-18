<script lang="ts">
	import { createClient } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const supabase = createClient();
	const registered = $derived($page.url.searchParams.get('registered') === '1');

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: err } = await supabase.auth.signInWithPassword({ email, password });

		if (err) {
			error = err.message;
			loading = false;
		} else {
			goto('/');
		}
	}
</script>

<div class="login-page">
	<div class="login-box">
		<div class="login-logo">
			<img src="/logo-kolok-action.jpg" alt="Kolok-Action" />
		</div>
		<h1>Connexion</h1>
		<p class="subtitle">La Kolok-Action — Campagne D&D 5e</p>

		{#if registered}
			<div class="success-msg">Compte créé ! Connectez-vous ci-dessous.</div>
		{/if}

		<form onsubmit={handleLogin}>
			<div class="field">
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} required autocomplete="email" />
			</div>
			<div class="field">
				<label for="password">Mot de passe</label>
				<input id="password" type="password" bind:value={password} required autocomplete="current-password" />
			</div>

			{#if error}
				<div class="error-msg">{error}</div>
			{/if}

			<button type="submit" class="btn-primary" disabled={loading} style="width:100%">
				{loading ? 'Connexion…' : 'Se connecter'}
			</button>
		</form>
	</div>
</div>

<style>
	.login-page {
		min-height: calc(100vh - 4rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.login-box {
		background: #111111;
		border: 1px solid #222222;
		border-radius: 6px;
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
		text-align: center;
	}

	.login-logo img {
		height: 5rem;
		width: auto;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 900;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.4);
		margin-bottom: 2rem;
	}

	form { display: flex; flex-direction: column; gap: 1rem; text-align: left; }

	.field { display: flex; flex-direction: column; gap: 0.35rem; }

	label {
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.6);
	}

	input {
		background: #0A0A0A;
		border: 1px solid #333333;
		color: #F0EDEA;
		padding: 0.65rem 0.85rem;
		border-radius: 3px;
		font-family: 'Crimson Text', serif;
		font-size: 1rem;
		transition: border-color 0.2s;
		width: 100%;
	}

	input:focus {
		outline: none;
		border-color: #C2374A;
	}

	.error-msg {
		background: #1A0508;
		border: 1px solid #C2374A44;
		color: #E05060;
		padding: 0.65rem 0.85rem;
		border-radius: 3px;
		font-size: 0.9rem;
	}

	.success-msg {
		background: #0A1A0A;
		border: 1px solid #5CB85C44;
		color: #5CB85C;
		padding: 0.65rem 0.85rem;
		border-radius: 3px;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}
</style>
