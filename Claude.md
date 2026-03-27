# CLAUDE.md — colloc-action-app

Fichier de contexte pour Claude Code. Décrit le projet, la stack, et les tâches à implémenter.

---

## Projet

Application d'aide au Maître du Jeu pour la campagne D&D 5e "La Kolok-Action".
Objectif : wiki de campagne + modules IA (génération PNJ, oracle règles, aide improvisation).

## Stack

- **Frontend** : SvelteKit 5 + TypeScript
- **Auth + DB** : Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **Hébergement** : Netlify (adapter-netlify — les routes `+server.ts` = Netlify Functions)
- **IA** : API Anthropic (`@anthropic-ai/sdk`) — modèle par défaut `claude-haiku-4-5-20251001`
- **Clé API** : variable d'environnement `ANTHROPIC_API_KEY` (jamais côté client)

## Règles importantes

- La clé `ANTHROPIC_API_KEY` est dans les env Netlify. En local, l'ajouter dans `.env`.
- Toujours importer la clé via `$env/static/private`, jamais en dur.
- Utiliser `claude-haiku-4-5-20251001` par défaut. `claude-sonnet-4-6` uniquement pour les résumés longs.
- Toutes les réponses IA sont en **français**.
- Cacher les résultats IA dans Supabase pour éviter les appels redondants.
- Envoyer un contexte minimal à Claude : 3-5 dernières sessions + PNJ de la scène courante.
- Le rôle MJ est `'dm'` (pas `'gm'`). Valeurs : `'dm' | 'player'`.
- Les visibilités existantes : `'dm_only' | 'players' | 'public'`.

---

## TODO — Tâches à implémenter

Statut : [ ] à faire · [x] fait · [~] en cours

### 🔧 Fondation

- [x] **INFRA-1** Installer le SDK Anthropic

  ```bash
  npm install @anthropic-ai/sdk
  ```

- [x] **INFRA-2** Créer la route serveur Claude de base
  - Fichier : `src/routes/api/claude/+server.ts`
  - Accepte `{ prompt, system? }` en POST
  - Retourne `{ text: string }`
  - Modèle : `claude-haiku-4-5-20251001`

- [x] **AUTH-1** ~~Créer un système de rôles MJ / Joueur~~ — **DÉJÀ FAIT**
  - La colonne `profiles.role` existe déjà (`'dm' | 'player'`)
  - NE PAS relancer l'ALTER TABLE (planterait)

