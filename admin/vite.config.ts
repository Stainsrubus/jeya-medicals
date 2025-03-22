import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		outDir: "build" // ✅ Make sure it matches Vercel's expected output
	},
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	}
});
