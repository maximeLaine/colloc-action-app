# CLAUDE.md — La Kolok-Action

Context file for AI assistants working on this repository.

## Project Overview

**La Kolok-Action** is a D&D 5e Dungeon Master console web application. It provides campaign management tools for DMs and players: campaign wiki, NPC management, session logs, combat tracker, dice roller, and AI-powered modules (NPC generation, rules oracle, session summarization, improvisation helper, enemy generator, location describer).

The application is in French. All UI text, AI prompts, and generated content target French-speaking users.

---

## Tech Stack

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Framework       | SvelteKit 5 (Svelte 5 with runes syntax)           |
| Language        | TypeScript 5.5 (strict mode)                       |
| Database + Auth | Supabase (PostgreSQL + RLS)                        |
| AI              | Anthropic API (Claude Haiku 4.5 / Sonnet 4.6)      |
| Deployment      | Netlify (serverless functions via adapter-netlify) |
| Build           | Vite 6                                             |
| Testing         | Vitest 4 + happy-dom + @testing-library/svelte     |

---

## Repository Structure

```
src/
├── lib/
│   ├── components/           # Reusable Svelte components
│   │   ├── DiceRoller.svelte         # Dice notation parser & roller (2d6+3 syntax)
│   │   ├── InitiativeTracker.svelte  # D&D 5e combat order tracker
│   │   ├── MarkdownEditor.svelte     # Edit/Preview/Split markdown editor with wiki links
│   │   ├── FileAttachments.svelte    # File attachment display
│   │   ├── ImageUpload.svelte        # Image upload handler
│   │   └── SessionAttachments.svelte # Session file attachments
│   ├── server/               # Server-only modules (never imported client-side)
│   │   ├── anthropic.ts      # Anthropic SDK client + model constants
│   │   ├── context.ts        # Builds campaign context for AI system prompts
│   │   ├── rateLimit.ts      # 50 AI calls/user/day enforcement
│   │   ├── context.test.ts
│   │   └── rateLimit.test.ts
│   ├── types/
│   │   └── database.ts       # TypeScript interfaces for all Supabase tables
│   ├── utils/
│   │   ├── format.ts         # HTML formatter: bold, italic, Fraktur magic text
│   │   └── format.test.ts
│   └── supabase.ts           # Supabase browser client (PUBLIC env vars)
├── routes/
│   ├── +layout.server.ts     # Root layout: loads session, profile, campaign_id
│   ├── +layout.svelte        # Root layout component
│   ├── +page.svelte          # Home page
│   ├── api/
│   │   ├── claude/
│   │   │   ├── +server.ts          # Base AI route (streaming, rate-limited)
│   │   │   ├── rules/+server.ts    # D&D 5e rules oracle
│   │   │   ├── npc/+server.ts      # NPC generator (returns JSON)
│   │   │   ├── improv/+server.ts   # Improvisation helper (returns JSON)
│   │   │   ├── location/+server.ts # Location describer (writes to Supabase)
│   │   │   ├── enemies/+server.ts  # Enemy/encounter generator (returns JSON)
│   │   │   └── summary/+server.ts  # Session summarizer (uses Sonnet model)
│   │   └── upload/
│   │       ├── +server.ts
│   │       ├── lore/+server.ts
│   │       └── session/+server.ts
│   ├── admin/                # DM-only console (tabbed: sessions, npcs, pj, combat, ia, monstres)
│   ├── auth/                 # Auth callbacks
│   ├── campaign/             # Campaign detail
│   ├── carte/                # Interactive campaign map
│   ├── combat/               # Combat tracker page
│   ├── invite/[token]/       # Invite link handler
│   ├── login/                # Login page
│   ├── lore/                 # Campaign wiki
│   ├── personnages/          # Player character view
│   ├── pnj/                  # NPC directory (player view)
│   └── sessions/             # Session log (shared view)
├── app.d.ts                  # Global type augmentation (Supabase session in locals)
├── app.html                  # HTML shell
├── hooks.server.ts           # Server hooks: Supabase SSR auth, safeGetSession()
└── test-setup.ts             # Vitest global setup (@testing-library/jest-dom)

scripts/
└── convert-bg.mjs            # Converts background.png → background.webp (Sharp)

static/
├── background.webp           # App background image
├── logo.png
└── img/                      # Static images: characters, NPCs, locations, map tiles
```

---

## Development Commands

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build (also runs convert-bg.mjs)
npm run preview      # Preview production build locally
npm test             # Run Vitest tests once
npm run test:watch   # Watch mode
npm run lint         # ESLint check
npm run format       # Prettier format (modifies files)
```

---

## Environment Variables

Create `.env.local` for local development:

```bash
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

- `PUBLIC_*` variables are exposed to the browser (safe by design — Supabase anon key).
- `ANTHROPIC_API_KEY` is server-only. Never import it in client-side code.
- In production, all variables are set in the Netlify dashboard.

---

## Code Conventions

### TypeScript

- Strict mode is enabled. No `any` unless unavoidable (ESLint warns).
- All Supabase table shapes are defined in `src/lib/types/database.ts`. Add new tables there.
- Server-only code lives in `src/lib/server/`. SvelteKit enforces this — never import server modules on the client.

