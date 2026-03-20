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
		{ data: monsters },
		{ data: invitations }
	] = await Promise.all([
		locals.supabase.rpc('admin_get_dashboard_stats', { p_user_id: user.id }),
		locals.supabase.rpc('admin_get_players_with_chars', { p_user_id: user.id }),
		locals.supabase.rpc('get_sessions_for_user', { p_user_id: user.id }),
		locals.supabase.rpc('admin_get_npcs', { p_user_id: user.id }),
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
		locals.supabase.rpc('get_monsters_for_user', { p_user_id: user.id }),
		locals.supabase.rpc('admin_list_invitations', { p_user_id: user.id })
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
		sessions: (sessionsRes as { data: unknown[] | null }).data ?? [],
		npcs: npcsRes.data ?? [],
		activeCombat: combatRes.data ?? null,
		campaign: campaignRes.data ?? null,
		kills: kills ?? [],
		monsters: monsters ?? [],
		invitations: invitations ?? []
	};
};

export const actions: Actions = {
	createNpc: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');
		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const role = (form.get('role') as string)?.trim();
		if (!name || !role) return fail(400, { error: 'Nom et rôle requis' });
		const { error } = await locals.supabase.rpc('admin_create_npc', {
			p_user_id: user.id, p_name: name, p_role: role,
			p_affiliation: (form.get('affiliation') as string)?.trim() || null,
			p_status: (form.get('status') as string)?.trim() || 'vivant',
			p_description: (form.get('description') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_visibility: (form.get('visibility') as string) || 'dm_only'
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	updateNpc: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');
		const form = await request.formData();
		const id = (form.get('id') as string)?.trim();
		const name = (form.get('name') as string)?.trim();
		const role = (form.get('role') as string)?.trim();
		if (!id || !name || !role) return fail(400, { error: 'Données manquantes' });
		const { error } = await locals.supabase.rpc('admin_update_npc', {
			p_user_id: user.id, p_npc_id: id, p_name: name, p_role: role,
			p_affiliation: (form.get('affiliation') as string)?.trim() || null,
			p_status: (form.get('status') as string)?.trim() || 'vivant',
			p_description: (form.get('description') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_visibility: (form.get('visibility') as string) || 'dm_only'
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	shareNpc: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');
		const form = await request.formData();
		const id = form.get('id') as string;
		const visibility = (form.get('visibility') as string) || 'players';
		if (!id) return fail(400, { error: 'ID manquant' });
		const { error } = await locals.supabase.rpc('admin_set_npc_visibility', {
			p_user_id: user.id, p_npc_id: id, p_visibility: visibility
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteNpc: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');
		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });
		const { error } = await locals.supabase.rpc('admin_delete_npc', {
			p_user_id: user.id, p_npc_id: id
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	saveSession: async ({ request, locals }) => {
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

	shareSession: async ({ request, locals }) => {
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

	deleteSession: async ({ request, locals }) => {
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
	},

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
