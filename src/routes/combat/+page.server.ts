import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const { data: profileArr } = await locals.supabase
		.rpc('get_profile_by_id', { user_id: user.id });
	const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr;
	const isDM = profile?.role === 'dm';

	const [{ data: kills }, { data: monsters }] = await Promise.all([
		locals.supabase.rpc('get_kills_for_user', { p_user_id: user.id }),
		locals.supabase.rpc('get_monsters_for_user', { p_user_id: user.id })
	]);

	return { kills: kills ?? [], monsters: monsters ?? [], isDM };
};

export const actions: Actions = {
	addKill: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const monster_name = (form.get('monster_name') as string)?.trim();
		const killed_by = (form.get('killed_by') as string)?.trim();
		if (!monster_name || !killed_by) return fail(400, { error: 'Monstre et personnage requis' });

		const session_number = parseInt(form.get('session_number') as string) || null;
		const notes = (form.get('notes') as string)?.trim() || null;

		const { error } = await locals.supabase.rpc('admin_add_kill', {
			p_user_id: user.id,
			p_monster_name: monster_name,
			p_killed_by: killed_by,
			p_session_number: session_number,
			p_notes: notes
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteKill: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('admin_delete_kill', {
			p_user_id: user.id,
			p_kill_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
