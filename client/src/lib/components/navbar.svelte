<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Define navigation items with labels, paths, and icons
  const navItems = [
    { label: 'Home', path: '/', icon: '/svg/home.svg' },
    { label: 'Products', path: '/Products', icon: '/svg/Heart.svg' },
    { label: 'Wishlist', path: '/wishlist', icon: '/svg/Heart.svg' },
    { label: 'Address Management', path: '/address-management', icon: '/svg/location.svg' },
    { label: 'Order History', path: '/order-history', icon: '/svg/box.svg' },
    { label: 'Demand Products', path: '/demand-products', icon: '/svg/box.svg' },
    { label: 'About Us', path: '/about-us', icon: '/svg/box.svg' }
  ];

  // Function to determine if the current path matches the item's path
  function isActive(path: string): boolean {
    return $page.url.pathname === path;
  }
</script>

<style>
  .nav-item {
    display: flex;
  }

  @media (max-width: 1000px) {
    .nav-item:nth-child(n+4) {
      display: none;
    }
  }
</style>

<div class="bg-[#01A0E2] px-4  lg:px-8 flex items-center md:justify-start justify-between h-[50px] text-white">
  {#each navItems as item, index}
    <div
      class="nav-item flex  items-center gap-2 px-4  h-full cursor-pointer hover:bg-[#156aa3] transition-colors duration-200"
      class:bg-[#ACDEF247]={isActive(item.path)}
      class:border-b-2={isActive(item.path)}
      class:border-white={isActive(item.path)}
      onclick={() => goto(item.path)}
    >
      <img src={`${item.icon}`} alt="icon" class="" />
      <span class="xl:text-lg md:text-base text-lg text-nowrap">{item.label}</span>
    </div>
  {/each}
</div>
