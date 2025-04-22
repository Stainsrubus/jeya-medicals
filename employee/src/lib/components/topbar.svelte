<script>
      import { Button } from "$lib/components/ui/button/index.js";
      import { Input } from "$lib/components/ui/input/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Avatar from './ui/avatar';
  import { writableGlobalStore } from "$lib/stores/global-store";
  import { imgUrl } from "$lib/config";
  import DropdownMenuSeparator from './ui/dropdown-menu/dropdown-menu-separator.svelte';
  import { goto } from "$app/navigation";
  import Icon from "@iconify/svelte";

  let isDropdownOpen = false;
  let isDialogOpen = false;
  function logout() {
    // Clear global store

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('empToken');
    localStorage.removeItem('_id');
    localStorage.removeItem('empData');

    // Refresh the page to reset all states
    window.location.href = '/'; // or goto('/') if you prefer Svelte's navigation
  }
  function openDialog() {
	closeDropdown();
    isDialogOpen = true;
  }
  function closeDropdown() {
    isDropdownOpen = false;
  }

  /**
   * @param {string} name
   */
  function getInitials(name) {
    return name.charAt(0).toUpperCase();
  }
  
</script>

<header class="bg-background sticky top-0 z-50 flex h-20 items-center gap-4 border-b px-4 md:px-6">
    <a href="/employee/products" class="">
        <img src="/logo.png" alt="" class="h-16 w-auto">
         <span class="sr-only">Acme Inc</span>
       </a>
    <!-- <nav
      class="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6"
    >
     
      <a href="##" class="text-foreground hover:text-foreground transition-colors">
        Dashboard
      </a>
      <a href="##" class="text-muted-foreground hover:text-foreground transition-colors">
        Orders
      </a>
      <a href="##" class="text-muted-foreground hover:text-foreground transition-colors">
        Home
      </a>
      <a href="##" class="text-muted-foreground hover:text-foreground transition-colors">
        Customers
      </a>
      <a href="##" class="text-muted-foreground hover:text-foreground transition-colors">
        Analytics
      </a>
    </nav> -->
     <div class="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
      <form class="ml-auto flex-1 sm:flex-initial">
        <div class="relative">
        
              <DropdownMenu.Root bind:open={isDropdownOpen} > 
                <DropdownMenu.Trigger class='focus:ring-0 outline-none '>
                    <Avatar.Root class="md:mx-4 cursor-pointer border focus:ring-0 outline-none">
                        {#if $writableGlobalStore.empDetails.image}
                          <img
                            src={imgUrl+$writableGlobalStore.empDetails.image}
                            alt="User Profile"
                            class="w-full h-full object-cover rounded-full "
                          />
                        {:else if $writableGlobalStore.empDetails.name}
                          <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]">
                            {getInitials($writableGlobalStore.empDetails.name)}
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
                <Avatar.Root class="md:mx-0 cursor-pointer border focus:ring-0 outline-none">
                    {#if $writableGlobalStore.empDetails.image}
                      <img
                        src={imgUrl+$writableGlobalStore.empDetails.image}
                        alt="User Profile"
                        class="w-full h-full object-cover rounded-full "
                      />
                    {:else if $writableGlobalStore.empDetails.name}
                      <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]">
                        {getInitials($writableGlobalStore.empDetails.name)}
                      </span>
                    {:else}
                      <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]">
                        U
                      </span>
                    {/if}
                  </Avatar.Root>
                    <div class="flex   md:px-0 w-full  items-center  justify-between">
                      <DropdownMenu.Item>
                        <p class="text-[#30363C] whitespace-nowrap flex flex-col font-medium text-lg">
                          {$writableGlobalStore.empDetails.name || 'name'}
                <span class=" text-[#718491] text-sm">
                    {#if $writableGlobalStore.empDetails.mobile!=0}
                  {$writableGlobalStore.empDetails.mobile}
                  {:else}
                  {$writableGlobalStore.empDetails.email}
                  {/if}
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
        </div>
      </form>

    </div>
  </header>