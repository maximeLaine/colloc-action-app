import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [{ data: profileArr }, { data: entries, error }] = await Promise.all([
		locals.supabase.rpc('get_profile_by_id', { user_id: user.id }),
		locals.supabase.rpc('get_lore_for_user', { p_user_id: user.id })
	]);
	const isDM = (Array.isArray(profileArr) ? profileArr[0] : profileArr)?.role === 'dm';

	if (error) console.error('[lore] load error:', error.message);

	// Group by section → category → entries
	const sections: Record<string, Record<string, typeof entries>> = {};
	for (const e of entries ?? []) {
		const sec = e.section ?? 'Divers';
		const cat = e.category ?? sec;
		if (!sections[sec]) sections[sec] = {};
		if (!sections[sec][cat]) sections[sec][cat] = [];
		sections[sec][cat]!.push(e);
	}

	return { sections, isDM };
};
