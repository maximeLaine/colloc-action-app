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
