import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (user) redirect(303, '/');

	const { data: invitation, error } = await locals.supabase
		.rpc('get_invitation_by_token', { p_token: params.token });

	if (error || !invitation) {
		return { invalid: true, email: null, role: null };
	}

	return { invalid: false, email: invitation.email, role: invitation.role };
};

export const actions: Actions = {
	register: async ({ request, params, locals }) => {
		const form = await request.formData();
		const email = form.get('email') as string;
		const password = (form.get('password') as string)?.trim();
		const display_name = (form.get('display_name') as string)?.trim();

		if (!password || password.length < 6) return fail(400, { error: 'Mot de passe trop court (min 6 caractères)' });
		if (!display_name) return fail(400, { error: 'Nom affiché requis' });

		// Sign up the user client-side — profile will be created by the trigger
		// We just need to mark the invitation as used after signup
		const { error: signUpError } = await locals.supabase.auth.signUp({
			email,
			password,
			options: { data: { display_name } }
		});

		if (signUpError) return fail(400, { error: signUpError.message });

		// Mark invitation as used
		await locals.supabase.rpc('use_invitation', { p_token: params.token });

		redirect(303, '/login?registered=1');
	}
};
