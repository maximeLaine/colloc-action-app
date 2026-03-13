<div class="container">
	<div class="page-header">
		<h1>Tableau de bord MJ</h1>
		<p class="subtitle">Panneau d'administration — Maître du Jeu</p>
	</div>

	<div class="admin-grid">
		<div class="card admin-card">
			<h2>🎭 PNJ</h2>
			<p>Créer, éditer et partager les fiches PNJ avec les joueurs.</p>
			<a href="/admin/pnj" class="btn-primary">Gérer les PNJ</a>
		</div>
		<div class="card admin-card">
			<h2>📜 Sessions</h2>
			<p>Rédiger et partager les résumés de sessions.</p>
			<a href="/admin/sessions" class="btn-primary">Gérer les sessions</a>
		</div>
		<div class="card admin-card">
			<h2>📚 Lore</h2>
			<p>Ajouter des entrées de lore et contrôler la visibilité.</p>
			<a href="/admin/lore" class="btn-primary">Gérer le lore</a>
		</div>
		<div class="card admin-card">
			<h2>⚔️ Personnages</h2>
			<p>Créer et éditer les fiches des personnages joueurs.</p>
			<a href="/admin/personnages" class="btn-primary">Gérer les PJ</a>
		</div>
		<div class="card admin-card">
			<h2>🐉 Bestiaire</h2>
			<p>Ajouter des monstres à la bibliothèque de combat.</p>
			<a href="/admin/monstres" class="btn-primary">Gérer les monstres</a>
		</div>
		<div class="card admin-card">
			<h2>👥 Joueurs</h2>
			<p>Gérer les comptes et les rôles des joueurs.</p>
			<a href="/admin/joueurs" class="btn-primary">Gérer les joueurs</a>
		</div>
	</div>
</div>

<style>
	.subtitle { font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.06em; color: #C2374A; margin-top: 0.4rem; }
	.admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
	.admin-card { display: flex; flex-direction: column; gap: 0.75rem; }
	.admin-card h2 { font-size: 1rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	.admin-card p { font-size: 0.95rem; color: rgba(240,237,234,0.6); flex: 1; }
</style>
