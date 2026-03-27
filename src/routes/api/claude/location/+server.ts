import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, DEFAULT_MODEL } from '$lib/server/anthropic';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	if (!body?.location_id) throw error(400, 'location_id requis');

	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (user) {
		const { allowed, count, limit } = await checkAndIncrementUsage(locals.supabase, user.id);
		if (!allowed) throw error(429, `Limite journalière atteinte (${count}/${limit} appels)`);
	}

	const { data: location, error: dbError } = await locals.supabase
		.from('locations')
		.select('name, description_public')
		.eq('id', body.location_id)
		.single();

	if (dbError || !location) throw error(404, 'Lieu introuvable');

	const prompt = `Génère une description immersive pour ce lieu de D&D 5e :
Nom : ${location.name}
${location.description_public ? `Description existante : ${location.description_public}` : ''}

Réponds UNIQUEMENT en JSON valide :
{
  "public_description": "Ce que les joueurs perçoivent (sons, odeurs, ambiance)",
  "hidden_details": "Détails cachés que le MJ peut révéler",
  "ambiance": "Mot ou phrase courte pour l'ambiance générale"
}`;

	const message = await anthropic.messages.create({
		model: DEFAULT_MODEL,
		max_tokens: 1024,
		system:
			'Tu es un auteur spécialisé en univers de fantasy médiévale pour D&D 5e. Tu crées des descriptions sensorielles et atmosphériques. Tu réponds uniquement en français et en JSON valide.',
		messages: [{ role: 'user', content: prompt }]
	});

	const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';

	let result: { public_description: string; hidden_details: string; ambiance: string };
	try {
		result = JSON.parse(raw);
	} catch {
		throw error(500, 'Réponse IA non parsable');
	}

	// Sauvegarder dans Supabase
	await locals.supabase
		.from('locations')
		.update({
			description_public: result.public_description,
			description_hidden: result.hidden_details
		})
		.eq('id', body.location_id);

	return json(result);
};
