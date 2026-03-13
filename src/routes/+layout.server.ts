import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('supabase:auth');
	const { session, user } = await locals.safeGetSession();

	let profile = null;
	if (user) {
		const { data, error } = await locals.supabase
			.rpc('get_profile_by_id', { user_id: user.id })
			.single();
		if (error) console.error('[layout] profile fetch error:', error.message, error.code);
		profile = data;
	}

	return { session, user, profile };
};