### Svelte

- Uses **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`). Do not use legacy Svelte 4 reactivity (`$:`, `export let`).
- Components use tabs for indentation, single quotes, 100-character line width (matches `.prettierrc`).
- The `@html` directive is intentionally used for markdown rendering (ESLint rule disabled for this).
- `MarkdownEditor.svelte` is excluded from ESLint due to a known parser issue — do not add it back.

### Formatting

- **Indentation:** tabs (not spaces)
- **Quotes:** single quotes
- **Trailing commas:** none
- **Line width:** 100 characters
- Run `npm run format` before committing.

### AI API Routes

All AI routes follow this pattern:

1. Parse JSON body from request
2. Call `checkAndIncrementUsage(supabase, user.id)` — return 429 if over limit
3. Build system prompt (inject campaign context if needed via `buildCampaignContext`)
4. Call `anthropic.messages.create(...)` — use `DEFAULT_MODEL` for short tasks, `LONG_MODEL` for summaries
5. Return response (streaming for `/api/claude`, JSON-parsed for structured endpoints)

**Model selection:**

- `DEFAULT_MODEL = 'claude-haiku-4-5-20251001'` — fast, cheap, for most features
- `LONG_MODEL = 'claude-sonnet-4-6'` — better quality, for session summaries

**JSON extraction:** AI responses that return structured data often wrap JSON in markdown code fences. Use robust extraction (find first `{` / last `}`) rather than direct `JSON.parse` on the raw response.

**Rate limiting:** The `ai_usage` Supabase table tracks `(user_id, date, count)`. The limit is 50 calls/day/user. Always call `checkAndIncrementUsage` before making AI requests.

### Supabase

- Browser client: `src/lib/supabase.ts` (uses `createBrowserClient` from `@supabase/ssr`)
- Server client: created in `hooks.server.ts` and `+layout.server.ts` using `createServerClient`
- Auth: handled by `safeGetSession()` in `hooks.server.ts` — always validates JWT server-side
- Campaign context: the root layout always loads `session`, `profile`, and `campaign_id` — available in all `+page.server.ts` files via `parent()`

### Testing

Tests live next to the files they test (e.g., `rateLimit.ts` → `rateLimit.test.ts`). Tests use Vitest globals (`describe`, `it`, `expect`) — no imports needed. Mock Supabase clients by passing objects with `.from()`, `.select()`, etc. stubs.

---

## Database Schema (key tables)

| Table               | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `profiles`          | User info: `email`, `display_name`, `role` ('dm' or 'player')         |
| `characters`        | Player characters: stats, abilities, backstory, image                 |
| `npcs`              | NPCs: role, personality, motivation, location, `generated_by_ai` flag |
| `sessions`          | Campaign sessions: summary, raw_notes, visibility                     |
| `campaigns`         | Campaign metadata                                                     |
| `locations`         | Locations: `public_description`, `hidden_details` (DM-only)           |
| `npc_relations`     | Relations between NPCs: ally/enemy/family                             |
| `ai_usage`          | Rate limiting: `(user_id, date, count)`                               |
| `campaign_members`  | Maps users to campaigns                                               |
| `lore_entries`      | Wiki entries with visibility control                                  |
| `monsters`          | Bestiary: CR, AC, HP, abilities, damage types                         |
| `combat_encounters` | Combat state (persisted)                                              |

---

## Key Domain Concepts

- **MJ** = Maître du Jeu = Dungeon Master (DM)
- **PJ** = Personnage Joueur = Player Character (PC)
- **PNJ** = Personnage Non-Joueur = Non-Player Character (NPC)
- **admin/** routes = DM-only console
- Locations have `public_description` (players can see) and `hidden_details` (DM-only)
- Sessions have `visibility`: `dm_only`, `players`, or `public`
- The dice roller supports standard D&D notation: `NdS[+/-M]`, e.g. `2d6+3`, `1d20`, `d8`
- `InitiativeTracker` supports the 14 official D&D 5e conditions

---

## Deployment

- **Platform:** Netlify
- **Build command:** `node run.mjs` (not `npm run build` — see `netlify.toml`)
- **Publish dir:** `.svelte-kit/netlify`
- **Node version:** 22 (set in `netlify.toml`)
- SvelteKit `+server.ts` routes become Netlify serverless functions automatically via `@sveltejs/adapter-netlify`
- The `run.mjs` script spawns Vite/SvelteKit directly for more reliable CI builds

---

## Common Pitfalls

- **Do not import from `$lib/server/*` in client-side code** — SvelteKit will throw a build error.
- **Background image:** The app uses `background.webp` (converted from `.png` at build time). If the background is missing, run `node scripts/convert-bg.mjs`.
- **AI JSON parsing:** Always extract JSON robustly — Claude may wrap responses in markdown code fences even when asked not to.
- **Svelte 5 syntax:** Use runes (`$state`, `$derived`, `$effect`). Legacy `$:` reactive statements and `export let` are not used in this codebase.
- **ESLint flat config:** The project uses ESLint 10 with the new flat config format (`eslint.config.js`), not `.eslintrc`.
