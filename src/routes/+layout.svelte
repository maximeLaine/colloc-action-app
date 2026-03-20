<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { createClient } from '$lib/supabase';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const supabase = createClient();
	let menuOpen = $state(false);

	onMount(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => sub.subscription.unsubscribe();
	});

	const isDM = $derived(data.profile?.role === 'dm');
	const isLoggedIn = $derived(!!data.user);
	const isConsole = $derived(false);

	const navItems = $derived([
		{ href: '/personnages', label: '⚔️ Personnages', show: true },
		{ href: '/pnj', label: '🎭 PNJ', show: true },
		{ href: '/sessions', label: '📜 Sessions', show: true },
		{ href: '/lore', label: '📚 Lore', show: true },
		{ href: '/combat', label: '⚔️ Combat', show: true },
	].filter(i => i.show));

	// Ferme le menu quand on change de page
	$effect(() => {
		$page.url.pathname;
		menuOpen = false;
	});
</script>

<svelte:head>
	<title>La Kolok-Action</title>
</svelte:head>

<div class="app">
	<header class="site-header" class:hidden={isConsole}>
		<div class="header-inner">
			<a href="/" class="logo">
				<img src="/logo-kolok-action.jpg" alt="Kolok-Action" />
				<span>La Kolok-Action</span>
			</a>

			{#if isLoggedIn}
			<nav class="main-nav">
				{#each navItems as item}
					<a href={item.href} class="nav-link">{item.label}</a>
				{/each}
				{#if isDM}
					<a href="/admin" class="nav-link dm-badge">🎲 MJ</a>
				{/if}
			</nav>
			{/if}

			<div class="header-actions">
				{#if isLoggedIn}
					<span class="user-name">{data.profile?.display_name ?? data.user?.email}</span>
					{#if isDM}
						<span class="role-badge dm">MJ</span>
					{:else}
						<span class="role-badge player">Joueur</span>
					{/if}
					<form method="POST" action="/auth?/logout" class="logout-form">
						<button type="submit" class="btn-logout" title="Déconnexion">↪</button>
					</form>
					<button class="burger" onclick={() => menuOpen = !menuOpen} aria-label="Menu">
						<span class:open={menuOpen}></span>
						<span class:open={menuOpen}></span>
						<span class:open={menuOpen}></span>
					</button>
				{:else}
					<a href="/login" class="btn-login">Connexion</a>
				{/if}
			</div>
		</div>
	</header>

	{#if menuOpen && isLoggedIn}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="mobile-overlay" onclick={() => menuOpen = false}>
			<nav class="mobile-nav" onclick={(e) => e.stopPropagation()}>
				{#each navItems as item}
					<a href={item.href} class="mobile-nav-link">{item.label}</a>
				{/each}
				{#if isDM}
					<a href="/admin" class="mobile-nav-link dm">🎲 Admin MJ</a>
				{/if}
				<div class="mobile-nav-separator"></div>
				<div class="mobile-user">
					<span class="mobile-user-name">{data.profile?.display_name ?? data.user?.email}</span>
					<form method="POST" action="/auth?/logout">
						<button type="submit" class="btn-logout">Déconnexion</button>
					</form>
				</div>
			</nav>
		</div>
	{/if}

	<main class="main-content" class:no-margin={isConsole}>
		{@render children()}
	</main>

	<footer class="site-footer">
		<p>⚔️ La Kolok-Action — Campagne D&D 5e</p>
	</footer>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(strong) { font-weight: 600; }
	:global(em) { font-style: italic; }

	:global(body) {
		background:
			linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.55) 100%),
			url('/background.png') center center / cover fixed;
		background-color: #0A0A0A;
		color: #F0EDEA;
		font-family: 'Crimson Text', Georgia, serif;
		font-size: 1.1rem;
		line-height: 1.7;
		min-height: 100vh;
	}

	:global(h1, h2, h3, h4) {
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #FFFFFF;
	}

	:global(a) {
		color: inherit;
		text-decoration: none;
	}

	:global(button) {
		cursor: pointer;
		font-family: inherit;
	}

	:global(.btn-primary) {
		background: #C2374A;
		color: #fff;
		border: none;
		padding: 0.65rem 1.5rem;
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border-radius: 3px;
		cursor: pointer;
		transition: background 0.2s;
	}

	:global(.btn-primary:hover) { background: #E05060; }

	:global(.btn-secondary) {
		background: transparent;
		color: #F0EDEA;
		border: 2px solid rgba(240,237,234,0.3);
		padding: 0.65rem 1.5rem;
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border-radius: 3px;
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s;
	}

	:global(.btn-secondary:hover) {
		border-color: #C2374A;
		color: #E05060;
	}

	:global(.card) {
		background: rgba(10,10,10,0.75);
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 4px;
		padding: 1.5rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	:global(.card:hover) {
		border-color: #C2374A;
		box-shadow: 0 4px 24px rgba(194,55,74,0.15);
	}

	:global(.badge-dm) {
		background: #C2374A;
		color: #fff;
		padding: 0.15rem 0.5rem;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-radius: 3px;
	}

	:global(.badge-player) {
		background: #2B8FD4;
		color: #fff;
		padding: 0.15rem 0.5rem;
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-radius: 3px;
	}

	:global(.page-header) {
		padding: 3rem 0 2rem;
		border-bottom: 1px solid #1A1A1A;
		margin-bottom: 2rem;
	}

	:global(.page-header h1) {
		font-size: 2.4rem;
		font-weight: 900;
	}

	:global(.page-header h1::after) {
		content: '';
		display: block;
		width: 4rem;
		height: 3px;
		background: #C2374A;
		margin-top: 0.6rem;
	}

	:global(.container) {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	:global(.grid-2) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 1.25rem;
	}

	:global(.grid-3) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1.25rem;
	}

	:global(.visibility-badge) {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
	}

	:global(.vis-dm) { background: #3A0A12; color: #E05060; border: 1px solid #C2374A44; }
	:global(.vis-players) { background: #0A1A2A; color: #4AAAE8; border: 1px solid #2B8FD444; }
	:global(.vis-public) { background: #0A2A12; color: #5CB85C; border: 1px solid #5CB85C44; }

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* ── Header ── */
	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid rgba(255,255,255,0.07);
		height: 4rem;
	}

	.header-inner {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1.5rem;
		height: 100%;
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-shrink: 0;
		text-decoration: none;
	}

	.logo img {
		height: 2.2rem;
		width: auto;
	}

	.logo span {
		font-family: 'Cinzel Decorative', serif;
		font-size: 0.9rem;
		font-weight: 700;
		color: #FFFFFF;
		white-space: nowrap;
	}

	.main-nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.main-nav::-webkit-scrollbar { display: none; }

	.nav-link {
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.65rem;
		border-radius: 3px;
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.7);
		white-space: nowrap;
		transition: background 0.15s, color 0.15s;
	}

	.nav-link:hover { background: rgba(194,55,74,0.15); color: #FFFFFF; }

	.dm-badge { color: #C2374A !important; }
	.dm-badge:hover { background: rgba(194,55,74,0.2) !important; }

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.user-name {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		color: rgba(240,237,234,0.6);
	}

	.role-badge {
		font-family: 'Cinzel', serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
	}

	.role-badge.dm { background: #C2374A; color: #fff; }
	.role-badge.player { background: #2B8FD4; color: #fff; }

	.btn-logout {
		background: transparent;
		border: 1px solid #333;
		color: rgba(240,237,234,0.4);
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
		line-height: 1;
		border-radius: 3px;
		transition: border-color 0.2s, color 0.2s;
		width: 1.8rem;
		height: 1.8rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-logout:hover { border-color: #C2374A; color: #E05060; }

	.btn-login {
		background: #C2374A;
		color: #fff;
		padding: 0.4rem 1rem;
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border-radius: 3px;
		transition: background 0.2s;
	}

	.btn-login:hover { background: #E05060; }

	/* ── Main ── */
	.main-content {
		flex: 1;
		margin-top: 4rem;
	}
	.main-content.no-margin { margin-top: 0; }
	.site-header.hidden { display: none; }

	/* ── Footer ── */
	.site-footer {
		border-top: 1px solid #1A1A1A;
		padding: 1.5rem;
		text-align: center;
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: rgba(240,237,234,0.3);
		text-transform: uppercase;
	}

	/* Burger button */
	.burger {
		display: none;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		background: transparent;
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 3px;
		padding: 0.4rem 0.5rem;
		cursor: pointer;
		width: 2.2rem;
		height: 2.2rem;
	}
	.burger span {
		display: block;
		height: 2px;
		background: rgba(240,237,234,0.7);
		border-radius: 2px;
		transition: transform 0.2s, opacity 0.2s;
		transform-origin: center;
	}
	.burger span.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
	.burger span.open:nth-child(2) { opacity: 0; }
	.burger span.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

	/* Mobile overlay */
	.mobile-overlay {
		display: none;
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(4px);
		z-index: 99;
		align-items: flex-start;
		justify-content: flex-end;
	}
	.mobile-nav {
		background: rgba(8,8,8,0.98);
		border-left: 1px solid rgba(255,255,255,0.08);
		width: min(300px, 85vw);
		height: 100%;
		padding: 5rem 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow-y: auto;
	}
	.mobile-nav-link {
		display: block;
		padding: 0.85rem 1rem;
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240,237,234,0.7);
		border-radius: 3px;
		transition: background 0.15s, color 0.15s;
		border-bottom: 1px solid rgba(255,255,255,0.04);
	}
	.mobile-nav-link:hover { background: rgba(194,55,74,0.15); color: #FFF; }
	.mobile-nav-link.dm { color: #C2374A; }
	.mobile-nav-separator { height: 1px; background: rgba(255,255,255,0.08); margin: 1rem 0; }
	.mobile-user { display: flex; flex-direction: column; gap: 0.75rem; }
	.mobile-user-name { font-family: 'Cinzel', serif; font-size: 0.72rem; color: rgba(240,237,234,0.5); }

	@media (max-width: 768px) {
		.main-nav { display: none; }
		.user-name { display: none; }
		.logout-form { display: none; }
		.burger { display: flex; }
		.mobile-overlay { display: flex; }
	}
</style>
