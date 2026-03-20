import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: { user } } = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'Non connecté');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role, display_name')
		.eq('id', user.id)
		.single();

	const isDm = profile?.role === 'dm';

	const [sessionsRes, npcsRes, campaignRes] = await Promise.all([
		locals.supabase
			.from('sessions')
			.select('id, number, title, date_played, summary, visibility')
			.order('number', { ascending: false })
			.limit(5),
		locals.supabase
			.from('npcs')
			.select('id, name, role, affiliation, status, visibility, generated_by_ai')
			.neq('status', 'dead')
			.order('name'),
		locals.supabase
			.from('campaigns')
			.select('id, name')
			.eq('id', params.id)
			.single()
	]);

	if (campaignRes.error) throw error(404, 'Campagne introuvable');

	// Les joueurs ne voient pas les sessions dm_only
	const sessions = (sessionsRes.data ?? []).filter(
		(s) => isDm || s.visibility !== 'dm_only'
	);

	// Les joueurs ne voient pas les PNJ dm_only
	const npcs = (npcsRes.data ?? []).filter(
		(n) => isDm || n.visibility !== 'dm_only'
	);

	return {
		campaign: campaignRes.data,
		sessions,
		npcs,
		isDm,
		profile
	};
};
