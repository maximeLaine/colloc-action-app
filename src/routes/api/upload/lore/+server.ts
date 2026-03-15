import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Non autorisé');

	const formData = await request.formData();
	const file = formData.get('file') as File;
	if (!file || file.size === 0) throw error(400, 'Fichier manquant');

	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
	if (!allowed.includes(ext)) throw error(400, 'Format non supporté (images ou PDF uniquement)');

	const filename = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
	const buffer = await file.arrayBuffer();

	const { error: uploadError } = await locals.supabase.storage
		.from('lore')
		.upload(filename, buffer, { contentType: file.type, upsert: false });

	if (uploadError) throw error(500, uploadError.message);

	const { data } = locals.supabase.storage.from('lore').getPublicUrl(filename);
	return json({
		url: data.publicUrl,
		name: file.name,
		type: ext === 'pdf' ? 'pdf' : 'image'
	});
};
