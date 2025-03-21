<script lang="ts">
    import { _axios } from '$lib/_axios';
    import { Button } from '$lib/components/ui/button';
    import * as Table from '$lib/components/ui/table';
    import { queryClient } from '$lib/query-client';
    import { createQuery, createMutation } from '@tanstack/svelte-query';
    import { toast } from 'svelte-sonner';
    import Icon from '@iconify/svelte';
	import { specificationStore } from './schema';
	import Paginator from '$lib/components/paginator.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	let modelOpen = $state(false);

    let page = $state(1);
    let limit = $state(10);
	let selectedSpecificationId = $state('');
    const query = createQuery({
        queryKey: ['specification'],
        queryFn: () => _axios.get('/specification/all?page=1&limit=10'),
    });

    const deleteMutation = createMutation({
        mutationFn: (id: string) => _axios.delete(`/specification/delete/${id}`),
        onSuccess: () => {
            queryClient.refetchQueries({ queryKey: ['specifications'] });
            toast.success("Specification category deleted successfully");
			selectedSpecificationId = '';
			modelOpen = false;
        },
        onError: (error: any) => {
            toast.error(error.response.data.message);
			selectedSpecificationId = '';
			modelOpen = false;
        }
    });
	function handleEdit(specification: { _id: string; name: string; fields: string[] }) {
        $specificationStore = {
            mode: 'edit',
            id: specification._id,
            name: specification.name,
            fields: specification.fields
        };
    }
</script>

<div class="mt-6 text-maintext w-[calc(100vw-420px)] font-pt mx-auto">
    <Table.Root class="mb-4">
        {#if $query.isLoading}
            <Table.Caption>Loading....</Table.Caption>
        {/if}
        <Table.Header>
            <Table.Row class="">
                <Table.Head class="w-[100px]">Sl.No</Table.Head>
                <Table.Head>Category</Table.Head>
                <Table.Head>Fields</Table.Head>
                <Table.Head class="">Actions</Table.Head>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {#each $query.data?.data?.specifications || [] as specification, i}
                <Table.Row>
                    <Table.Cell>{i + 1 + (page - 1) * limit}</Table.Cell>
                    <Table.Cell>{specification.name}</Table.Cell>
                    <Table.Cell>{specification.fields.join(', ')}</Table.Cell>
                    <Table.Cell class="flex gap-4 items-center">
						<button
						disabled={$deleteMutation.isPending}
						onclick={() => handleEdit(specification)}
					>
						<Icon icon={'material-symbols:edit-square-outline-rounded'} class="text-green-600 text-xl" />
					</button>
						<button
						disabled={$deleteMutation.isPending}
								onclick={() => ((modelOpen = true), (selectedSpecificationId = specification._id))}
					>
						<Icon icon={'fluent:delete-28-regular'} class="text-red-500 text-xl" />
					</button>
                    </Table.Cell>
                </Table.Row>
            {/each}
        </Table.Body>
    </Table.Root>
	<Dialog.Root controlledOpen={true} open={modelOpen} onOpenChange={(e) => (modelOpen = e)}>
		<Dialog.Content>
			<Dialog.Header class="text-center">
				<div class="flex justify-center items-center">
					<Icon icon={'jam:triangle-danger-f'} class="text-red-500 text-6xl" />
				</div>

				<Dialog.Title class=" flex flex-col gap-2 justify-center items-center text-center">
					Do you want to delete this Specification ?

					<span class="text-sm font-semibold"> This action cannot be undone. </span>
				</Dialog.Title>
			</Dialog.Header>

			<div class="flex gap-4 justify-around">
				<Button
					class="bg-red-500 text-white font-bold w-full hover:bg-red-400"
					onclick={() => $deleteMutation.mutate(selectedSpecificationId)}>Yes</Button
				>
				<Button class="text-white font-bold w-full" onclick={() => (modelOpen = false)}>No</Button
				>
			</div>
		</Dialog.Content>
	</Dialog.Root>
    {#if !$query.isLoading && $query?.data?.data?.total > 0}
        <Paginator
            total={$query?.data?.data?.total || 0}
            {limit}
            {page}
            callback={(_page: any) => {
                if (_page === page) return;
                page = _page;
                $query.refetch();
            }}
        />
    {/if}
</div>