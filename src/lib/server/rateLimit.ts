import type { SupabaseClient } from '@supabase/supabase-js';

const DAILY_LIMIT = 50;

/**
 * Vérifie la limite d'appels Claude pour l'utilisateur du jour.
 * Retourne true si l'appel est autorisé et incrémente le compteur.
 * Retourne false si la limite est atteinte.
 */
export async function checkAndIncrementUsage(
	supabase: SupabaseClient,
	userId: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
	const today = new Date().toISOString().slice(0, 10);

	// Upsert : crée ou met à jour la ligne du jour
	const { data, error } = await supabase
		.from('ai_usage')
		.upsert({ user_id: userId, date: today, count: 1 }, { onConflict: 'user_id,date' })
		.select('count')
		.single();

	if (error) {
		// En cas d'erreur DB, on laisse passer pour ne pas bloquer le MJ
		console.error('[rateLimit] erreur upsert:', error.message);
		return { allowed: true, count: 0, limit: DAILY_LIMIT };
	}

	// Si la ligne existait déjà, on incrémente
	if (data.count > 1) {
		const { data: updated } = await supabase
			.from('ai_usage')
			.update({ count: data.count + 1 })
			.eq('user_id', userId)
			.eq('date', today)
			.select('count')
			.single();

		const count = updated?.count ?? data.count;
		return { allowed: count <= DAILY_LIMIT, count, limit: DAILY_LIMIT };
	}

	return { allowed: true, count: 1, limit: DAILY_LIMIT };
}
