import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(303, '/login');

	const [
		{ data: statsArr },
		{ data: rows },
		sessionsRes,
		npcsRes,
		combatRes,
		campaignRes,
		{ data: kills },
		{ data: monsters }
	] = await Promise.all([
		locals.supabase.rpc('admin_get_dashboard_stats', { p_user_id: user.id }),
		locals.supabase.rpc('admin_get_players_with_chars', { p_user_id: user.id }),
		locals.supabase
			.from('sessions')
			.select('id, number, title, date_played, summary, dm_notes, xp_awarded')
			.order('number', { ascending: false })
			.limit(30),
		locals.supabase
			.from('npcs')
			.select('id, name, role, status, generated_by_ai, visibility, affiliation')
			.order('name'),
		locals.supabase
			.from('combat_encounters')
			.select('id, name, combatants, round, turn_index, is_active')
			.eq('is_active', true)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		locals.supabase
			.from('campaigns')
			.select('id, name')
			.order('created_at')
			.limit(1)
			.maybeSingle(),
		locals.supabase.rpc('get_kills_for_user', { p_user_id: user.id }),
		locals.supabase.rpc('get_monsters_for_user', { p_user_id: user.id })
	]);

	const stats = Array.isArray(statsArr) ? statsArr[0] : statsArr;

	const playersMap = new Map<string, {
		id: string; email: string; display_name: string; role: string;
		characters: { id: string; name: string; class: string; level: number; hp_current: number; hp_max: number; visibility: string }[];
	}>();

	for (const row of rows ?? []) {
		if (!playersMap.has(row.player_id)) {
			playersMap.set(row.player_id, {
				id: row.player_id, email: row.email,
				display_name: row.display_name, role: row.role,
				characters: []
			});
		}
		if (row.char_id) {
			playersMap.get(row.player_id)!.characters.push({
				id: row.char_id, name: row.char_name, class: row.char_class,
				level: row.char_level, hp_current: row.char_hp_current,
				hp_max: row.char_hp_max, visibility: row.char_visibility
			});
		}
	}

	return {
		stats: stats ?? { sessions_count: 0, characters_count: 0, pnj_count: 0, lore_count: 0, monsters_count: 0, kills_count: 0 },
		players: Array.from(playersMap.values()),
		sessions: sessionsRes.data ?? [],
		npcs: npcsRes.data ?? [],
		activeCombat: combatRes.data ?? null,
		campaign: campaignRes.data ?? null,
		kills: kills ?? [],
		monsters: monsters ?? []
	};
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
			p_user_id: user.id, p_monster_name: monster_name,
			p_killed_by: killed_by, p_session_number: session_number, p_notes: notes
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
			p_user_id: user.id, p_kill_id: id
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	updatePlayer: async ({ request, locals }) => {
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
	}
};
