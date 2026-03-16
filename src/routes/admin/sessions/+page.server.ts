import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const { data: sessions, error } = await locals.supabase
		.rpc('get_sessions_for_user', { p_user_id: user.id });

	if (error) console.error('[admin/sessions] load error:', error.message);
	return { sessions: sessions ?? [] };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = (form.get('id') as string)?.trim() || null;
		const title = (form.get('title') as string)?.trim();
		const number = parseInt(form.get('number') as string) || 1;

		if (!title) return fail(400, { error: 'Titre requis' });

		const dateRaw = (form.get('date_played') as string)?.trim();

		let attachments = [];
		try {
			const raw = (form.get('attachments') as string)?.trim();
			if (raw) attachments = JSON.parse(raw);
		} catch { /* ignore */ }

		const { error } = await locals.supabase.rpc('admin_upsert_session', {
			p_user_id: user.id,
			p_id: id || null,
			p_number: number,
			p_title: title,
			p_summary: (form.get('summary') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_date_played: dateRaw || null,
			p_xp_awarded: parseInt(form.get('xp_awarded') as string) || 0,
			p_visibility: (form.get('visibility') as string) || 'players',
			p_attachments: attachments,
		p_campaign: (form.get('campaign') as string)?.trim() || 'Colloc-Action'
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

		const { error } = await locals.supabase.rpc('admin_set_session_visibility', {
			p_user_id: user.id,
			p_session_id: id,
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

		const { error } = await locals.supabase.rpc('admin_delete_session', {
			p_user_id: user.id,
			p_session_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
