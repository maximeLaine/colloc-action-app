import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [{ data: profileArr }, { data: characters, error }] = await Promise.all([
		locals.supabase.rpc('get_profile_by_id', { user_id: user.id }),
		locals.supabase.rpc('get_characters_for_user', { p_user_id: user.id })
	]);
	const isDM = (Array.isArray(profileArr) ? profileArr[0] : profileArr)?.role === 'dm';

	if (error) console.error('[personnages] load error:', error.message);
	return { characters: characters ?? [], isDM, userId: user.id };
};

export const actions: Actions = {
	updateOwn: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const charId = form.get('char_id') as string;
		if (!charId) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('player_update_own_character', {
			p_user_id: user.id,
			p_char_id: charId,
			p_level: parseInt(form.get('level') as string) || null,
			p_hp_max: parseInt(form.get('hp_max') as string) || null,
			p_hp_current: parseInt(form.get('hp_current') as string) || null,
			p_ac: parseInt(form.get('ac') as string) || null,
			p_backstory: (form.get('backstory') as string) || null,
			p_image_url: (form.get('image_url') as string) || null
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
