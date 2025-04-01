<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { _axios } from '$lib/_axios';
  import { imgUrl } from '$lib/config';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import ProductCard from '$lib/components/productCard.svelte';
  import { page } from '$app/stores';
  import Footer from '$lib/components/footer.svelte';
  import { onDestroy } from 'svelte';
  import * as Breadcrumb from "$lib/components/ui/breadcrumb";
	import Icon from '@iconify/svelte';
  
  $: productId = $page.params.id;

  // Define interfaces based on the API response
  interface Option {
    title: string;
    values: string[];
    _id: string;
  }

  interface Brand {
    _id: string;
    name: string;
  }

  interface Category {
    _id: string;
    name: string;
  }

  interface SpecificationField {
    [key: string]: string;
  }

  interface Specification {
    name: string;
    fields: SpecificationField;
    _id: string;
  }

  interface Product {
    id: string | number;
    name: string;
    images: string[];
    discount: number;
    MRP: number;
    strikePrice: number;
    description?: string;
    ratings?: number;
    categoryId?: string;
    categoryName?: string;
    favorite?: boolean;
    brand?: string;
    productCode?: string;
    gst?: number;
    options?: Option[];
    specifications?: Specification[];
  }

  let selectedImageIndex = 0;
  let previousProductId: string | null = null;

  function changeMainImage(index: number) {
    selectedImageIndex = index;
  }

  // Use QueryClient to manage query invalidation
  const queryClient = useQueryClient();

  // Reset state when productId changes
  $: {
    if (previousProductId !== productId) {
      // Reset image index
      selectedImageIndex = 0;
      // Cancel any ongoing queries for the previous product
      queryClient.cancelQueries({ queryKey: ['product', previousProductId] });
      // Store current productId for next comparison
      previousProductId = productId;
    }
  }

  // Fetch the product by ID
  const productQuery = createQuery<Product>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await _axios.get(`/products/${productId}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to fetch product');
      }

      const product = response.data.data;
      return {
        id: product._id,
        name: product.productName,
        images: product.images,
        discount: product.discount || 0,
        MRP: product.price,
        strikePrice: product.strikePrice || product.price,
        description: product.description,
        ratings: product.ratings,
        categoryId: product.category._id,
        categoryName: product.category.name,
        favorite: product.favorite,
        brand: product.brand?.name,
        productCode: product.productCode,
        gst: product.gst,
        options: product.options,
        specifications: product.specifications,
      };
    },
    // Important settings to prevent stale data
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Fetch recently browsed products
  const recentlyBrowsedQuery = createQuery<Product[]>({
    queryKey: ['recentlyBrowsed'],
    queryFn: async () => {
      const response = await _axios.get('/products/', {
        params: { limit: 4, page: 1 },
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to fetch products');
      }

      const groupedProducts = response.data.data;
      const allProducts = groupedProducts.flatMap((category: any) =>
        category.products.map((product: any) => ({
          id: product._id,
          name: product.productName,
          images: product.images,
          discount: product.discount || 0,
          MRP: product.price,
          strikePrice: product.strikePrice || product.price,
          description: product.description,
          ratings: product.ratings,
          categoryId: product.category._id,
          categoryName: product.category.name,
          favorite: product.favorite,
        }))
      );

      return allProducts.slice(0, 4);
    },
    staleTime: Infinity // These don't need to refresh as often
  });

  // Access query states
  $: product = $productQuery.data;
  $: productLoading = $productQuery.isLoading || $productQuery.isFetching;
  $: productError = $productQuery.error ? ($productQuery.error as Error).message : null;
  $: productSuccess = $productQuery.isSuccess;

  $: recentlyBrowsed = $recentlyBrowsedQuery.data ?? [];
  $: recentlyBrowsedLoading = $recentlyBrowsedQuery.isLoading;
  $: recentlyBrowsedError = $recentlyBrowsedQuery.error ? ($recentlyBrowsedQuery.error as Error).message : null;

  // Cart state
  let selectedOptions: { [key: string]: string } = {};
  let quantity: number = 1;

  // Initialize selected options only when product data is available and matches current productId
  $: if (product?.options) {
    product.options.forEach((option) => {
      if (!selectedOptions[option.title]) {
        selectedOptions[option.title] = option.values[0]; // Default to the first value
      }
    });
  }

  // Add to cart handler
  function addToCart() {
    console.log(`Added to cart: ${product?.name}, Options: ${JSON.stringify(selectedOptions)}, Quantity: ${quantity}`);
  }

  // Negotiate handler
  function handleNegotiate() {
    console.log(`Negotiating price for product: ${product?.name}`);
  }

  // Cleanup on destroy
  onDestroy(() => {
    queryClient.cancelQueries({ queryKey: ['product'] });
  });
</script>



<section class="bg-[#F2F4F5] py-4 px-4 md:px-6 lg:px-8">
  <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/" class='text-[#4F585E] hover:text-[#01A0E2] text-base'>Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/Products" class='text-[#4F585E] hover:text-[#01A0E2] text-base'>Products</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          {#if productLoading || !product}
          <Skeleton class="h-5 w-32 inline-block" />
        {:else}
          <Breadcrumb.Link href={`/Products/${productId}`} class='text-[#01A0E2] text-base'>
            {product.name}
          </Breadcrumb.Link>
        {/if}
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </section>
<div class="min-h-screen bg-white p-6">
  <!-- Main Product Section -->
  <div class="flex gap-6">
    <!-- Product Image and Details -->
    <div class="flex-1">
      {#if productLoading || productError}
        <!-- Skeleton Loader for Product -->
        <div class="flex gap-6">
          <Skeleton class="h-96 w-96 rounded-lg" />
          <div class="flex-1 space-y-4">
            <Skeleton class="h-6 w-48" />
            <Skeleton class="h-8 w-64" />
            <Skeleton class="h-6 w-32" />
            <Skeleton class="h-6 w-48" />
            <div class="flex gap-2">
              {#each Array(4) as _}
                <Skeleton class="h-10 w-10 rounded-full" />
              {/each}
            </div>
            <Skeleton class="h-6 w-32" />
            <Skeleton class="h-10 w-32" />
            <Skeleton class="h-10 w-32" />
          </div>
        </div>
      {:else if product}
        <div class="flex gap-12">
          <!-- Product Image -->
          <div class="flex gap-5">
                 <!-- Main Image Container -->
                 <div class="bg-[#F3F9FB] min-h-[450px]  rounded-xl shadow p-10 relative">
          
                  <img
                    src={imgUrl + product.images[selectedImageIndex]}
                    alt={product.name}
                    class="h-96 w-96 object-contain"
                  />
                </div>
            <!-- Thumbnail Gallery (vertical on the left) -->
            {#if product.images.length > 1}
              <div class="flex flex-col gap-2 w-16">
                {#each product.images as image, index}
                  <button
                    on:click={() => changeMainImage(index)}
                    class={`w-20 h-20 border-1 border bg-[#F5F5F5] rounded-md overflow-hidden ${selectedImageIndex === index ? 'border-[#008ECC]' : 'border-gray-200'}`}
                  >
                    <img
                      src={imgUrl + image}
                      alt={`Thumbnail ${index + 1}`}
                      class="w-full h-full object-contain"
                    />
                  </button>
                {/each}
              </div>
            {/if}

       
          </div>

          <!-- Product Details -->
          <div class="flex-1 flex flex-col">
            <!-- offer -->
            {#if product.discount > 0}
            <div class=" bg-[#FA8232] w-fit text-white mb-5 text-sm font-bizGothic font-semibold rounded-full px-4 py-2 z-10">
              {product.discount}% OFF
            </div>
          {/if}
            <!-- Top Info: Brand, Options, Quantity -->
            <div class="flex gap-4 text-sm text-[#4F585E] mb-2">
                <span class="text-base text-[#4F585E]"> <span class="text-[#147097]">BRAND:</span> {product.brand}</span>
              {#each product.options || [] as option}
              <span class="text-base text-[#4F585E]"> <span class="text-[#147097]">{option.title.toUpperCase()}</span>: {selectedOptions[option.title]?.toUpperCase()}</span>
              {/each}
              <span class="text-base text-[#4F585E]"> <span class="text-[#147097]">QUANTITY:</span> {quantity}</span>
            </div>

            <!-- Product Name -->
            <h1 class="text-3xl font-bold text-[#30363C]">{product.name}</h1>

            <!-- Price -->
       <div class="flex justify-between">
        <div>
          <p class="text-lg text-[#4F585E] mt-2">
            M.R.P {product.MRP} 
          </p>
          <p class="line-through  text-[#111827] font-bold text-2xl">₹{product.strikePrice} </p>
          <p class="text-green-600">Save - ₹{product.strikePrice - product.MRP}</p>
        </div>
        <div class="mt-4 self-end">
          <button
            class="bg-[#01A0E2] text-xl text-white px-6 py-3 rounded-lg hover:scale-105 transition-all"
            on:click={addToCart}
          >
            Add to cart
          </button>
        </div>
       </div>

            <!-- Options Selection -->
            {#each product.options || [] as option}
              <div class="mt-4">
                <p class="text-sm text-[#4F585E] mb-2">{option.title.toUpperCase()}: {selectedOptions[option.title]?.toUpperCase()}</p>
                <div class="flex gap-2">
                  {#each option.values as value}
                    <button
                      class="border px-4 py-2 rounded-lg {selectedOptions[option.title] === value ? 'border-[#0EA5E9] bg-[#F3FBFF]' : 'border-gray-300'}"
                      on:click={() => (selectedOptions[option.title] = value)}
                    >
                      {value.toUpperCase()}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}

            <!-- Quantity Selection -->
            <div class="mt-4">
              <p class="text-sm text-[#4F585E] mb-2">COUNT: {quantity}</p>
              <div class="flex items-center gap-2">
                <button
                  class="h-10 w-10 border rounded-lg"
                  on:click={() => (quantity = Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span class="text-lg">{quantity}</span>
                <button
                  class="h-10 w-10 border rounded-lg"
                  on:click={() => (quantity = quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <!-- Add to Cart Button -->
         
          </div>
        </div>
      {/if}

      <!-- Specifications -->
      <div class="mt-8 bg-white">
        <div class="bg-[#F5F5F5] rounded-lg">
          <h2 class="text-xl font-bold text-[#4B5563] border rounded-lg border-[#0EA5E9] bg-[#F3FBFF] px-16 py-4 inline-block">
            Specifications
          </h2>
        </div>
        <div class="p-6">
          {#if productLoading || productError}
            <div class="space-y-4">
              {#each Array(3) as _}
                <div class="space-y-2">
                  <Skeleton class="h-5 w-32" />
                  <div class="space-y-1">
                    {#each Array(2) as _}
                      <div class="flex">
                        <Skeleton class="h-4 w-24" />
                        <Skeleton class="h-4 w-24 ml-4" />
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else if product}
            <div class="space-y-4">
              <!-- Always show the brand -->
              <div class="space-y-2">
                <div class="flex">
                  <span class="text-[#4F585E] w-40">Brand</span>
                  <span class="text-[#4F585E] mx-2">:</span>
                  <span class="text-[#30363C]">{product.brand}</span>
                </div>
              </div>

              <!-- Show specifications if available -->
              {#if product.specifications && product.specifications.length > 0}
                {#each product.specifications as spec}
                  <!-- Only show the specification if it has at least one non-empty field -->
                  {#if Object.entries(spec.fields).some(([_, value]) => value && value !== '-')}
                    <div class="space-y-2">
                      {#each Object.entries(spec.fields) as [key, value]}
                        {#if value && value !== '-'}
                          <div class="flex">
                            <span class="text-[#4F585E] w-40">{key}</span>
                            <span class="text-[#4F585E] mx-2">:</span>
                            <span class="text-[#30363C]">{value}</span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Cart Summary -->
  <div class="flex flex-col gap-4">
    <div class="w-80 bg-white p-6 rounded-lg shadow-md border h-fit">
      <h2 class="text-lg font-bold text-[#30363C] mb-4">Please add item(s) to proceed</h2>
      <button class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
        Go to cart
      </button>
     </div>
    <div class="w-80  bg-white p-6 rounded-lg border shadow-md h-fit">
 
      <div class="mt-4 space-y-2">
        <p class="text-xl text-[#4F585E] flex justify-between">
          1st attempt price <span>₹{product?.MRP || 0}</span>
        </p>
        <p class="text-xl text-[#4F585E] flex justify-between">
          2nd attempt <span>₹{product ? product.MRP - 1 : 0}</span>
        </p>
        <p class="text-xl text-[#4F585E] flex justify-between font-bold">
          Negotiable <span>₹{product ? product.MRP - 2 : 0}</span>
        </p>
      </div>
      <p class="text-sm text-yellow-600 mt-4 flex gap-1">
        <Icon icon="icon-park-solid:info" class="text-yellow-600 h-5 w-5" />
 You can negotiate the product price</p>
      <button
        class="w-full bg-[#01A0E2] text-white py-3 rounded-lg hover:scale-105  text-xl mt-2"
        on:click={handleNegotiate}
      >
        NEGOTIATE
      </button>
      <p class="text-sm text-red-500 mt-2">YOU HAVE 1 ATTEMPT LEFT</p>
    </div>
  </div>
  </div>

  <!-- Recently Browsed Products -->
  <div class="mt-8">
    <h2 class="text-xl font-bold text-[#30363C] mb-4">Recently Browsed Products</h2>
    {#if recentlyBrowsedLoading || recentlyBrowsedError}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {#each Array(4) as _}
          <div class="w-full bg-white rounded-xl shadow-md overflow-hidden">
            <Skeleton class="h-48 w-full" />
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
    {:else}
      <div class="flex flex-wrap gap-10">
        {#each recentlyBrowsed as product (product.id)}
          <ProductCard
            id={product.id}
            image={product.images[0]} 
            discount={product?.discount}
            name={product.name}
            MRP={product.MRP}
            strikePrice={product.strikePrice}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>
<Footer />