<script lang="ts">
    import axios from 'axios';
    import { createQuery } from '@tanstack/svelte-query';
    import ProductCard from '$lib/components/productCard.svelte';
    import { _axios } from '$lib/_axios';
    import { imgUrl } from '$lib/config';
    import { Skeleton } from "$lib/components/ui/skeleton/index.js"; // Import ShadCN Skeleton
	import { goto } from '$app/navigation';
	import { writableGlobalStore } from '$lib/stores/global-store';
	import Icon from '@iconify/svelte';
  
    interface Product {
      id: string | number;
      name: string;
      image: string;
      discount: number;
      MRP: number;
      strikePrice: number;
      available:boolean;
      description?: string;
      ratings?: number;
      categoryId?: string;
      categoryName?: string;
      favorite?: boolean;
    }
    $: isLoggedIn = $writableGlobalStore.isLogedIn ;
    const productsQuery = createQuery<Product[]>({
  
      queryKey: ['products'],
      queryFn: async () => {
        const userId = isLoggedIn ? localStorage.getItem('_id') : null;
        const response = await _axios.get('/products/', {
          params: {
            limit: 7, // Fetch all products
            page: 1,
            userId 
          },
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to fetch products');
        }
  
        const groupedProducts = response.data.data;
        const allProducts = groupedProducts.flatMap((category: any) =>
          category.products.map((product: any) => ({
            id: product._id,
            name: product.productName,
            image: product.images,
            discount: product.discount || 0,
            MRP: product.price,
            strikePrice: product.strikePrice || product.price,
            description: product.description,
            ratings: product.ratings,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
            favorite: product.favorite,
            available:product.available,
          }))
        );
  
        return allProducts;
      },
    });
  
    $: products = $productsQuery.data ?? [];
    $: productsLoading = $productsQuery.isLoading;
    $: productsError = $productsQuery.error ? ($productsQuery.error as Error).message : null;
  </script>

<section class="pl-4 md:px-6 lg:px-8 py-10">
  <div class="mt-10">
    <div class="flex items-start justify-between">
      <h2 class="lg:text-3xl text-xl  font-bold text-[#30363C] mb-6 text-left">New Products</h2>
      <p onclick={()=>{goto('/Products')}} class="text-[#01A0E2] cursor-pointer font-bold lg:text-2xl text-base pr-4">View All</p>
    </div>
    {#if productsLoading || productsError}
      <!-- Skeleton Loader for Product Cards -->
      <div class="flex gap-6 overflow-x-auto">
        {#each Array(4) as _} <!-- Adjust number based on how many cards you want to show -->
          <div class="flex-shrink-0 w-64 bg-white rounded-xl shadow-md overflow-hidden">
            <!-- Image Skeleton -->
            <Skeleton class="h-48 w-full" />
            <!-- Content Skeleton -->
            <div class="px-4 py-2 space-y-2">
              <Skeleton class="h-5 w-3/4" /> <!-- Name -->
              <div class="flex items-center gap-2">
                <Skeleton class="h-4 w-12" /> <!-- MRP -->
                <Skeleton class="h-4 w-12" /> <!-- Strike Price -->
              </div>
              <Skeleton class="h-4 w-20" /> <!-- Savings -->
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex md:gap-6 gap-4 py-1 px-1 overflow-x-auto scrollbar-hide">
        {#each products as product (product.id)}
          <div class="flex-wrap">
            <ProductCard
              id={product.id}
              image={product.image[0]}
              discount={product?.discount}
              name={product.name}
              MRP={product.MRP}
              strikePrice={product.strikePrice}
              favorite={product.favorite}
              available={product.available}
            />
          </div>
        {/each}
        <p onclick={()=>{goto('/Products')}} class="flex justify-center items-center text-[#01A0E2] underline whitespace-nowrap">view all <span>
		  <Icon icon="mdi:arrow-right-thin"  />
     </span></p>
      </div>
    {/if}
  </div>
</section>
