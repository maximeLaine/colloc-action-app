import { describe, it, expect, vi } from 'vitest';
import { checkAndIncrementUsage } from './rateLimit';

function makeChain(overrides: Record<string, unknown> = {}) {
	const chain: Record<string, unknown> = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data: null }),
		update: vi.fn().mockReturnThis(),
		insert: vi.fn().mockResolvedValue({ error: null }),
		...overrides
	};
	return chain;
}

function makeSupabase(queryData: { id: string; count: number } | null) {
	const chain = makeChain({
		maybeSingle: vi.fn().mockResolvedValue({ data: queryData })
	});
	return { from: vi.fn().mockReturnValue(chain) };
}

describe('checkAndIncrementUsage', () => {
	it('crée un enregistrement pour un nouvel utilisateur', async () => {
		const supabase = makeSupabase(null);
		const result = await checkAndIncrementUsage(supabase as never, 'user-1');

		expect(result).toEqual({ allowed: true, count: 1, limit: 50 });
		expect(supabase.from).toHaveBeenCalledWith('ai_usage');
	});

	it('incrémente le compteur si sous la limite', async () => {
		const supabase = makeSupabase({ id: 'row-1', count: 10 });
		const result = await checkAndIncrementUsage(supabase as never, 'user-1');

		expect(result).toEqual({ allowed: true, count: 11, limit: 50 });
	});

	it('bloque à 50 appels', async () => {
		const supabase = makeSupabase({ id: 'row-1', count: 50 });
		const result = await checkAndIncrementUsage(supabase as never, 'user-1');

		expect(result).toEqual({ allowed: false, count: 50, limit: 50 });
	});

	it('autorise le 50e appel (count=49)', async () => {
		const supabase = makeSupabase({ id: 'row-1', count: 49 });
		const result = await checkAndIncrementUsage(supabase as never, 'user-1');

		expect(result).toEqual({ allowed: true, count: 50, limit: 50 });
	});
});
