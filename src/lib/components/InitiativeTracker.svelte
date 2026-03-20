<script lang="ts">
	import type { Combatant } from '$lib/types/database';

	interface Props {
		combatants: Combatant[];
		round: number;
		turnIndex: number;
		isDm?: boolean;
		onUpdate?: (combatants: Combatant[], round: number, turnIndex: number) => void;
	}

	let { combatants = $bindable(), round, turnIndex, isDm = false, onUpdate }: Props = $props();

	// 14 conditions D&D 5e avec descriptions courtes
	const CONDITIONS: Record<string, string> = {
		blinded: 'Aveuglé — rate les attaques qui nécessitent de voir',
		charmed: 'Charmé — ne peut pas attaquer le charmeur',
		deafened: 'Assourdi — ne peut pas entendre',
		exhaustion: 'Épuisement — malus progressifs',
		frightened: 'Effrayé — désavantage si la source est visible',
		grappled: 'Agrippé — vitesse 0',
		incapacitated: 'Neutralisé — ne peut pas agir',
		invisible: 'Invisible — avantage aux attaques',
		paralyzed: 'Paralysé — neutralisé + echecs Force/Dex',
		petrified: 'Pétrifié — transformé en pierre',
		poisoned: 'Empoisonné — désavantage aux jets',
		prone: 'À terre — avantage des attaques au corps à corps',
		restrained: 'Entravé — vitesse 0, désavantage aux attaques',
		stunned: 'Étourdi — neutralisé, échecs Force/Dex'
	};

	let dragIndex = $state<number | null>(null);
	let showConditions = $state<string | null>(null);
	let editingHp = $state<string | null>(null);
	let hpDelta = $state('');

	function nextTurn() {
		let newTurn = turnIndex + 1;
		let newRound = round;
		if (newTurn >= combatants.length) {
			newTurn = 0;
			newRound += 1;
		}
		onUpdate?.(combatants, newRound, newTurn);
	}

	function applyHpChange(id: string) {
		const delta = parseInt(hpDelta);
		if (isNaN(delta)) { editingHp = null; hpDelta = ''; return; }
		combatants = combatants.map((c) => {
			if (c.id !== id) return c;
			const newHp = Math.max(0, Math.min(c.hp_max, c.hp_current + delta));
			return { ...c, hp_current: newHp };
		});
		onUpdate?.(combatants, round, turnIndex);
		editingHp = null;
		hpDelta = '';
	}

	function toggleCondition(id: string, condition: string) {
		combatants = combatants.map((c) => {
			if (c.id !== id) return c;
			const has = c.conditions.includes(condition);
			return {
				...c,
				conditions: has ? c.conditions.filter((x) => x !== condition) : [...c.conditions, condition]
			};
		});
		onUpdate?.(combatants, round, turnIndex);
	}

	function handleDragStart(index: number) {
		dragIndex = index;
	}

	function handleDrop(targetIndex: number) {
		if (dragIndex === null || dragIndex === targetIndex) return;
		const updated = [...combatants];
		const [moved] = updated.splice(dragIndex, 1);
		updated.splice(targetIndex, 0, moved);
		combatants = updated;
		dragIndex = null;
		onUpdate?.(combatants, round, turnIndex);
	}

	function hpPercent(c: Combatant) {
		return c.hp_max > 0 ? Math.round((c.hp_current / c.hp_max) * 100) : 0;
	}
</script>

