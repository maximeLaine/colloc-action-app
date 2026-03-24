import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [{ data: profileArr }, { data: sessions, error }] = await Promise.all([
		locals.supabase.rpc('get_profile_by_id', { user_id: user.id }),
		locals.supabase.rpc('get_sessions_for_user', { p_user_id: user.id })
	]);
	const isDM = (Array.isArray(profileArr) ? profileArr[0] : profileArr)?.role === 'dm';

	if (error) console.error('[sessions] load error:', error.message);

	return { sessions: sessions ?? [], isDM };
};
