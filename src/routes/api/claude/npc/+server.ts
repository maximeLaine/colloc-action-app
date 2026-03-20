import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, DEFAULT_MODEL } from '$lib/server/anthropic';
import { buildCampaignContext } from '$lib/server/context';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

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
			'Réponds UNIQUEMENT avec un JSON valide (pas de markdown) avec les champs :',
			'{ "name": string, "role": string, "affiliation": string, "status": "vivant", "description": string (2-3 phrases, visible joueurs), "dm_notes": string (motivations secrètes, 1-2 phrases), "personality": string (3 traits), "secret": string, "motivation": string }'
		].join('\n'),
		messages: [{ role: 'user', content: prompt }]
	});

	const raw = response.content[0].type === 'text' ? response.content[0].text : '';

	let npc: Record<string, string>;
	try {
		npc = JSON.parse(raw);
	} catch {
		// Try to extract JSON from response
		const match = raw.match(/\{[\s\S]*\}/);
		if (!match) throw error(500, 'Réponse IA invalide');
		npc = JSON.parse(match[0]);
	}

	return json({ npc });
};
