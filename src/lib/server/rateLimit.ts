import type { SupabaseClient } from '@supabase/supabase-js';

const DAILY_LIMIT = 50;

export async function checkAndIncrementUsage(
	supabase: SupabaseClient,
	userId: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
	const today = new Date().toISOString().split('T')[0];

	const { data } = await supabase
		.from('ai_usage')
		.select('id, count')
		.eq('user_id', userId)
		.eq('date', today)
		.maybeSingle();

	if (data) {
		if (data.count >= DAILY_LIMIT) {
			return { allowed: false, count: data.count, limit: DAILY_LIMIT };
		}
		await supabase
			.from('ai_usage')
			.update({ count: data.count + 1 })
			.eq('id', data.id);
		return { allowed: true, count: data.count + 1, limit: DAILY_LIMIT };
	}

	await supabase.from('ai_usage').insert({ user_id: userId, date: today, count: 1 });
	return { allowed: true, count: 1, limit: DAILY_LIMIT };
}
