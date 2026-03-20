import type { LayoutServerLoad } from './$types';
import type { Role } from '$lib/types/database';

type Profile = { id: string; email: string; display_name: string; role: Role; avatar_url: string | null } | null;

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('supabase:auth');
	const { session, user } = await locals.safeGetSession();

	let profile = null;
	if (user) {
		const { data, error } = await locals.supabase
			.rpc('get_profile_by_id', { user_id: user.id })
			.single();
		if (error) console.error('[layout] profile fetch error:', error.message, error.code);
		profile = data as Profile;
	}

	let campaignId: string | null = null;
	if (user) {
		const { data: campaign } = await locals.supabase
			.from('campaigns')
			.select('id')
			.order('created_at')
			.limit(1)
			.single();
		campaignId = campaign?.id ?? null;
	}

	return { session, user, profile, campaignId };
};
