<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import { _axios } from '$lib/_axios';
  import { createMutation, createQuery } from '@tanstack/svelte-query';
  import { imgUrl } from '$lib/config';
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { tick } from 'svelte';

  // Static "See All" category
  const seeAllCategory = { label: 'See All', image: '/images/see-all.png' };

  // Define the type for categories
  interface Category {
	_id: any;
    label: string;
    image: string;
  }

  interface SearchResult {
    data: any[];
    total: number;
    page: number;
    limit: number;
    status: boolean;
  }

  let searchQuery = '';
  let searchResults: SearchResult | null = null;
  let debounceTimeout: any;

  // Use Svelte Query to fetch categories
  const categoriesQuery = createQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await _axios.get('/categories/all?limit=5', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const fetchedCategories = response.data.categories.map((category: {
		  _id: any; name: string; image: string 
}) => ({
        _id:category._id,
        label: category.name,
        image: category.image,
      }));

      // Append the static "See All" category
      return [...fetchedCategories, seeAllCategory];
    },
  });
  const bannersQuery = createQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const response = await _axios.get('/banner/all', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
 
return response.data;

    },
  });

  const searchMutation = createMutation({
    mutationFn: async (query: string) => {
      const response = await _axios.get('/products/search', {
        params: {
          q: query,
          page: 1,
          limit: 10
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      searchResults = data;
    },
    onError: (error) => {
      console.error('Search error:', error);
      searchResults = null;
    }
  });

  // Debounced search handler
  function debounceSearch(query: string) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      await tick();
      if (query.trim().length > 0) {
        $searchMutation.mutate(query);
      } else {
        searchResults = null;
      }
    }, 500);
  }

  function handleSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    debounceSearch(query);
  }

  function clearSearch() {
    searchQuery = '';
    searchResults = null;
  }
  // Access query state
  $: categories = $categoriesQuery.data ?? [];
  $:banners=$bannersQuery.data??[];
  $: loading = $categoriesQuery.isLoading;
  $: error = $categoriesQuery.error ? ($categoriesQuery.error as Error).message : null;

</script>

