# La Kolok-Action — Console MJ

Application D&D 5e pour Maître du Jeu : wiki de campagne, tracker d'initiative, modules IA (génération PNJ, oracle règles, improvisation, résumé de session).

## Stack

- **Frontend** : SvelteKit 5 + TypeScript
- **Auth + DB** : Supabase
- **IA** : API Anthropic (Claude Haiku / Sonnet)
- **Hébergement** : Netlify

## Prérequis

- Node.js ≥ 18
- Compte Supabase + projet configuré
- Clé API Anthropic

## Installation locale

```bash
npm install
cp .env.example .env   # puis remplir les valeurs
npm run dev
```

## Variables d'environnement requises

```bash
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur local (port 3000) |
| `npm run build` | Build production |
| `npm run preview` | Prévisualisation du build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest (tests unitaires) |

## Structure

```
src/
├── lib/
│   ├── components/   # Composants réutilisables (DiceRoller, InitiativeTracker…)
│   ├── server/       # Logique serveur (Anthropic, Supabase context, rate limit)
│   └── utils/        # Fonctions utilitaires pures
└── routes/
    ├── admin/        # Console MJ
    ├── api/claude/   # Routes IA (6 modules)
    └── …             # Pages joueurs, combat, sessions…
```

## Déploiement

Géré via Netlify. `run.mjs` est utilisé comme build command à la place de `npm run build` (voir `netlify.toml`).
