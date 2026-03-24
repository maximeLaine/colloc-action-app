import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, DEFAULT_MODEL } from '$lib/server/anthropic';
import { buildCampaignContext } from '$lib/server/context';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

/** Extrait le premier objet JSON complet d'une chaîne (résistant aux balises markdown). */
function extractFirstJson(text: string): string | null {
	const start = text.indexOf('{');
	if (start === -1) return null;
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}') {
			depth--;
			if (depth === 0) return text.slice(start, i + 1);
		}
	}
	return null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { data: { user } } = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'Non connecté');

	const { allowed } = await checkAndIncrementUsage(locals.supabase, user.id);
	if (!allowed) throw error(429, 'Limite quotidienne atteinte (50 appels/jour)');

	const { concept, role, affiliation, extra } = await request.json();
	if (!concept) throw error(400, 'concept requis');

	const context = await buildCampaignContext(locals.supabase);

	const prompt = [
		`Génère un PNJ D&D 5e cohérent avec la campagne.`,
		`Concept : ${concept}`,
		role ? `Rôle : ${role}` : '',
		affiliation ? `Affiliation : ${affiliation}` : '',
		extra ? `Notes supplémentaires : ${extra}` : ''
	]
		.filter(Boolean)
		.join('\n');

	const response = await anthropic.messages.create({
		model: DEFAULT_MODEL,
		max_tokens: 800,
		system: [
			context,
			'',
			'Réponds STRICTEMENT en JSON, sans markdown ni texte avant/après. Champs attendus :',
			'{ "name": string, "role": string, "affiliation": string, "status": "vivant", "description": string (2-3 phrases, visible joueurs), "dm_notes": string (motivations secrètes, 1-2 phrases), "personality": string (3 traits), "secret": string, "motivation": string }'
		].join('\n'),
		messages: [{ role: 'user', content: prompt }]
	});

	const raw = response.content[0].type === 'text' ? response.content[0].text : '';

	let npc: Record<string, string>;
	try {
		npc = JSON.parse(raw);
	} catch {
		const extracted = extractFirstJson(raw);
		if (!extracted) {
			console.error('[npc] Parsing JSON échoué. Réponse brute :', raw);
			throw error(500, 'Réponse IA invalide');
		}
		try {
			npc = JSON.parse(extracted);
		} catch {
			console.error('[npc] Parsing JSON échoué après extraction. Réponse brute :', raw);
			throw error(500, 'Réponse IA invalide');
		}
	}

	return json({ npc });
};
