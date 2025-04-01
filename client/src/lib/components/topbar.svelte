<!-- TopBar.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { _axios } from '$lib/_axios';
	import { writableGlobalStore } from '$lib/stores/global-store';
	import { createMutation } from '@tanstack/svelte-query';
	import  Icon  from '@iconify/svelte';
  
	// Cart count (you can replace this with a store or prop if needed)
	let cartCount = 2;
  
	// Logout mutation
	const logoutMutation = createMutation({
	  mutationFn: () => _axios.post('/auth/logout'),
	  onSuccess() {
		writableGlobalStore.update(() => ({
		  userDetails: {
			profileImage: '',
			userName: ''
		  },
		  isLogedIn: false
		}));
  
		localStorage.removeItem('userToken');
		localStorage.removeItem('_id');
		localStorage.removeItem('userData');
		goto('/');
	  }
	});
  
	function logout() {
	  $logoutMutation.mutate();
	}
  </script>
  
  <div class=" flex items-center justify-between h-[70px] px-10 ">
	<!-- Left Section: Logo and Address -->
	<div class="flex items-center gap-4">
	  <!-- Logo -->
	  <div onclick={() => goto('/')} class="cursor-pointer">
		<img src="/logo.png" alt="Jeya Medical Enterprises" class="max-w-[120px]" />
	  </div>
  
	  <!-- Separator -->
	  <div class="h-8 w-[1px] bg-white opacity-50"></div>
  
	  <!-- Address with Dropdown -->
	  <div class="flex flex-col">
		<div class="flex items-center gap-1">
		  <span class="text-sm">Deliver To</span>
		  <Icon icon="mdi:chevron-down" class="text-black" width="16" />
		</div>
		<span class="text-sm font-semibold">629001 Nagercoil</span>
	  </div>
	</div>
  
	<!-- Right Section: Icons and Login -->
	<div class="flex items-center gap-6">
	  <!-- Offer -->
	  <div class="flex items-center gap-2 cursor-pointer">
		<img src="/svg/offer.svg" alt="Offer" class="" />
		<span class="text-xl text-[#30363C]  font-semibold">Offer</span>
	  </div>
	  
  
	  <!-- Notification -->
	  <div class="flex items-center gap-2 cursor-pointer">
		<img src="/svg/Notification.svg" alt="Offer" class="" />
		<span class="text-xl font-semibold">Notification</span>
	  </div>
  
	  <!-- Cart with Badge -->
	  <div class=" flex items-center gap-2 cursor-pointer">
		<div class="relative">
			<img src="/svg/cart.svg" alt="Offer" class="" />
			{#if cartCount > 0}
			<span
			  class="absolute -top-1 -right-1 bg-[#01A0E2] text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-semibold"
			>
			  {cartCount}
			</span>
		  {/if}
		</div>
		
		<span class="text-xl text-[#30363C] font-semibold">Cart</span>
	
	  </div>
  
	  <!-- Login Button -->
	  <div
		onclick={() => ($writableGlobalStore.isLogedIn ? logout() : goto('/login'))}
		class="flex items-center gap-2 cursor-pointer"
	  >
	  <img src="/svg/login.svg" alt="Offer" class="" />
		<span class="text-xl text-[#30363C]  font-semibold">
		  {$writableGlobalStore.isLogedIn ? 'Logout' : 'Login'}
		</span>
	  </div>
	</div>
  </div>