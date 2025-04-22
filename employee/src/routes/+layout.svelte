<script lang="ts">
  import { queryClient } from '$lib/query-client';
  import { QueryClientProvider } from '@tanstack/svelte-query';
	import '../app.css';
  import { Toaster } from 'svelte-sonner';
  import Topbar from '$lib/components/topbar.svelte';
	let { children } = $props();
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';


  
</script>



<Toaster position="top-center" />
<QueryClientProvider client={queryClient}>
<div>
  {@render children()}
</div>
</QueryClientProvider>
