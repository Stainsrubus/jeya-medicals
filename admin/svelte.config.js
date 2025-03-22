import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			fallback: 'index.html' // ✅ Correct fallback
		}),
		paths: {
			base: '' // ✅ Remove any base path for now
		},
		alias: {
			'@/*': './src/lib/*' // ✅ Ensure correct path
		}
	}
};

export default config;
