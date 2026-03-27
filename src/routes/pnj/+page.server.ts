import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [{ data: profileArr }, { data: npcs, error }] = await Promise.all([
		locals.supabase.rpc('get_profile_by_id', { user_id: user.id }),
		locals.supabase.rpc('get_npcs_for_user', { p_user_id: user.id })
	]);
	const isDM = (Array.isArray(profileArr) ? profileArr[0] : profileArr)?.role === 'dm';

	if (error) console.error('[pnj] load error:', error.message);
	return { npcs: npcs ?? [], isDM };
};

export const actions = {
	toggleVisibility: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const { data: profileArr } = await locals.supabase.rpc('get_profile_by_id', {
			user_id: user.id
		});
		const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr;
		if (profile?.role !== 'dm') return { error: 'Non autorisé' };

		const form = await request.formData();
		const id = form.get('id') as string;
		const visibility = form.get('visibility') as string;

		await locals.supabase.rpc('admin_set_npc_visibility', {
			p_user_id: user.id,
			p_npc_id: id,
			p_visibility: visibility
		});
		return { success: true };
	}
};
