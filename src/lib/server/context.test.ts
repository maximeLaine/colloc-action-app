import { describe, it, expect } from 'vitest';
import { buildCampaignContext } from './context';

function makeSupabase(sessions: unknown[], npcs: unknown[]) {
	const makeQuery = (data: unknown[]) => ({
		select: () => makeQuery(data),
		order: () => makeQuery(data),
		limit: () => makeQuery(data),
		neq: () => makeQuery(data),
		then: (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data })
	});

	return {
		from: (table: string) => {
			if (table === 'sessions') return makeQuery(sessions);
			if (table === 'npcs') return makeQuery(npcs);
			return makeQuery([]);
		}
	};
}

describe('buildCampaignContext', () => {
	it('retourne un message vide pour des données absentes', async () => {
		const supabase = makeSupabase([], []);
		const ctx = await buildCampaignContext(supabase as never);

		expect(ctx).toContain('Aucune session enregistrée');
		expect(ctx).toContain('Aucun PNJ enregistré');
	});

	it('inclut les sessions dans le contexte', async () => {
		const supabase = makeSupabase(
			[{ number: 3, title: 'Le Donjon', date_played: '2024-01-01', summary: 'Les héros explorent.' }],
			[]
		);
		const ctx = await buildCampaignContext(supabase as never);

		expect(ctx).toContain('Session 3');
		expect(ctx).toContain('Le Donjon');
		expect(ctx).toContain('Les héros explorent.');
	});

	it('inclut les PNJ actifs dans le contexte', async () => {
		const supabase = makeSupabase([], [
			{ name: 'Aldric', role: 'Forgeron', affiliation: 'Guilde', personality: 'Bourru', motivation: 'Protéger sa famille', description: 'Un vieil homme robuste.' }
		]);
		const ctx = await buildCampaignContext(supabase as never);

		expect(ctx).toContain('Aldric');
		expect(ctx).toContain('Forgeron');
	});

	it('gère les PNJ avec des champs partiels', async () => {
		const supabase = makeSupabase([], [
			{ name: 'Inconnu', role: null, affiliation: null, personality: null, motivation: null, description: null }
		]);
		const ctx = await buildCampaignContext(supabase as never);

		expect(ctx).toContain('Inconnu');
	});

	it('tronque les longs résumés de session', async () => {
		const longSummary = 'A'.repeat(500);
		const supabase = makeSupabase(
			[{ number: 1, title: null, date_played: null, summary: longSummary }],
			[]
		);
		const ctx = await buildCampaignContext(supabase as never);

		// Le résumé est tronqué à 200 caractères
		expect(ctx).toContain('A'.repeat(200));
		expect(ctx).not.toContain('A'.repeat(201));
	});
});
