import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [{ data: players, error }, { data: invitations }] = await Promise.all([
		locals.supabase.rpc('admin_get_all_players', { p_user_id: user.id }),
		locals.supabase.rpc('admin_list_invitations', { p_user_id: user.id })
	]);

	if (error) console.error('[admin/joueurs] load error:', error.message);
	return { players: players ?? [], invitations: invitations ?? [] };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('admin_update_player', {
			p_user_id: user.id,
			p_player_id: id,
			p_display_name: (form.get('display_name') as string)?.trim() || '',
			p_role: (form.get('role') as string) || ''
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	invite: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const email = (form.get('email') as string)?.trim();
		const role = (form.get('role') as string) || 'player';
		if (!email) return fail(400, { error: 'Email requis' });

		const { data: token, error } = await locals.supabase.rpc('admin_create_invitation', {
			p_user_id: user.id,
			p_email: email,
			p_role: role
		});

		if (error) return fail(500, { error: error.message });
		return { success: true, inviteToken: token };
	}
};
