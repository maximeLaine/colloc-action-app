import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const { data: entries, error } = await locals.supabase.rpc('admin_get_lore', {
		p_user_id: user.id
	});

	if (error) console.error('[admin/lore] load error:', error.message);
	return { entries: entries ?? [] };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const title = (form.get('title') as string)?.trim();
		const category = (form.get('category') as string)?.trim();
		if (!title || !category) return fail(400, { error: 'Titre et catégorie requis' });

		let attachments = [];
		try {
			const raw = (form.get('attachments') as string)?.trim();
			if (raw) attachments = JSON.parse(raw);
		} catch {
			/* ignore */
		}

		const { error } = await locals.supabase.rpc('admin_upsert_lore', {
			p_user_id: user.id,
			p_id: (form.get('id') as string)?.trim() || null,
			p_title: title,
			p_category: category,
			p_content: (form.get('content') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_visibility: (form.get('visibility') as string) || 'players',
			p_attachments: attachments,
			p_section: (form.get('section') as string)?.trim() || 'Divers'
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

		const { error } = await locals.supabase.rpc('admin_delete_lore', {
			p_user_id: user.id,
			p_lore_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
