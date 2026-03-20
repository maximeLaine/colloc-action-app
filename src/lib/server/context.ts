import type { SupabaseClient } from '@supabase/supabase-js';

export async function buildCampaignContext(supabase: SupabaseClient): Promise<string> {
	const [sessionsRes, npcsRes] = await Promise.all([
		supabase
			.from('sessions')
			.select('number, title, date_played, summary')
			.order('number', { ascending: false })
			.limit(5),
		supabase
			.from('npcs')
			.select('name, role, affiliation, status, description')
			.neq('status', 'mort')
			.order('name')
			.limit(30)
	]);

	const sessions = sessionsRes.data ?? [];
	const npcs = npcsRes.data ?? [];

	const sessionLines = sessions.map(
		(s) => `- Session ${s.number} "${s.title}"${s.summary ? ': ' + s.summary.slice(0, 200) : ''}`
	);

	const npcLines = npcs.map(
		(n) =>
			`- ${n.name} (${n.role}${n.affiliation ? ', ' + n.affiliation : ''}) — ${n.status}${n.description ? ': ' + n.description.slice(0, 100) : ''}`
	);

	return [
		'## Contexte de campagne — La Kolok-Action (D&D 5e)',
		'',
		'### Dernières sessions',
		...sessionLines,
		'',
		'### PNJ actifs',
		...npcLines
	].join('\n');
}
