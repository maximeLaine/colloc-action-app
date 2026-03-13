import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const { data: profileArr } = await locals.supabase
		.rpc('get_profile_by_id', { user_id: user.id });
	const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr;
	if (profile?.role !== 'dm') error(403, 'Accès réservé au Maître du Jeu');

	return {};
};
