<script lang="ts">
  import { goto } from '$app/navigation';
  import { _axios } from '$lib/_axios';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { createMutation, createQuery } from '@tanstack/svelte-query';
  import Icon from '@iconify/svelte';
  import { Badge } from '$lib/components/ui/badge';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Avatar from './ui/avatar';
  import { toast } from 'svelte-sonner';
  import DropdownMenuSeparator from './ui/dropdown-menu/dropdown-menu-separator.svelte';
  import { imgUrl } from '$lib/config';
  import { page } from '$app/stores';

  // Interface for global store (adjust as per your store structure)
  interface EmpDetails {
    image: string;
    email: string;
    mobile: number;
    name: string;
    empId: string;
  }

  interface GlobalStore {
    empDetails: EmpDetails;
    isLoggedIn: boolean;
    token: string;
  }

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

  // Queries (unchanged)
  const addressesQuery = createQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const token = localStorage.getItem('empToken');
      if (!token) throw new Error('No token found. Please log in.');

      try {
        const response = await _axios.get('/address/all', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.data.status) throw new Error(response.data.message || 'Failed to fetch addresses');
        return response.data.addresses || [];
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Server error while fetching addresses');
      }
    },
    retry: 2,
    staleTime: 300000,
    enabled: $writableGlobalStore.isLoggedIn,
  });

  const cartCountQuery = createQuery<CartCountResponse>({
    queryKey: ['cartCount'],
    queryFn: async () => {
      const token = localStorage.getItem('empToken');
      if (!token) throw new Error('No token found');

      const response = await _axios.get('/cart/count', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.data.status && response.data.message !== 'No active cart found') {
        throw new Error(response.data.message || 'Failed to fetch cart count');
      }

      return response.data;
    },
    retry: 1,
    staleTime: 0,
    enabled: $writableGlobalStore.isLoggedIn,
  });

  $: currentPath = $page.url.pathname;
  $: cartCount = $writableGlobalStore.isLoggedIn ? ($cartCountQuery.data?.count || 0) : 0;
  $: isLoading = $cartCountQuery.isLoading;
  $: error = $cartCountQuery.error ? ($cartCountQuery.error as Error).message : null;

  $: primaryAddress = $writableGlobalStore.isLoggedIn && $addressesQuery.data
    ? $addressesQuery.data.find((addr) => addr.isPrimary)
    : null;

  $: displayAddress = primaryAddress
    ? `${primaryAddress.flatorHouseno}, ${primaryAddress.area}`
    : $addressesQuery.data?.length > 0
      ? `${$addressesQuery.data[0].flatorHouseno}, ${$addressesQuery.data[0].area}`
      : '';

  // Form state
  let previewImage: string | null = null;
  let isDialogOpen = false;
  let isDropdownOpen = false;
  let fileInput: HTMLInputElement;
  let showPasswordField = false;
  let mobileError: string | null = null;
  let passwordError: string | null = null;
