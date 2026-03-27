import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { anthropic, DEFAULT_MODEL } from '$lib/server/anthropic';
import { checkAndIncrementUsage } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	if (!body?.prompt) throw error(400, 'prompt requis');

	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'Non connecté');

	const { allowed, count, limit } = await checkAndIncrementUsage(locals.supabase, user.id);
	if (!allowed) throw error(429, `Limite journalière atteinte (${count}/${limit} appels)`);

	// Streaming
	const stream = await anthropic.messages.stream({
		model: body.model ?? DEFAULT_MODEL,
		max_tokens: body.max_tokens ?? 1024,
		system: body.system,
		messages: [{ role: 'user', content: body.prompt }]
	});

	const readable = new ReadableStream({
		async start(controller) {
			for await (const chunk of stream) {
				if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
					controller.enqueue(new TextEncoder().encode(chunk.delta.text));
				}
			}
			controller.close();
		}
	});

	return new Response(readable, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Transfer-Encoding': 'chunked',
			'Cache-Control': 'no-cache'
		}
	});
};
