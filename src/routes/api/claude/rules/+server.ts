import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, DEFAULT_MODEL } from '$lib/server/anthropic';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

const SYSTEM = `Tu es un expert des règles de Donjons & Dragons 5e édition.
Tu cites les règles précises (numéros de page si possible), tu réponds toujours en français,
et tu expliques clairement pour un MJ en cours de session. Sois concis et pratique.`;

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	if (!body?.question) throw error(400, 'question requise');

	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (user) {
		const { allowed, count, limit } = await checkAndIncrementUsage(locals.supabase, user.id);
		if (!allowed) throw error(429, `Limite journalière atteinte (${count}/${limit} appels)`);
	}

	const message = await anthropic.messages.create({
		model: DEFAULT_MODEL,
		max_tokens: 1024,
		system: SYSTEM,
		messages: [{ role: 'user', content: body.question }]
	});

	const answer = message.content[0].type === 'text' ? message.content[0].text : '';
	return json({ answer });
};
