<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import { _axios } from '$lib/_axios';
  import { createQuery } from '@tanstack/svelte-query';
  import { imgUrl } from '$lib/config';
  import { Skeleton } from "$lib/components/ui/skeleton"; 

  // Static "See All" category
  const seeAllCategory = { label: 'See All', image: '/images/see-all.png' };

  // Define the type for categories
  interface Category {
    label: string;
    image: string;
  }

  // Use Svelte Query to fetch categories
  const categoriesQuery = createQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await _axios.get('/categories/all?limit=5', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const fetchedCategories = response.data.categories.map((category: { name: string; image: string }) => ({
        label: category.name,
        image: category.image,
      }));

      // Append the static "See All" category
      return [...fetchedCategories, seeAllCategory];
    },
  });

  // Access query state
  $: categories = $categoriesQuery.data ?? [];
  $: loading = $categoriesQuery.isLoading;
  $: error = $categoriesQuery.error ? ($categoriesQuery.error as Error).message : null;
</script>

<div class="bg-custom-gradient py-10 px-4 md:px-6 lg:px-8 text-[#30363C]">
  <!-- Search Section -->
  <div>
    <h1 class="text-3xl text-center font-bold text-[#30363C] mb-6">Looking for something specific?</h1>
    <div class="flex items-center justify-center w-full mb-10">
      <div class="border flex w-1/2 rounded-full bg-white p-2">
        <div class="relative w-full">
          <input
            type="text"
            placeholder="Search medical products"
            class="w-full absolute top-1/2 transform -translate-y-1/2 text-xl pl-20 pr-4 rounded-full focus:outline-none focus:ring-0 text-gray-700"
          />
          <img
            class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
            src="/svg/search.svg"
            alt="search"
          />
        </div>
        <button
          class="ml-4 bg-[#01A0E2] font-medium text-xl text-white px-9 py-4 rounded-full hover:bg-[#156aa3] transition-colors duration-200"
        >
          Search
        </button>
      </div>
    </div>

    <!-- Categories Grid -->
    <div class="flex justify-center items-center w-full">
      {#if loading || error}
        <!-- Skeleton Loader with ShadCN Skeleton -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 mb-10 w-3/4">
          {#each Array(6) as _}
            <div class="flex flex-col items-center space-y-2">
              <Skeleton class="w-24 h-24 rounded-full" />
              <Skeleton class="h-6 w-20" />
            </div>
          {/each}
        </div>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 mb-10 w-3/4">
          {#each categories as category}
            <div class="flex flex-col items-center cursor-pointer">
              <img
                src={category.label !== 'See All' ? imgUrl + category.image : category.image}
                alt={category.label}
                class="w-24 h-24 object-contain mb-2"
              />
              <span class="text-xl text-[#30363C] text-center">
                {category.label}
                {#if category.label === 'See All'}
                  <Icon icon="mdi:arrow-right" class="inline-block ml-1" width="16" />
                {/if}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Banner Section -->
    <div class="flex justify-start gap-10 pt-10">
      <div class="w-[550px]">
        <img
          src="/images/banner1.png"
          alt="Banner"
          class="object-cover rounded-lg w-full h-full"
        />
      </div>
      <div class="w-[500px]">
        <img
          src="/images/banner-2.png"
          alt="Banner"
          class="rounded-lg object-cover"
        />
      </div>
    </div>
  </div>
</div>