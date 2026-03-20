import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, DEFAULT_MODEL } from '$lib/server/anthropic';
import { buildCampaignContext } from '$lib/server/context';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	if (!body?.situation) throw error(400, 'situation requise');

	const { data: { user } } = await locals.supabase.auth.getUser();
	if (user) {
		const { allowed, count, limit } = await checkAndIncrementUsage(locals.supabase, user.id);
		if (!allowed) throw error(429, `Limite journalière atteinte (${count}/${limit} appels)`);
	}

	const campaignContext = await buildCampaignContext(locals.supabase);

	const prompt = `${campaignContext}

---
Situation actuelle : ${body.situation}

Propose 3 directions narratives pour cette situation. Réponds UNIQUEMENT en JSON valide :
{
  "options": [
    {
      "title": "Titre court de l'option",
      "description": "Ce qui se passe concrètement",
      "consequence": "Conséquence probable à court terme"
    }
  ]
}`;

	const message = await anthropic.messages.create({
		model: DEFAULT_MODEL,
		max_tokens: 1024,
		system: 'Tu es un Maître du Jeu D&D 5e expérimenté, expert en improvisation narrative. Tu réponds uniquement en français et en JSON valide.',
		messages: [{ role: 'user', content: prompt }]
	});

	const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';

	let result: { options: { title: string; description: string; consequence: string }[] };
	try {
		result = JSON.parse(raw);
	} catch {
		const match = raw.match(/\{[\s\S]*\}/);
		if (!match) throw error(500, 'Réponse IA non parsable');
		try {
			result = JSON.parse(match[0]);
		} catch {
			throw error(500, 'Réponse IA non parsable');
		}
	}

	return json(result);
};
