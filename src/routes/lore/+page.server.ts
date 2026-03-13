import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const { data: profileArr } = await locals.supabase
		.rpc('get_profile_by_id', { user_id: user.id });
	const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr;
	const isDM = profile?.role === 'dm';

	const { data: entries, error } = await locals.supabase
		.rpc('get_lore_for_user', { p_user_id: user.id });

	if (error) console.error('[lore] load error:', error.message);

	const grouped: Record<string, typeof entries> = {};
	for (const e of entries ?? []) {
		if (!grouped[e.category]) grouped[e.category] = [];
		grouped[e.category]!.push(e);
	}

	return { grouped, isDM };
};
