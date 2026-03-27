import type { LayoutServerLoad } from './$types';
import type { Role } from '$lib/types/database';

type Profile = {
	id: string;
	email: string;
	display_name: string;
	role: Role;
	avatar_url: string | null;
} | null;

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('supabase:auth');
	const { session, user } = await locals.safeGetSession();

	let profile = null;
	let campaignId: string | null = null;

	if (user) {
		const [profileRes, campaignRes] = await Promise.all([
			locals.supabase.rpc('get_profile_by_id', { user_id: user.id }).single(),
			locals.supabase.from('campaigns').select('id').order('created_at').limit(1).single()
		]);
		if (profileRes.error)
			console.error(
				'[layout] profile fetch error:',
				profileRes.error.message,
				profileRes.error.code
			);
		profile = profileRes.data as Profile;
		campaignId = campaignRes.data?.id ?? null;
	}

	return { session, user, profile, campaignId };
};
