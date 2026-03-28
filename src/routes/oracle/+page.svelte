<script lang="ts">
	let question = $state('');
	let answer = $state('');
	let loading = $state(false);
	let error = $state('');

	async function askOracle() {
		if (!question.trim()) return;
		loading = true;
		error = '';
		answer = '';
		try {
			const res = await fetch('/api/claude/rules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question })
			});
			if (!res.ok) throw new Error((await res.json()).message);
			answer = (await res.json()).answer;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Erreur inconnue';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container">
	<div class="page-header">
		<h1>📖 Oracle des Règles</h1>
		<p class="subtitle">
			Pose une question sur les règles D&D 5e — l'oracle répond en contexte de campagne.
		</p>
	</div>

	<div class="oracle-card card">
		<div class="field">
			<label for="oracle-question">Ta question</label>
			<textarea
				id="oracle-question"
				bind:value={question}
				placeholder="Ex : Comment fonctionne la surprise en combat ? Peut-on lancer un sort en étant à terre ?"
				rows="3"
				onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askOracle())}
			></textarea>
			<span class="field-hint">Entrée pour envoyer, Maj+Entrée pour un saut de ligne</span>
		</div>

		<div class="form-actions">
			<button class="btn-primary" onclick={askOracle} disabled={loading || !question.trim()}>
				{loading ? '⏳ Consultation…' : "📖 Demander à l'oracle"}
			</button>
		</div>

		{#if error}
			<div class="error-msg">{error}</div>
		{/if}

		{#if answer}
			<div class="oracle-answer">
				<div class="oracle-answer-label">Réponse de l'oracle</div>
				<p>{answer}</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.subtitle {
		color: rgba(240, 237, 234, 0.6);
		font-size: 1rem;
		margin-top: 0.4rem;
	}

	.oracle-card {
		max-width: 760px;
		margin: 0 auto;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 1.25rem;
	}

	.field label {
		font-family: 'Cinzel', serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(240, 237, 234, 0.5);
	}

	.field textarea {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		color: #f0edea;
		font-family: 'Crimson Text', Georgia, serif;
		font-size: 1rem;
		padding: 0.65rem 0.85rem;
		resize: vertical;
		transition: border-color 0.2s;
		line-height: 1.6;
	}

	.field textarea:focus {
		outline: none;
		border-color: rgba(194, 55, 74, 0.5);
	}

	.field textarea::placeholder {
		color: rgba(240, 237, 234, 0.3);
	}

	.field-hint {
		font-size: 0.78rem;
		color: rgba(240, 237, 234, 0.3);
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
	}

	.error-msg {
		margin-top: 1rem;
		background: rgba(194, 55, 74, 0.15);
		border: 1px solid rgba(194, 55, 74, 0.4);
		border-radius: 3px;
		padding: 0.75rem 1rem;
		color: #e05060;
		font-size: 0.9rem;
	}

	.oracle-answer {
		margin-top: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 3px solid #c2374a;
		border-radius: 3px;
		padding: 1.25rem 1.5rem;
	}

	.oracle-answer-label {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #c2374a;
		margin-bottom: 0.75rem;
	}

	.oracle-answer p {
		color: rgba(240, 237, 234, 0.9);
		line-height: 1.8;
		white-space: pre-wrap;
	}
</style>
