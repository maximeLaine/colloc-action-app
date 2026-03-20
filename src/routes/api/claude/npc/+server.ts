import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, DEFAULT_MODEL } from '$lib/server/anthropic';
import { buildCampaignContext } from '$lib/server/context';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);

	const { data: { user } } = await locals.supabase.auth.getUser();
	if (user) {
		const { allowed, count, limit } = await checkAndIncrementUsage(locals.supabase, user.id);
		if (!allowed) throw error(429, `Limite journalière atteinte (${count}/${limit} appels)`);
	}

	const campaignContext = await buildCampaignContext(locals.supabase);

	const hints: string[] = [];
	if (body?.race) hints.push(`Race : ${body.race}`);
	if (body?.role) hints.push(`Rôle : ${body.role}`);
	if (body?.location) hints.push(`Lieu : ${body.location}`);
	if (body?.tone) hints.push(`Ton / ambiance : ${body.tone}`);

	const prompt = `${campaignContext}

---
Génère un PNJ pour cette campagne D&D 5e.
${hints.length ? hints.join('\n') : ''}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, avec exactement ces champs :
{
  "name": "Nom complet",
  "race": "Race",
  "role": "Rôle dans la campagne",
  "personality": "2-3 traits de personnalité marquants",
  "voice": "Manière de parler, tics verbaux",
  "secret": "Un secret que le PNJ cache",
  "motivation": "Ce qui le motive profondément"
}`;

	const message = await anthropic.messages.create({
		model: DEFAULT_MODEL,
		max_tokens: 1024,
		system: 'Tu es un assistant de jeu de rôle expert en création de personnages D&D 5e. Tu réponds uniquement en français et uniquement en JSON valide.',
		messages: [{ role: 'user', content: prompt }]
	});

	const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';

	let npcData: Record<string, string>;
	try {
		npcData = JSON.parse(raw);
	} catch {
		throw error(500, 'Réponse IA non parsable');
	}

	// Sauvegarder dans Supabase
	const { data: saved, error: dbError } = await locals.supabase
		.from('npcs')
		.insert({
			name: npcData.name,
			role: npcData.role,
			description: npcData.personality,
			personality: npcData.personality,
			motivation: npcData.motivation,
			secret: npcData.secret,
			location: body?.location ?? null,
			generated_by_ai: true,
			status: 'alive',
			visibility: 'dm_only',
			abilities: []
		})
		.select()
		.single();

	if (dbError) throw error(500, dbError.message);

	return json({ npc: saved, generated: npcData });
};
