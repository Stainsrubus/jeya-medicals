<script lang="ts">
  import { goto } from '$app/navigation';
  import { imgUrl } from '$lib/config';
  import { _axios } from '$lib/_axios'; // Import your axios instance
  import { toast } from 'svelte-sonner'; // Optional: For showing toast notifications
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { queryClient } from '$lib/query-client';
  import { createMutation } from '@tanstack/svelte-query';

  // Props for the product card
  export let image: string;
  export let discount: number | null = null;
  export let name: string;
  export let MRP: number;
  export let strikePrice: number;
  export let id: string | number;
  export let favorite: boolean = false; // New prop to track favorite status
  export let comboOffer: boolean = false; // New prop to track if it's a combo offer
export let offerType:string | null = null;
  // Calculate savings
  $: savings = strikePrice > MRP ? strikePrice - MRP : 0;

  // Handle click to navigate to product details page or combo offer page
  function handleClick() {
    if (comboOffer) {
      goto(`/comboOffers/${id}`);
    } else {
      if(offerType==='negotiation'||offerType==='discount'||offerType==='onMRP'){
      goto(`/Products/${id}?offerType=${offerType}`);
      }
    else{
      goto(`/Products/${id}`);
    }
  }
  }

  // Handle favorite toggle
  async function handleFavorite() {
    const token = localStorage.getItem('token');
    if (!$writableGlobalStore.isLogedIn) {
      toast.error('Please log in to add to favorites');
      goto('/login');
      return;
    }

    try {
      // Make API call to toggle favorite status
      const response = await _axios.post(
        '/favorites/toggle',
        { productId: id },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        // Toggle the favorite status in the UI
        favorite = !favorite;
        // Show success message
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || 'Failed to toggle favorite');
      }
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token'); // Clear invalid token
        goto('/login');
      } else {
        toast.error(error.response?.data?.message || 'An error occurred while toggling favorite');
      }
    }
  }

  const addToCartMutation = createMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      if (!token || !$writableGlobalStore.isLogedIn) {
        throw new Error('Please log in to add to cart');
      }

      const response = await _axios.post(
        comboOffer? '/cart/updateCombo':'/cart/update',
        {
          products: [
            {
              productId: id,
              quantity: 1,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Product added to cart successfully!');
    },
    onError: (error: any) => {
      if (error.message === 'Please log in to add to cart') {
        toast.error(error.message);
        goto('/login');
      } else {
        toast.error(error.message || 'An error occurred while adding to cart');
      }
    },
  });

  // Handle add to cart
  function handleAddToCart() {
    $addToCartMutation.mutate();
  }
</script>

<div
  class="relative bg-white rounded-xl shadow-md overflow-hidden md:w-64 w-40  transition-transform duration-200 cursor-pointer group"
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  <!-- Discount Badge -->
  {#if discount}
    <div
      class="absolute top-0 right-0 bg-[#FA8232] text-white md:text-sm text-xs  font-bizGothic font-medium rounded-full px-4 py-2"
    >
      {discount}% OFF
    </div>
  {/if}

  <!-- Product Image with Overlay and Icons -->
  <div class="relative md:h-48 h-32 bg-gray-100 flex justify-center items-center">
    <img
      class="object-cover max-h-full max-w-full"
      src={imgUrl + image}
      alt={name}
    />
    <!-- Overlay on hover -->
    <div
      class="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center items-center gap-4"
    >
      <!-- Heart Icon -->
      <!-- <button
        class="bg-white h-10 w-10 flex justify-center rounded-full transition-all hover:scale-110 duration-200"
        on:click|stopPropagation={handleFavorite}
        aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {#if favorite}
          <img class="px-2.5" src="/svg/fav-filled.svg" alt="Favorited" />
        {:else}
          <img class="px-2.5" src="/svg/fav.svg" alt="Favorite" />
        {/if}
      </button> -->
      <!-- Cart Icon -->
      <button
        class="bg-white h-10 w-10 flex justify-center rounded-full transition-all hover:scale-110 duration-200"
        on:click|stopPropagation={handleAddToCart}
        aria-label="Add to cart"
      >
        <img class="p-2" src="/svg/cart.svg" alt="Cart" />
      </button>
    </div>
  </div>

  <!-- Product Details -->
  <div class="md:px-4 px-2">
    <!-- Product Name -->
    <h3 class="font-medium md:text-base text-sm text-[#222222] py-2 capitalize overflow-hidden text-ellipsis whitespace-nowrap">
      {name}
    </h3>

 

   
  </div>
</div>
