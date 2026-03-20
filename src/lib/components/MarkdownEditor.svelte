<script lang="ts">
	import { marked } from 'marked';

	interface WikiLink {
		type: 'npc' | 'location';
		name: string;
	}

	interface Props {
		value?: string;
		placeholder?: string;
		readonly?: boolean;
		onWikiLink?: (link: WikiLink) => void;
	}

	let { value = $bindable(''), placeholder = 'Écris en Markdown...', readonly = false, onWikiLink }: Props = $props();

	let mode = $state<'edit' | 'preview' | 'split'>('split');

	// Convertit [[npc:Nom]] et [[location:Lieu]] en liens HTML cliquables
	function resolveWikiLinks(text: string): string {
		return text
			.replace(/\[\[npc:([^\]]+)\]\]/g, (_, name) =>
				`<a class="wiki-link wiki-npc" data-type="npc" data-name="${name}">👤 ${name}</a>`
			)
			.replace(/\[\[location:([^\]]+)\]\]/g, (_, name) =>
				`<a class="wiki-link wiki-location" data-type="location" data-name="${name}">📍 ${name}</a>`
			);
	}

	let rendered = $derived.by(() => {
		const withLinks = resolveWikiLinks(value);
		return marked.parse(withLinks) as string;
	});

	function handlePreviewClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const link = target.closest('.wiki-link') as HTMLElement | null;
		if (!link) return;
		e.preventDefault();
		onWikiLink?.({
			type: link.dataset.type as 'npc' | 'location',
			name: link.dataset.name ?? ''
		});
	}
</script>

<div class="md-editor">
	{#if !readonly}
		<div class="toolbar">
			<button class="mode-btn" class:active={mode === 'edit'} onclick={() => (mode = 'edit')}>
				✏️ Éditer
			</button>
			<button class="mode-btn" class:active={mode === 'split'} onclick={() => (mode = 'split')}>
				⬜ Divisé
			</button>
			<button class="mode-btn" class:active={mode === 'preview'} onclick={() => (mode = 'preview')}>
				👁️ Aperçu
			</button>
			<span class="hint">Liens : <code>[[npc:Aldric]]</code> · <code>[[location:Port-Hiver]]</code></span>
		</div>
	{/if}

	<div class="panes" class:split={mode === 'split'}>
		{#if mode !== 'preview' && !readonly}
			<textarea
				bind:value
				{placeholder}
				class="editor-pane"
				spellcheck="false"
			></textarea>
		{/if}

		{#if mode !== 'edit' || readonly}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="preview-pane prose"
				onclick={handlePreviewClick}
				{@html rendered}
			></div>
		{/if}
	</div>
</div>

<style>
	.md-editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}
	.mode-btn {
		padding: 0.25rem 0.625rem;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		background: #f9fafb;
		cursor: pointer;
		font-size: 0.875rem;
	}
	.mode-btn.active {
		background: #7c3aed;
		color: white;
		border-color: #7c3aed;
	}
	.hint {
		font-size: 0.75rem;
		color: #9ca3af;
		margin-left: auto;
	}
	.hint code {
		background: #f3f4f6;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}
	.panes {
		display: flex;
		gap: 0.5rem;
		min-height: 200px;
	}
	.panes.split > * {
		flex: 1;
	}
	.editor-pane {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		resize: vertical;
		min-height: 200px;
		line-height: 1.6;
	}
	.editor-pane:focus {
		outline: none;
		border-color: #7c3aed;
	}
	.preview-pane {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		overflow-y: auto;
		min-height: 200px;
	}

	/* Styles prose basiques */
	.preview-pane :global(h1),
	.preview-pane :global(h2),
	.preview-pane :global(h3) {
		font-weight: 700;
		margin: 0.75rem 0 0.375rem;
	}
	.preview-pane :global(h1) { font-size: 1.5rem; }
	.preview-pane :global(h2) { font-size: 1.25rem; }
	.preview-pane :global(h3) { font-size: 1.125rem; }
	.preview-pane :global(p) { margin: 0.5rem 0; line-height: 1.6; }
	.preview-pane :global(ul),
	.preview-pane :global(ol) { padding-left: 1.5rem; margin: 0.5rem 0; }
	.preview-pane :global(li) { margin: 0.25rem 0; }
	.preview-pane :global(blockquote) {
		border-left: 3px solid #7c3aed;
		padding-left: 0.75rem;
		color: #6b7280;
		margin: 0.5rem 0;
	}
	.preview-pane :global(code) {
		background: #f3f4f6;
		padding: 0.125rem 0.3rem;
		border-radius: 3px;
		font-size: 0.875em;
	}
	.preview-pane :global(hr) {
		border: none;
		border-top: 1px solid #e5e7eb;
		margin: 1rem 0;
	}

	/* Liens wiki */
	.preview-pane :global(.wiki-link) {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		font-size: 0.875em;
		cursor: pointer;
		text-decoration: none;
		font-weight: 500;
	}
	.preview-pane :global(.wiki-npc) {
		background: #ede9fe;
		color: #7c3aed;
	}
	.preview-pane :global(.wiki-npc:hover) { background: #ddd6fe; }
	.preview-pane :global(.wiki-location) {
		background: #dcfce7;
		color: #16a34a;
	}
	.preview-pane :global(.wiki-location:hover) { background: #bbf7d0; }
</style>
