export type Role = 'dm' | 'player';
export type Visibility = 'dm_only' | 'players' | 'public';

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
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<Database['public']['Tables']['characters']['Row'], 'id' | 'created_at' | 'updated_at'>;
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
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<Database['public']['Tables']['npcs']['Row'], 'id' | 'created_at' | 'updated_at'>;
				Update: Partial<Database['public']['Tables']['npcs']['Insert']>;
			};
			sessions: {
				Row: {
					id: string;
					number: number;
					title: string;
					date_played: string | null;
					summary: string;
					dm_notes: string | null;
					xp_awarded: number | null;
					visibility: Visibility;
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'created_at' | 'updated_at'>;
				Update: Partial<Database['public']['Tables']['sessions']['Insert']>;
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
				Insert: Omit<Database['public']['Tables']['lore_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
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
				Insert: Omit<Database['public']['Tables']['combat_encounters']['Row'], 'id' | 'created_at' | 'updated_at'>;
				Update: Partial<Database['public']['Tables']['combat_encounters']['Insert']>;
			};
		};
	};
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
