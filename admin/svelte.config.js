import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'public', // Output directory
			assets: 'public', // Output directory
			fallback: 'index.html'
		}),
		paths: {
			base: '/hidden-admin-base-007'
		},
		alias: {
			'@/*': './path/to/lib/*'
		}
	}
};

export default config;