<div class="tracker">
	<div class="tracker-header">
		<h3>⚔️ Initiative — Round {round}</h3>
		{#if isDm}
			<button onclick={nextTurn} class="next-btn">Tour suivant →</button>
		{/if}
	</div>

	<div class="combatants">
		{#each combatants as combatant, i}
			<div
				class="combatant"
				class:active={i === turnIndex}
				class:dead={combatant.hp_current === 0}
				draggable={isDm}
				ondragstart={() => handleDragStart(i)}
				ondragover={(e) => e.preventDefault()}
				ondrop={() => handleDrop(i)}
				role="listitem"
			>
				<div class="combatant-main">
					<span class="initiative">{combatant.initiative}</span>
					<span class="name">
						{combatant.name}
						{#if combatant.type === 'player'} 👤{:else if combatant.type === 'monster'} 👾{:else} 🤝{/if}
					</span>

					<div class="hp-section">
						<div class="hp-bar">
							<div class="hp-fill" style="width: {hpPercent(combatant)}%" class:low={hpPercent(combatant) < 30}></div>
						</div>
						{#if editingHp === combatant.id}
							<input
								type="number"
								bind:value={hpDelta}
								placeholder="±HP"
								class="hp-input"
								onkeydown={(e) => e.key === 'Enter' && applyHpChange(combatant.id)}
								onblur={() => applyHpChange(combatant.id)}
							/>
						{:else}
							<button
								class="hp-text"
								onclick={() => { if (isDm) { editingHp = combatant.id; hpDelta = ''; } }}
								disabled={!isDm}
							>
								{combatant.hp_current}/{combatant.hp_max}
							</button>
						{/if}
					</div>

					<span class="ac">CA {combatant.ac}</span>

					{#if isDm}
						<button
							class="conditions-toggle"
							onclick={() => { showConditions = showConditions === combatant.id ? null : combatant.id; }}
						>
							🩺
						</button>
					{/if}
				</div>

				{#if combatant.conditions.length > 0}
					<div class="active-conditions">
						{#each combatant.conditions as cond}
							<span class="condition-tag" title={CONDITIONS[cond] ?? cond}>
								{cond}
								{#if isDm}
									<button onclick={() => toggleCondition(combatant.id, cond)}>×</button>
								{/if}
							</span>
						{/each}
					</div>
				{/if}

				{#if showConditions === combatant.id}
					<div class="conditions-picker">
						{#each Object.entries(CONDITIONS) as [key, label]}
							<button
								class="condition-btn"
								class:active={combatant.conditions.includes(key)}
								onclick={() => toggleCondition(combatant.id, key)}
								title={label}
							>
								{key}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.tracker {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.tracker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.tracker-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 700;
	}
	.next-btn {
		padding: 0.375rem 0.75rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 600;
	}
	.next-btn:hover { background: #b91c1c; }
	.combatants {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.combatant {
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		background: white;
		transition: border-color 0.15s;
	}
	.combatant.active {
		border-color: #f59e0b;
		background: #fffbeb;
	}
	.combatant.dead {
		opacity: 0.5;
		filter: grayscale(1);
	}
	.combatant-main {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.initiative {
		font-weight: 700;
		font-size: 1.125rem;
		min-width: 2rem;
		text-align: center;
		color: #7c3aed;
	}
	.name {
		flex: 1;
		font-weight: 600;
	}
	.hp-section {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.hp-bar {
		width: 60px;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
	}
	.hp-fill {
		height: 100%;
		background: #22c55e;
		transition: width 0.3s;
	}
	.hp-fill.low { background: #ef4444; }
	.hp-text {
		font-size: 0.8rem;
		color: #374151;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.hp-text:disabled { cursor: default; }
	.hp-input {
		width: 50px;
		padding: 0.125rem 0.25rem;
		border: 1px solid #7c3aed;
		border-radius: 3px;
		font-size: 0.8rem;
	}
	.ac {
		font-size: 0.8rem;
		color: #6b7280;
		min-width: 3.5rem;
	}
	.conditions-toggle {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		padding: 0;
	}
	.active-conditions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.375rem;
	}
	.condition-tag {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.375rem;
		background: #fee2e2;
		border-radius: 999px;
		font-size: 0.75rem;
		color: #dc2626;
	}
	.condition-tag button {
		background: none;
		border: none;
		cursor: pointer;
		color: #dc2626;
		padding: 0;
		font-size: 0.75rem;
		line-height: 1;
	}
	.conditions-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.375rem;
		padding-top: 0.375rem;
		border-top: 1px solid #e5e7eb;
	}
	.condition-btn {
		padding: 0.125rem 0.375rem;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		background: #f9fafb;
		cursor: pointer;
		font-size: 0.75rem;
	}
	.condition-btn.active {
		background: #fee2e2;
		border-color: #fca5a5;
		color: #dc2626;
	}
</style>
