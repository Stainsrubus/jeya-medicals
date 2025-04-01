<!-- ProductCard.svelte -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { imgUrl } from '$lib/config';
    import { _axios } from '$lib/_axios'; // Import your axios instance
    import { toast } from 'svelte-sonner'; // Optional: For showing toast notifications
	import { writableGlobalStore } from '$lib/stores/global-store';
	import { queryClient } from '$lib/query-client';
  
    // Props for the product card
    export let image: string;
    export let discount: number | null = null;
    export let name: string;
    export let MRP: number;
    export let strikePrice: number;
    export let id: string | number;
    export let favorite: boolean = false; // New prop to track favorite status
  
    // Calculate savings
    $: savings = strikePrice > MRP ? strikePrice - MRP : 0;
  
    // Handle click to navigate to product details page
    function handleClick() {
      goto(`/Products/${id}`);
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
          '/favorites/favorite',
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
          //@ts-ignore
        queryClient.invalidateQueries(['favorites']);
        //@ts-ignore
       queryClient.invalidateQueries(['products']);
          // Show success message
          toast.success(response.data.message); // e.g., "Favorite added successfully"
        } else {
          toast.error(response.data.message || 'Failed to toggle favorite');
        }
      } catch (error:any) {
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
  
    // Handle add to cart
    function handleAddToCart() {
      console.log(`Added product with ID: ${id} to cart`);
      // Add logic to add the product to the cart (e.g., API call or store update)
    }
  </script>
  
  <div
    class="relative bg-white rounded-xl shadow-md overflow-hidden w-64 transition-transform duration-200 cursor-pointer group"
    on:click={handleClick}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' && handleClick()}
  >
    <!-- Discount Badge -->
    {#if discount}
      <div
        class="absolute top-0 right-0 bg-[#FA8232] text-white text-sm font-semibold font-HostGrotesk rounded-bl-xl px-4 py-2 z-10"
      >
        {discount}% <br />OFF
      </div>
    {/if}
  
    <!-- Product Image with Overlay and Icons -->
    <div class="relative h-48 bg-gray-100 flex justify-center items-center">
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
        <button
        class="bg-white h-10 w-10 flex justify-center rounded-full transition-all hover:scale-110 duration-200"
        on:click|stopPropagation={handleFavorite}
        aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {#if favorite}
          <img class="px-2.5" src="/svg/fav-filled.svg" alt="Favorited" />
        {:else}
          <img class="px-2.5" src="/svg/fav.svg" alt="Favorite" />
        {/if}
      </button>
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
    <div class="px-4">
      <!-- Product Name -->
      <h3 class="font-medium text-base text-[#222222] overflow-hidden text-ellipsis whitespace-nowrap">
        {name}
      </h3>
  
      <!-- Price Section -->
      <div class="flex items-center gap-2 mt-1">
        <span class="text-[#222222] text-base">₹{MRP}</span>
        {#if strikePrice > MRP}
          <span class="text-[#222222] text-base line-through">₹{strikePrice}</span>
        {/if}
      </div>
  
      <!-- Savings Section -->
      {#if savings > 0}
        <div class="mt-1 pt-2 border-t border-[#EDEDED] text-base text-[#249B3E]">
          Save - ₹{savings}
        </div>
      {/if}
    </div>
  </div>