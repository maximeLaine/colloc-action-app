import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const { data: npcs, error } = await locals.supabase.rpc('admin_get_npcs', { p_user_id: user.id });
	if (error) console.error('[admin/pnj] load error:', error.message);

	return { npcs: npcs ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const role = (form.get('role') as string)?.trim();

		if (!name || !role) return fail(400, { error: 'Nom et rôle requis' });

		const { error } = await locals.supabase.rpc('admin_create_npc', {
			p_user_id: user.id,
			p_name: name,
			p_role: role,
			p_affiliation: (form.get('affiliation') as string)?.trim() || null,
			p_status: (form.get('status') as string)?.trim() || 'Vivant',
			p_description: (form.get('description') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_visibility: (form.get('visibility') as string) || 'dm_only'
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = (form.get('id') as string)?.trim();
		const name = (form.get('name') as string)?.trim();
		const role = (form.get('role') as string)?.trim();
		if (!id || !name || !role) return fail(400, { error: 'Données manquantes' });

		const { error } = await locals.supabase.rpc('admin_update_npc', {
			p_user_id: user.id,
			p_npc_id: id,
			p_name: name,
			p_role: role,
			p_affiliation: (form.get('affiliation') as string)?.trim() || null,
			p_status: (form.get('status') as string)?.trim() || 'Vivant',
			p_description: (form.get('description') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_visibility: (form.get('visibility') as string) || 'dm_only'
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	share: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		const visibility = (form.get('visibility') as string) || 'players';
		if (!id) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('admin_set_npc_visibility', {
			p_user_id: user.id,
			p_npc_id: id,
			p_visibility: visibility
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

		const { error } = await locals.supabase.rpc('admin_delete_npc', {
			p_user_id: user.id,
			p_npc_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
