<script lang="ts">
    import { _axios } from '$lib/_axios';
    import { createQuery } from '@tanstack/svelte-query';
    import { Skeleton } from '$lib/components/ui/skeleton/index.js';
    import { imgUrl } from '$lib/config';
    import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import Icon from '@iconify/svelte';
  
    // Define the query to fetch demand data
    const demandQuery = createQuery({
      queryKey: ['demand'],
      queryFn: async () => {
        const response = await _axios.get('/demand/');
        return response.data;
      },
      select: (data) => data.data,
      retry: 1,
      staleTime: 0,
      enabled: true,
    });
  
    // Reactive variables
    $: demandData = $demandQuery.data || [];
    $: isLoading = $demandQuery.isLoading;
  </script>
  
  <div>
    <Tabs.Root
	value={"list"}
	class="w-full p-4"
>
	<Tabs.List>
		<Tabs.Trigger value="list" class="flex items-center gap-2">
			<Icon class="w-4 h-4" icon="tabler:table" />
			<span>Demand List</span>
		</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="list">

	</Tabs.Content>
	
</Tabs.Root>
    <!-- Table Structure -->
    <div class="overflow-x-auto mx-auto  w-[calc(100vw-420px)]">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-[100px]">Sl.No</Table.Head>
            <Table.Head>Product Name</Table.Head>
            <Table.Head>Message</Table.Head>
            <Table.Head class="flex items-center justify-center">Image</Table.Head>
            <Table.Head>Created By</Table.Head>
            <Table.Head>Created At</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if isLoading}
            <!-- Skeleton Loader in Table Rows -->
            {#each Array(1) as _}
              <Table.Row>
                
                <Table.Cell>
                  <Skeleton class="h-6 w-32 bg-gray-200" />
                </Table.Cell>
                <Table.Cell>
                  <Skeleton class="h-6 w-64 bg-gray-200" />
                </Table.Cell>
                <Table.Cell class="flex items-center justify-center">
                  <Skeleton class="w-16 h-16 rounded-lg bg-gray-200" />
                </Table.Cell>
                <Table.Cell>
                  <Skeleton class="h-6 w-48 bg-gray-200" />
                </Table.Cell>
                <Table.Cell>
                  <Skeleton class="h-6 w-32 bg-gray-200" />
                </Table.Cell>
              </Table.Row>
            {/each}
          {:else if demandData.length > 0}
            <!-- Display Demand Data -->
            {#each demandData as demand,i}
              <Table.Row>
                <Table.Cell>{i + 1}</Table.Cell>
                <Table.Cell>{demand.productName}</Table.Cell>
                <Table.Cell>{demand.message}</Table.Cell>
                <Table.Cell class="flex items-center justify-center">
                  <img
                    src={imgUrl + demand.file}
                    alt={demand.productName}
                    class="w-16 h-16 object-contain rounded-lg"
                  />
                </Table.Cell>
                <Table.Cell>
                  {#if demand.userId}
                    <div>
                      <p>User: {demand.userId.username || 'N/A'}</p>
                      <p>Mobile: {demand.userId.mobile || 'N/A'}</p>
                    </div>
                  {:else}
                    <p>User: N/A</p>
                    <p>Mobile: N/A</p>
                  {/if}
                </Table.Cell>
                <Table.Cell>{new Date(demand.createdAt).toLocaleString()}</Table.Cell>
              </Table.Row>
            {/each}
          {:else}
            <!-- No Data Message -->
            <Table.Row>
              <Table.Cell colspan="5" class="text-center text-gray-500 py-4">
                No demand data available.
              </Table.Cell>
            </Table.Row>
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </div>
  