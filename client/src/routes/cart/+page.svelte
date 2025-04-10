<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb";
  import { createQuery, createMutation } from '@tanstack/svelte-query';
  import { _axios } from '$lib/_axios';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import Icon from '@iconify/svelte';
  import { imgUrl } from "$lib/config";
  import { toast } from 'svelte-sonner'; // Optional: for error/success feedback
  import { queryClient } from "$lib/query-client";
	import { goto } from "$app/navigation";
	import { writableGlobalStore } from "$lib/stores/global-store";
	import Footer from "$lib/components/footer.svelte";

  // Define interfaces based on actual backend response
  interface ProductDetails {
	strikePrice: any;
    _id: string;
    productName: string;
    price: number;
    images: string[];
    gst: number;
    discount: number;
    onMRP: number;
  }

  interface CartItem {
    productId: ProductDetails;
    quantity: number;
    totalAmount: number;
    price: number;
    customSuggestion: string;
    _id: string;
  }

  interface CartResponse {
    message: string;
    status: boolean;
    cart: {
      _id: string;
      user: string;
      products: CartItem[];
      subtotal: number;
      tax: number;
      totalPrice: number;
      totalDistance: number;
      deliveryFee: number;
      platformFee: number;
      deliverySeconds: number;
      status: string;
      lastUpdated: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
    };
    totalDistance: number;
    deliveryFee: number;
    platformFee: number;
    coupons: any[];
    deliverySeconds: number;
    deliveryMinutes: number;
  }

  // Interface for Address (assuming it matches your backend Address model)
  interface Address {
    _id: string;
    receiverName: string;
    receiverMobile: string;
    flatorHouseno: string;
    area: string;
    landmark: string;
    addressString: string;
    latitude: string;
    longitude: string;
    active: boolean;
    addressType: string;
    userId: string;
    isPrimary:boolean;
  }

  $: isLoggedIn = $writableGlobalStore.isLogedIn;

  const placeOrderMutation = createMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      // Get the first address (or you might want to make address selection required)
      const addressId =primaryAddress?._id;
      if (!addressId) {
        throw new Error('Please select a delivery address');
      }

      const response = await _axios.post(
        '/orders/order',
        { addressId }, // Include other needed fields like couponId if available
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to place order');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate cart queries to refresh the cart
      //@ts-ignore
      queryClient.invalidateQueries(['cart']);
      //@ts-ignore
      queryClient.invalidateQueries(['cartCount']);
      
      toast.success('Order placed successfully!');
      
      // Redirect to order confirmation page
      goto(`/order-confirmation/${data.order._id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to place order');
    },
  });

  // Fetch cart data
  const cartQuery = createQuery<CartResponse>({
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

  // Fetch user addresses
  const addressesQuery = createQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      try {
        const response = await _axios.get('/address/all', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to fetch addresses');
        }
        return response.data.addresses || [];
      } catch (error) {
        throw error instanceof Error ? error : new Error('An unexpected error occurred');
      }
    },
    retry: 1,
    staleTime: 0,
    enabled: true,
  });

  // Update quantity mutation
  const updateQuantityMutation = createMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      const response = await _axios.post(
        '/cart/updatequantity',
        { productId, quantity },
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to update quantity');
      }
      return response.data;
    },
    onSuccess: () => {
      $cartQuery.refetch(); // Refetch cart data after successful update
      toast.success('Quantity updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update quantity');
    },
  });

  // Remove product mutation
  const removeProductMutation = createMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      const response = await _axios.delete(`/cart/remove-product/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to remove product');
      }
      return response.data;
    },
    onSuccess: () => {
      //@ts-ignore
      queryClient.invalidateQueries(['cartCount']);
      $cartQuery.refetch(); // Refetch cart data after successful removal
      toast.success('Product removed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove product');
    },
  });
  function handlePayNow() {
    if (!primaryAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    $placeOrderMutation.mutate();
  }
  // Access cart data
  $: cartData = $cartQuery.data;
  $: cartItems = cartData?.cart?.products || [];
  $: isLoading = $cartQuery.isLoading;
  $: error = $cartQuery.error ? ($cartQuery.error as Error).message : null;
  // Access first address
  $: primaryAddress = $addressesQuery.data?.find((address) => address.isPrimary) || null;
  // Function to update quantity
  function updateQuantity(productId: string, change: number) {
    const item = cartItems.find((item) => item.productId._id === productId);

    if (item) {
      const newQuantity = Math.max(1, item.quantity + change);
      item.quantity = newQuantity; // Update local state immediately
      item.totalAmount = item.price * newQuantity; // Update total amount based on new quantity
      $updateQuantityMutation.mutate({ productId, quantity: newQuantity }); // Trigger API call in the background
    }
  }

  // Function to remove product
  function removeProduct(productId: string) {
    cartItems = cartItems.filter((item) => item.productId._id !== productId); // Update local state immediately
    $removeProductMutation.mutate(productId); // Trigger API call in the background
  }

  // Calculate totals for the bill summary
  $: totalAmount = cartData?.cart?.subtotal || 0;
  $: totalDiscount = cartItems.reduce((sum, item) => sum + (item.productId.discount || 0) * item.quantity, 0);
  $: deliveryFee = cartData?.deliveryFee || 0;
  $: platformFee = cartData?.platformFee || 0;
  $: tax = cartData?.cart?.tax || 0;
  $: totalPrice = cartData?.cart?.totalPrice || 0;
  async function handleAddressClick() {
    await goto('/address-management', {
      state: { editAddressId: primaryAddress?._id }
    });
  }
</script>

<section class="bg-[#F2F4F5] py-4 px-4 md:px-6 lg:px-8 mb-10">
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/" class="text-[#4F585E] hover:text-[#01A0E2] text-base">Home</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/cart" class="text-[#01A0E2] text-base">Cart</Breadcrumb.Link>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</section>
{#if isLoggedIn}
<div class=" !flex !justify-center  !items-center">
  <div class="flex lg:flex-row flex-col  lg:w-full md:w-[65%]  justify-between lg:px-20 px-4 md:px-6 gap-5">
    <div class="border bg-white  max-w-2xl  lg:hidden flex justify-between rounded-lg shadow-lg p-3">
      <div>
        <h3 class="text-base text-[#4F585E] font-medium mb-3">Deliver To</h3>
        {#if $addressesQuery.isLoading}
          <Skeleton class="h-6 w-3/4" />
        {:else if $addressesQuery.error}
          <p class="text-red-500 text-sm">Error fetching address: {$addressesQuery.error.message}</p>
        {:else if !primaryAddress}
          <p class="text-gray-500 text-sm">No address available</p>
        {:else}
          <p class="text-lg text-[#30363C] font-semibold mb-2">{primaryAddress.flatorHouseno}, {primaryAddress.area}, {primaryAddress.landmark}</p>
          <p class="text-base text-[#4F585E] mb-1.25">☎ {primaryAddress.receiverMobile} - {primaryAddress.receiverName}</p>
        {/if}
      </div>
      <button 
        on:click={handleAddressClick}
        class="h-fit bg-[#01A0E2] text-white px-3 py-1.5 rounded-md cursor-pointer lg:text-lg text-base whitespace-nowrap font-medium"
      >
        {primaryAddress ? 'Edit address' : 'Add address'}
      </button>
    </div>
    <div class="cart-items  max-w-2xl  lg:hidden  block bg-white rounded-lg shadow-lg p-2  h-fit border">
      {#if isLoading}
        <div class="space-y-4 py-4">
          {#each Array(1) as _}
            <div class="flex items-center py-3.5 border-b border-gray-300">
              <div style="width: 30%;" class="flex gap-4 items-center">
                <Skeleton class="w-12 h-12" />
                <Skeleton class="h-6 w-3/4" />
              </div>
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 7%;" class="h-6" />
            </div>
          {/each}
        </div>
      {:else if error}
        <p class="text-center py-4 text-red-500">Error: {error}</p>
      {:else if cartItems.length === 0}
        <div class="flex flex-col items-center py-8">
          <Icon icon="mdi:cart-off" class="w-10 h-10 text-[#d8dee3]" />
          <p class="text-center text-lg text-[#b5bbc1] mt-4">Your cart is empty</p>
        </div>
      {:else}
        {#each cartItems as item}
          <div class="cart-item gap-5 grid grid-cols-3 items-center py-3.5 border-b border-gray-300">
            <div class="flex gap-4 col-span-2 items-center">
              <div class="w-20 h-20 rounded-lg mr-3.75 bg-[#F5F5F5] border-[#EDEDED]">
                <img
                  src={imgUrl + item.productId.images[0] || 'placeholder.png'}
                  alt="Product Image"
                  class="p-3  "
                />
              </div>
              <div class="item-details flex-1">
                <p class="text-[#30363C] font-bold text-lg mb-0.5">{item.productId.productName}</p>
                <p><span class="line-through">₹{item.productId.strikePrice}</span>  <span class="text-[#249B3E]"> ₹{item.price}</span></p>
              </div>
            </div>
         
            <div  class="item-total text-center font-semibold text-base text-[#4F585E]">
              ₹{item.totalAmount.toFixed(2)}
              <div  class="quantity flex items-center justify-between border rounded-md bg-[#F3FBFF] border-[#0EA5E9]">
                <button
                  on:click={() => updateQuantity(item.productId._id, -1)}
                  class="w-7.5 h-7.5 pl-2 border-gray-300 cursor-pointer text-base flex items-center justify-center text-[#01A0E2]"
                  disabled={$updateQuantityMutation.isPending}
                >
                  -
                </button>
                <span class="w-7.5 text-center text-sm text-[#4F585E]">{item.quantity}</span>
                <button
                  on:click={() => updateQuantity(item.productId._id, 1)}
                  class="w-7.5 h-7.5 pr-2 border-gray-300 cursor-pointer text-base flex items-center justify-center text-[#01A0E2]"
                  disabled={$updateQuantityMutation.isPending}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
    <!-- Cart Items Section -->
    <div class="cart-items hidden lg:block bg-white rounded-lg shadow-lg p-2 lg:w-[65%]   h-fit border">
      <div class="cart-header flex items-center justify-between text-sm py-2 text-[#475156] border border-gray-300 bg-[#F2F4F5]">
        <span style="width: 30%; text-align: center;">PRODUCT</span>
        <span style="width: 17%; text-align: center;">PRICE</span>
        <span style="width: 17%; text-align: center;">DISCOUNT</span>
        <span style="width: 17%; text-align: center;">TOTAL</span>
        <span style="width: 17%; text-align: center;">QUANTITY</span>
        <span style="width: 7%; text-align: center;"></span>
      </div>
  
      {#if isLoading}
        <div class="space-y-4 py-4">
          {#each Array(1) as _}
            <div class="flex items-center py-3.5 border-b border-gray-300">
              <div style="width: 30%;" class="flex gap-4 items-center">
                <Skeleton class="w-12 h-12" />
                <Skeleton class="h-6 w-3/4" />
              </div>
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 7%;" class="h-6" />
            </div>
          {/each}
        </div>
      {:else if error}
        <p class="text-center py-4 text-red-500">Error: {error}</p>
      {:else if cartItems.length === 0}
        <div class="flex flex-col items-center py-8">
          <Icon icon="mdi:cart-off" class="w-10 h-10 text-[#d8dee3]" />
          <p class="text-center text-lg text-[#b5bbc1] mt-4">Your cart is empty</p>
        </div>
      {:else}
        {#each cartItems as item}
          <div class="cart-item flex items-center py-3.5 border-b border-gray-300">
            <div style="width: 30%;" class="flex gap-4 items-center">
              <div class="w-20 h-20 rounded-lg mr-3.75 bg-[#F5F5F5] border-[#EDEDED]">
                <img
                  src={imgUrl + item.productId.images[0] || 'placeholder.png'}
                  alt="Product Image"
                  class="p-3"
                />
              </div>
              <div class="item-details flex-1">
                <p class="text-[#30363C] font-bold text-lg mb-0.5">{item.productId.productName}</p>
              </div>
            </div>
            <div style="width: 17%;" class="item-price text-center font-semibold text-base text-[#4F585E]">
              ₹{item.price.toFixed(2)}
            </div>
            <div style="width: 17%;" class="item-discount text-center font-semibold text-base text-[#249B3E]">
              {item.productId.discount}% OFF
            </div>
            <div style="width: 17%;" class="item-total text-center font-semibold text-base text-[#4F585E]">
              ₹{item.totalAmount.toFixed(2)}
            </div>
            <div style="width: 17%;" class="quantity flex items-center justify-between border rounded-md bg-[#F3FBFF] border-[#0EA5E9]">
              <button
                on:click={() => updateQuantity(item.productId._id, -1)}
                class="w-7.5 h-7.5 pl-2 border-gray-300 cursor-pointer text-base flex items-center justify-center text-[#01A0E2]"
                disabled={$updateQuantityMutation.isPending}
              >
                -
              </button>
              <span class="w-7.5 text-center text-sm text-[#4F585E]">{item.quantity}</span>
              <button
                on:click={() => updateQuantity(item.productId._id, 1)}
                class="w-7.5 h-7.5 pr-2 border-gray-300 cursor-pointer text-base flex items-center justify-center text-[#01A0E2]"
                disabled={$updateQuantityMutation.isPending}
              >
                +
              </button>
            </div>
            <div style="width: 7%;" class="remove flex items-center justify-center">
              <button
                on:click={() => removeProduct(item.productId._id)}
                class="text-red-500 cursor-pointer"
                disabled={$removeProductMutation.isPending}
              >
                <Icon icon="mdi:trash-can-outline" class="w-5 h-5" />
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  
    <!-- Billing Section -->
    <div class="billing lg:w-[35%] max-w-2xl">
      <div class="border hidden bg-white lg:flex justify-between rounded-lg shadow-lg p-3">
        <div>
          <h3 class="text-base text-[#4F585E] font-medium mb-2.5">Deliver To</h3>
          {#if $addressesQuery.isLoading}
            <Skeleton class="h-6 w-3/4" />
          {:else if $addressesQuery.error}
            <p class="text-red-500 text-sm">Error fetching address: {$addressesQuery.error.message}</p>
          {:else if !primaryAddress}
            <p class="text-gray-500 text-sm">No address available</p>
          {:else}
            <p class="text-lg text-[#30363C] font-semibold mb-2">{primaryAddress.flatorHouseno}, {primaryAddress.area}, {primaryAddress.landmark}</p>
            <p class="text-base text-[#4F585E] mb-1.25">☎ {primaryAddress.receiverMobile} - {primaryAddress.receiverName}</p>
          {/if}
        </div>
        <button 
          on:click={handleAddressClick}
          class="h-fit bg-[#01A0E2] text-white px-4 py-2 rounded-md cursor-pointer text-lg whitespace-nowrap font-medium"
        >
          {primaryAddress ? 'Edit address' : 'Add address'}
        </button>
      </div>
      <div class="summary mt-5 bg-white rounded-lg shadow-lg p-3 border">
        <h3 class="text-lg font-semibold text-[#4F585E] mb-2.5">Bill Summary</h3>
        <div class="flex justify-between mb-2.5 text-sm">
          <span class="text-[#30363C] font-semibold">Subtotal</span>
          <span class="text-gray-800">₹{totalAmount.toFixed(2)}</span>
        </div>
        <div class="flex justify-between mb-2.5 text-sm">
          <span class="text-[#30363C] font-semibold">Delivery Charge</span>
          <span class="free text-green-600">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
        </div>
        <div class="flex justify-between mb-2.5 text-sm">
          <span class="text-[#30363C] font-semibold">Platform Fee</span>
          <span class="text-gray-800">₹{platformFee.toFixed(2)}</span>
        </div>
        <div class="flex justify-between mb-2.5 text-sm">
          <span class="text-[#30363C] font-semibold">Tax</span>
          <span class="text-gray-800">₹{tax.toFixed(2)}</span>
        </div>
        <div class="flex justify-between mb-2.5 text-sm">
          <span class="text-[#30363C] font-semibold">Discount</span>
          <span class="text-gray-800">₹{totalDiscount.toFixed(2)}</span>
        </div>
        <div class="total flex justify-between font-bold text-base">
          <span class="text-[#30363C] font-bold">Total Amount</span>
          <span class="text-gray-800">₹{totalPrice.toFixed(2)}</span>
        </div>
        <button 
        on:click={handlePayNow}
        class="pay-now-btn w-full py-2.5 bg-[#01A0E2] text-white rounded-md cursor-pointer text-base mt-5 "
        disabled={$placeOrderMutation.isPending || cartItems.length === 0}
      >
        {#if $placeOrderMutation.isPending}
          Processing...
        {:else}
          PAY NOW
        {/if}
      </button>
      </div>
    </div>
  </div>
</div>
{:else}
<div class="container max-w-2xl my-20 py-20 rounded-lg shadow-lg flex-col gap-3 flex justify-center items-center">
  <p class="text-lg font-medium">Please login to access Cart</p>
  <button on:click={()=>{goto('/login')}} class="bg-[#01A0E2] hover:bg-[#01A0E2] rounded-lg px-4 text-lg text-white py-2">Login</button>
  </div>
{/if}

<Footer />