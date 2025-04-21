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

let offerType: string | null=null;

  onMount(() => {
    isInitialLoad = false;
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
  let neededProductName = '';
  let selectedComplementaryProducts: Product[] = [];
  let totalComplementaryValue = 0;
  let complementaryError = '';

  $: if (product) {
    if (product.flat > 0 && !hasFetchedFlatProducts) {
    selectedPricingOption = 'flatOffer';
    $flatProductQuery.mutate(),
  hasFetchedFlatProducts = true; 
  }
  if(offerType==='negotiation'){
    selectedPricingOption='negotiation'
  }
  else if(offerType==='discount'){
    selectedPricingOption='discount'
  }
  else if(offerType==='onMRP'){
    selectedPricingOption='onMRP'
  }
    negotiation.currentPrice = product.MRP;
    negotiation.negotiateLimit = product.negotiateLimit || 0;
    // Reset complementary selections when product changes
    if (previousProductId !== productId) {
      selectedComplementaryProducts = [];
      totalComplementaryValue = 0;
      complementaryError = '';
      hasFetchedFlatProducts = false; 
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
  const cartQuery = createQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
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
              user: '',
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
  $: cartCount = $writableGlobalStore.isLogedIn ? ($cartCountQuery.data?.count || 0) : 0;
  $: cartData = $writableGlobalStore.isLogedIn ? ($cartQuery?.data?.cart|| 0) : 0;
  let cartQuantity = 0;

$: if ($cartQuery.data?.cart?.products) {
  const foundItem = $cartQuery.data.cart.products.find(
    (item: { productId: { _id: string } }) => item.productId._id === productId
  );
  if (foundItem) {
    cartQuantity = foundItem.quantity;
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
      queryClient.cancelQueries({ queryKey: ['product', previousProductId] });
      previousProductId = productId;
    }
  }
  const complementaryProductQuery = createMutation<Product>({
    mutationFn: async () => {
      const response = await _axios.get(`/products/complementary`, {
        params: { q: product.onMRP }, 
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
        params: { userId: userData?.userId,productId:productId },
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
        flat:product.flat||0,
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
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    keepPreviousData: false
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
  function getSelectedOffer() {
    let selectedOffer = null;
    if (selectedPricingOption === 'discount') {
      selectedOffer = {
        offerType: 'Discount',
        discount: product?.discount,
      };
    } else if (selectedPricingOption === 'onMRP') {
      selectedOffer = {
        offerType: 'onMRP',
        onMRP: {
          subType: selectedMessageOption,
          reductionValue: product?.onMRP,
          ...(selectedMessageOption === 'Need' && { message: neededProductName }),
          ...(selectedMessageOption === 'Complementary' && { productId: product.id }),
        },
      };
    } else if (selectedPricingOption === 'flatOffer') {
      selectedOffer = {
        offerType: 'Flat',
        flatAmount: product.MRP, // Assuming flatAmount is the MRP for simplicity
      };
    } else if (selectedPricingOption === 'negotiation') {
      selectedOffer = {
        offerType: 'Negotiate',
        negotiate: {
          negotiatedPrice: negotiation.negotiatedPrice,
          attempts: negotiation.attempts,
        },
      };
    }
    return selectedOffer;
  }

  const addToCartMutation = createMutation({
    mutationFn: async (quantity: number) => {
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
                options: Object.entries(selectedOptions).map(([key, value]) => ({ title: key, value })),
                selectedOffer: getSelectedOffer(),
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
      // Optimistically update the UI
      cartQuantity = quantity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      queryClient.invalidateQueries(['cartCount']);
    },
    onError: (error: any) => {
      // Revert optimistic update
      const foundItem = $cartQuery.data?.cart?.products.find(
        (item: { productId: { _id: string } }) => item.productId._id === productId
      );
      cartQuantity = foundItem ? foundItem.quantity : 0;

      if (error.message === 'Please log in to add to cart') {
        toast.error(error.message);
        window.location.href = '/login';
      } else {
        toast.error(error.message || 'An error occurred while updating cart');
      }
    },
  });

  function addToCart() {
    if (!product) return;
    $addToCartMutation.mutate(1);
  }

  function incrementQuantity() {
    $addToCartMutation.mutate(cartQuantity + 1);
  }

  function decrementQuantity() {
    $addToCartMutation.mutate(Math.max(0, cartQuantity - 1));
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

  function toggleComplementaryProduct(prod: Product) {
  const index = selectedComplementaryProducts.findIndex(p => p._id === prod._id);
  
  if (index > -1) {
    selectedComplementaryProducts = selectedComplementaryProducts.filter(p => p._id !== prod._id);
    totalComplementaryValue -= prod.MRP || prod.price || 0;
  } else {
    if (totalComplementaryValue + (prod.MRP || prod.price || 0) > product.onMRP) {
      complementaryError = `Cannot add - exceeds your complementary limit of ₹${product.onMRP}`;
      toast.error(complementaryError);
      return;
    }

    selectedComplementaryProducts = [prod]; // Select only one product
    totalComplementaryValue = prod.MRP || prod.price || 0;
  }

  complementaryError = '';
}


  // Function to check if a product is selected
  function isComplementarySelected(prod: Product) {
  return selectedComplementaryProducts.some(p => p._id === prod._id);
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
            {product.name}
          </Breadcrumb.Link>
        {/if}
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</section>

<div class="min-h-screen bg-white p-6">
  {#if isInitialLoad || productLoading}
    <!-- Full page skeleton loader -->
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
    <!-- Main Product Section -->
    <div class="flex gap-6">
      <!-- Product Image and Details -->
      <div class="flex-1">
        <div class="flex md:flex-row flex-col md:gap-12 gap-3">
          <div class="block md:hidden ">
            {#if product.discount > 0 && selectedPricingOption === 'discount'}
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
                class="lg:h-96 h-52 w-96 object-contain"
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
            {#if product.discount > 0 && selectedPricingOption === 'discount'}
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
            <div class="lg:flex justify-between  hidden  flex-wrap mt-4 pr-20">
              <div>
                <p class="md:text-lg text-base text-[#4F585E] mt-2">M.R.P <span class="line-through">₹{product.strikePrice*quantity}</span></p>

                {#if negotiation.negotiatedPrice && selectedPricingOption ==='negotiation'}
                <p class="text-[#111827] "><span class="line-through font-bold md:text-2xl text-lg">₹{product.MRP} </span> <span class="font-bold md:text-2xl text-lg px-4"> ₹{negotiation.negotiatedPrice*quantity} <span class="text-[#C49814] text-sm font-medium px-4">Negotiation Price</span> </span></p>

              {:else}
              <div class="flex gap-2">
                <p class={`text-[#111827] font-bold md:text-2xl text-lg ${selectedPricingOption==='discount'? 'line-through':''}`}>₹{product.MRP*quantity}</p>
                {#if selectedPricingOption === 'discount'}
                <p class="text-[#111827] font-bold md:text-2xl text-lg">
                  ₹{(product?.MRP * quantity * (1 - product?.discount / 100)).toFixed(2)} <span class="text-sm font-medium text-[#C49814]">(Discount Price)</span>
                </p>
              {/if}
            </div>
              <!-- {#if selectedPricingOption === 'discount'}
                <p class=" text-green-600">Save - ₹{(product.strikePrice - (product?.MRP * quantity * (1 - product?.discount / 100)))*quantity.toFixed(2)}</p>
               {:else}
                <p class=" text-green-600">Save - ₹{(product.strikePrice - product.MRP)*quantity}</p>
                {/if} -->
              {/if}

              </div>
              <div class="mt-4 self-end">
                {#if cartQuantity > 0}
      <div class="flex items-center rounded-lg gap-2 bg-[#F3FBFF] border-[#0EA5E9] border">
        <button
          on:click={decrementQuantity}
          class="w-14 h-10 text-3xl flex items-center justify-center text-[#01A0E2]"
          disabled={$addToCartMutation.isPending}
        >
          -
        </button>
        <span class="text-lg">{cartQuantity}</span>
        <button
          on:click={incrementQuantity}
          class="w-14 h-10 text-2xl flex items-center justify-center text-[#01A0E2]"
          disabled={$addToCartMutation.isPending}
        >
          +
        </button>
      </div>
    {:else}
      <button
        class="bg-[#01A0E2] text-xl text-white px-6 py-3 rounded-lg hover:scale-105 transition-all"
        on:click={addToCart}
        disabled={$addToCartMutation.isPending}
      >
        {#if $addToCartMutation.isPending}
          Adding...
        {:else}
          Add to cart
        {/if}
      </button>
    {/if}
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

            <!-- Negotiation Section for mobile -->
            <div class="md:hidden block mt-5">
              <div class={`negotiation-section bg-white lg:p-6 p-2 max-w-lg flex gap-5 rounded-lg shadow-md border border-gray-200 ${product?.negotiate?'block':'hidden'}`}>
                <!-- Negotiation Option -->
        {#if product?.negotiate}
        <label class="flex items-center space-x-1">
          <input
            type="radio"
            bind:group={selectedPricingOption}
            value="negotiation"
            class="form-radio h-5 w-5 text-blue-600"
          />
          <span class="text-sm text-gray-700">Negotiation</span>
        </label>
      {/if}

      <!-- On MRP Option -->
      {#if product?.onMRP > 0}
        <label class="flex items-center space-x-1">
          <input
            type="radio"
            bind:group={selectedPricingOption}
            value="onMRP"
            class="form-radio h-5 w-5 text-blue-600"
          />
          <span class="text-sm text-gray-700">On MRP Price</span>
        </label>
      {/if}

      <!-- Discount Option -->
      {#if product?.discount > 0}
        <label class="flex items-center space-x-1">
          <input
            type="radio"
            bind:group={selectedPricingOption}
            value="discount"
            class="form-radio h-5 w-5 text-blue-600"
          />
          <span class="text-sm text-gray-700">Discount</span>
        </label>
      {/if}
        </div>
        <div class={`negotiation-section max-w-lg mt-5 bg-white lg:p-6 p-2 rounded-lg shadow-md border border-gray-200 ${product?.negotiate || product?.onMRP > 0 || product?.discount > 0||product?.flat > 0 ? 'block' : 'hidden'}`}>
          <!-- Radio Buttons for Pricing Options -->
      {#if selectedPricingOption===''}
      <p class="text-sm text-yellow-600 flex items-center">
        <span class="mr-1 text-lg">
          <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
        </span> Please select an offer
      </p>
      {/if}

          <!-- Dynamic UI Based on Selected Option -->
          {#if selectedPricingOption === 'negotiation' && product?.negotiate}
            <div class="mb-4 flex items-center">
              <div class="relative flex-1 mr-2">
                <input
                  type="number"
                  bind:value={proposedPrice}
                  on:input={(event) => {
                    let value = Number(event.currentTarget.value);
                    if (value > product?.MRP) {
                      proposedPrice = product.MRP;
                    } else {
                      proposedPrice = value;
                    }
                  }}
                  class="w-full border border-gray-300 rounded-lg p-2 mt-1 text-left placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Enter your offer amount"
                  min="1"
                  max={product?.MRP || 0}
                  disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
                />
              </div>
            </div>

            <div class="mb-4 space-y-2">
              <p class="text-sm text-yellow-600 flex items-center">
                <span class="mr-1 text-lg">
                  <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
                </span> You can negotiate the product price
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
            {:else if selectedPricingOption === 'onMRP' && product?.onMRP > 0}
            <div class="mb-4">
              <Select.Root type="single" bind:value={selectedMessageOption}>
                <Select.Trigger class="text-black  focus:outline-none  focus:ring-0 text-base">
                  {selectedMessageOption}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="Need" class='text-base'>Need</Select.Item>
                  <Select.Item value="Complementary" class='text-base'>Complementary</Select.Item>
                </Select.Content>
              </Select.Root>
                
      {#if selectedPricingOption==='onMRP'&&selectedMessageOption==='Need'}
      <input type="text"  bind:value={neededProductName} class="h-10 focus:outline-none  focus:ring-0 w-full px-2 rounded-lg my-3 border" placeholder="Enter products name">
      <p class="text-sm text-yellow-600 flex items-center">
        <span class="mr-1 text-lg">
          <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
        </span> Tell us your needed product we will send 

      </p>
      {:else}
      <p class="text-sm my-4 text-yellow-600 flex items-center">
        <span class="mr-1 text-lg">
          <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
        </span> Please select Complementary product <br />
        listed below

      </p>
      {/if}
              <button
                class={`${selectedMessageOption!='Need'?'hidden':''} w-full bg-[#01A0E2] text-white py-3 rounded-lg hover:scale-105 duration-300 transition-all focus:outline-none focus:ring-0 text-lg mt-2`}
                on:click={sendMessage}
              >
                Send Message
              </button>
            </div>
          
          {:else if selectedPricingOption === 'discount' && product?.discount > 0}
            <div class="mb-4">
              <p class="text-base my-4 text-yellow-600 flex items-center">
                <span class="mr-1 text-base">
                  <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
                </span> You can avail <span class="text-lg px-2">{product?.discount}%</span> offer  for this product
        
              </p>
            </div>
            {:else if selectedPricingOption === 'flatOffer' && product?.flat > 0}
            <div class="mb-1 my-1 flex items-center gap-2 rounded-md  p-1 text-yellow-700">
              <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600 shrink-0" />
              <p class="text-base flex lg:flex-wrap items-center gap-1">
            Please add one more product to avail
                {product?.flat}%
                offer for this product.
              </p>
            </div>
          {/if}
        </div>
            </div>

            <!-- <div class="mt-4">
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
            </div> -->
            <div class="flex justify-between  lg:hidden  flex-wrap">
              <div>
                <p class="md:text-lg text-base text-[#4F585E] mt-2">M.R.P <span class="line-through">₹{product.strikePrice}</span></p>

                {#if negotiation.negotiatedPrice && selectedPricingOption ==='negotiation'}
                <p class="text-[#111827] "><span class="line-through font-bold md:text-2xl text-lg">₹{product.MRP} </span> <span class="font-bold md:text-2xl text-lg px-4"> ₹{negotiation.negotiatedPrice*quantity} <span class="text-[#C49814] text-sm font-medium px-4">Negotiation Price</span> </span></p>

              {:else}
                <p class={`text-[#111827] font-bold md:text-2xl text-lg ${selectedPricingOption==='discount'? 'line-through':''}`}>₹{product.MRP*quantity}</p>
                {#if selectedPricingOption === 'discount'}
                <p class="text-[#111827] font-bold md:text-2xl text-lg">
                  ₹{(product?.MRP * quantity * (1 - product?.discount / 100)).toFixed(2)}
                </p>
              {/if}
              {#if selectedPricingOption === 'discount'}
                <p class=" ">Save - ₹{(product.strikePrice - (product?.MRP * quantity * (1 - product?.discount / 100)))*quantity.toFixed(2)}</p>
               {:else}
                <p class=" ">Save - ₹{(product.strikePrice - product.MRP)*quantity}</p>
                {/if}
              {/if}

              </div>
              <div class="mt-4 self-end">
                {#if cartQuantity > 0}
                <div class="flex items-center rounded-lg gap-2 bg-[#F3FBFF] border-[#0EA5E9] border">
                  <button
                    on:click={decrementQuantity}
                    class="w-14 h-10 text-3xl flex items-center justify-center text-[#01A0E2]"
                    disabled={$addToCartMutation.isPending}
                  >
                    -
                  </button>
                  <span class="text-lg">{cartQuantity}</span>
                  <button
                    on:click={incrementQuantity}
                    class="w-14 h-10 text-2xl flex items-center justify-center text-[#01A0E2]"
                    disabled={$addToCartMutation.isPending}
                  >
                    +
                  </button>
                </div>
              {:else}
                <button
                  class="bg-[#01A0E2] text-xl text-white px-6 py-3 rounded-lg hover:scale-105 transition-all"
                  on:click={addToCart}
                  disabled={$addToCartMutation.isPending}
                >
                  {#if $addToCartMutation.isPending}
                    Adding...
                  {:else}
                    Add to cart
                  {/if}
                </button>
              {/if}
              </div>
            </div>
          </div>
        </div>

        <!-- Side sections for tablet -->
        <div class="md:flex flex-col gap-4 mt-4 xl:hidden hidden">
          <div class="max-w-lg bg-white p-6 rounded-lg  shadow-md border h-fit">
            <h2 class="text-lg font-bold text-[#30363C] mb-4">Please add item(s) to proceed</h2>
            <button on:click={()=>{if(cartCount>0){goto('/cart')}}} class={`w-full ${cartCount>0?'bg-[#01A0E2] cursor-pointer':'bg-gray-400 cursor-not-allowed'}  text-white py-3 rounded-lg `}>
              Go to cart ({cartCount})
            </button>
          </div>
    
          <!-- Negotiation Section -->
          <div class={`negotiation-section bg-white lg:p-6 p-2 max-w-lg flex gap-5 rounded-lg shadow-md border border-gray-200 ${product?.negotiate?'block':'hidden'}`}>
                  <!-- Negotiation Option -->
          {#if product?.negotiate}
          <label class="flex items-center space-x-1">
            <input
              type="radio"
              bind:group={selectedPricingOption}
              value="negotiation"
              class="form-radio h-5 w-5 text-blue-600"
            />
            <span class="text-sm text-gray-700">Negotiation</span>
          </label>
        {/if}

        <!-- On MRP Option -->
        {#if product?.onMRP > 0}
          <label class="flex items-center space-x-1">
            <input
              type="radio"
              bind:group={selectedPricingOption}
              value="onMRP"
              class="form-radio h-5 w-5 text-blue-600"
            />
            <span class="text-sm text-gray-700">On MRP Price</span>
          </label>
        {/if}

        <!-- Discount Option -->
        {#if product?.discount > 0}
          <label class="flex items-center space-x-1">
            <input
              type="radio"
              bind:group={selectedPricingOption}
              value="discount"
              class="form-radio h-5 w-5 text-blue-600"
            />
            <span class="text-sm text-gray-700">Discount</span>
          </label>
        {/if}
          </div>
          <div class={`negotiation-section max-w-lg bg-white p-6 rounded-lg shadow-md border border-gray-200 ${product?.negotiate || product?.onMRP > 0 || product?.discount > 0 ? 'block' : 'hidden'}`}>
            <!-- Radio Buttons for Pricing Options -->
        {#if selectedPricingOption===''}
        <p class="text-sm text-yellow-600 flex items-center">
          <span class="mr-1 text-lg">
            <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
          </span> Please select an offer
        </p>
        {/if}
  
            <!-- Dynamic UI Based on Selected Option -->
            {#if selectedPricingOption === 'negotiation' && product?.negotiate}
              <div class="mb-4 flex items-center">
                <div class="relative flex-1 mr-2">
                  <input
                    type="number"
                    bind:value={proposedPrice}
                    on:input={(event) => {
                      let value = Number(event.currentTarget.value);
                      if (value > product?.MRP) {
                        proposedPrice = product.MRP;
                      } else {
                        proposedPrice = value;
                      }
                    }}
                    class="w-full border border-gray-300 rounded-lg p-2 mt-1 text-left placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="Enter your offer amount"
                    min="1"
                    max={product?.MRP || 0}
                    disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
                  />
                </div>
              </div>
  
              <div class="mb-4 space-y-2">
                <p class="text-sm text-yellow-600 flex items-center">
                  <span class="mr-1 text-lg">
                    <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
                  </span> You can negotiate the product price
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
              {:else if selectedPricingOption === 'onMRP' && product?.onMRP > 0}
              <div class="mb-4">
                <Select.Root type="single" bind:value={selectedMessageOption}>
                  <Select.Trigger class="text-black  focus:outline-none  focus:ring-0 text-base">
                    {selectedMessageOption}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="Need" class='text-base'>Need</Select.Item>
                    <Select.Item value="Complementary" class='text-base'>Complementary</Select.Item>
                  </Select.Content>
                </Select.Root>
                  
        {#if selectedPricingOption==='onMRP'&&selectedMessageOption==='Need'}
        <input type="text"  bind:value={neededProductName} class="h-10 focus:outline-none  focus:ring-0 w-full px-2 rounded-lg my-3 border" placeholder="Enter products name">
        <p class="text-sm text-yellow-600 flex items-center">
          <span class="mr-1 text-lg">
            <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
          </span> Tell us your needed product we will send 

        </p>
        {:else}
        <p class="text-sm my-4 text-yellow-600 flex items-center">
          <span class="mr-1 text-lg">
            <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
          </span> Please select Complementary product <br />
          listed below

        </p>
        {/if}
                <button
                  class={`${selectedMessageOption!='Need'?'hidden':''} w-full bg-[#01A0E2] text-white py-3 rounded-lg hover:scale-105 duration-300 transition-all focus:outline-none focus:ring-0 text-lg mt-2`}
                  on:click={sendMessage}
                >
                  Send Message
                </button>
              </div>
            
            {:else if selectedPricingOption === 'discount' && product?.discount > 0}
              <div class="mb-4">
                <p class="text-base my-4 text-yellow-600 flex items-center">
                  <span class="mr-1 text-base">
                    <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
                  </span> You can avail <span class="text-lg px-2">{product?.discount}%</span> offer  for this product
        
              </p>
            </div>
          {/if}
        </div>
          
        </div>

        <!-- Complementary product if available -->
        {#if selectedPricingOption==='onMRP' && selectedMessageOption==='Complementary'}
        <div class="my-10 bg-[#F3FBFF] rounded-lg">
          <div class="p-8">
            <p class="font-bold text-2xl text-[#30363C]">Complementary Products up to ₹{product?.onMRP} value</p>
            <p class="text-[#4B5563] text-base py-2">Choose an additional item with your purchase</p>
        
            {#if $complementaryProductQuery.isLoading}
              <div class="flex justify-center items-center py-8">
                <div>Loading complementary products...</div>
              </div>
            {:else if $complementaryProductQuery.isError}
              <div class="text-red-500 text-center py-8">
                Error loading complementary products
              </div>
            {:else if $complementaryProductQuery?.data?.data&& $complementaryProductQuery?.data.total>0}
              <div class="flex gap-4 overflow-x-auto px-2 py-4">
                {#each $complementaryProductQuery?.data?.data as prod}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <div
                    class={`relative bg-white rounded-xl shadow-md overflow-hidden w-44 md:w-64 transition-all duration-200 cursor-pointer 
                           ${isComplementarySelected(prod) ? 'ring-1 ring-[#01A0E2]' : ''}`}
                    role="button"
                    tabindex="0"
                    on:click={() => toggleComplementaryProduct(prod)}
                  >
                    <!-- Product Image -->
                    <div class="relative  bg-gray-100 flex justify-center items-center">
                      {#if prod.images && prod.images[0]}
                        <img
                          class="object-contain w-full h-full p-4"
                          src={imgUrl + prod.images[0]}
                          alt={prod.productName}
                        />
                      {:else}
                        <div class="text-gray-400">No image available</div>
                      {/if}
                      
                      {#if isComplementarySelected(prod)}
                        <div class="absolute top-2 right-2 bg-[#01A0E2] text-white rounded-full p-1">
                          <Icon icon="mdi:check" class="text-lg" />
                        </div>
                      {/if}
                    </div>
                    
                    <!-- Product Details -->
                    <div class="p-3">
                      <h3 class="font-medium text-sm md:text-base text-[#222222] overflow-hidden text-ellipsis whitespace-nowrap">
                        {prod.productName}
                      </h3>
                      
                      <div class="flex items-center gap-2 py-2">
                        <span class="text-[#222222] text-sm md:text-base">₹0</span>
                        <span class="text-gray-500 text-sm md:text-base line-through">₹{prod.price}</span>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            
            {:else}
              <div class="text-center py-8 text-gray-500">
                No complementary products available right now! 
              </div>
            {/if}
          </div>
        </div>
        {/if}
        <!-- Specifications -->
        <div class="mt-8 bg-white ">
          {#if product}
          <div class="bg-[#F5F5F5] rounded-lg lg:mr-20">
            <h2 class="text-xl font-bold text-[#4B5563] border rounded-lg border-[#0EA5E9] bg-[#F3FBFF] px-16 py-4 inline-block">
              Specifications
            </h2>
          </div>
          {/if}
          <div class="p-6">
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
          </div>
        </div>
      </div>

      <!-- Cart Summary -->
      <div class="xl:flex   flex-col gap-4 hidden">
        <div class="min-w-80  bg-white p-6 rounded-lg shadow-md border h-fit">
          <h2 class="text-lg font-bold text-[#30363C] mb-4">Please add item(s) to proceed</h2>
          <button on:click={()=>{if(cartCount>0){goto('/cart')}}} class={`w-full ${cartCount>0?'bg-[#01A0E2] cursor-pointer':'bg-gray-400 cursor-not-allowed'}  text-white py-3 rounded-lg `}>
            Go to cart ( {cartCount} )
          </button>
        </div>
    

        <!-- Negotiation Section -->
        <div class="my-4 space-x-3 flex">
          <!-- Negotiation Option -->
          {#if product?.flat > 0}
   
          <label class="flex items-center space-x-1">
            <input
              type="radio"
              bind:group={selectedPricingOption}
              value="flatOffer"
              on:click={()=>{$flatProductQuery.mutate()}}
              class="form-radio h-5 w-5 text-blue-600"
            />
            <span class="text-sm text-gray-700">Flat Discount</span>
          </label>

          {/if}
          {#if product?.negotiate}
            <label class="flex items-center space-x-1">
              <input
                type="radio"
                bind:group={selectedPricingOption}
                value="negotiation"
                class="form-radio h-5 w-5 text-blue-600"
              />
              <span class="text-sm text-gray-700">Negotiation</span>
            </label>
          {/if}

          <!-- On MRP Option -->
          {#if product?.onMRP > 0}
            <label class="flex items-center space-x-1">
              <input
                type="radio"
                on:change={()=>{$complementaryProductQuery.mutate()}}
                bind:group={selectedPricingOption}
                value="onMRP"
                class="form-radio h-5 w-5 text-blue-600"
              />
              <span class="text-sm text-gray-700">On MRP Price</span>
            </label>
          {/if}

          <!-- Discount Option -->
          {#if product?.discount > 0}
            <label class="flex items-center space-x-1">
              <input
                type="radio"
                bind:group={selectedPricingOption}
                value="discount"
                class="form-radio h-5 w-5 text-blue-600"
              />
              <span class="text-sm text-gray-700">Discount</span>
            </label>
          {/if}
        </div>
        <div class={`negotiation-section min-w-80 max-w-80 bg-white p-6 rounded-lg shadow-md border border-gray-200 ${product?.negotiate || product?.onMRP > 0 || product?.discount > 0 || product?.flat>0 ? 'block' : 'hidden'}`}>
          <!-- Radio Buttons for Pricing Options -->
      {#if selectedPricingOption===''}
      <p class="text-sm text-yellow-600 flex items-center">
        <span class="mr-1 text-lg">
          <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
        </span> Please select an offer
      </p>
      {/if}

          <!-- Dynamic UI Based on Selected Option -->
          {#if selectedPricingOption === 'negotiation' && product?.negotiate}
            <div class="mb-4 flex items-center">
              <div class="relative flex-1 mr-2">
                <input
                  type="number"
                  bind:value={proposedPrice}
                  on:input={(event) => {
                    let value = Number(event.currentTarget.value);
                    if (value > product?.MRP) {
                      proposedPrice = product.MRP;
                    } else {
                      proposedPrice = value;
                    }
                  }}
                  class="w-full border border-gray-300 rounded-lg p-2 mt-1 text-left placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Enter your offer amount"
                  min="1"
                  max={product?.MRP || 0}
                  disabled={negotiation.attemptNumber >= negotiation.maxAttempts}
                />
              </div>
            </div>

            <div class="mb-4 space-y-2">
              <p class="text-sm text-yellow-600 flex items-center">
                <span class="mr-1 text-lg">
                  <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
                </span> You can negotiate the product price
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


          
            {:else if selectedPricingOption === 'onMRP' && product?.onMRP > 0}
            <div class="mb-4">
              <Select.Root type="single" bind:value={selectedMessageOption}>
                <Select.Trigger class="text-black  focus:outline-none  focus:ring-0 text-base">
                  {selectedMessageOption}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="Need" class='text-base'>Need</Select.Item>
                  <Select.Item value="Complementary" class='text-base'>Complementary</Select.Item>
                </Select.Content>
              </Select.Root>
                
      {#if selectedPricingOption==='onMRP'&&selectedMessageOption==='Need'}
      <input type="text"  bind:value={neededProductName} class="h-10 focus:outline-none  focus:ring-0 w-full px-2 rounded-lg my-3 border" placeholder="Enter products name">
      <p class="text-sm text-yellow-600 flex items-center">
        <span class="mr-1 text-lg">
          <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
        </span> Tell us your needed product we will send 

      </p>
      {:else}
      <p class="text-sm my-4 text-yellow-600 flex items-center">
        <span class="mr-1 text-lg">
          <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
        </span> Please select Complementary product <br />
        listed below

      </p>
      {/if}
              <button
                class={`${selectedMessageOption!='Need'?'hidden':''} w-full bg-[#01A0E2] text-white py-3 rounded-lg hover:scale-105 duration-300 transition-all focus:outline-none focus:ring-0 text-lg mt-2`}
                on:click={sendMessage}
              >
                Send Message
              </button>
            </div>
          
          {:else if selectedPricingOption === 'discount' && product?.discount > 0}

            <div class="mb-4 flex items-start my-4">
              <span class="mr-1 mt-0.5 text-base">
                <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600" />
              </span>
              <p class="text-base  flex flex-wrap text-yellow-600 items-center">
               
               <span>
                You can avail <span class="text-lg px-2">{product?.discount}%</span> offer  for this product
               </span>  
        
              </p>
            </div>
         
            {:else if selectedPricingOption === 'flatOffer' && product?.flat > 0}
            <div class="mb-4 my-4 flex items-center gap-2 rounded-md  p-3 text-yellow-700">
              <Icon icon="tabler:info-circle-filled" class="text-xl text-yellow-600 shrink-0" />
              <p class="text-base flex lg:flex-wrap items-center gap-1">
            Please add one more product to avail
                {product?.flat}%
                offer for this product.
              </p>
            </div>
            
            
         
          {/if}
          


          
        </div>
      </div>
    </div>

    <!-- Products from Same Brand - Only show if products available -->
    {#if hasSameBrandProducts&&selectedPricingOption!='flatOffer'}
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
    {#if selectedPricingOption==='flatOffer'}
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