import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [{ data: players, error }, { data: invitations }, { data: characters }] = await Promise.all(
		[
			locals.supabase.rpc('admin_get_all_players', { p_user_id: user.id }),
			locals.supabase.rpc('admin_list_invitations', { p_user_id: user.id }),
			locals.supabase.rpc('admin_get_characters', { p_user_id: user.id })
		]
	);

	if (error) console.error('[admin/joueurs] load error:', error.message);
	return { players: players ?? [], invitations: invitations ?? [], characters: characters ?? [] };
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

	assignChar: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const charId = form.get('char_id') as string;
		const playerId = (form.get('player_id') as string)?.trim();
		if (!charId) return fail(400, { error: 'ID personnage manquant' });

		const { error } = await locals.supabase.rpc('admin_update_character', {
			p_user_id: user.id,
			p_char_id: charId,
			p_player_id: playerId || null,
			p_clear_player: !playerId,
			p_name: null,
			p_race: null,
			p_class: null,
			p_level: null,
			p_hp_max: null,
			p_hp_current: null,
			p_ac: null,
			p_backstory: null,
			p_image_url: null,
			p_dm_backstory: null,
			p_status: null
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteInvite: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('admin_delete_invitation', {
			p_user_id: user.id,
			p_invitation_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deletePlayer: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('admin_delete_player', {
			p_user_id: user.id,
			p_player_id: id
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