<div class="bg-custom-gradient py-10  text-[#30363C] scrollbar-hide">
  <!-- Search Section -->
  <div>
    <h1 class="lg:text-3xl px-4 md:px-6 lg:px-8 text-2xl text-center font-bold text-[#30363C] lg:mb-6 mb-3">Looking for something specific?</h1>
    <div class="flex px-4 md:px-6 lg:px-8 flex-col relative items-center justify-center w-full lg:mb-10 mb-6">
      <div class="border flex md:w-1/2 w-full rounded-full bg-white md:p-2 p-1">
        <div class="relative w-full">
          <input
            type="text"
            placeholder="Search medical products"
            class="w-full absolute top-1/2 transform -translate-y-1/2 md:text-xl text-lg placeholder:text-base md:pl-20 pl-14 pr-4 rounded-full focus:outline-none focus:ring-0 text-gray-700"
            on:input={handleSearch}
            bind:value={searchQuery}
          />
          <img
            class="absolute md:left-2 left-0 top-1/2 transform -translate-y-1/2 text-gray-400"
            src="/svg/search.svg"
            alt="search"
          />
        </div>
        {#if searchResults}
          <button
            on:click={clearSearch}
            class="ml-4 bg-[#01A0E2] font-medium md:text-xl text-lg text-white md:px-5 md:py-5 px-2 py-2 rounded-full hover:bg-[#156aa3] transition-colors duration-200 flex items-center justify-center"
          >
            <Icon icon="lucide:x" class="inline-block" width="24" />
          </button>
        {:else}
          <button
            class="lg:ml-4 bg-[#01A0E2] font-medium md:text-xl text-lg text-white md:px-9 md:py-4 px-5 py-2 rounded-full hover:bg-[#156aa3] transition-colors duration-200"
          >
            Search
          </button>
        {/if}
      </div>
      {#if searchResults}
        <div class="md:w-1/2 lg:top-24 top-14 absolute w-full lg:max-h-64 max-h-52  overflow-y-auto bg-white rounded-3xl shadow-md py-4 pl-4 ">
          {#if searchResults.data.length > 0}
            {#each searchResults.data as product, index}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div on:click={()=>{goto(`/Products/${product._id}`)}} class="cursor-pointer {index === searchResults.data.length - 1 ? '' : 'border-b'} flex items-center md:gap-10 gap-2 p-1">
                <div class="border lg:p-3 md:p-2 p-1 rounded-lg">
                  <img src={imgUrl + product.images[0]} alt="" class="md:w-16 md:h-16 min-w-12 min-h-12 h-12 w-12" />
                </div>
                <div>
                  <h2 class="lg:text-2xl md:text-xl text-base font-semibold text-[#30363C]">{product.productName}</h2>
                  <p class="lg:text-lg md:text-base text-sm font-bold text-[#111827]">
                    MRP: <span class="text-gray-600 px-2 text-base line-through">₹{product?.strikePrice || product.price}</span> ₹{product.price}
                  </p>
                </div>
              </div>
            {/each}
          {:else}
            <div class="text-center text-lg mt-4 text-gray-400">No results found</div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Categories Grid -->
    <div class="flex justify-center items-center w-full">
      {#if loading || error}
        <!-- Skeleton Loader with ShadCN Skeleton -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:mb-10 mb-5 w-3/4">
          {#each Array(6) as _}
            <div class="flex flex-col items-center space-y-2">
              <Skeleton class="w-24 h-24 rounded-full" />
              <Skeleton class="h-6 w-20" />
            </div>
          {/each}
        </div>
      {:else}
        <div class="flex px-4 md:px-0 gap-6 md:mb-10 mb-5  lg:w-3/4 w-full overflow-x-auto items-center md:justify-center scrollbar-hide">
          {#each categories as category}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
            on:click={()=>{
              if(category.label==='See All'){goto('/Products')}
              else{goto(`/Products?${category._id}`)}
                            
                       }} 
          class="flex flex-col items-center cursor-pointer">
              <img
                src={category.label !== 'See All' ? imgUrl + category.image : category.image}
                alt={category.label}
                class="md:min-w-24 md:min-h-24 min-h-12 min-w-12 max-h-12 max-w-12 md:max-h-24 md:max-w-24  object-contain lg:mb-2"
              />
              <span class="lg:text-xl md:text-lg text-base text-[#30363C] text-center">
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
    <div class="px-4 md:px-6 lg:px-8 flex justify-start overflow-x-auto scrollbar-hide gap-10 lg:pt-10 md:pt-7 pt-5">
      {#if $bannersQuery.isLoading}
        <!-- Skeleton loader for banners -->
        <div class="flex gap-10">
          {#each Array(2) as _}
            <div class="flex-shrink-0 lg:w-[500px] md:w-[400px] w-[300px]">
              <Skeleton class="w-full h-[200px] md:h-[250px] lg:h-[300px] rounded-lg" />
            </div>
          {/each}
        </div>
      {:else if $bannersQuery.error}
        <div class="text-center w-full text-red-500">
          Error loading banners
        </div>
      {:else if $bannersQuery.data?.banners?.length > 0}
        {#each $bannersQuery.data.banners as banner}
          <div class="flex-shrink-0 lg:w-[500px] md:w-[400px] w-[300px]">
            <img
              src={imgUrl + banner.bannerImage}
              alt={banner.bannerTitle}
              class="object-cover shadow rounded-lg w-full h-full"
            />
          </div>
        {/each}
      {:else}
        <!-- Fallback banners if API returns empty -->
        <div class="flex-shrink-0 lg:w-[500px] md:w-[400px] w-[300px]">
          <img
            src="/images/banner1.png"
            alt="Banner"
            class="object-cover rounded-lg w-full h-full"
          />
        </div>
        <div class="flex-shrink-0 lg:w-[500px] md:w-[400px] w-[300px]">
          <img
            src="/images/banner-2.png"
            alt="Banner"
            class="rounded-lg object-cover"
          />
        </div>
      {/if}
    </div>


  </div>
</div>
