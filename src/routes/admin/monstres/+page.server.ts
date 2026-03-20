import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const { data: monsters } = await locals.supabase
		.rpc('admin_get_monsters', { p_user_id: user.id });

	return { monsters: monsters ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		if (!name) return fail(400, { error: 'Nom requis' });

		const { error } = await locals.supabase.rpc('admin_create_monster', {
			p_user_id: user.id,
			p_name: name,
			p_type: (form.get('type') as string)?.trim() || null,
			p_cr: (form.get('cr') as string)?.trim() || null,
			p_hp: parseInt(form.get('hp') as string) || null,
			p_ac: parseInt(form.get('ac') as string) || null,
			p_notes: (form.get('notes') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null
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

		const g = (k: string) => (form.get(k) as string)?.trim() || null;
		const gi = (k: string) => parseInt(form.get(k) as string) || null;
		const { error } = await locals.supabase.rpc('admin_update_monster', {
			p_user_id: user.id, p_monster_id: id,
			p_name: g('name'), p_type: g('type'), p_cr: g('cr'),
			p_hp: gi('hp'), p_ac: gi('ac'),
			p_notes: g('notes'), p_image_url: g('image_url'),
			p_description: g('description'), p_actions: g('actions'), p_special_abilities: g('special_abilities'),
			p_size: g('size'), p_alignment: g('alignment'), p_speed: g('speed'),
			p_str_score: gi('str_score'), p_dex_score: gi('dex_score'), p_con_score: gi('con_score'),
			p_int_score: gi('int_score'), p_wis_score: gi('wis_score'), p_cha_score: gi('cha_score'),
			p_saving_throws: g('saving_throws'), p_skills_text: g('skills_text'),
			p_damage_resistances: g('damage_resistances'), p_damage_immunities: g('damage_immunities'),
			p_condition_immunities: g('condition_immunities'), p_senses: g('senses'),
			p_languages: g('languages'), p_legendary_actions: g('legendary_actions'), p_reactions: g('reactions')
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

		const { error } = await locals.supabase.rpc('admin_delete_monster', {
			p_user_id: user.id,
			p_monster_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
