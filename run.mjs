/**
 * run.mjs — Script de build utilisé par Netlify en lieu et place de `npm run build`.
 *
 * Raison d'être : dans certains environnements CI (notamment Netlify), appeler
 * directement les binaires Node évite des problèmes liés à npm scripts et aux
 * variables d'environnement non propagées.
 *
 * Usage :
 *   node run.mjs           → build (défaut)
 *   node run.mjs sync      → svelte-kit sync (génère les types $types)
 *   node run.mjs dev       → serveur de dev sur le port 5173
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const cmd = process.argv[2] ?? 'build';

const scripts = {
	sync: ['node', ['node_modules/@sveltejs/kit/src/cli.js', 'sync']],
	build: ['node', ['node_modules/vite/bin/vite.js', 'build']],
	dev: ['node', ['node_modules/vite/bin/vite.js', '--port', '5173']]
};

const [bin, args] = scripts[cmd] ?? scripts.build;
const result = spawnSync(bin, args, { cwd: dir, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 0);
