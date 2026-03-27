import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, LONG_MODEL } from '$lib/server/anthropic';
import { buildCampaignContext } from '$lib/server/context';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'Non connecté');

	const { allowed } = await checkAndIncrementUsage(locals.supabase, user.id);
	if (!allowed) throw error(429, 'Limite quotidienne atteinte (50 appels/jour)');

	const { raw_notes, session_number, title } = await request.json();
	if (!raw_notes) throw error(400, 'raw_notes requis');

	const context = await buildCampaignContext(locals.supabase);

	const response = await anthropic.messages.create({
		model: LONG_MODEL,
		max_tokens: 1200,
		system: [
			context,
			'',
			'Tu es le chroniqueur de la campagne. Écris un résumé vivant et immersif de la session, à la 3ème personne, en français.',
			'Le résumé doit être engageant pour les joueurs (2-4 paragraphes), en style narratif D&D.',
			'Ne répète pas les notes brutes mot pour mot. Synthesise et donne du rythme.'
		].join('\n'),
		messages: [
			{
				role: 'user',
				content: `Session ${session_number ?? '?'} — ${title ?? 'Sans titre'}\n\nNotes brutes du MJ :\n${raw_notes}`
			}
		]
	});

	const summary = response.content[0].type === 'text' ? response.content[0].text : '';

	return json({ summary });
};
