<script lang="ts">
  import { createQuery, useQueryClient, createMutation } from '@tanstack/svelte-query';
  import { _axios } from '$lib/_axios';
  import { imgUrl } from '$lib/config';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import ProductCard from '$lib/components/productCard.svelte';
  import { page } from '$app/stores';
  import Footer from '$lib/components/footer.svelte';
  import { onDestroy, onMount } from 'svelte';
  import * as Breadcrumb from "$lib/components/ui/breadcrumb";
  import Icon from '@iconify/svelte';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import * as Select from "$lib/components/ui/select/index.js";
  import { json } from '@sveltejs/kit';

  $: productId = $page.params.id;
  let isInitialLoad = true;
  let offerType: string | null = null;

  onMount(() => {
    isInitialLoad = false;
    productId = $page.params.id;
    offerType = $page.url.searchParams.get('offerType');
  });

  let hasFetchedFlatProducts = false;

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
    onMRP: number;
    flat: number;
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
    negotiate?: boolean;
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
  let neededProductName = '';
  let selectedComplementaryProducts: Product[] = [];
  let totalComplementaryValue = 0;
  let complementaryError = '';

  $: if (product) {
    if (product.flat > 0 && !hasFetchedFlatProducts) {
      selectedPricingOption = 'flatOffer';
      $flatProductQuery.mutate();
      hasFetchedFlatProducts = true;
    }
    if (offerType === 'negotiation') {
      selectedPricingOption = 'negotiation';
    } else if (offerType === 'discount') {
      selectedPricingOption = 'discount';
    } else if (offerType === 'onMRP') {
      selectedPricingOption = 'onMRP';
    }
    negotiation.currentPrice = product.MRP;
    negotiation.negotiateLimit = product.negotiateLimit || 0;
    if (previousProductId !== productId) {
      selectedComplementaryProducts = [];
      totalComplementaryValue = 0;
      complementaryError = '';
      hasFetchedFlatProducts = false;
      desiredQuantity = cartQuantity || 1; // Initialize with cart quantity or 1
    }
  }

  let selectedMessageOption: string = 'Need';
  let selectedPricingOption: string = '';

  function sendMessage() {
    console.log('Selected Message Option:', selectedMessageOption);
  }

  const cartCountQuery = createQuery({
    queryKey: ['cartCount'],
    queryFn: async () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('empToken') : null;
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
    enabled: $writableGlobalStore.isLoggedIn,
  });

  const cartQuery = createQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      try {
        const response = await _axios.get('/cart', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.data.status && response.data.message === "No active cart found") {
          return {
            message: "No active cart found",
            status: false,
            cart: {
              _id: '',
              empId: '',
              products: [],
              subtotal: 0,
              tax: 0,
              totalPrice: 0,
              totalDistance: 0,
              deliveryFee: 0,
              platformFee: 0,
              deliverySeconds: 0,
              status: 'active',
              lastUpdated: '',
              createdAt: '',
              updatedAt: '',
              __v: 0,
            },
            totalDistance: 0,
            deliveryFee: 0,
            platformFee: 0,
            coupons: [],
            deliverySeconds: 0,
            deliveryMinutes: 0,
          };
        }

        if (response.data.status) {
          return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch cart');
      } catch (error) {
        throw error instanceof Error ? error : new Error('An unexpected error occurred');
      }
    },
    retry: 1,
    staleTime: 0,
    enabled: true,
  });

  $: cartCount = $writableGlobalStore.isLoggedIn ? ($cartCountQuery.data?.count || 0) : 0;
  $: cartData = $writableGlobalStore.isLoggedIn ? ($cartQuery?.data?.cart || 0) : 0;
  let cartQuantity = 0;

  $: if ($cartQuery.data?.cart?.products) {
    const foundItem = $cartQuery.data.cart.products.find(
      (item: { productId: { _id: string } }) => item.productId._id === productId
    );
    cartQuantity = foundItem ? foundItem.quantity : 0;
    if (!foundItem && desiredQuantity !== 1) {
      desiredQuantity = 1; // Reset to 1 if no cart item exists
    }
  }

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

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
      desiredQuantity = cartQuantity || 1; // Reset quantity on product change
      queryClient.cancelQueries({ queryKey: ['product', previousProductId] });
      previousProductId = productId;
    }
  }

  const complementaryProductQuery = createMutation<Product>({
    mutationFn: async () => {
      const response = await _axios.get(`/products/complementary`, {
        params: { q: product?.onMRP },
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to fetch product');
      }

      return response.data;
    },
  });

  const flatProductQuery = createMutation<Product>({
    mutationFn: async () => {
      const response = await _axios.get(`/products/flat-discount`, {
        params: { userId: userData?.userId, productId: productId },
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to fetch product');
      }

      return response.data;
    },
  });

  const productQuery = createQuery<Product>({
    queryKey: ['product', productId],
    queryFn: async () => {
      // console.log(productId);
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
        onMRP: product.onMRP || 0,
        flat: product.flat || 0,
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
    retry: 1,
    staleTime: 0,
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
  
          description: product.description,
          ratings: product.ratings,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          brandId: product.brandId,
          brandName: product.brandName,
          favorite: product.favorite,
        }))
      );

      const filtered = allProducts.filter((p: { id: string }) => p.id !== productId);
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



  const addToCartMutation = createMutation({
    mutationFn: async (quantity: number) => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('empToken') : null;
      if (!token || !$writableGlobalStore.isLoggedIn) {
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
                options: Object.entries(selectedOptions).map(([key, value]) => ({ title: key, value })),
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
          throw new Error(response.data.message || 'Failed to update cart');
        }
        toast.success('Quantity updated successfully');
        return response.data;
      } catch (error) {
        console.error("Failed to update cart:", error);
        throw error;
      }
    },
    onMutate: (quantity) => {
      cartQuantity = quantity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      queryClient.invalidateQueries(['cartCount']);
    },
    onError: (error: any) => {
      const foundItem = $cartQuery.data?.cart?.products.find(
        (item: { productId: { _id: string } }) => item.productId._id === productId
      );
      cartQuantity = foundItem ? foundItem.quantity : 0;
      desiredQuantity = cartQuantity || 1; // Reset to cart quantity on error

      if (error.message === 'Please log in to add to cart') {
        toast.error(error.message);
        window.location.href = '/login';
      } else {
        toast.error(error.message || 'An error occurred while updating cart');
      }
    },
  });

  let desiredQuantity: number = 1; // Local quantity for input

  function addToCart() {
    if (!product) return;
    if (desiredQuantity < 1) {
      toast.error('Quantity must be at least 1');
      desiredQuantity = 1;
      return;
    }
    $addToCartMutation.mutate(desiredQuantity);
  }

  function incrementQuantity() {
    desiredQuantity += 1; // Update locally
  }

  function decrementQuantity() {
    desiredQuantity = Math.max(1, desiredQuantity - 1); // Update locally, minimum 1
  }

  $: product = $productQuery.data;
  $: productLoading = $productQuery.isLoading || $productQuery.isFetching;
  $: productError = $productQuery.error ? ($productQuery.error as Error).message : null;

  $: sameBrandProducts = $sameBrandProductsQuery.data ?? [];
  $: sameBrandProductsLoading = $sameBrandProductsQuery.isLoading;
  $: sameBrandProductsError = $sameBrandProductsQuery.error ? ($sameBrandProductsQuery.error as Error).message : null;
  $: hasSameBrandProducts = sameBrandProducts.length > 0;

  let selectedOptions: { [key: string]: string } = {};

  $: if (product?.options) {
    product.options.forEach((option: { title: string | number; values: string[] }) => {
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
        {#if isInitialLoad || productLoading || !product}
          <Skeleton class="h-5 w-32 inline-block" />
        {:else}
          <Breadcrumb.Link href={`/Products/${productId}`} class='text-[#01A0E2] text-base'>
            {product?.name}
          </Breadcrumb.Link>
        {/if}
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</section>

<div class="min-h-screen bg-white p-6">
  {#if isInitialLoad || productLoading}
    <div class="flex gap-6">
      <div class="flex-1">
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
      </div>
      <div class="hidden xl:flex flex-col gap-4">
        <Skeleton class="h-40 w-80" />
        <Skeleton class="h-40 w-80" />
      </div>
    </div>
  {:else if productError}
    <div class="text-red-500">Error loading product: {productError}</div>
  {:else if product}
    <div class="flex gap-6">
      <div class="flex-1">
        <div class="flex md:flex-row flex-col md:gap-12 gap-3">
          <div class="block md:hidden">
            {#if product.discount > 0 && selectedPricingOption === 'discount'}
              <div class="bg-[#FA8232] w-fit text-white mb-5 text-sm font-bizGothic font-semibold rounded-full px-4 py-2 z-10">
                {product.discount}% OFF
              </div>
            {/if}

            <div class="flex gap-2 text-sm text-[#4F585E] mb-2">
              <span class="text-sm text-[#4F585E]">
                <span class="text-[#147097]">BRAND:</span> {product.brand}
              </span>
              {#each product.options || [] as option}
                <span class="text-sm text-[#4F585E]">
                  <span class="text-[#147097]">{option.title.toUpperCase()}</span>: {selectedOptions[option.title]?.toUpperCase()}
                </span>
              {/each}
            </div>

            <h1 class="text-xl font-bold text-[#30363C]">{product.name}</h1>
          </div>

          <div class="flex md:flex-row flex-col gap-5">
            <div class="bg-[#F3F9FB] !max-h-[450px] !md:min-w-96 rounded-xl flex justify-center item-center shadow p-10 relative">
              <img
                src={imgUrl + product.images[selectedImageIndex]}
                alt={product.name}
                class="lg:h-96 h-52 w-96 object-contain"
              />
            </div>
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

          <div class="flex-1 flex flex-col">
            <div class="hidden md:block">
              {#if product.discount > 0 && selectedPricingOption === 'discount'}
                <div class="bg-[#FA8232] w-fit text-white mb-5 text-sm font-bizGothic font-semibold rounded-full px-4 py-2 z-10">
                  {product.discount}% OFF
                </div>
              {/if}

              <div class="flex xl:gap-4 gap-2 text-sm text-[#4F585E] mb-2">
                <span class="text-base text-[#4F585E]">
                  <span class="text-[#147097]">BRAND:</span> {product.brand}
                </span>
                {#each product.options || [] as option}
                  <span class="text-base text-[#4F585E]">
                    <span class="text-[#147097]">{option.title.toUpperCase()}</span>: {selectedOptions[option.title]?.toUpperCase()}
                  </span>
                {/each}
              </div>

              <h1 class="text-3xl font-bold text-[#30363C]">{product.name}</h1>
              <p class="py-2 text-slate-500">{product.description}</p>
            </div>

            <div class="lg:flex justify-between hidden flex-wrap mt-4 pr-20">
            
              <div class="mt-4 self-end">
                <div class="flex items-center gap-2">
                  <button
                    on:click={decrementQuantity}
                    class="w-10 h-10 text-2xl flex items-center justify-center text-[#01A0E2] border border-[#0EA5E9] rounded-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    bind:value={desiredQuantity}
                    min="1"
                    class="w-16 h-10 text-center border border-[#0EA5E9] rounded-lg text-lg"
                  />
                  <button
                    on:click={incrementQuantity}
                    class="w-10 h-10 text-2xl flex items-center justify-center text-[#01A0E2] border border-[#0EA5E9] rounded-lg"
                  >
                    +
                  </button>
                </div>
                <button
                  class="bg-[#01A0E2] text-xl text-white px-6 py-3 rounded-lg hover:scale-105 transition-all mt-2 w-full"
                  on:click={addToCart}
                  disabled={$addToCartMutation.isPending}
                >
                  {#if $addToCartMutation.isPending}
                    Adding...
                  {:else}
                    Add to Cart
                  {/if}
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

            <div class="flex justify-between lg:hidden flex-wrap">
             
              <div class="mt-4 self-end">
                <div class="flex items-center gap-2">
                  <button
                    on:click={decrementQuantity}
                    class="w-10 h-10 text-2xl flex items-center justify-center text-[#01A0E2] border border-[#0EA5E9] rounded-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    bind:value={desiredQuantity}
                    min="1"
                    class="w-16 h-10 text-center border border-[#0EA5E9] rounded-lg text-lg"
                  />
                  <button
                    on:click={incrementQuantity}
                    class="w-10 h-10 text-2xl flex items-center justify-center text-[#01A0E2] border border-[#0EA5E9] rounded-lg"
                  >
                    +
                  </button>
                </div>
                <button
                  class="bg-[#01A0E2] text-xl text-white px-6 py-3 rounded-lg hover:scale-105 transition-all mt-2 w-full"
                  on:click={addToCart}
                  disabled={$addToCartMutation.isPending}
                >
                  {#if $addToCartMutation.isPending}
                    Adding...
                  {:else}
                    Add to Cart
                  {/if}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="md:flex flex-col gap-4 mt-4 xl:hidden hidden">
          <div class="max-w-lg bg-white p-6 rounded-lg shadow-md border h-fit">
            <h2 class="text-lg font-bold text-[#30363C] mb-4">Please add item(s) to proceed</h2>
            <button
              on:click={() => { if (cartCount > 0) { goto('/cart') } }}
              class={`w-full ${cartCount > 0 ? 'bg-[#01A0E2] cursor-pointer' : 'bg-gray-400 cursor-not-allowed'} text-white py-3 rounded-lg`}
            >
              Go to cart ({cartCount})
            </button>
          </div>
        </div>

        <div class="mt-8 bg-white">
          {#if product}
            <div class="bg-[#F5F5F5] rounded-lg lg:mr-20">
              <h2 class="text-xl font-bold text-[#4B5563] border rounded-lg border-[#0EA5E9] bg-[#F3FBFF] px-16 py-4 inline-block">
                Specifications
              </h2>
            </div>
          {/if}
          <div class="p-6">
            <div class="space-y-2">
              <div class="space-y-2">
                <div class="flex">
                  <span class="text-[#4F585E] w-40">Brand</span>
                  <span class="text-[#4F585E] mx-2">:</span>
                  <span class="text-[#30363C]">{product.brand}</span>
                </div>
              </div>

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
          </div>
        </div>
      </div>

      <div class="xl:flex flex-col gap-4 hidden">
        <div class="min-w-80 bg-white p-6 rounded-lg shadow-md border h-fit">
          <h2 class="text-lg font-bold text-[#30363C] mb-4">Please add item(s) to proceed</h2>
          <button
            on:click={() => { if (cartCount > 0) { goto('/cart') } }}
            class={`w-full ${cartCount > 0 ? 'bg-[#01A0E2] cursor-pointer' : 'bg-gray-400 cursor-not-allowed'} text-white py-3 rounded-lg`}
          >
            Go to cart ({cartCount})
          </button>
        </div>
      </div>
    </div>

    {#if hasSameBrandProducts && selectedPricingOption !== 'flatOffer'}
      <div class="mt-8 overflow-x-auto pb-2 pl-2">
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
    {#if selectedPricingOption === 'flatOffer'}
      <div class="mt-8 overflow-x-auto">
        <h2 class="text-xl font-bold text-[#30363C] mb-4">More from Flat Offer</h2>
        {#if $flatProductQuery?.isLoading}
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
        {:else if $flatProductQuery.error}
          <p class="text-red-500">Error loading products: {$flatProductQuery.error}</p>
        {:else}
          <div class="flex flex-wrap gap-10">
            {#each $flatProductQuery?.data?.data as product (product.id)}
              <ProductCard
                id={product._id}
                image={product.images[0]}
                name={product.productName}
                MRP={product.price}
                favorite={product.favorite}
                strikePrice={product.strikePrice}
              />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<Footer />