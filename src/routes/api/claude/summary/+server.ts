import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, LONG_MODEL } from '$lib/server/anthropic';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	if (!body?.session_id || !body?.raw_notes) throw error(400, 'session_id et raw_notes requis');

	const { data: { user } } = await locals.supabase.auth.getUser();
	if (user) {
		const { allowed, count, limit } = await checkAndIncrementUsage(locals.supabase, user.id);
		if (!allowed) throw error(429, `Limite journalière atteinte (${count}/${limit} appels)`);
	}

	const prompt = `Voici les notes brutes d'une session de D&D 5e :

${body.raw_notes}

Génère un résumé structuré. Réponds UNIQUEMENT en JSON valide :
{
  "summary": "Résumé narratif de la session (2-4 paragraphes)",
  "key_events": ["Événement clé 1", "Événement clé 2"],
  "npcs_met": ["Nom du PNJ rencontré 1", "Nom du PNJ rencontré 2"],
  "hooks": ["Fil narratif à suivre 1", "Fil narratif à suivre 2"]
}`;

	const message = await anthropic.messages.create({
		model: LONG_MODEL,
		max_tokens: 2048,
		system: 'Tu es un assistant de campagne D&D 5e. Tu rédiges des résumés de session clairs, immersifs et utiles pour le MJ et les joueurs. Tu réponds uniquement en français et en JSON valide.',
		messages: [{ role: 'user', content: prompt }]
	});

	const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';

	let result: { summary: string; key_events: string[]; npcs_met: string[]; hooks: string[] };
	try {
		result = JSON.parse(raw);
	} catch {
		throw error(500, 'Réponse IA non parsable');
	}

	// Sauvegarder le résumé dans la session
	await locals.supabase
		.from('sessions')
		.update({ summary: result.summary, raw_notes: body.raw_notes })
		.eq('id', body.session_id);

	return json(result);
};
