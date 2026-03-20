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

	const { context: userContext, party_level, session_tone } = await request.json();

	const campaignContext = await buildCampaignContext(locals.supabase);

	const prompt = [
		`Propose 3 à 5 ennemis/rencontres pour la prochaine session D&D 5e.`,
		party_level ? `Niveau du groupe : ${party_level}` : '',
		session_tone ? `Ton souhaité : ${session_tone}` : '',
		userContext ? `Contexte supplémentaire : ${userContext}` : ''
	]
		.filter(Boolean)
		.join('\n');

	const response = await anthropic.messages.create({
		model: DEFAULT_MODEL,
		max_tokens: 1200,
		system: [
			campaignContext,
			'',
			'Tu es un Maître du Jeu D&D 5e créatif. Propose des rencontres cohérentes avec la campagne.',
			'Réponds UNIQUEMENT avec un JSON valide (pas de markdown) :',
			'{ "encounters": [ { "name": string, "type": "boss"|"monstre"|"groupe"|"piège"|"social", "cr": string, "description": string (2-3 phrases narratives), "tactics": string (comment ils se battent), "loot": string (récompenses potentielles), "hook": string (pourquoi ils sont là, lien avec la campagne) } ] }'
		].join('\n'),
		messages: [{ role: 'user', content: prompt }]
	});

	const raw = response.content[0].type === 'text' ? response.content[0].text : '';

	let result: { encounters: unknown[] };
	try {
		result = JSON.parse(raw);
	} catch {
		const match = raw.match(/\{[\s\S]*\}/);
		if (!match) throw error(500, 'Réponse IA invalide');
		try {
			result = JSON.parse(match[0]);
		} catch {
			throw error(500, 'Réponse IA invalide');
		}
	}

	return json({ encounters: result.encounters ?? [] });
};
