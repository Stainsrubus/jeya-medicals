<script lang="ts">
	import { _axios } from '$lib/_axios';
	import { createMutation, createQuery } from '@tanstack/svelte-query';

	async function fetchPrivacyPolicy() {
		const res = await _axios.get('/ppolicy');
		const data = await res.data;
		return data;
	}

	const query = createQuery({
		queryKey: ['ppolicy fetch'],
		queryFn: () => fetchPrivacyPolicy()
	});

	const updatePrivacyPolicy = createMutation({
		mutationFn: (data: any) => _axios.post('/ppolicy/update', data)
	});
</script>

<svelte:head>
	<title>Dashboard | Manager - Notification</title>
	<meta name="description" content="dashboard for Ecommerce" />
</svelte:head>

<div class="">
	<div class="w-[80%] mx-auto text-zinc-800 my-8 !font-pt">
		<h1 class="text-3xl font-bold py-3">Send Custom Notifications</h1>
	</div>
</div>
