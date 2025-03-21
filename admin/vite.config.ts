import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
		build: {
		  outDir: "public", // ✅ Correct way to set the output directory
		},
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	}
});
