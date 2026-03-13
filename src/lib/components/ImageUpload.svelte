<script lang="ts">
	let { name = 'image_url', value = $bindable(''), placeholder = '/img/...' }: {
		name?: string;
		value?: string;
		placeholder?: string;
	} = $props();

	let uploading = $state(false);
	let uploadError = $state('');
	let preview = $derived(value);

	async function handleFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		uploadError = '';

		const fd = new FormData();
		fd.append('file', file);

		try {
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				uploadError = err.message ?? 'Erreur upload';
			} else {
				const { url } = await res.json();
				value = url;
			}
		} catch {
			uploadError = 'Erreur réseau';
		} finally {
			uploading = false;
		}
	}
</script>

<div class="img-upload">
	<input type="hidden" {name} bind:value />

	{#if preview}
		<div class="preview-wrap">
			<img src={preview} alt="Aperçu" class="preview-img" />
			<button type="button" class="remove-img" onclick={() => (value = '')}>✕</button>
		</div>
	{/if}

	<div class="upload-row">
		<label class="file-btn" class:loading={uploading}>
			{uploading ? 'Envoi…' : '📎 Choisir une image'}
			<input type="file" accept="image/*" onchange={handleFile} style="display:none" disabled={uploading} />
		</label>
		<span class="or">ou</span>
		<input
			type="text"
			bind:value
			{placeholder}
			class="url-input"
		/>
	</div>
	{#if uploadError}<p class="upload-err">{uploadError}</p>{/if}
</div>

<style>
	.img-upload { display: flex; flex-direction: column; gap: 0.5rem; }

	.preview-wrap { position: relative; display: inline-block; }
	.preview-img { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #2A2A2A; display: block; }
	.remove-img {
		position: absolute; top: -6px; right: -6px;
		background: #C2374A; border: none; color: #fff;
		width: 18px; height: 18px; border-radius: 50%;
		font-size: 0.55rem; cursor: pointer; line-height: 18px; text-align: center; padding: 0;
	}

	.upload-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

	.file-btn {
		background: #1A1A1A; border: 1px solid #333; color: rgba(240,237,234,0.6);
		padding: 0.4rem 0.75rem; border-radius: 3px;
		font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700;
		letter-spacing: 0.06em; text-transform: uppercase;
		cursor: pointer; transition: border-color 0.2s, color 0.2s; white-space: nowrap;
	}
	.file-btn:hover { border-color: #C2374A; color: #E05060; }
	.file-btn.loading { opacity: 0.5; cursor: wait; }

	.or { font-family: 'Cinzel', serif; font-size: 0.62rem; color: rgba(240,237,234,0.3); text-transform: uppercase; }

	.url-input {
		flex: 1; min-width: 120px;
		background: #0A0A0A; border: 1px solid #2A2A2A; color: #F0EDEA;
		padding: 0.4rem 0.75rem; border-radius: 3px;
		font-family: 'Crimson Text', serif; font-size: 0.95rem;
	}
	.url-input:focus { outline: none; border-color: #C2374A; }

	.upload-err { color: #E05060; font-size: 0.8rem; margin: 0; }
</style>
