<script lang="ts">
	interface Attachment { name: string; url: string; type: 'image' | 'pdf'; }

	let {
		value = $bindable<Attachment[]>([]),
		uploadUrl = '/api/upload/session'
	}: {
		value?: Attachment[];
		uploadUrl?: string;
	} = $props();

	let uploading = $state(false);
	let uploadError = $state('');
	let dragOver = $state(false);

	async function uploadFile(file: File) {
		uploading = true;
		uploadError = '';

		const fd = new FormData();
		fd.append('file', file);

		try {
			const res = await fetch(uploadUrl, { method: 'POST', body: fd });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				uploadError = err.message ?? 'Erreur upload';
			} else {
				const attachment = await res.json();
				value = [...value, attachment];
			}
		} catch {
			uploadError = 'Erreur réseau';
		} finally {
			uploading = false;
		}
	}

	async function handleFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await uploadFile(file);
		input.value = '';
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (!file) return;
		await uploadFile(file);
	}

	function remove(index: number) {
		value = value.filter((_, i) => i !== index);
	}
</script>

<div class="attachments">
	<input type="hidden" name="attachments" value={JSON.stringify(value)} />

	{#if value.length > 0}
		<div class="attachment-list">
			{#each value as att, i}
				<div class="attachment-item">
					{#if att.type === 'image'}
						<img src={att.url} alt={att.name} class="att-thumb" loading="lazy" decoding="async" />
					{:else}
						<div class="att-pdf-icon">📄</div>
					{/if}
					<span class="att-name">{att.name}</span>
					<button type="button" class="att-remove" onclick={() => remove(i)}>✕</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="drop-zone"
		class:drag-over={dragOver}
		class:loading={uploading}
		ondragover={(e) => { e.preventDefault(); dragOver = true; }}
		ondragleave={() => dragOver = false}
		ondrop={handleDrop}
	>
		{#if uploading}
			<span>Envoi…</span>
		{:else}
			<span>Glissez une image / PDF ici</span>
			<span class="drop-or">ou</span>
			<label class="file-btn">
				Parcourir
				<input type="file" accept="image/*,.pdf" onchange={handleFile} style="display:none" disabled={uploading} />
			</label>
		{/if}
	</div>

	{#if uploadError}<p class="upload-err">{uploadError}</p>{/if}
</div>

<style>
	.attachments { display: flex; flex-direction: column; gap: 0.6rem; }
	.attachment-list { display: flex; flex-wrap: wrap; gap: 0.6rem; }
	.attachment-item {
		display: flex; align-items: center; gap: 0.4rem;
		background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
		border-radius: 4px; padding: 0.3rem 0.5rem; max-width: 220px;
	}
	.att-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 3px; flex-shrink: 0; }
	.att-pdf-icon { font-size: 1.4rem; flex-shrink: 0; line-height: 1; }
	.att-name { font-size: 0.75rem; color: rgba(240,237,234,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
	.att-remove { background: transparent; border: none; color: rgba(240,237,234,0.3); cursor: pointer; font-size: 0.65rem; padding: 0; flex-shrink: 0; transition: color 0.15s; }
	.att-remove:hover { color: #C2374A; }

	.drop-zone {
		display: flex; align-items: center; justify-content: center; gap: 0.75rem;
		border: 2px dashed #333; border-radius: 6px; padding: 1.25rem;
		color: rgba(240,237,234,0.4); font-family: 'Cinzel', serif;
		font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase;
		transition: border-color 0.2s, background 0.2s;
		cursor: default;
	}
	.drop-zone.drag-over { border-color: #C2374A; background: rgba(194,55,74,0.06); color: #E05060; }
	.drop-zone.loading { opacity: 0.5; cursor: wait; }
	.drop-or { color: rgba(240,237,234,0.2); }

	.file-btn {
		display: inline-flex; align-items: center;
		background: #1A1A1A; border: 1px solid #333; color: rgba(240,237,234,0.6);
		padding: 0.3rem 0.65rem; border-radius: 3px;
		font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700;
		letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: border-color 0.2s, color 0.2s; white-space: nowrap;
	}
	.file-btn:hover { border-color: #C2374A; color: #E05060; }
	.upload-err { color: #E05060; font-size: 0.8rem; margin: 0; }
</style>
