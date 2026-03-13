import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			profile: {
				id: string;
				email: string;
				display_name: string;
				role: 'dm' | 'player';
				avatar_url: string | null;
			} | null;
		}
	}
}

export {};