let showPassword=false;
  // Form input values
  let mobileInput: string = $writableGlobalStore.empDetails.mobile ? $writableGlobalStore.empDetails.mobile.toString() : '';
  let passwordInput: string = '';

  // Functions
  function logout() {
    writableGlobalStore.update(() => ({
      empDetails: {
        image: '',
        email: '',
        mobile: 0,
        name: '',
        empId: '',
      },
      isLoggedIn: false,
      token: '',
    }));

    localStorage.removeItem('token');
    localStorage.removeItem('userToken');
    localStorage.removeItem('_id');
    localStorage.removeItem('userData');

    window.location.href = '/';
  }

  function closeDropdown() {
    isDropdownOpen = false;
  }

  const updateProfileMutation = createMutation({
    mutationFn: async (data: { username?: string; profileImage?: File; mobile?: number; password?: string }) => {
      const token = localStorage.getItem('empToken');
      if (!token) throw new Error('No token found. Please log in.');

      const formData = new FormData();
      if (data.username) formData.append('username', data.username);
      if (data.profileImage) formData.append('image', data.profileImage);
      if (data.mobile) formData.append('mobile', data.mobile.toString()); // Convert to string for FormData
      if (data.password) formData.append('password', data.password);

      const response = await _axios.put('/emp/update', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      if (!response.data.status) throw new Error(response.data.message || 'Failed to update profile');
      return response.data;
    },
    onSuccess: (data) => {
  writableGlobalStore.update((store) => ({
    ...store,
    empDetails: {
      ...store.empDetails,
      name: data.emp.name || store.empDetails.name,
      image: data.emp.image || store.empDetails.image,
      mobile: data.emp.mobile || store.empDetails.mobile,
    },
  }));
  
  // Get the current data from localStorage
  const empData = JSON.parse(localStorage.getItem('empData') || '{}');

  // Update relevant fields
  const updatedEmpData = {
    ...empData,
    name: data.emp.name || empData.name,
    image: data.emp.image || empData.image,
    mobile: data.emp.mobile || empData.mobile,
  };

  // Store updated data back in localStorage
  localStorage.setItem('empData', JSON.stringify(updatedEmpData));

  toast.success('Profile updated successfully');
  isDialogOpen = false;
  previewImage = null;
  showPasswordField = false;
  mobileInput = data.emp.mobile ? data.emp.mobile.toString() : '';
  passwordInput = '';
  mobileError = null;
  passwordError = null;
},
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  function openDialog() {
    closeDropdown();
    isDialogOpen = true;
    mobileInput = $writableGlobalStore.empDetails.mobile ? $writableGlobalStore.empDetails.mobile.toString() : '';
    passwordInput = '';
    mobileError = null;
    passwordError = null;
  }

  function closeDialog() {
    isDialogOpen = false;
    showPasswordField = false;
    mobileInput = $writableGlobalStore.empDetails.mobile ? $writableGlobalStore.empDetails.mobile.toString() : '';
    passwordInput = '';
    mobileError = null;
    passwordError = null;
  }

  function togglePasswordField() {
    showPasswordField = !showPasswordField;
    passwordInput = '';
    passwordError = null;
  }

  function handleMobileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    value = value.slice(0, 10); // Limit to 10 digits
    mobileInput = value; // Update local state
    input.value = value; // Update input display

    // Validate mobile
    if (value.length > 0 && value.length < 10) {
      mobileError = 'Please enter a 10-digit mobile number';
    } else {
      mobileError = null;
    }
  }

  function handlePasswordInput(event: Event) {
    const input = event.target as HTMLInputElement;
    passwordInput = input.value;

    // Validate password if showPasswordField is true
    if (showPasswordField && passwordInput) {
      if (passwordInput.length < 6) {
        passwordError = 'Password must be at least 6 characters';
      } else {
        passwordError = null;
      }
    } else if (showPasswordField && !passwordInput) {
      passwordError = 'Password cannot be empty';
    } else {
      passwordError = null;
    }
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const username = formData.get('username') as string;
    const profileImage = formData.get('profileImage') as File;

    // Validate mobile
    if (!mobileInput) {
      mobileError = 'Mobile number is required';
      toast.error(mobileError);
      return;
    }
    if (mobileInput.length !== 10) {
      mobileError = 'Please enter a 10-digit mobile number';
      toast.error(mobileError);
      return;
    }

    // Validate password if showPasswordField is true
    if (showPasswordField) {
      if (!passwordInput) {
        passwordError = 'Password cannot be empty';
        toast.error(passwordError);
        return;
      }
      if (passwordInput.length < 6) {
        passwordError = 'Password must be at least 6 characters';
        toast.error(passwordError);
        return;
      }
    }

    const payload: {
      username: string;
      profileImage?: File;
      mobile?: number;
      password?: string;
    } = { username };

    if (profileImage && profileImage.size > 0) {
      payload.profileImage = profileImage;
    }

    if (mobileInput) {
      payload.mobile = parseInt(mobileInput, 10); // Convert to number for backend
    }

    if (showPasswordField && passwordInput) {
      payload.password = passwordInput;
    }

    $updateProfileMutation.mutate(payload);
  }

  function getInitials(name: string) {
    return name.charAt(0).toUpperCase();
  }

  function triggerFileUpload() {
    if (fileInput) {
      fileInput.click();
    }
  }

  function handleImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      previewImage = URL.createObjectURL(file);
    }
  }
</script>

