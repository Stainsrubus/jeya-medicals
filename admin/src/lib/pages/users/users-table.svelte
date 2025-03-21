<script lang="ts">
	import { goto } from '$app/navigation';
	import { _axios } from '$lib/_axios';
	import Paginator from '$lib/components/paginator.svelte';
	import { Button } from '$lib/components/ui/button';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatDate } from '$lib/utils';
	import Icon from '@iconify/svelte';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';

	async function fetchUsers(limit = 10, page = 1, search = '') {
		const res = await _axios.get(`/users/all?limit=${limit}&page=${page}&q=${search}`);
		const data = await res.data;
		return data;
	}

	let page = $state(1);
	let limit = $state(8);
	let search = $state('');

	let selectedUsers = $state<string[]>([]);
	let notificaitonModel = $state(false);

	let title = $state('');
	let message = $state('');

	let debounceTimeout: any;
	function debounceSearch() {
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(async () => {
			await tick();
			page = 1;
			$query.refetch();
		}, 500);
	}

	function sendNotification() {
		$notificationMutation.mutate({
			title,
			message,
			users: selectedUsers,
			type: selectedUsers.length == 0 ? 'all' : 'selected'
		});
		notificaitonModel = false;
	}

	const query = createQuery({
		queryKey: ['users fetch', debounceSearch],
		queryFn: () => fetchUsers(limit, page, search)
	});

	const notificationMutation = createMutation({
		mutationFn: (data: unknown) => _axios.post('/notification/massnotifications', data),
		onSuccess({ data }) {
			if (data && data['status'] == 200) {
				toast.success('Notificaitons Sended');

				title = '';
				message = '';
				selectedUsers = [];
			}
		},
		onError(error, variables, context) {
			console.error('onError', error, variables, context);
		}
	});
</script>

<div class="mt-6 text-maintext w-[calc(100vw-420px)] font-pt mx-auto overflow-auto">
	<div class="flex items-center justify-end ml-auto mb-4 gap-4">
		<Button
			disabled={$notificationMutation.isPending}
			onclick={() => (notificaitonModel = true)}
			class=" text-white"
		>
			{#if $notificationMutation.isPending}
				Sending...
			{:else}
				<Icon icon="solar:bell-line-duotone" />
				<span> {selectedUsers.length == 0 ? $query.data?.total : selectedUsers.length}</span>
			{/if}
		</Button>

		<div class="grid gap-2 relative">
			<Input
				type={'text'}
				required
				class="pr-10 placeholder:text-zinc-500 text-zinc-700 min-w-[400px]"
				placeholder={'Search Users Name'}
				bind:value={search}
				oninput={debounceSearch}
			/>
			{#if !search}
				<Icon
					icon={'iconamoon:search'}
					class="absolute right-2 bottom-2.5 cursor-pointer text-gray-400 text-xl"
				/>
			{:else}
				<Icon
					icon={'mdi:clear-outline'}
					onclick={() => {
						search = '';
						debounceSearch();
					}}
					class="absolute right-2 bottom-2.5 cursor-pointer text-gray-400 text-xl"
				/>
			{/if}
		</div>
	</div>

	<div class="overflow-x-auto">
		<Table.Root>
			{#if $query.isLoading}
				<Table.Caption>Loading....</Table.Caption>
			{:else if $query?.data?.total === 0}
				<Table.Caption class="text-center w-full text-xs">No Users Found!</Table.Caption>
			{/if}
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[50px]"></Table.Head>
					<Table.Head class="w-[100px]">Sl.No</Table.Head>
					<Table.Head>User Name</Table.Head>
					<Table.Head class="cursor-pointer">Mobile</Table.Head>
					<Table.Head>Email</Table.Head>
					<Table.Head>Joined At</Table.Head>
					<Table.Head>Active</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each $query.data?.users || [] as user, i}
					<Table.Row>
						<Table.Cell>
							<Checkbox
								disabled={user?.fcmToken ? false : true}
								onCheckedChange={(e) => {
									if (e) {
										selectedUsers = [...selectedUsers, user._id];
									} else {
										selectedUsers = selectedUsers.filter((id) => id !== user._id);
									}
								}}
								checked={selectedUsers.includes(user._id)}
							/>
						</Table.Cell>
						<Table.Cell>{i + 1 + (page - 1) * limit}</Table.Cell>
						<Table.Cell class="capitalize ">
							<button
								class="cursor-pointer capitalize underline underline-offset-4 text-primary font-bold"
								onclick={() => {
									goto(`/hidden-admin-base-007/dashboard/users/${user._id}`);
								}}
							>
								{user.username}
							</button>
						</Table.Cell>
						<Table.Cell>{user.mobile}</Table.Cell>
						<Table.Cell>{user.email || '-'}</Table.Cell>
						<Table.Cell>{formatDate(user.createdAt)}</Table.Cell>
						<Table.Cell>{user.active ? 'Yes' : 'No'}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	{#if !$query.isLoading && $query?.data?.total > 0}
		<Paginator
			total={$query?.data?.total || 0}
			{limit}
			{page}
			callback={(_page: any) => {
				if (_page === page) return;
				page = _page;
				$query.refetch();
			}}
		/>
	{/if}

	<Dialog.Root onOpenChange={(e) => (notificaitonModel = e)} open={notificaitonModel}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title
					>Send Notification to {selectedUsers.length == 0
						? $query.data?.total
						: selectedUsers.length} Users</Dialog.Title
				>
				<Dialog.Description>
					<div class="flex flex-col gap-3 my-4">
						<Label for="title">Notification Title</Label>
						<Input
							type="string"
							id="title"
							placeholder="Hey User! New offer for you"
							bind:value={title}
						/>
					</div>

					<div class="flex flex-col gap-3 my-4">
						<Label for="message">Notification Description</Label>
						<Textarea
							cols={20}
							rows={7}
							id="message"
							placeholder="Hey User! New offer for you"
							bind:value={message}
						/>
					</div>

					<Button onclick={sendNotification} class="">Send</Button>
				</Dialog.Description>
			</Dialog.Header>
		</Dialog.Content>
	</Dialog.Root>
</div>
