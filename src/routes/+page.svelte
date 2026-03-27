<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const isDM = $derived(data.profile?.role === 'dm');
	const name = $derived(data.profile?.display_name ?? 'Aventurier');
</script>

<div class="hero-section">
	<div class="hero-content container">
		<div class="hero-text">
			<p class="campaign-label">Campagne D&D 5e</p>
			<h1>La Kolok-Action</h1>
			<p class="welcome">
				{#if data.user}
					Bienvenue, <strong>{name}</strong>.
					{#if isDM}Que la session commence, Maître du Jeu.
					{:else}L'aventure vous attend.{/if}
				{:else}
					Connectez-vous pour accéder au wiki de campagne.
				{/if}
			</p>
			{#if !data.user}
				<a href="/login" class="btn-primary">Se connecter</a>
			{/if}
		</div>
	</div>
</div>

<div class="container sections">
	{#if data.user}
		<div class="section-grid">
			<a href="/personnages" class="section-card">
				<div class="section-icon">⚔️</div>
				<h2>Personnages</h2>
				<p>Fiches des PJ — stats, attaques, capacités, historique</p>
			</a>
			<a href="/pnj" class="section-card">
				<div class="section-icon">🎭</div>
				<h2>PNJ</h2>
				<p>Personnages non-joueurs rencontrés au fil de la campagne</p>
			</a>
			<a href="/sessions" class="section-card">
				<div class="section-icon">📜</div>
				<h2>Sessions</h2>
				<p>Résumés des aventures passées</p>
			</a>
			<a href="/lore" class="section-card">
				<div class="section-icon">📚</div>
				<h2>Lore</h2>
				<p>Histoire du monde, royaumes, factions et mystères</p>
			</a>
			<a href="/combat" class="section-card highlight">
				<div class="section-icon">🎲</div>
				<h2>Combat</h2>
				<p>Tracker d'initiative, PV, monstres et alliés</p>
				{#if isDM}<span class="dm-only">MJ</span>{/if}
			</a>
			{#if isDM}
				<a href="/admin" class="section-card admin-card">
					<div class="section-icon">🛡️</div>
					<h2>Admin</h2>
					<p>Gérer les sessions, PNJ, joueurs et outils MJ</p>
					<span class="dm-only">MJ</span>
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.hero-section {
		background:
			linear-gradient(to bottom, rgba(10, 10, 10, 0) 0%, #0a0a0a 100%),
			radial-gradient(ellipse at 30% 50%, rgba(194, 55, 74, 0.12) 0%, transparent 60%), #0a0a0a;
		padding: 5rem 0 4rem;
		border-bottom: 1px solid #1a1a1a;
	}

	.hero-content {
		display: flex;
		align-items: center;
	}

	.campaign-label {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #c2374a;
		margin-bottom: 0.75rem;
	}

	h1 {
		font-family: 'Cinzel Decorative', serif;
		font-size: clamp(2.5rem, 6vw, 4.5rem);
		font-weight: 900;
		line-height: 1.05;
		color: #ffffff;
		margin-bottom: 1.5rem;
	}

	h1::after {
		content: '';
		display: block;
		width: 5rem;
		height: 4px;
		background: #c2374a;
		margin-top: 1rem;
	}

	.welcome {
		font-size: 1.25rem;
		color: rgba(240, 237, 234, 0.75);
		margin-bottom: 2rem;
		max-width: 500px;
	}

	.welcome strong {
		color: #ffffff;
	}

	.sections {
		padding: 3rem 1.5rem;
	}

	.section-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	.section-card {
		background: #111111;
		border: 1px solid #222222;
		border-radius: 4px;
		padding: 1.75rem;
		text-decoration: none;
		display: block;
		position: relative;
		transition:
			border-color 0.2s,
			box-shadow 0.2s,
			transform 0.2s;
	}

	.section-card:hover {
		border-color: #c2374a;
		box-shadow: 0 4px 24px rgba(194, 55, 74, 0.15);
		transform: translateY(-2px);
	}

	.section-card.highlight {
		border-color: #c2374a33;
	}
	.section-card.admin-card {
		border-color: rgba(240, 165, 0, 0.2);
	}
	.section-card.admin-card:hover {
		border-color: rgba(240, 165, 0, 0.5);
		background: rgba(240, 165, 0, 0.04);
	}

	.section-icon {
		font-size: 2rem;
		margin-bottom: 0.75rem;
	}

	.section-card h2 {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		margin-bottom: 0.4rem;
		color: #ffffff;
	}

	.section-card p {
		font-size: 0.95rem;
		color: rgba(240, 237, 234, 0.55);
		line-height: 1.5;
	}

	.dm-only {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: #c2374a;
		color: #fff;
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
	}
</style>
