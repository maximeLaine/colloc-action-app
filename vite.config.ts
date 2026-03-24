import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 3000
	},
	test: {
		environment: 'happy-dom',
		globals: true,
		setupFiles: ['src/test-setup.ts'],
		include: ['src/**/*.{test,spec}.{ts,js}']
	}
});
