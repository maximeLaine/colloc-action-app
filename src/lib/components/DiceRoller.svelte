<script lang="ts">
	interface Roll {
		expression: string;
		result: number;
		breakdown: string;
		isSecret: boolean;
		timestamp: Date;
	}

	interface Props {
		isDm?: boolean;
	}

	let { isDm = false }: Props = $props();

	let expression = $state('');
	let history = $state<Roll[]>([]);
	let error = $state('');
	let isSecret = $state(false);

	function parseAndRoll(expr: string): { result: number; breakdown: string } | null {
		// Supporte : 2d6+3, 1d20, d8, 3d4-1
		const normalized = expr.trim().toLowerCase().replace(/\s/g, '');
		const match = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/);
		if (!match) return null;

		const count = parseInt(match[1] || '1');
		const sides = parseInt(match[2]);
		const modifier = parseInt(match[3] || '0');

		if (count < 1 || count > 20 || sides < 2) return null;

		const rolls: number[] = [];
		for (let i = 0; i < count; i++) {
			rolls.push(Math.floor(Math.random() * sides) + 1);
		}

		const total = rolls.reduce((a, b) => a + b, 0) + modifier;
		const breakdown =
			count > 1
				? `[${rolls.join('+')}]${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''} = ${total}`
				: `${rolls[0]}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''} = ${total}`;

		return { result: total, breakdown };
	}

	function roll() {
		error = '';
		const parsed = parseAndRoll(expression);
		if (!parsed) {
			error = 'Format invalide. Exemple : 2d6+3, 1d20, d8';
			return;
		}
		history = [
			{
				expression,
				result: parsed.result,
				breakdown: parsed.breakdown,
				isSecret,
				timestamp: new Date()
			},
			...history.slice(0, 19)
		];
		expression = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') roll();
	}

	function quickRoll(expr: string) {
		expression = expr;
		roll();
	}

	const QUICK_ROLLS = ['d20', 'd12', 'd10', 'd8', 'd6', 'd4', '2d6', '4d6'];
</script>

<div class="dice-roller">
	<div class="input-row">
		<input
			type="text"
			bind:value={expression}
			onkeydown={handleKeydown}
			placeholder="Ex: 2d6+3, 1d20..."
			class="dice-input"
		/>
		<button onclick={roll} class="roll-btn">🎲 Lancer</button>
	</div>

	{#if isDm}
		<label class="secret-toggle">
			<input type="checkbox" bind:checked={isSecret} />
			Lancer secret (visible DM uniquement)
		</label>
	{/if}

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="quick-rolls">
		{#each QUICK_ROLLS as q}
			<button onclick={() => quickRoll(q)} class="quick-btn">{q}</button>
		{/each}
	</div>

	{#if history.length > 0}
		<div class="history">
			{#each history as roll}
				{#if !roll.isSecret || isDm}
					<div class="roll-entry" class:secret={roll.isSecret}>
						<span class="roll-expr">{roll.expression}</span>
						<span class="roll-breakdown">{roll.breakdown}</span>
						<span
							class="roll-result"
							class:nat20={roll.result === 20 && roll.expression.includes('d20')}
						>
							{roll.result}
						</span>
						{#if roll.isSecret}
							<span class="secret-badge">🔒</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.dice-roller {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.input-row {
		display: flex;
		gap: 0.5rem;
	}
	.dice-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
	}
	.roll-btn {
		padding: 0.5rem 1rem;
		background: #7c3aed;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}
	.roll-btn:hover {
		background: #6d28d9;
	}
	.secret-toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.875rem;
		color: #6b7280;
		cursor: pointer;
	}
	.error {
		color: #dc2626;
		font-size: 0.875rem;
	}
	.quick-rolls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.quick-btn {
		padding: 0.25rem 0.5rem;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}
	.quick-btn:hover {
		background: #e5e7eb;
	}
	.history {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: 300px;
		overflow-y: auto;
	}
	.roll-entry {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.375rem 0.5rem;
		background: #f9fafb;
		border-radius: 4px;
		font-size: 0.875rem;
	}
	.roll-entry.secret {
		background: #fef3c7;
	}
	.roll-expr {
		font-weight: 600;
		min-width: 3rem;
	}
	.roll-breakdown {
		color: #6b7280;
		flex: 1;
	}
	.roll-result {
		font-weight: 700;
		font-size: 1.125rem;
		min-width: 2rem;
		text-align: right;
	}
	.roll-result.nat20 {
		color: #d97706;
	}
	.secret-badge {
		font-size: 0.75rem;
	}

	@media (max-width: 480px) {
		.history {
			max-height: 200px;
		}
		.roll-entry {
			flex-wrap: wrap;
			gap: 0.4rem;
		}
		.quick-btn {
			padding: 0.35rem 0.6rem;
			min-height: 32px;
		}
	}
</style>