- [x] **DB-1** Migrations Supabase (data-safe)

  ```sql
  -- ✅ Nouvelle table campaigns (n'existait pas)
  CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- ✅ Migration : peupler campaigns depuis sessions.campaign existant
  INSERT INTO campaigns (name)
  SELECT DISTINCT campaign FROM sessions WHERE campaign IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- ✅ ALTER sessions — ajouter les colonnes manquantes uniquement
  ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS raw_notes TEXT,
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

  -- ✅ Remplir campaign_id depuis le champ string existant
  UPDATE sessions s
  SET campaign_id = c.id
  FROM campaigns c
  WHERE c.name = s.campaign;

  -- ✅ ALTER npcs — ajouter les colonnes manquantes uniquement
  ALTER TABLE npcs
    ADD COLUMN IF NOT EXISTS personality TEXT,
    ADD COLUMN IF NOT EXISTS secret TEXT,
    ADD COLUMN IF NOT EXISTS motivation TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN DEFAULT false;

  -- ✅ Nouvelle table locations (n'existait pas)
  CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    name TEXT NOT NULL,
    description_public TEXT,
    description_hidden TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [x] **AI-INFRA-1** Créer la fonction `buildCampaignContext()`
  - Fichier : `src/lib/server/context.ts`
  - Charge depuis Supabase : 5 dernières sessions + PNJ actifs
  - Retourne une string formatée pour le system prompt Claude
  - C'est la fonction centrale qui rend Claude conscient de la campagne

### 🤖 Modules IA

- [x] **AI-1** Module : Oracle de règles D&D 5e
  - Route : `src/routes/api/claude/rules/+server.ts`
  - System prompt : expert D&D 5e, cite les règles précises, répond en français
  - Input : `{ question: string }`
  - Output : `{ answer: string }`
  - Pas de contexte campagne nécessaire (règles génériques)

- [x] **AI-2** Module : Générateur de PNJ
  - Route : `src/routes/api/claude/npc/+server.ts`
  - Input : `{ race?, role?, location?, tone? }`
  - Injecte le contexte campagne via `buildCampaignContext()`
  - Output JSON structuré : `{ name, race, role, personality, voice, secret, motivation }`
  - **Sauvegarder le résultat dans la table `npcs`** (pas de double appel)
  - Demander à Claude de répondre UNIQUEMENT en JSON valide

- [x] **AI-3** Module : Aide à l'improvisation
  - Route : `src/routes/api/claude/improv/+server.ts`
  - Input : `{ situation: string }`
  - Injecte le contexte campagne
  - Output : `{ options: [{ title, description, consequence }] }` — 3 directions narratives
  - Demander à Claude de répondre UNIQUEMENT en JSON valide

- [x] **AI-4** Module : Résumé de session
  - Route : `src/routes/api/claude/summary/+server.ts`
  - Input : `{ session_id, raw_notes: string }`
  - Modèle : `claude-sonnet-4-6` (texte long)
  - Output : `{ summary, key_events[], npcs_met[], hooks[] }`
  - Sauvegarder le résultat dans `sessions.summary`

- [x] **AI-5** Module : Générateur de description de lieu
  - Route : `src/routes/api/claude/location/+server.ts`
  - Input : `{ location_id }`
  - Output : `{ public_description, hidden_details, ambiance }`
  - Sauvegarder dans `locations`

### ⚔️ Outils combat

- [x] **UI-1** Tracker d'initiative
  - Composant : `src/lib/components/InitiativeTracker.svelte`
  - Drag-and-drop pour réordonner
  - HP + conditions (14 conditions D&D 5e)
  - Synchronisation Supabase Realtime sur channel `combat_${encounter_id}`

- [x] **UI-2** Gestion des conditions D&D 5e
  - 14 conditions : blinded, charmed, deafened, exhaustion, frightened, grappled,
    incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned
  - Affichage avec rappel des effets

- [x] **UI-3** Lanceur de dés
  - Composant : `src/lib/components/DiceRoller.svelte`
  - Notation standard : `2d6+3`, `1d20`, etc.
  - Historique de la session courante
  - Lancer secret (visible DM uniquement)

### 📚 Wiki

- [ ] **UI-4** Éditeur Markdown pour les entrées wiki

  ```bash
  npm install marked
  ```

  - Syntaxe de lien interne : `[[npc:Aldric]]`, `[[location:Port-Hiver]]`
  - Résolution automatique vers les fiches Supabase

- [ ] **DB-2** Fiches PNJ avec relations

  ```sql
  CREATE TABLE npc_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id UUID REFERENCES npcs(id),
    target_id UUID REFERENCES npcs(id),
    relation_type TEXT -- 'ally' | 'enemy' | 'neutral' | 'family'
  );
  ```

- [ ] **DB-3** Journal de session partagé
  - Champ `sessions.visibility` déjà existant : `'dm_only' | 'players' | 'public'`
  - Les joueurs voient uniquement les sessions `players` ou `public`

### 🏗️ Architecture

- [ ] **INFRA-3** Rate limiting des appels Claude

  ```sql
  CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    date DATE DEFAULT CURRENT_DATE,
    count INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
  );
  ```

  - Limite : 50 appels/jour/utilisateur
  - Vérifier avant chaque appel Claude, incrémenter après

- [ ] **INFRA-4** Streaming des réponses Claude
  - Utiliser `client.messages.stream()` au lieu de `client.messages.create()`
  - Retourner un `ReadableStream` depuis la route `+server.ts`
  - Consommer avec `fetch` + `response.body.getReader()` côté Svelte

- [ ] **DB-4** Support multi-campagnes
  ```sql
  CREATE TABLE campaign_members (
    campaign_id UUID REFERENCES campaigns(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT DEFAULT 'player', -- 'dm' | 'player'
    PRIMARY KEY (campaign_id, user_id)
  );
  ```

---

## Structure de fichiers cible

```
src/
├── lib/
│   ├── server/
│   │   ├── context.ts          ← buildCampaignContext()
│   │   └── anthropic.ts        ← client Anthropic partagé
│   ├── components/
│   │   ├── InitiativeTracker.svelte
│   │   ├── DiceRoller.svelte
│   │   └── NpcCard.svelte
│   └── supabase.ts             ← client Supabase
├── routes/
│   ├── api/
│   │   └── claude/
│   │       ├── +server.ts      ← route de base
│   │       ├── rules/+server.ts
│   │       ├── npc/+server.ts
│   │       ├── improv/+server.ts
│   │       ├── summary/+server.ts
│   │       └── location/+server.ts
│   └── ...
```

---

## Variables d'environnement requises

```bash
# .env (local) — ne jamais commiter
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## Ordre d'implémentation recommandé

1. ~~INFRA-1~~ ✅ SDK installé
2. ~~INFRA-2~~ ✅ Route de base créée
3. ~~AUTH-1~~ ✅ Déjà en place (`profiles.role = 'dm' | 'player'`)
4. ~~DB-1~~ ✅ Migrations appliquées (ALTER TABLE, pas CREATE TABLE)
5. ~~AI-INFRA-1~~ ✅ `buildCampaignContext()` créé
6. ~~AI-2~~ ✅ Générateur PNJ
7. ~~AI-1~~ ✅ Oracle règles
8. ~~AI-3~~ ✅ Improvisation
9. ~~AI-4~~ ✅ Résumé session
10. ~~AI-5~~ ✅ Description lieu
11. ~~UI-1/UI-2~~ ✅ InitiativeTracker + conditions
12. ~~UI-3~~ ✅ DiceRoller
13. UI-4 → DB-2 → INFRA-3 → INFRA-4 → DB-4
