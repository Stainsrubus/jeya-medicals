<!-- Navbar.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import { page } from '$app/stores';

  // Define navigation items with labels, paths, and icons
  const navItems = [
    { label: 'Home', path: '/', icon: '/svg/home.svg' },
    { label: 'Products', path: '/Products', icon: '/svg/Heart.svg' },
    { label: 'Wishlist', path: '/wishlist', icon: '/svg/Heart.svg' },
    { label: 'Address Management', path: '/address-management', icon: '/svg/location.svg' },
    { label: 'Order History', path: '/order-history', icon: '/svg/box.svg' },
    { label: 'Demand History', path: '/demand-history', icon: '/svg/box.svg' },
    { label: 'About Us', path: '/about-us', icon: '/svg/box.svg' }
  ];

  // Function to determine if the current path matches the item's path
  function isActive(path: string): boolean {
    return $page.url.pathname === path;
  }
</script>

<div class="bg-[#01A0E2] px-4 md:px-6 lg:px-8 flex items-center justify-start h-[50px] text-white">
  {#each navItems as item}
    <div
      onclick={() => goto(item.path)}
      class="flex items-center gap-2 px-4 h-full cursor-pointer hover:bg-[#156aa3] transition-colors duration-200"
      class:bg-[#ACDEF247]={isActive(item.path)}
      class:border-b-2={isActive(item.path)}
      class:border-white={isActive(item.path)}
    >	<img src={`${item.icon}`} alt="icon" class="" />
      <span class="text-lg">{item.label}</span>
    </div>
  {/each}
</div>