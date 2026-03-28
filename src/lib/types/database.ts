export type Role = 'dm' | 'player';
export type Visibility = 'dm_only' | 'players' | 'public';
export type RelationType = 'ally' | 'enemy' | 'neutral' | 'family';

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string;
					display_name: string;
					role: Role;
					avatar_url: string | null;
					created_at: string;
				};
				Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
				Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
			};
			characters: {
				Row: {
					id: string;
					player_id: string;
					name: string;
					race: string;
					class: string;
					level: number;
					hp_max: number;
					hp_current: number;
					ac: number;
					stats: Record<string, number>;
					attacks: Attack[];
					abilities: string[];
					backstory: string | null;
					image_url: string | null;
					resources: CharacterResource[];
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<
					Database['public']['Tables']['characters']['Row'],
					'id' | 'created_at' | 'updated_at'
				>;
				Update: Partial<Database['public']['Tables']['characters']['Insert']>;
			};
			npcs: {
				Row: {
					id: string;
					name: string;
					role: string;
					affiliation: string | null;
					status: string;
					description: string | null;
					dm_notes: string | null;
					abilities: string[];
					image_url: string | null;
					visibility: Visibility;
					personality: string | null;
					secret: string | null;
					motivation: string | null;
					location: string | null;
					generated_by_ai: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<
					Database['public']['Tables']['npcs']['Row'],
					'id' | 'created_at' | 'updated_at'
				>;
				Update: Partial<Database['public']['Tables']['npcs']['Insert']>;
			};
			sessions: {
				Row: {
					id: string;
					number: number;
					title: string;
					date_played: string | null;
					summary: string;
					raw_notes: string | null;
					dm_notes: string | null;
					xp_awarded: number | null;
					campaign_id: string | null;
					visibility: Visibility;
					attachments: { name: string; url: string; type: 'image' | 'pdf' }[] | null;
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<
					Database['public']['Tables']['sessions']['Row'],
					'id' | 'created_at' | 'updated_at'
				>;
				Update: Partial<Database['public']['Tables']['sessions']['Insert']>;
			};
			campaigns: {
				Row: {
					id: string;
					name: string;
					created_at: string;
				};
				Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at'>;
				Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
			};
			locations: {
				Row: {
					id: string;
					campaign_id: string | null;
					name: string;
					description_public: string | null;
					description_hidden: string | null;
					created_at: string;
				};
				Insert: Omit<Database['public']['Tables']['locations']['Row'], 'id' | 'created_at'>;
				Update: Partial<Database['public']['Tables']['locations']['Insert']>;
			};
			npc_relations: {
				Row: {
					id: string;
					npc_id: string;
					target_id: string;
					relation_type: RelationType | null;
				};
				Insert: Omit<Database['public']['Tables']['npc_relations']['Row'], 'id'>;
				Update: Partial<Database['public']['Tables']['npc_relations']['Insert']>;
			};
			ai_usage: {
				Row: {
					id: string;
					user_id: string;
					date: string;
					count: number;
				};
				Insert: Omit<Database['public']['Tables']['ai_usage']['Row'], 'id'>;
				Update: Partial<Database['public']['Tables']['ai_usage']['Insert']>;
			};
			campaign_members: {
				Row: {
					campaign_id: string;
					user_id: string;
					role: Role;
				};
				Insert: Database['public']['Tables']['campaign_members']['Row'];
				Update: Partial<Database['public']['Tables']['campaign_members']['Insert']>;
			};
			lore_entries: {
				Row: {
					id: string;
					title: string;
					category: string;
					content: string;
					dm_notes: string | null;
					visibility: Visibility;
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<
					Database['public']['Tables']['lore_entries']['Row'],
					'id' | 'created_at' | 'updated_at'
				>;
				Update: Partial<Database['public']['Tables']['lore_entries']['Insert']>;
			};
			monsters: {
				Row: {
					id: string;
					name: string;
					type: string;
					hp: number;
					ac: number;
					speed: string;
					stats: Record<string, number>;
					attacks: Attack[];
					abilities: string[];
					cr: string;
					image_url: string | null;
					created_at: string;
				};
				Insert: Omit<Database['public']['Tables']['monsters']['Row'], 'id' | 'created_at'>;
				Update: Partial<Database['public']['Tables']['monsters']['Insert']>;
			};
			combat_encounters: {
				Row: {
					id: string;
					name: string;
					is_active: boolean;
					combatants: Combatant[];
					round: number;
					turn_index: number;
					created_by: string;
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<
					Database['public']['Tables']['combat_encounters']['Row'],
					'id' | 'created_at' | 'updated_at'
				>;
				Update: Partial<Database['public']['Tables']['combat_encounters']['Insert']>;
			};
		};
	};
}

export interface CharacterResource {
	label: string;
	current: number;
	max: number;
	reset: 'long_rest' | 'short_rest' | 'manual';
}

export interface Attack {
	name: string;
	bonus: string;
	damage: string;
	type: string;
}

export interface Combatant {
	id: string;
	name: string;
	type: 'player' | 'monster' | 'ally';
	initiative: number;
	hp_max: number;
	hp_current: number;
	ac: number;
	conditions: string[];
	character_id?: string;
	monster_id?: string;
}
