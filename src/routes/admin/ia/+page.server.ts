import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: { user } } = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'Non connecté');

	const [sessionsRes, npcsRes, combatRes, campaignRes] = await Promise.all([
		locals.supabase
			.from('sessions')
			.select('id, number, title, date_played, summary, dm_notes, xp_awarded')
			.order('number', { ascending: false })
			.limit(30),
		locals.supabase
			.from('npcs')
			.select('id, name, role, status, generated_by_ai, visibility, affiliation')
			.order('name'),
		locals.supabase
			.from('combat_encounters')
			.select('id, name, combatants, round, turn_index, is_active')
			.eq('is_active', true)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		locals.supabase
			.from('campaigns')
			.select('id, name')
			.order('created_at')
			.limit(1)
			.maybeSingle()
	]);

	return {
		sessions: sessionsRes.data ?? [],
		npcs: npcsRes.data ?? [],
		activeCombat: combatRes.data ?? null,
		campaign: campaignRes.data ?? null
	};
};
