<script lang="ts">
  import { createQuery, useQueryClient, createMutation } from '@tanstack/svelte-query';
  import { _axios } from '$lib/_axios';
  import { imgUrl } from '$lib/config';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import ProductCard from '$lib/components/productCard.svelte';
  import { page } from '$app/stores';
  import Footer from '$lib/components/footer.svelte';
  import { onDestroy } from 'svelte';
  import * as Breadcrumb from "$lib/components/ui/breadcrumb";
  import Icon from '@iconify/svelte';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';

  $: productId = $page.params.id;

  interface Option {
    title: string;
    values: string[];
    _id: string;
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
    brandId?: string;
    productCode?: string;
    gst?: number;
    options?: Option[];
    specifications?: Specification[];
    negotiateLimit?: number;
    negotiate?:boolean;
  }

  interface NegotiationAttempt {
    amount: number;
    attemptNumber: number;
    _id?: string;
  }

  interface NegotiationState {
    attemptNumber: number;
    currentPrice: number;
    negotiatedPrice?: number;
    maxAttempts: number;
    negotiateLimit: number;
    attempts: NegotiationAttempt[];
    error?: string;
  }

  let negotiation: NegotiationState = {
    attemptNumber: 0,
    currentPrice: 0,
    negotiatedPrice: undefined,
    maxAttempts: 3,
    negotiateLimit: 0,
    attempts: []
  };

  let proposedPrice: number;
  let negotiationError: string | null = null;

  $: if (product) {
    negotiation.currentPrice = product.MRP;
    negotiation.negotiateLimit = product.negotiateLimit || 0;
  }

  const cartCountQuery = createQuery({
    queryKey: ['cartCount'],
    queryFn: async () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        throw new Error('No token found');
      }

      const response = await _axios.get('/cart/count', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.data.status && response.data.message !== "No active cart found") {
        throw new Error(response.data.message || 'Failed to fetch cart count');
      }

      return response.data;
    },
    retry: 1,
    staleTime: 0,
    enabled: $writableGlobalStore.isLogedIn,
  });

  $: cartCount = $writableGlobalStore.isLogedIn ? ($cartCountQuery.data?.count || 0) : 0;

  let selectedImageIndex = 0;
  let previousProductId: string | null = null;

  function changeMainImage(index: number) {
    selectedImageIndex = index;
  }

  const queryClient = useQueryClient();

  $: {
    if (previousProductId !== productId) {
      selectedImageIndex = 0;
      negotiation = {
        attemptNumber: 0,
        currentPrice: 0,
        negotiatedPrice: undefined,
        maxAttempts: 3,
        negotiateLimit: 0,
        attempts: []
      };
      negotiationError = null;
      queryClient.cancelQueries({ queryKey: ['product', previousProductId] });
      previousProductId = productId;
    }
  }

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
        brandId: product.brand?._id,
        productCode: product.productCode,
        gst: product.gst,
        options: product.options,
        specifications: product.specifications,
        negotiateLimit: product.negotiateLimit,
        negotiate: product.negotiate,
      };
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const sameBrandProductsQuery = createQuery<Product[]>({
    queryKey: ['sameBrandProducts', productId],
    queryFn: async () => {
      if (!$productQuery.data?.brandId) return [];

      const response = await _axios.get('/products/', {
        params: {
          limit: 4,
          page: 1,
          brand: $productQuery.data?.brandId,
        },
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
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          brandId: product.brandId,
          brandName: product.brandName,
          favorite: product.favorite,
        }))
      );

      const filtered = allProducts.filter((p: { id: string; }) => p.id !== productId);
      return filtered.slice(0, 4);
    },
    enabled: !!$productQuery.data?.brandId
  });

  const fetchNegotiationAttempts = async () => {

    try {
      const response = await _axios.get('/products/negotiate', {
        params: {
          productId: productId
        },
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.status) {
        negotiation = {
          ...negotiation,
          attemptNumber: response.data.attemptsCount || 0,
          maxAttempts: response.data.maxAttempts || 3,
          attempts: response.data.attempts || [],
          currentPrice: product?.MRP || 0
        };

        if (response.data.attempts?.length > 0) {
          negotiation.negotiatedPrice = response.data.attempts[response.data.attempts.length - 1].amount;
        }
      }
    } catch (error) {
      console.error("Failed to fetch negotiation attempts:", error);
    }
  };

  $: if (product?.negotiate) {
    fetchNegotiationAttempts();
  }

  async function handleNegotiate() {
    if (!product ) return;

    if (!proposedPrice || proposedPrice <= 0) {
      negotiationError = "Please enter a valid price";
      return;
    }

    try {
      const response = await _axios.get('/products/negotiate', {
        params: {
          productId: product.id,
          amount: proposedPrice.toString()
        },
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.status) {
        negotiation = {
          ...negotiation,
          attemptNumber: response.data.attemptsCount,
          negotiatedPrice: response.data.negotiatedPrice,
          currentPrice: response.data.negotiatedPrice,
          maxAttempts: response.data.maxAttempts,
          attempts: response.data.attempts || [],
          error: undefined
        };
        negotiationError = null;
      } else {
        negotiationError = response.data.message || "Negotiation failed";
      }
    } catch (error) {
      console.error("Negotiation error:", error);
      negotiationError = "Failed to negotiate price. Please try again.";
    }
  }

  const addToCartMutation = createMutation({
    mutationFn: async () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token || !$writableGlobalStore.isLogedIn) {
        throw new Error('Please log in to add to cart');
      }

      try {
        const response = await _axios.post(
          '/cart/update',
          {
            products: [
              {
                productId: productId,
                quantity: quantity,
                options: Object.entries(selectedOptions).map(([key, value]) => ({ title: key, value }))
              },
            ],
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to add to cart');
        }
        return response.data;
      } catch (error) {
        console.error("Failed to add to cart:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Product added to cart successfully!');
    },
    onError: (error: any) => {
      if (error.message === 'Please log in to add to cart') {
        toast.error(error.message);
        window.location.href = '/login';
      } else {
        toast.error(error.message || 'An error occurred while adding to cart');
      }
    },
  });

  function addToCart() {
    if (!product) return;
    $addToCartMutation.mutate();
  }

  $: product = $productQuery.data;
  $: productLoading = $productQuery.isLoading || $productQuery.isFetching;
  $: productError = $productQuery.error ? ($productQuery.error as Error).message : null;

  $: sameBrandProducts = $sameBrandProductsQuery.data ?? [];
  $: sameBrandProductsLoading = $sameBrandProductsQuery.isLoading;
  $: sameBrandProductsError = $sameBrandProductsQuery.error ? ($sameBrandProductsQuery.error as Error).message : null;
  $: hasSameBrandProducts = sameBrandProducts.length > 0;

  let selectedOptions: { [key: string]: string } = {};
  let quantity: number = 1;

  $: if (product?.options) {
    product.options.forEach((option: { title: string | number; values: string[]; }) => {
      if (!selectedOptions[option.title]) {
        selectedOptions[option.title] = option.values[0];
      }
    });
  }

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
        <div class="flex md:flex-row flex-col md:gap-12 gap-3">
          <div class="block md:hidden ">
            {#if product.discount > 0}
            <div class="bg-[#FA8232] w-fit text-white mb-5 text-sm font-bizGothic font-semibold rounded-full px-4 py-2 z-10">
              {product.discount}% OFF
            </div>
          {/if}

          <div class="flex gap-2 text-sm text-[#4F585E] mb-2">
            <span class="text-sm text-[#4F585E]"> <span class="text-[#147097]">BRAND:</span> {product.brand}</span>
            {#each product.options || [] as option}
              <span class="text-sm text-[#4F585E]"> <span class="text-[#147097]">{option.title.toUpperCase()}</span>: {selectedOptions[option.title]?.toUpperCase()}</span>
            {/each}
            <span class="text-sm text-[#4F585E]"> <span class="text-[#147097]">QUANTITY:</span> {quantity}</span>
          </div>

          <h1 class="text-xl font-bold text-[#30363C]">{product.name}</h1>

           </div>
          <!-- Product Image -->
          
          <div class="flex md:flex-row flex-col gap-5">
            <!-- Main Image Container -->
            <div class="bg-[#F3F9FB] !max-h-[450px] !md:min-w-96  rounded-xl flex justify-center item-center shadow p-10 relative">
              <img
                src={imgUrl + product.images[selectedImageIndex]}
                alt={product.name}
                class="h-96 w-96 object-contain"
              />
            </div>
            <!-- Thumbnail Gallery -->
            {#if product.images.length > 1}
              <div class="flex md:flex-col flex-row gap-2 md:w-16 w-full">
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
           <div class="hidden md:block ">
            {#if product.discount > 0}
            <div class="bg-[#FA8232] w-fit text-white mb-5 text-sm font-bizGothic font-semibold rounded-full px-4 py-2 z-10">
              {product.discount}% OFF
            </div>
          {/if}

          <div class="flex xl:gap-4 gap-2 text-sm text-[#4F585E] mb-2">
            <span class="text-base text-[#4F585E]"> <span class="text-[#147097]">BRAND:</span> {product.brand}</span>
            {#each product.options || [] as option}
              <span class="text-base text-[#4F585E]"> <span class="text-[#147097]">{option.title.toUpperCase()}</span>: {selectedOptions[option.title]?.toUpperCase()}</span>
            {/each}
            <span class="text-base text-[#4F585E]"> <span class="text-[#147097]">QUANTITY:</span> {quantity}</span>
          </div>

          <h1 class="text-3xl font-bold text-[#30363C]">{product.name}</h1>

           </div>
            <div class="lg:flex justify-between  hidden  flex-wrap">
              <div>
                <p class="md:text-lg text-base text-[#4F585E] mt-2">M.R.P <span class="line-through">₹{product.strikePrice}</span></p>

                {#if negotiation.negotiatedPrice}
                <p class="text-[#111827] "><span class="line-through font-bold md:text-2xl text-lg">₹{product.MRP} </span> <span class="font-bold md:text-2xl text-lg px-4"> ₹{negotiation.negotiatedPrice} <span class="text-[#C49814] text-sm font-medium px-4">Negotiation Price</span> </span></p>

              {:else}
                <p class="text-[#111827] font-bold md:text-2xl text-lg">₹{product.MRP}</p>
                <p class="line-through ">Save - ₹{product.strikePrice - product.MRP}</p>
              {/if}

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
   <!-- Negotiation Section -->
<div class="md:hidden block mt-5">
  <div class={`negotiation-section bg-white p-6 max-w-lg rounded-lg shadow-md border border-gray-200 ${product?.negotiate?'block':'hidden'}`}>
    <h2 class="text-xl font-bold text-gray-500 mb-4">Negotiate Price</h2>

    <div class="mb-4 flex items-center">
      <div class="relative flex-1 mr-2">
        <input
          type="number"
          bind:value={proposedPrice}
          on:input={(event)=>{
            let value = Number(event.currentTarget.value);
            if (value > product?.MRP) {
              proposedPrice = product.MRP;
            } else {
              proposedPrice = value;
            }}}
          class="w-full border border-gray-300 rounded-lg p-2  mt-1 text-left placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Enter your offer amount"
          min="1"
          max={product?.MRP || 0}
          disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
        />
      </div>
    </div>

    <div class="mb-4 space-y-2">
      <p class="text-sm text-yellow-600 flex items-center">
        <span class="mr-2 text-lg">ⓘ</span> You can negotiate the product price
      </p>
    </div>

    <!-- Show only attempted attempts (max 2) -->
    <div class="mb-4 space-y-2">
      {#each negotiation.attempts as attempt, index}
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-800">{index + 1}st attempt</p>
          <p class="text-sm text-gray-800">₹{attempt.amount}</p>
        </div>
      {/each}
      {#if negotiation.attempts.length === 0}
        <p class="text-sm text-gray-400">No attempts made yet</p>
      {/if}
    </div>

    {#if negotiationError}
      <p class="text-red-500 text-sm mb-2">{negotiationError}</p>
    {/if}

    <button
      class="w-full bg-[#01A0E2] text-white py-3 rounded-lg hover:scale-105 duration-300 transition-all focus:outline-none focus:ring-0 text-xl mt-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      on:click={handleNegotiate}
      disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
    >
      NEGOTIATE
    </button>

    {#if negotiation.attemptNumber >= negotiation.maxAttempts}
      <p class="text-sm text-center text-red-500 mt-2">No attempts left</p>
    {:else}
      <p class="text-sm text-center text-red-500 mt-2">
        You have {negotiation.maxAttempts - negotiation.attemptNumber} attempt(s) left
      </p>
    {/if}
  </div>
</div>
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
            <div class="flex justify-between  lg:hidden  flex-wrap">
              <div>
                <p class="md:text-lg text-base text-[#4F585E] mt-2">M.R.P <span class="line-through">₹{product.strikePrice}</span></p>

                {#if negotiation.negotiatedPrice}
                <p class="text-[#111827] "><span class="line-through font-bold md:text-2xl text-lg">₹{product.MRP} </span> <span class="font-bold md:text-2xl text-lg px-4"> ₹{negotiation.negotiatedPrice} <span class="text-[#C49814] text-sm font-medium px-4">Negotiation Price</span> </span></p>

              {:else}
                <p class="text-[#111827] font-bold md:text-2xl text-lg">₹{product.MRP}</p>
                <p class="line-through ">Save - ₹{product.strikePrice - product.MRP}</p>
              {/if}

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
          </div>
        </div>
      {/if}
      <div class="md:flex flex-col gap-4  xl:hidden hidden">
        <div class="max-w-lg bg-white p-6 rounded-lg  shadow-md border h-fit">
          <h2 class="text-lg font-bold text-[#30363C] mb-4">Please add item(s) to proceed</h2>
          <button on:click={()=>{if(cartCount>0){goto('/cart')}}} class={`w-full ${cartCount>0?'bg-[#01A0E2] cursor-pointer':'bg-gray-400 cursor-not-allowed'}  text-white py-3 rounded-lg `}>
            Go to cart
          </button>
        </div>
  
        <!-- Negotiation Section -->
        <div class={`negotiation-section bg-white p-6 max-w-lg rounded-lg shadow-md border border-gray-200 ${product?.negotiate?'block':'hidden'}`}>
          <h2 class="text-xl font-bold text-gray-500 mb-4">Negotiate Price</h2>
  
          <div class="mb-4 flex items-center">
            <div class="relative flex-1 mr-2">
              <input
                type="number"
                bind:value={proposedPrice}
                on:input={(event)=>{
                  let value = Number(event.currentTarget.value);
                  if (value > product?.MRP) {
                    proposedPrice = product.MRP;
                  } else {
                    proposedPrice = value;
                  }}}
                class="w-full border border-gray-300 rounded-lg p-2  mt-1 text-left placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Enter your offer amount"
                min="1"
                max={product?.MRP || 0}
                disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
              />
            </div>
          </div>
  
          <div class="mb-4 space-y-2">
            <p class="text-sm text-yellow-600 flex items-center">
              <span class="mr-2 text-lg">ⓘ</span> You can negotiate the product price
            </p>
          </div>
  
          <!-- Show only attempted attempts (max 2) -->
          <div class="mb-4 space-y-2">
            {#each negotiation.attempts as attempt, index}
              <div class="flex justify-between items-center">
                <p class="text-sm text-gray-800">{index + 1}st attempt</p>
                <p class="text-sm text-gray-800">₹{attempt.amount}</p>
              </div>
            {/each}
            {#if negotiation.attempts.length === 0}
              <p class="text-sm text-gray-400">No attempts made yet</p>
            {/if}
          </div>
  
          {#if negotiationError}
            <p class="text-red-500 text-sm mb-2">{negotiationError}</p>
          {/if}
  
          <button
            class="w-full bg-[#01A0E2] text-white py-3 rounded-lg hover:scale-105 duration-300 transition-all focus:outline-none focus:ring-0 text-xl mt-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            on:click={handleNegotiate}
            disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
          >
            NEGOTIATE
          </button>
  
          {#if negotiation.attemptNumber >= negotiation.maxAttempts}
            <p class="text-sm text-center text-red-500 mt-2">No attempts left</p>
          {:else}
            <p class="text-sm text-center text-red-500 mt-2">
              You have {negotiation.maxAttempts - negotiation.attemptNumber} attempt(s) left
            </p>
          {/if}
        </div>
      </div>
      <!-- Specifications -->
      <div class="mt-8 bg-white">
        {#if product}
        <div class="bg-[#F5F5F5] rounded-lg">
          <h2 class="text-xl font-bold text-[#4B5563] border rounded-lg border-[#0EA5E9] bg-[#F3FBFF] px-16 py-4 inline-block">
            Specifications
          </h2>
        </div>
        {/if}
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
            <div class="space-y-2">
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
                  {#if Object.entries(spec.fields).some(([_, value]) => value && value !== '-')}
                    <div class="space-y-2">
                      {#each Object.entries(spec.fields) as [key, value]}
                        {#if value && value !== ''}
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
    <div class="xl:flex   flex-col gap-4 hidden">
      <div class="w-80 bg-white p-6 rounded-lg shadow-md border h-fit">
        <h2 class="text-lg font-bold text-[#30363C] mb-4">Please add item(s) to proceed</h2>
        <button on:click={()=>{if(cartCount>0){goto('/cart')}}} class={`w-full ${cartCount>0?'bg-[#01A0E2] cursor-pointer':'bg-gray-400 cursor-not-allowed'}  text-white py-3 rounded-lg `}>
          Go to cart
        </button>
      </div>

      <!-- Negotiation Section -->
      <div class={`negotiation-section bg-white p-6 rounded-lg shadow-md border border-gray-200 ${product?.negotiate?'block':'hidden'}`}>
        <h2 class="text-xl font-bold text-gray-500 mb-4">Negotiate Price</h2>

        <div class="mb-4 flex items-center">
          <div class="relative flex-1 mr-2">
            <input
              type="number"
              bind:value={proposedPrice}
              on:input={(event)=>{
                let value = Number(event.currentTarget.value);
                if (value > product?.MRP) {
                  proposedPrice = product.MRP;
                } else {
                  proposedPrice = value;
                }}}
              class="w-full border border-gray-300 rounded-lg p-2  mt-1 text-left placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Enter your offer amount"
              min="1"
              max={product?.MRP || 0}
              disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
            />
          </div>
        </div>

        <div class="mb-4 space-y-2">
          <p class="text-sm text-yellow-600 flex items-center">
            <span class="mr-2 text-lg">ⓘ</span> You can negotiate the product price
          </p>
        </div>

        <!-- Show only attempted attempts (max 2) -->
        <div class="mb-4 space-y-2">
          {#each negotiation.attempts as attempt, index}
            <div class="flex justify-between items-center">
              <p class="text-sm text-gray-800">{index + 1}st attempt</p>
              <p class="text-sm text-gray-800">₹{attempt.amount}</p>
            </div>
          {/each}
          {#if negotiation.attempts.length === 0}
            <p class="text-sm text-gray-400">No attempts made yet</p>
          {/if}
        </div>

        {#if negotiationError}
          <p class="text-red-500 text-sm mb-2">{negotiationError}</p>
        {/if}

        <button
          class="w-full bg-[#01A0E2] text-white py-3 rounded-lg hover:scale-105 duration-300 transition-all focus:outline-none focus:ring-0 text-xl mt-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          on:click={handleNegotiate}
          disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
        >
          NEGOTIATE
        </button>

        {#if negotiation.attemptNumber >= negotiation.maxAttempts}
          <p class="text-sm text-center text-red-500 mt-2">No attempts left</p>
        {:else}
          <p class="text-sm text-center text-red-500 mt-2">
            You have {negotiation.maxAttempts - negotiation.attemptNumber} attempt(s) left
          </p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Products from Same Brand - Only show if products available -->
  {#if hasSameBrandProducts}
    <div class="mt-8 overflow-x-auto">
      <h2 class="text-xl font-bold text-[#30363C] mb-4">More from {product?.brand || 'this brand'}</h2>
      {#if sameBrandProductsLoading}
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
      {:else if sameBrandProductsError}
        <p class="text-red-500">Error loading products: {sameBrandProductsError}</p>
      {:else}
        <div class="flex flex-wrap gap-10">
          {#each sameBrandProducts as product (product.id)}
            <ProductCard
              id={product.id}
              image={product.images[0]}
              discount={product.discount}
              name={product.name}
              MRP={product.MRP}
              strikePrice={product.strikePrice}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<Footer />
