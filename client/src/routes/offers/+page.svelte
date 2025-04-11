<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { _axios } from '$lib/_axios';
    import { Skeleton } from '$lib/components/ui/skeleton/index.js';
    import ProductCard from '$lib/components/productCard.svelte';
    import { imgUrl } from '$lib/config';
    import { goto } from '$app/navigation';
    import * as Breadcrumb from "$lib/components/ui/breadcrumb";
    import Footer from '$lib/components/footer.svelte';
  
    // Interfaces based on the API response
    interface ProductDetails {
	  favorite: boolean | undefined;
      _id: string;
      productName: string;
      price: number;
      images: string[];
      discount: number;
      strikePrice: number;
      negotiateLimit?: number;
      negotiate?: boolean;
    }
  
    interface OfferItem {
	  productName: string;
	  type: string;
	  percentage: number;
	  image: string;
	  name: string;
	  MRP: number;
	  strikePrice: number;
	  favorite: boolean | undefined;
	  id: string | number;
      _id: string;
      productId: ProductDetails;
      discount?: number;
      successPercentage?: number;
      failurePercentage?: number;
      mrpReduction?: number;
    }
  
    interface Offer {
      _id: string;
      type: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      percentage?: number;
      items: OfferItem[];
      noOfAttempts?: number;
    }
    $: products = $offersQuery.data ?? [];
    // Fetch offers using TanStack Query
    const offersQuery = createQuery<Offer[]>({
      queryKey: ['userOffers'],
      queryFn: async () => {
        const response = await _axios.get('/offers/', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        });
  
        const { data } = response;
  
        if (!data || typeof data !== 'object' || !('status' in data)) {
          throw new Error('Invalid response from server');
        }
  
        if (!data.status) {
          throw new Error(data.message || 'Failed to fetch offers');
        }
  
        return data.data as Offer[];
      },
      refetchOnWindowFocus: false,
      enabled: typeof window !== 'undefined',
    });
  
  
    // Group offers by type for display
    $: groupedOffers = $offersQuery.data?.reduce((acc, offer) => {
      if (!acc[offer.type]) acc[offer.type] = [];
      acc[offer.type].push(offer);
      return acc;
    }, {} as Record<string, Offer[]>);

  </script>
  
  <section class="bg-[#F2F4F5] py-4 px-4 md:px-6 lg:px-8">
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/" class="text-[#4F585E] hover:text-[#01A0E2] text-base">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/offers" class="text-[#01A0E2] text-base">Offers</Breadcrumb.Link>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </section>
  
  <div class="flex min-h-screen px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
    <main class="flex-1 p-6">
      {#if $offersQuery.isLoading}
        <div class="flex gap-6">
          {#each Array(4) as _}
            <div class="w-56 bg-white rounded-xl shadow-md overflow-hidden">
              <Skeleton class="h-48 w-56" />
              <div class="px-4 py-2 space-y-2">
                <Skeleton class="h-5 w-3/4" />
                <div class="flex items-center gap-2">
                  <Skeleton class="h-4 w-12" />
                  <Skeleton class="h-4 w-12" />
                </div>
                <Skeleton class="h-4 w-20" />
              </div>
            </div>
          {/each}
        </div>
      {:else if $offersQuery.error}
        <div class="text-red-500 text-center py-10">{$offersQuery.error.message}</div>
      {:else if !groupedOffers || Object.keys(groupedOffers).length === 0}
        <div class="text-center py-10">
          <p class="text-lg text-[#4F585E]">No offers found</p>
        </div>
      {:else}
        <!-- Negotiable Products Section -->
        {#if groupedOffers['negotiate']}
          <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex justify-between items-center">
              Negotiable Products
              <a href="/offers?type=negotiate" class="text-blue-500 hover:underline">View All</a>
            </h2>
            <div class="flex flex-wrap gap-6">
              {#each groupedOffers['negotiate'] as offer (offer._id)}
                {#each offer.items as item (item._id)}
                <ProductCard  id={item._id}
                image={item.productId.images[0]}
                discount={item.discount}
                name={item.productId.productName}
                MRP={item.productId.price}
                strikePrice={item.productId.strikePrice}
                favorite={item.productId.favorite} />
                {/each}
              {/each}
            </div>
          </div>
        {/if}
  
        <!-- Discount on MRP Section -->
        {#if groupedOffers['discount']}
          <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex justify-between items-center">
              Discount on MRP
              <a href="/offers?type=discount" class="text-blue-500 hover:underline">View All</a>
            </h2>
            <div class="flex flex-wrap gap-6">
              {#each groupedOffers['discount'] as offer (offer._id)}
              {console.log(offer)}
                {#each offer.items as item (item._id)}
                <ProductCard  id={item._id}
                image={item.productId.images[0]}
                discount={item.discount}
                name={item.productId.productName}
                MRP={item.productId.price}
                strikePrice={item.productId.strikePrice}
                favorite={item.productId.favorite} />
                {/each}
              {/each}
            </div>
          </div>
        {/if}
  
  
        <!-- MRP Reduction Section -->
        {#if groupedOffers['mrp']}
          <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex justify-between items-center">
              MRP Reduction
              <a href="/offers?type=mrp" class="text-blue-500 hover:underline">View All</a>
            </h2>
            <div class="flex flex-wrap gap-6">
              {#each groupedOffers['mrp'] as offer (offer._id)}
                {#each offer.items as item (item._id)}
                <ProductCard  id={item._id}
                image={item.productId.images[0]}
                discount={item.discount}
                name={item.productId.productName}
                MRP={item.productId.price}
                strikePrice={item.productId.strikePrice}
                favorite={item.productId.favorite} />
                {/each}
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </main>
  </div>
  
  <Footer />
  
  <style>
    .container {
      max-width: 1200px;
    }
  </style>