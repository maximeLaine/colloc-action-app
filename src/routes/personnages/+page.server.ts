import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { CharacterResource } from '$lib/types/database';

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
	},

	updateCharacterFull: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const charId = form.get('char_id') as string;
		if (!charId) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('player_update_character_full', {
			p_user_id: user.id,
			p_char_id: charId,
			p_name: (form.get('name') as string) || null,
			p_race: (form.get('race') as string) || null,
			p_class: (form.get('class') as string) || null,
			p_level: parseInt(form.get('level') as string) || null,
			p_hp_max: parseInt(form.get('hp_max') as string) || null,
			p_hp_current: parseInt(form.get('hp_current') as string) || null,
			p_ac: parseInt(form.get('ac') as string) || null,
			p_status: (form.get('status') as string) || null,
			p_backstory: (form.get('backstory') as string) || null,
			p_image_url: (form.get('image_url') as string) || null,
			p_dm_backstory: (form.get('dm_backstory') as string) || null
		});

		if (error) return fail(500, { error: error.message });

		const stats: Record<string, number> = {};
		for (const key of ['for', 'dex', 'con', 'int', 'sag', 'cha']) {
			const val = parseInt(form.get(`stats_${key}`) as string);
			if (!isNaN(val)) stats[key] = val;
		}
		if (Object.keys(stats).length > 0) {
			const { error: statsError } = await locals.supabase.rpc('player_update_character_stats', {
				p_user_id: user.id,
				p_char_id: charId,
				p_stats: stats
			});
			if (statsError) return fail(500, { error: statsError.message });
		}

		return { success: true };
	},

	updateResources: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const charId = form.get('char_id') as string;
		if (!charId) return fail(400, { error: 'ID manquant' });

		let resources: CharacterResource[];
		try {
			resources = JSON.parse(form.get('resources') as string);
		} catch {
			return fail(400, { error: 'Format invalide' });
		}

		const { error } = await locals.supabase.rpc('player_update_resources', {
			p_user_id: user.id,
			p_char_id: charId,
			p_resources: resources
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
