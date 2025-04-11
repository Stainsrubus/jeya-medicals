<script lang="ts">
  import { goto } from '$app/navigation';
  import { _axios } from '$lib/_axios';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { createMutation, createQuery } from '@tanstack/svelte-query';
  import Icon from '@iconify/svelte';
  import { Badge } from '$lib/components/ui/badge';
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Avatar from './ui/avatar';
	import { toast } from 'svelte-sonner';
	import DropdownMenuSeparator from './ui/dropdown-menu/dropdown-menu-separator.svelte';
	import { imgUrl } from '$lib/config';
	import { page } from '$app/stores';
  
  interface CartCountResponse {
    message: string;
    status: boolean;
    count: number;
  }

  interface Address {
    _id: string;
    receiverName: string;
    receiverMobile: string;
    flatorHouseno: string;
    area: string;
    landmark: string;
    latitude: number;
    longitude: number;
    addressType: string;
	isPrimary: boolean;
  }
  const addressesQuery = createQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found. Please log in.');

      try {
        const response = await _axios.get('/address/all', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.data.status) throw new Error(response.data.message || 'Failed to fetch addresses');
        return response.data.addresses || [];
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Server error while fetching addresses');
      }
    },
    retry: 2,
    staleTime: 300000,
    enabled: $writableGlobalStore.isLogedIn,
  });

  const cartCountQuery = createQuery<CartCountResponse>({
    queryKey: ['cartCount'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
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
  $: currentPath = $page.url.pathname;
  $: cartCount = $writableGlobalStore.isLogedIn ? ($cartCountQuery.data?.count || 0) : 0;
  $: isLoading = $cartCountQuery.isLoading;
  $: error = $cartCountQuery.error ? ($cartCountQuery.error as Error).message : null;

  $: primaryAddress = $writableGlobalStore.isLogedIn && $addressesQuery.data 
  ? $addressesQuery.data.find(addr => addr.isPrimary) 
  : null;

$: displayAddress = primaryAddress 
  ? `${primaryAddress.flatorHouseno}, ${primaryAddress.area}` 
  : ($addressesQuery.data?.length > 0 
    ? `${$addressesQuery.data[0].flatorHouseno}, ${$addressesQuery.data[0].area}` 
    : '');

    function logout() {
    // Clear global store
    writableGlobalStore.update(() => ({
      userDetails: {
        profileImage: '',
        userName: '',
        mobile: ''
      },
      isLogedIn: false,
    }));

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('userToken');
    localStorage.removeItem('_id');
    localStorage.removeItem('userData');

    // Refresh the page to reset all states
    window.location.href = '/'; // or goto('/') if you prefer Svelte's navigation
  }

  let previewImage: string | null = null;
  let isDialogOpen = false;
  let isDropdownOpen = false;
  let fileInput: HTMLInputElement;

  function closeDropdown() {
    isDropdownOpen = false;
  }
  const updateProfileMutation = createMutation({
    mutationFn: async (data: { username?: string; profileImage?: File }) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found. Please log in.');

      const formData = new FormData();
      if (data.username) formData.append('username', data.username);
      if (data.profileImage) formData.append('profileImage', data.profileImage);

      const response = await _axios.put('/user/', formData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      if (!response.data.status) throw new Error(response.data.message || 'Failed to update profile');
      return response.data;
    },
    onSuccess: (data) => {
      writableGlobalStore.update((store) => ({
        ...store,
        userDetails: {
          ...store.userDetails,
          userName: data.user.username || store.userDetails.userName,
          profileImage: data.user.profileImage || store.userDetails.profileImage,
        },
      }));
      toast.success('Profile updated successfully');
      isDialogOpen = false; // Close dialog after success
      previewImage = null;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  function openDialog() {
	closeDropdown();
    isDialogOpen = true;
  }

  function closeDialog() {
    isDialogOpen = false;
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const username = formData.get('username') as string;
    const profileImage = formData.get('profileImage') as File;

    $updateProfileMutation.mutate({ username, profileImage });
  }
  function getInitials(name: string) {
    return name.charAt(0).toUpperCase();
  }
  function triggerFileUpload() {
    if (fileInput) {
      fileInput.click(); // Programmatically click the hidden file input
    }
  }

  function handleImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      previewImage = URL.createObjectURL(file); // Preview the new image
    }
  }
</script>

<div class="flex items-center justify-between h-[70px] lg:px-10 md:px-5 px-2 bg-white shadow-md">
  <!-- Left Section: Logo and Address -->
  <div class="flex items-center md:gap-4 gap-1">
    <!-- Logo -->
    <div onclick={() => goto('/')} class="cursor-pointer">
      <img src="/logo.png" alt="Jeya Medical Enterprises" class="md:max-w-[120px] max-w-[100px]" />
    </div>

    <!-- Separator -->
    <div class="h-8 w-[1px] bg-gray-300 opacity-50"></div>

    <!-- Address with Dropdown -->
	<div class="flex flex-col">
		<div class="flex items-center gap-1">
		  <span class="md:text-sm text-xs text-gray-600">Deliver To</span>
		  <Icon icon="mdi:chevron-down" class="text-gray-600" width="16" />
		</div>
		{#if $addressesQuery.isLoading && $writableGlobalStore.isLogedIn}
		  <span class="md:text-sm text-xs font-semibold text-gray-700">Loading address...</span>
		{:else if $addressesQuery.error && $writableGlobalStore.isLogedIn}
		  <!-- <span class="text-sm font-semibold text-red-500">Error loading address</span> -->
		{:else if !$writableGlobalStore.isLogedIn || ($writableGlobalStore.isLogedIn && $addressesQuery.data?.length === 0)}
		  <button
			onclick={() => goto('/address-management')}
			class="md:text-sm text-xs font-semibold text-[#01A0E2] hover:underline"
		  >
			Add Address
		  </button>
		{:else}
		  <div class="flex items-center gap-1">
			<span class="md:text-sm text-xs font-semibold text-gray-700">
			  {primaryAddress 
				? `${primaryAddress.flatorHouseno}, ${primaryAddress.area}`
				: `${$addressesQuery.data[0].flatorHouseno}, ${$addressesQuery.data[0].area}`}
			</span>
		  </div>
		{/if}
	  </div>
  </div>

  <!-- Right Section: Icons and Login -->
  <div class="flex items-center lg:gap-6 md:gap-4 gap-2">
    <!-- Offer -->
    <div onclick={()=>{goto('/offers')}} class="flex items-center gap-2 cursor-pointer">
      <img
      src={currentPath === '/offers' ? '/svg/offer-filled.svg' : '/svg/offer.svg'}
      alt="Cart"
    />
      <!-- <img src="/svg/offer.svg" alt="Offer" /> -->
      <span class="lg:text-xl md:text-lg hidden md:bloack text-base text-[#30363C] font-semibold">Offer</span>
    </div>

    <!-- Notification -->
    <div class="flex items-center gap-2 cursor-pointer">
      <img src="/svg/Notification.svg" alt="Notification" />
      <span class="lg:text-xl md:text-lg hidden md:bloack text-base font-semibold text-[#30363C]">Notification</span>
    </div>

    <!-- Cart with Badge -->
    <div onclick={() => goto('/cart')} class="flex items-center gap-2 cursor-pointer ">
   <div class="relative">
    <img
    src={currentPath === '/cart' ? '/svg/cart-filled.svg' : '/svg/cart.svg'}
    alt="Cart"
  />
    {#if !$writableGlobalStore.isLogedIn}
        <!-- <span class="absolute -top-1 -right-1 bg-[#01A0E2] rounded-full w-4 h-4"></span> -->
      {:else if cartCount > 0}
        <span class={`absolute -top-1 -right-1 bg-[#01A0E2] text-white rounded-full  flex items-center justify-center text-xs font-semibold ${currentPath === '/cart' ?'border border-white w-5 h-5':'border-none w-4 h-4'}` }>
          {cartCount}
        </span>
      {/if}
   </div>
      <span class="lg:text-xl md:text-lg text-base hidden md:bloack text-[#30363C] font-semibold">Cart</span>
    </div>

	<div class="flex items-center gap-2 cursor-pointer relative ">
    
		{#if $writableGlobalStore.isLogedIn}
		<DropdownMenu.Root bind:open={isDropdownOpen} > 
			<DropdownMenu.Trigger class='focus:ring-0 outline-none '>
			  <Avatar.Root class="md:mx-4 cursor-pointer border focus:ring-0 outline-none">
				{#if $writableGlobalStore.userDetails.profileImage}
				  <img
					src={imgUrl+$writableGlobalStore.userDetails.profileImage}
					alt="User Profile"
					class="w-full h-full object-cover rounded-full "
				  />
				{:else if $writableGlobalStore.userDetails.userName}
				  <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]">
					{getInitials($writableGlobalStore.userDetails.userName)}
				  </span>
				{:else}
				  <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]">
					U
				  </span>
				{/if}
			  </Avatar.Root>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class='w-screen md:w-72 lg:w-56  mt-1 md:mt-0 '>
			  <DropdownMenu.Group >
         <div class="flex gap-0 items-center">
            <Avatar.Root class="ml-2  cursor-pointer border">
              {#if $writableGlobalStore.userDetails.profileImage}
                <img
                src={imgUrl+$writableGlobalStore.userDetails.profileImage}
                alt="User Profile"
                class="w-full h-full object-cover rounded-full"
                />
              {:else if $writableGlobalStore.userDetails.userName}
                <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]">
                {getInitials($writableGlobalStore.userDetails.userName)}
                </span>
              {:else}
                <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]">
                U
                </span>
              {/if}
              </Avatar.Root>
				<div class="flex   md:px-0 w-full  items-center  justify-between">
				  <DropdownMenu.Item>
					<p class="text-[#30363C] flex flex-col font-medium text-lg">
					  {$writableGlobalStore.userDetails.userName || 'Username'}
            <span class=" text-[#718491] text-sm">
              {$writableGlobalStore.userDetails.mobile}
            </span>
					</p>
				  </DropdownMenu.Item>
				  <Icon icon="hugeicons:pencil-edit-02" class="text-gray-600 cursor-pointer mr-3" height={24} width={24} onclick={openDialog} />
				</div>
         </div>
          <DropdownMenuSeparator class="bg-gray-200 md:hidden  block" />
        <div>
          <DropdownMenu.Item class='lg:hidden block' onclick={()=>{goto('/address-management')}}>
           <div  class="flex justify-between text-[#30363C] items-center font-medium text-lg w-full px-2">
<p>Address Management</p>
<Icon icon="lucide:move-right"  />

           </div>
          </DropdownMenu.Item>
          <DropdownMenuSeparator class="bg-gray-200" />
          <DropdownMenu.Item class='lg:hidden block ' onclick={()=>{goto('/order-history')}}>
            <div  class="flex justify-between font-medium text-[#30363C] text-lg items-center  w-full px-2">
              <p>Order history</p>
              <Icon icon="lucide:move-right"  />
                                       </div>
           </DropdownMenu.Item>
           <DropdownMenuSeparator class="bg-gray-200 lg:hidden block" />
           <DropdownMenu.Item class='lg:hidden block ' onclick={()=>{goto('/demand-products')}}>
             <div  class="flex justify-between font-medium text-lg items-center text-[#30363C]  w-full px-2">
               <p>Demand Products</p>
               <Icon icon="lucide:move-right"  />
                                        </div>
            </DropdownMenu.Item>
            <DropdownMenuSeparator class="bg-gray-200 lg:hidden block" />
            <DropdownMenu.Item class='lg:hidden block' onclick={()=>{goto('/about-us')}}>
              <div  class="flex justify-between text-[#30363C] font-medium text-lg items-center  w-full px-2">
                <p>About Us</p>
                <Icon icon="lucide:move-right"  />
                                         </div>
             </DropdownMenu.Item>
        </div>
				<DropdownMenuSeparator class="bg-gray-400 lg:hidden block" />
				<DropdownMenu.Item class="text-lg" onclick={() => logout()}>
          <div  class="flex justify-between font-medium text-lg items-center  w-full px-2">
            <p>          Logout
            </p>
            <Icon icon="lucide:log-out"  />
                                     </div>

        </DropdownMenu.Item>
			  </DropdownMenu.Group>
			</DropdownMenu.Content>
		  </DropdownMenu.Root>
      {#if isDropdownOpen}
      <div class="fixed inset-0 bg-black bg-opacity-50 mt-16 z-50"></div>
      {/if}
		{:else}
		  <button
			onclick={() => goto('/login')}
			class="flex items-center gap-2"
		  >
			<img src="/svg/login.svg" alt="Login" class="hidden md:block" />
			<span class="lg:text-xl md:text-lg text-base text-[#30363C] font-semibold">Login</span>
		  </button>
		{/if}
    
	  </div>
	</div>
  </div>

  {#if isDialogOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50" onclick={closeDialog}></div>
  <div class="fixed top-0 right-0 h-full lg:w-[600px] w-screen bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out translate-x-0" class:translate-x-full={!isDialogOpen}>
    <div class="p-6 h-full flex flex-col">
      <div class="flex justify-between">
        <h2 class="text-3xl text-[#30363C] font-semibold mb-4 flex items-center gap-2"><Icon onclick={closeDialog} icon="lucide:arrow-left" class="w-6 h-6 text-[#4F585E] cursor-pointer]"  /> Edit Profile</h2>
        <Icon icon="material-symbols:close-small-rounded" class="text-gray-600" height={32} width={32} onclick={closeDialog} />
      </div>
      <form onsubmit={handleSubmit} class="space-y-4 flex-grow">
        <div class="flex flex-col justify-center items-center">
			<div class="relative bg-white">
				<img
				  src={previewImage ||imgUrl+$writableGlobalStore.userDetails.profileImage || '/images/profile.jpg'}
				  alt="Profile"
				  class="h-32 w-32  object-contain rounded-full border"
				  onerror={() => previewImage = '/images/profile.jpg'}
				/>
				<div class="absolute bottom-0 right-0">
				  <Icon icon="hugeicons:pencil-edit-02" class="text-gray-600 bg-white rounded-lg" height={28} width={28} onclick={triggerFileUpload} />
				</div>
			  </div>
			  <!-- Hidden file input -->
			  <input
				type="file"
				id="profileImage"
				name="profileImage"
				accept="image/*"
				bind:this={fileInput} 
				class="hidden" 
				onchange={handleImageChange}
			  />
			</div>
        <div>
          <label for="username" class="block text-xl font-semibold text-gray-700">Username</label>
          <input
            type="text"
            id="username"
            name="username"
			placeholder="Enter Username"
            value={$writableGlobalStore.userDetails.userName || ''}
            class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 focus:ring-0 focus:outline-none text-sm"
          />
        </div>
		<div>
			<label for="username" class="block text-xl font-semibold text-gray-700">Mobile Number</label>
			<input
			  type="text"
			  id="username"
			  name="username"
			  disabled
			  value={$writableGlobalStore.userDetails.mobile || ''}
			  class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 focus:ring-0 focus:outline-none text-sm"
			/>
		  </div>
        <div class="mt-auto">
          <button
            type="submit"
            class="w-full bg-[#01A0E2] text-white py-2 px-4 rounded-lg hover:bg-[#0189c9]"
            disabled={$updateProfileMutation.isLoading}
          >
            {#if $updateProfileMutation.isLoading}Updating...{:else}Update{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
<style>
	.translate-x-full {
    transform: translateX(100%);
  }
</style>
