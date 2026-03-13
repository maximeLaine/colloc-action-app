import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [{ data: characters }, { data: players }] = await Promise.all([
		locals.supabase.rpc('admin_get_characters', { p_user_id: user.id }),
		locals.supabase.rpc('admin_get_players', { p_user_id: user.id })
	]);

	return { characters: characters ?? [], players: players ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const race = (form.get('race') as string)?.trim();
		const charClass = (form.get('class') as string)?.trim();
		const level = parseInt(form.get('level') as string) || 1;
		const hp_max = parseInt(form.get('hp_max') as string) || 10;
		const ac = parseInt(form.get('ac') as string) || 10;

		if (!name || !race || !charClass) return fail(400, { error: 'Nom, race et classe requis' });

		const player_id = (form.get('player_id') as string)?.trim() || null;

		const { error } = await locals.supabase.rpc('admin_create_character', {
			p_user_id: user.id,
			p_name: name,
			p_race: race,
			p_class: charClass,
			p_level: level,
			p_hp_max: hp_max,
			p_ac: ac,
			p_player_id: player_id || null,
			p_backstory: (form.get('backstory') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	share: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		const visibility = form.get('visibility') as string;
		if (!id || !visibility) return fail(400, { error: 'Paramètres manquants' });

		const { error } = await locals.supabase.rpc('admin_set_character_visibility', {
			p_user_id: user.id,
			p_char_id: id,
			p_visibility: visibility
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const player_id = (form.get('player_id') as string)?.trim();
		const clear_player = player_id === '';

		const { error } = await locals.supabase.rpc('admin_update_character', {
			p_user_id: user.id,
			p_char_id: id,
			p_name: (form.get('name') as string)?.trim() || null,
			p_race: (form.get('race') as string)?.trim() || null,
			p_class: (form.get('class') as string)?.trim() || null,
			p_level: parseInt(form.get('level') as string) || null,
			p_hp_max: parseInt(form.get('hp_max') as string) || null,
			p_hp_current: parseInt(form.get('hp_current') as string) || null,
			p_ac: parseInt(form.get('ac') as string) || null,
			p_player_id: player_id || null,
			p_clear_player: clear_player,
			p_backstory: (form.get('backstory') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('admin_delete_character', {
			p_user_id: user.id,
			p_char_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
