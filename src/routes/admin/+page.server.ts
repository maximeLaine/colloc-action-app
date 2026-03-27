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
		{ data: invitations },
		{ data: allCharacters }
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
		locals.supabase.from('campaigns').select('id, name').order('created_at').limit(1).maybeSingle(),
		locals.supabase.rpc('get_kills_for_user', { p_user_id: user.id }),
		locals.supabase.rpc('get_monsters_for_user', { p_user_id: user.id }),
		locals.supabase.rpc('admin_list_invitations', { p_user_id: user.id }),
		locals.supabase.rpc('admin_get_characters', { p_user_id: user.id })
	]);

	const stats = Array.isArray(statsArr) ? statsArr[0] : statsArr;

	const playersMap = new Map<
		string,
		{
			id: string;
			email: string;
			display_name: string;
			role: string;
			characters: {
				id: string;
				name: string;
				race: string;
				class: string;
				level: number;
				hp_current: number;
				hp_max: number;
				ac: number;
				status: string;
				visibility: string;
			}[];
		}
	>();

	for (const row of rows ?? []) {
		if (!playersMap.has(row.player_id)) {
			playersMap.set(row.player_id, {
				id: row.player_id,
				email: row.email,
				display_name: row.display_name,
				role: row.role,
				characters: []
			});
		}
		if (row.char_id) {
			playersMap.get(row.player_id)!.characters.push({
				id: row.char_id,
				name: row.char_name,
				race: row.char_race ?? '',
				class: row.char_class,
				level: row.char_level,
				hp_current: row.char_hp_current,
				hp_max: row.char_hp_max,
				ac: row.char_ac ?? 10,
				status: row.char_status ?? 'vivant',
				visibility: row.char_visibility
			});
		}
	}

	return {
		stats: stats ?? {
			sessions_count: 0,
			characters_count: 0,
			pnj_count: 0,
			lore_count: 0,
			monsters_count: 0,
			kills_count: 0
		},
		players: Array.from(playersMap.values()),
		sessions: (sessionsRes as { data: unknown[] | null }).data ?? [],
		npcs: npcsRes.data ?? [],
		activeCombat: combatRes.data ?? null,
		campaign: campaignRes.data ?? null,
		kills: kills ?? [],
		monsters: monsters ?? [],
		invitations: invitations ?? [],
		allCharacters: allCharacters ?? []
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
			p_user_id: user.id,
			p_name: name,
			p_role: role,
			p_affiliation: (form.get('affiliation') as string)?.trim() || null,
			p_status: (form.get('status') as string)?.trim() || 'vivant',
			p_description: (form.get('description') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_visibility: (form.get('visibility') as string) || 'dm_only',
			p_hp: parseInt(form.get('hp') as string) || null,
			p_ac: parseInt(form.get('ac') as string) || null,
			p_str_score: parseInt(form.get('str_score') as string) || null,
			p_dex_score: parseInt(form.get('dex_score') as string) || null,
			p_con_score: parseInt(form.get('con_score') as string) || null,
			p_int_score: parseInt(form.get('int_score') as string) || null,
			p_wis_score: parseInt(form.get('wis_score') as string) || null,
			p_cha_score: parseInt(form.get('cha_score') as string) || null
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
			p_user_id: user.id,
			p_npc_id: id,
			p_name: name,
			p_role: role,
			p_affiliation: (form.get('affiliation') as string)?.trim() || null,
			p_status: (form.get('status') as string)?.trim() || 'vivant',
			p_description: (form.get('description') as string)?.trim() || null,
			p_dm_notes: (form.get('dm_notes') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_visibility: (form.get('visibility') as string) || 'dm_only',
			p_hp: parseInt(form.get('hp') as string) || null,
			p_ac: parseInt(form.get('ac') as string) || null,
			p_str_score: parseInt(form.get('str_score') as string) || null,
			p_dex_score: parseInt(form.get('dex_score') as string) || null,
			p_con_score: parseInt(form.get('con_score') as string) || null,
			p_int_score: parseInt(form.get('int_score') as string) || null,
			p_wis_score: parseInt(form.get('wis_score') as string) || null,
			p_cha_score: parseInt(form.get('cha_score') as string) || null
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
			p_user_id: user.id,
			p_npc_id: id,
			p_visibility: visibility
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
			p_user_id: user.id,
			p_npc_id: id
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
		} catch {
			/* ignore */
		}

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
	},

	assignChar: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const charId = form.get('char_id') as string;
		const playerId = (form.get('player_id') as string)?.trim();
		if (!charId) return fail(400, { error: 'ID personnage manquant' });

		const { error } = await locals.supabase.rpc('admin_update_character', {
			p_user_id: user.id,
			p_char_id: charId,
			p_player_id: playerId || null,
			p_clear_player: !playerId,
			p_name: null,
			p_race: null,
			p_class: null,
			p_level: null,
			p_hp_max: null,
			p_hp_current: null,
			p_ac: null,
			p_backstory: null,
			p_image_url: null,
			p_dm_backstory: null,
			p_status: null
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	updateChar: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

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
			p_player_id: null,
			p_clear_player: false,
			p_backstory: null,
			p_image_url: null,
			p_dm_backstory: null,
			p_status: (form.get('status') as string) || null
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	createChar: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');
		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const race = (form.get('race') as string)?.trim();
		const charClass = (form.get('class') as string)?.trim();
		if (!name || !race || !charClass) return fail(400, { error: 'Nom, race et classe requis' });
		const { error } = await locals.supabase.rpc('admin_create_character', {
			p_user_id: user.id,
			p_name: name,
			p_race: race,
			p_class: charClass,
			p_level: parseInt(form.get('level') as string) || 1,
			p_hp_max: parseInt(form.get('hp_max') as string) || 10,
			p_ac: parseInt(form.get('ac') as string) || 10,
			p_player_id: (form.get('player_id') as string)?.trim() || null,
			p_backstory: (form.get('backstory') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_dm_backstory: (form.get('dm_backstory') as string)?.trim() || null,
			p_status: (form.get('status') as string) || 'vivant'
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	shareChar: async ({ request, locals }) => {
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

	updateCharFull: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');
		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });
		const player_id = (form.get('player_id') as string)?.trim();
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
			p_clear_player: player_id === '',
			p_backstory: (form.get('backstory') as string)?.trim() || null,
			p_image_url: (form.get('image_url') as string)?.trim() || null,
			p_dm_backstory: (form.get('dm_backstory') as string)?.trim() || null,
			p_status: (form.get('status') as string) || null
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteChar: async ({ request, locals }) => {
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
	},

	deleteInvitation: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const { error } = await locals.supabase.rpc('admin_delete_invitation', {
			p_user_id: user.id,
			p_invitation_id: id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	createMonster: async ({ request, locals }) => {
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

	updateMonster: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) redirect(303, '/login');

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID manquant' });

		const g = (k: string) => (form.get(k) as string)?.trim() || null;
		const gi = (k: string) => parseInt(form.get(k) as string) || null;
		const { error } = await locals.supabase.rpc('admin_update_monster', {
			p_user_id: user.id,
			p_monster_id: id,
			p_name: g('name'),
			p_type: g('type'),
			p_cr: g('cr'),
			p_hp: gi('hp'),
			p_ac: gi('ac'),
			p_notes: g('notes'),
			p_image_url: g('image_url'),
			p_description: g('description'),
			p_actions: g('actions'),
			p_special_abilities: g('special_abilities'),
			p_size: g('size'),
			p_alignment: g('alignment'),
			p_speed: g('speed'),
			p_str_score: gi('str_score'),
			p_dex_score: gi('dex_score'),
			p_con_score: gi('con_score'),
			p_int_score: gi('int_score'),
			p_wis_score: gi('wis_score'),
			p_cha_score: gi('cha_score'),
			p_saving_throws: g('saving_throws'),
			p_skills_text: g('skills_text'),
			p_damage_resistances: g('damage_resistances'),
			p_damage_immunities: g('damage_immunities'),
			p_condition_immunities: g('condition_immunities'),
			p_senses: g('senses'),
			p_languages: g('languages'),
			p_legendary_actions: g('legendary_actions'),
			p_reactions: g('reactions'),
			p_source_url: g('source_url')
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteMonster: async ({ request, locals }) => {
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
