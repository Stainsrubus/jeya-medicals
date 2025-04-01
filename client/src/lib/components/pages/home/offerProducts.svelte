<script lang="ts">
    import axios from 'axios';
    import { createQuery } from '@tanstack/svelte-query';
	import ProductCard from '$lib/components/productCard.svelte';
	import { _axios } from '$lib/_axios';
	import { imgUrl } from '$lib/config';

  

  
    interface Product {
    id: string | number;
    name: string;
    image: string;
    discount: number;
    MRP: number;
    strikePrice: number;
    description?: string;
    ratings?: number;
    categoryId?: string;
    categoryName?: string;
    favorite?: boolean;
  }
  
  const productsQuery = createQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await _axios.get('/products/', {
        params: {
          limit: 1000, // Fetch all products
          page: 1,
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
          discount: product.discount || 0, // No discount field in API; default to 0
          MRP: product.price, // Current price as MRP
          strikePrice: product.strikePrice || product.price, // No strikePrice in API; use price as fallback
          description: product.description,
          ratings: product.ratings,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          favorite: product.favorite,
        }))
      );

      return allProducts;
    },
  });
  
    $: products = $productsQuery.data ?? [];
  $: productsLoading = $productsQuery.isLoading;
  $: productsError = $productsQuery.error ? ($productsQuery.error as Error).message : null;

  </script>


<section class="px-4 md:px-6 lg:px-8 py-10">

    <div class="mt-10">
        <h2 class="text-3xl font-bold text-[#30363C] mb-6 text-left">New Products</h2>
        {#if productsLoading}
          <div class="text-center text-xl text-[#30363C]">Loading products...</div>
        {:else if productsError}
          <div class="text-center text-xl text-red-500">{productsError}</div>
        {:else}
          <div class="flex gap-6">
            {#each products as product (product.id)}
              <ProductCard
                id={product.id}
                image={product.image}
                discount={product?.discount}
                name={product.name}
                MRP={product.MRP}
                strikePrice={product.strikePrice}
              />
            {/each}
          </div>
        {/if}
      </div>
</section>