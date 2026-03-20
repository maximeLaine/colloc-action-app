import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Construit le contexte de la campagne pour les prompts Claude.
 * Charge les 5 dernières sessions + PNJ actifs depuis Supabase.
 */
export async function buildCampaignContext(supabase: SupabaseClient): Promise<string> {
	const [sessionsRes, npcsRes] = await Promise.all([
		supabase
			.from('sessions')
			.select('number, title, date_played, summary')
			.order('number', { ascending: false })
			.limit(5),
		supabase
			.from('npcs')
			.select('name, role, affiliation, status, description, personality, motivation')
			.neq('status', 'mort')
			.order('name')
			.limit(30)
	]);

	const sessions = sessionsRes.data ?? [];
	const npcs = npcsRes.data ?? [];

	const sessionLines = sessions
		.map(
			(s) =>
				`- Session ${s.number}${s.title ? ` "${s.title}"` : ''}${s.date_played ? ` (${s.date_played})` : ''}: ${s.summary?.slice(0, 200) || 'Pas de résumé.'}`
		)
		.join('\n');

	const npcLines = npcs
		.map((n) => {
			const parts = [`${n.name} (${n.role || 'PNJ'})`];
			if (n.affiliation) parts.push(`affiliation: ${n.affiliation}`);
			if (n.personality) parts.push(`personnalité: ${n.personality}`);
			if (n.motivation) parts.push(`motivation: ${n.motivation}`);
			if (n.description) parts.push(n.description.slice(0, 100));
			return `- ${parts.join(' — ')}`;
		})
		.join('\n');

	return `## Contexte de la campagne "La Kolok-Action" (D&D 5e)

### 5 dernières sessions
${sessionLines || 'Aucune session enregistrée.'}

### PNJ actifs
${npcLines || 'Aucun PNJ enregistré.'}`;
}