<!-- HTML remains mostly unchanged, with added error messages -->
<div class="flex items-center justify-between h-[70px] z-50 w-screen lg:px-10 md:px-5 px-2 bg-white shadow-md">
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
      {#if $addressesQuery.isLoading && $writableGlobalStore.isLoggedIn}
        <span class="md:text-sm text-xs font-semibold text-gray-700">Loading address...</span>
      {:else if $addressesQuery.error && $writableGlobalStore.isLoggedIn}
        <!-- <span class="text-sm font-semibold text-red-500">Error loading address</span> -->
      {:else if !$writableGlobalStore.isLoggedIn || ($writableGlobalStore.isLoggedIn && $addressesQuery.data?.length === 0)}
        <button
          onclick={() => goto('/address-management')}
          class="md:text-sm text-xs font-semibold text-[#01A0E2] hover:underline"
        >
          Add Address
        </button>
      {:else}
        <div class="flex items-center gap-1">
          <span class="md:text-sm text-xs font-semibold text-gray-700">
            {displayAddress}
          </span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right Section: Icons and Login -->
  <div class="flex items-center lg:gap-6 md:gap-4 gap-2">
    <!-- Notification -->
    <div class="flex items-center gap-2 cursor-pointer">
      <img src="/svg/Notification.svg" alt="Notification" />
      <span class="lg:text-xl md:text-lg hidden md:block text-base font-semibold text-[#30363C]">Notification</span>
    </div>

    <!-- Cart with Badge -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onclick={() => goto('/cart')} class="flex items-center gap-2 cursor-pointer">
      <div class="relative">
        <img
          src={currentPath === '/cart' ? '/svg/cart-filled.svg' : '/svg/cart.svg'}
          alt="Cart"
        />
        {#if !$writableGlobalStore.isLoggedIn}
          <!-- <span class="absolute -top-1 -right-1 bg-[#01A0E2] rounded-full w-4 h-4"></span> -->
        {:else if cartCount > 0}
          <span
            class={`absolute -top-2 -right-2 bg-[#01A0E2] text-white rounded-full flex items-center justify-center text-xs font-semibold min-h-5 min-w-5 ${
              currentPath === '/cart' ? 'border border-white p-0.5' : 'border-none p-0.5'
            }`}
          >
            {cartCount}
          </span>
        {/if}
      </div>
      <span class="lg:text-xl md:text-lg text-base hidden md:block text-[#30363C] font-semibold">Cart</span>
    </div>

    <div class="flex items-center gap-2 cursor-pointer relative">
      {#if $writableGlobalStore.isLoggedIn}
        <DropdownMenu.Root bind:open={isDropdownOpen}>
          <DropdownMenu.Trigger class="focus:ring-0 outline-none">
            <Avatar.Root class="md:mx-4 cursor-pointer border focus:ring-0 outline-none">
              {#if $writableGlobalStore.empDetails.image}
                <img
                  src={imgUrl + $writableGlobalStore.empDetails.image}
                  alt="User Profile"
                  class="w-full h-full object-cover rounded-full"
                />
              {:else if $writableGlobalStore.empDetails.name}
                <span
                  class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]"
                >
                  {getInitials($writableGlobalStore.empDetails.name)}
                </span>
              {:else}
                <span
                  class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]"
                >
                  U
                </span>
              {/if}
            </Avatar.Root>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-screen md:w-72 lg:w-56 mt-1 md:mt-0">
            <DropdownMenu.Group>
              <div class="flex gap-0 items-center">
                <Avatar.Root class="ml-2 cursor-pointer border">
                  {#if $writableGlobalStore.empDetails.image}
                    <img
                      src={imgUrl + $writableGlobalStore.empDetails.image}
                      alt="User Profile"
                      class="w-full h-full object-cover rounded-full"
                    />
                  {:else if $writableGlobalStore.empDetails.name}
                    <span
                      class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]"
                    >
                      {getInitials($writableGlobalStore.empDetails.name)}
                    </span>
                  {:else}
                    <span
                      class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-[#01A0E2]"
                    >
                      U
                    </span>
                  {/if}
                </Avatar.Root>
                <div class="flex md:px-0 w-full items-center justify-between">
                  <DropdownMenu.Item>
                    <p class="text-[#30363C] flex flex-col font-medium text-lg">
                      {$writableGlobalStore.empDetails.name || 'Username'}
                      <span class="text-[#718491] text-sm">
                        {$writableGlobalStore.empDetails.email}
                      </span>
                    </p>
                  </DropdownMenu.Item>
                  <Icon
                    icon="hugeicons:pencil-edit-02"
                    class="text-gray-600 cursor-pointer mr-3"
                    height={24}
                    width={24}
                    onclick={openDialog}
                  />
                </div>
              </div>
              <DropdownMenuSeparator class="bg-gray-200 md:hidden block" />
              <div>
                <DropdownMenu.Item class="lg:hidden block" onclick={() => goto('/address-management')}>
                  <div class="flex justify-between text-[#30363C] items-center font-medium text-lg w-full px-2">
                    <p>Address Management</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200" />
                <DropdownMenu.Item class="lg:hidden block" onclick={() => goto('/order-history')}>
                  <div class="flex justify-between font-medium text-[#30363C] text-lg items-center w-full px-2">
                    <p>Order history</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200 lg:hidden block" />
                <DropdownMenu.Item class="lg:hidden block" onclick={() => goto('/demand-products')}>
                  <div class="flex justify-between font-medium text-lg items-center text-[#30363C] w-full px-2">
                    <p>Demand Products</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200 lg:hidden block" />
                <DropdownMenu.Item class="lg:hidden block" onclick={() => goto('/about-us')}>
                  <div class="flex justify-between text-[#30363C] font-medium text-lg items-center w-full px-2">
                    <p>About Us</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
              </div>
              <DropdownMenuSeparator class="bg-gray-400 lg:hidden block" />
              <DropdownMenu.Item class="text-lg" onclick={() => logout()}>
                <div class="flex justify-between font-medium text-lg items-center w-full px-2">
                  <p>Logout</p>
                  <Icon icon="lucide:log-out" />
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        {#if isDropdownOpen}
          <div class="fixed inset-0 bg-black bg-opacity-50 mt-16 z-50"></div>
        {/if}
      {:else}
        <button onclick={() => goto('/login')} class="flex items-center gap-2">
          <img src="/svg/login.svg" alt="Login" class="hidden md:block" />
          <span class="lg:text-xl md:text-lg text-base text-[#30363C] font-semibold">Login</span>
        </button>
      {/if}
    </div>
  </div>
</div>

{#if isDialogOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50" onclick={closeDialog}></div>
  <div
    class="fixed top-0 right-0 h-full lg:w-[600px] w-screen bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out translate-x-0"
    class:translate-x-full={!isDialogOpen}
  >
    <div class="p-6 h-full flex flex-col">
      <div class="flex justify-between">
        <h2 class="text-3xl text-[#30363C] font-semibold mb-4 flex items-center gap-2">
          <Icon
            onclick={closeDialog}
            icon="lucide:arrow-left"
            class="w-6 h-6 text-[#4F585E] cursor-pointer"
          />
          Edit Profile
        </h2>
      </div>
      <form onsubmit={handleSubmit} class="space-y-4 flex-grow">
        <div class="flex flex-col justify-center items-center">
          {console.log($writableGlobalStore?.empDetails?.image )}
          <div class="relative bg-white">
            <img
              src={previewImage || imgUrl + $writableGlobalStore?.empDetails?.image || '/images/profile.jpg'}
              alt="Profile"
              class="h-32 w-32 object-contain rounded-full border"
            />
            <div class="absolute bottom-0 right-0">
              <Icon
                icon="hugeicons:pencil-edit-02"
                class="text-gray-600 bg-white rounded-lg"
                height={28}
                width={28}
                onclick={triggerFileUpload}
              />
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
            autocomplete="off"
            placeholder="Enter Username"
            value={$writableGlobalStore.empDetails.name || ''}
            class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 focus:ring-0 focus:outline-none text-sm"
            required
          />
        </div>
        <div>
          <label for="email" class="block text-xl font-semibold text-gray-700">Email</label>
          <input
            type="text"
            id="email"
            name="email"
            disabled
            autocomplete="off"
            value={$writableGlobalStore.empDetails.email || ''}
            class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 focus:ring-0 focus:outline-none text-sm"
          />
        </div>
        <div>
          <label for="mobile" class="block text-xl font-semibold text-gray-700">Mobile</label>
          <input
            type="tel"
            id="mobile"
            name="mobile"
            autocomplete="tel"
            placeholder="Enter Mobile Number"
            value={mobileInput}
            oninput={handleMobileInput}
            maxlength="10"
            class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 focus:ring-0 focus:outline-none text-sm"
            aria-label="Mobile Number"
            title="Please enter a 10-digit mobile number"
          />
          {#if mobileError}
            <p class="text-red-500 text-xs mt-1">{mobileError}</p>
          {/if}
        </div>
        <div class="flex justify-end w-full">
          <button
            type="button"
            onclick={togglePasswordField}
            class="text-[#01A0E2] underline"
          >
            {!showPasswordField ? 'Reset Password ?' : 'Cancel'}
          </button>
        </div>
        {#if showPasswordField}
        <div class="relative">
          <label for="password" class="block text-xl font-semibold text-gray-700">Password</label>
          <div class="relative"> <!-- Add this wrapper div -->
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              autocomplete="new-password"
              placeholder="Enter new password"
              value={passwordInput}
              oninput={handlePasswordInput}
              class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 pr-10 focus:ring-0 focus:outline-none text-sm"
            />
            
            <!-- Toggle icon - now positioned relative to the input wrapper -->
            <span
              class="absolute top-1/2 -translate-y-1/2 right-3 cursor-pointer text-gray-600"
              onclick={() => (showPassword = !showPassword)}
            >
              <Icon
                icon={showPassword ? "mdi:eye-off" : "mdi:eye"}
                class="text-gray-600 cursor-pointer"
                height={20}
                width={20}
              />
            </span>
          </div>
          
          {#if passwordError}
            <p class="text-red-500 text-xs mt-1">{passwordError}</p>
          {/if}
        </div>
      {/if}
      
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