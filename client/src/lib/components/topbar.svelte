<script lang="ts">
  import { goto } from '$app/navigation';
  import { _axios } from '$lib/_axios';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { createMutation, createQuery, createInfiniteQuery } from '@tanstack/svelte-query';
  import Icon from '@iconify/svelte';
  import { Badge } from '$lib/components/ui/badge';
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Avatar from './ui/avatar';
  import { toast } from 'svelte-sonner';
  import DropdownMenuSeparator from './ui/dropdown-menu/dropdown-menu-separator.svelte';
  import { imgUrl } from '$lib/config';
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';

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

  interface Notification {
    _id: string;
    userId: string;
    type: 'order' | 'promotion' | 'demand' | 'account' | 'other';
    message: string;
    isRead: boolean;
    createdAt: string;
    response?: 'yes' | 'no'; // Add response field
  }

  interface NotificationResponse {
    notifications: Array<{
      _id: string;
      userId: string;
      type: string;
      description: string;
      isRead: boolean;
      createdAt: string;
      updatedAt: string;
      response?: 'yes' | 'no'; // Add response field
      __v: number;
    }>;
    currentPage: number;
    totalPages: number;
    total: number;
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
    staleTime: 30000,
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

  const hasNewNotificationsQuery = createQuery<{ hasNew: boolean }>({
    queryKey: ['hasNewNotifications'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');

      if (!token || !userData) {
        throw new Error('No token or user data found. Please log in.');
      }

      try {
        const response = await _axios.get('/notification/hasNew', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.data) {
          throw new Error('Failed to check for new notifications');
        }

        return {
          hasNew: !!response.data.hasNew
        };
      } catch (error: any) {
        console.error('Check new notifications error:', error.message);
        throw new Error(error.response?.data?.message || error.message || 'Failed to check for new notifications');
      }
    },
    enabled: $writableGlobalStore.isLogedIn,
    retry: 1,
    staleTime: 0,
    refetchInterval: 2000, // Poll this lightweight endpoint every 2 seconds
    onError: (error: any) => {
      console.error('Check new notifications error:', error.message);
      if (error.message.includes('token') || error.message.includes('log in')) {
        writableGlobalStore.update((store) => ({ ...store, isLogedIn: false }));
        goto('/login');
      }
    },
  });

  const notificationsQuery = createInfiniteQuery<NotificationResponse, Error, Notification[]>({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam = 1 }) => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');

      if (!token || !userData) {
        writableGlobalStore.update((store) => ({
          ...store,
          isLogedIn: false,
          userId: null,
        }));
        throw new Error('No token or user data found. Please log in.');
      }

      try {
        const userId = JSON.parse(userData)?.userId;
        if (!userId) throw new Error('User ID not found');

        const response = await _axios.get(`/notification?page=${pageParam}&limit=5`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to fetch notifications');
        }

        return {
          notifications: response.data.notifications,
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          total: response.data.total,
        };
      } catch (error: any) {
        console.error('Notifications query error:', error.message);
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch notifications');
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    select: (data) =>
      data.pages
        .flatMap((page) => page.notifications)
        .map((item) => ({
          _id: item._id,
          userId: item.userId,
          type: item.type === 'promotional' ? 'promotion' : item.type,
          title: item.title || '',
          message: item.description || item.message || 'No message provided',
          isRead: item.isRead,
          createdAt: item.createdAt,
          response: item.response, // Include response field
        })),
    enabled: $writableGlobalStore.isLogedIn,
    retry: 1,
    staleTime: 0,
    refetchInterval: false, // Don't auto-refetch, we'll control this manually
    onError: (error: any) => {
      console.error('Notifications query error:', error.message);
      if (error.message.includes('token') || error.message.includes('log in')) {
        writableGlobalStore.update((store) => ({ ...store, isLogedIn: false }));
        goto('/login');
      }
    },
  });

  $: if ($hasNewNotificationsQuery.data?.hasNew && !$notificationsQuery.isFetching && !isNotificationDrawerOpen) {
    $notificationsQuery.refetch();
  }

  const markAllReadMutation = createMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found.');
      }
      const response = await _axios.post(
        `/notification/mark-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to mark all notifications as read');
      }
      return response.data;
    },
    onSuccess: () => {
      $notificationsQuery.refetch();
      $hasNewNotificationsQuery.refetch();
      // toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      console.error('Mark all read mutation error:', error.message);
      // toast.error(error.message || 'Failed to mark all notifications as read');
    },
  });

  const respondToDemandMutation = createMutation({
    mutationFn: async ({ notificationId, response }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found.');
      }
      const responseData = await _axios.post(
        `/notification/respond`,
        { notificationId, response },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!responseData.data.status) {
        throw new Error(responseData.data.message || 'Failed to respond to demand notification');
      }
      return responseData.data;
    },
    onSuccess: () => {
      $notificationsQuery.refetch();
      toast.success('Response submitted successfully');
    },
    onError: (error: any) => {
      console.error('Respond to demand mutation error:', error.message);
      toast.error(error.message || 'Failed to respond to demand notification');
    },
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
    writableGlobalStore.update(() => ({
      userDetails: {
        profileImage: '',
        userName: '',
        mobile: ''
      },
      isLogedIn: false,
      userId: null,
    }));
    localStorage.removeItem('token');
    localStorage.removeItem('userToken');
    localStorage.removeItem('_id');
    localStorage.removeItem('userData');
    window.location.href = '/';
  }

  let previewImage: string | null = null;
  let isDialogOpen = false;
  let isDropdownOpen = false;
  let isNotificationDrawerOpen = false;
  let notificationDrawerElement: HTMLDivElement | null = null;
  let toggleTimeout: number | null = null;
  let fileInput: HTMLInputElement;
  let observerTarget: HTMLDivElement | null = null;
let userResponse='';
  // Track responded notifications
  let respondedNotifications: Set<string> = new Set();

  function closeDropdown() {
    isDropdownOpen = false;
  }

  function toggleNotificationDrawer() {
    if (toggleTimeout) return;

    toggleTimeout = setTimeout(() => {
      const wasOpen = isNotificationDrawerOpen;
      isNotificationDrawerOpen = !isNotificationDrawerOpen;

      // If opening the drawer, refetch notifications and mark as read
      if (!wasOpen && isNotificationDrawerOpen) {
        $notificationsQuery.refetch();

        // Mark all as read automatically when drawer is opened
        if ($hasNewNotificationsQuery.data?.hasNew) {
          $markAllReadMutation.mutate();
        }
      }

      toggleTimeout = null;
    }, 100);
  }

  onMount(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isNotificationDrawerOpen &&
        notificationDrawerElement &&
        !notificationDrawerElement.contains(target)
      ) {
        isNotificationDrawerOpen = false;
      }
    };

    document.addEventListener('click', handleOutsideClick);

    // Set up Intersection Observer for infinite scrolling
    let observer: IntersectionObserver | null = null;
    if (isNotificationDrawerOpen && observerTarget) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && $notificationsQuery.hasNextPage && !$notificationsQuery.isFetchingNextPage) {
            $notificationsQuery.fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(observerTarget);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      if (toggleTimeout) clearTimeout(toggleTimeout);
      if (observer && observerTarget) observer.unobserve(observerTarget);
    };
  });

  // Update Intersection Observer when drawer opens/closes
  $: if (isNotificationDrawerOpen && observerTarget) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && $notificationsQuery.hasNextPage && !$notificationsQuery.isFetchingNextPage) {
          $notificationsQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerTarget);
    onDestroy(() => observer.unobserve(observerTarget));
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
      isDialogOpen = false;
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

    const payload: { username: string; profileImage?: File } = { username };

    if (profileImage && profileImage.size > 0) {
      payload.profileImage = profileImage;
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

  // Format date for notifications
  function formatDate(dateString: string | number | Date) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'pm' : 'am';
    return `${day}/${month}/${year}, ${hours}:${minutes}${ampm}`;
  }

  // Notification type styles
  const typeStyles = {
    order: { icon: 'mdi:cart', color: 'bg-blue-100 text-blue-600' },
    promotion: { icon: 'mdi:tag', color: 'bg-green-100 text-green-600' },
    demand: { icon: 'solar:reorder-linear', color: 'bg-yellow-100 text-yellow-600' },
    account: { icon: 'mdi:account', color: 'bg-purple-100 text-purple-600' },
    other: { icon: 'mdi:bell', color: 'bg-gray-100 text-gray-600' },
  };

  function handleDemandResponse(event: Event,notificationId: string, response: 'yes' | 'no') {
    event.stopPropagation();
    userResponse=response;
    if (respondedNotifications.has(notificationId)) {
      toast.error('You have already responded to this notification.');
      return;
    }

    $respondToDemandMutation.mutate({ notificationId, response });
    respondedNotifications.add(notificationId);
  }
</script>

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
    <div onclick={() => goto('/offers')} class="flex items-center gap-2 cursor-pointer">
      <img
        src={currentPath === '/offers' ? '/svg/offer-filled.svg' : '/svg/offer.svg'}
        alt="Offer"
      />
      <span class="lg:text-xl md:text-lg hidden md:block text-base text-[#30363C] font-semibold">Offer</span>
    </div>

    <!-- Notification -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    {#if $writableGlobalStore.isLogedIn}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        onclick={toggleNotificationDrawer}
        class="flex items-center gap-2 cursor-pointer"
      >
        <div class="relative">
          <img src="/svg/Notification.svg" alt="Notification" />
          {#if $hasNewNotificationsQuery.data?.hasNew}
            <span class="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
          {/if}
        </div>
        <span class="lg:text-xl md:text-lg hidden md:block text-base font-semibold text-[#30363C]">Notification</span>
      </div>
    {/if}

    <!-- Cart with Badge -->
    <div onclick={() => goto('/cart')} class="flex items-center gap-2 cursor-pointer">
      <div class="relative">
        <img
          src={currentPath === '/cart' ? '/svg/cart-filled.svg' : '/svg/cart.svg'}
          alt="Cart"
        />
        {#if !$writableGlobalStore.isLogedIn}
          <!-- <span class="absolute -top-1 -right-1 bg-[#01A0E2] rounded-full w-4 h-4"></span> -->
        {:else if cartCount > 0}
          <span class={`absolute -top-1 -right-1 bg-[#01A0E2] text-white rounded-full flex items-center justify-center text-xs font-semibold ${currentPath === '/cart' ? 'border border-white min-w-5 min-h-5' : 'border-none min-w-4 min-h-4'}`}>
            {cartCount}
          </span>
        {/if}
      </div>
      <span class="lg:text-xl md:text-lg hidden md:block text-base font-semibold text-[#30363C]">Cart</span>
    </div>

    <!-- User Profile/Login -->
    <div class="flex items-center gap-2 cursor-pointer relative">
      {#if $writableGlobalStore.isLogedIn}
        <DropdownMenu.Root bind:open={isDropdownOpen}>
          <DropdownMenu.Trigger class='focus:ring-0 outline-none'>
            <Avatar.Root class="md:mx-4 cursor-pointer border focus:ring-0 outline-none">
              {#if $writableGlobalStore.userDetails.profileImage}
                <img
                  src={imgUrl + $writableGlobalStore.userDetails.profileImage}
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
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class='w-screen md:w-72 lg:w-56 mt-1 md:mt-0'>
            <DropdownMenu.Group>
              <div class="flex gap-0 items-center">
                <Avatar.Root class="ml-2 cursor-pointer border">
                  {#if $writableGlobalStore.userDetails.profileImage}
                    <img
                      src={imgUrl + $writableGlobalStore.userDetails.profileImage}
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
                <div class="flex md:px-0 w-full items-center justify-between">
                  <DropdownMenu.Item>
                    <p class="text-[#30363C] flex flex-col font-medium text-lg">
                      {$writableGlobalStore.userDetails.userName || 'Username'}
                      <span class="text-[#718491] text-sm">
                        {$writableGlobalStore.userDetails.mobile}
                      </span>
                    </p>
                  </DropdownMenu.Item>
                  <Icon icon="hugeicons:pencil-edit-02" class="text-gray-600 cursor-pointer mr-3" height={24} width={24} onclick={openDialog} />
                </div>
              </div>
              <DropdownMenuSeparator class="bg-gray-200 md:hidden block" />
              <div>
                <DropdownMenu.Item class='lg:hidden block' onclick={() => goto('/address-management')}>
                  <div class="flex justify-between text-[#30363C] items-center font-medium text-lg w-full px-2">
                    <p>Address Management</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200" />
                <DropdownMenu.Item class='lg:hidden block' onclick={() => goto('/order-history')}>
                  <div class="flex justify-between font-medium text-[#30363C] text-lg items-center w-full px-2">
                    <p>Order history</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200 lg:hidden block" />
                <DropdownMenu.Item class='lg:hidden block' onclick={() => goto('/demand-products')}>
                  <div class="flex justify-between font-medium text-lg items-center text-[#30363C] w-full px-2">
                    <p>Demand Products</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200 lg:hidden block" />
                <DropdownMenu.Item class='lg:hidden block' onclick={() => goto('/about-us')}>
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

<!-- Notification Dropdown -->
{#if $writableGlobalStore.isLogedIn}
  <div
    class="fixed inset-0 z-40 {isNotificationDrawerOpen ? 'block' : 'hidden'}"
    onclick={() => (isNotificationDrawerOpen = false)}
  ></div>
  <div
    class="fixed lg:right-20 md:right-10 right-1 top-[70px] z-50 w-full max-w-xs max-h-[50vh] overflow-y-auto bg-white rounded-lg shadow-xl transform transition-all duration-200 ease-in-out {isNotificationDrawerOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}"
    bind:this={notificationDrawerElement}
    role="dialog"
    aria-label="Notification dropdown"
  >
    <!-- Content -->
    <div class="overflow-y-auto">
      {#if $notificationsQuery.isLoading}
        <div class="p-4 space-y-2">
          {#each Array(3) as _}
            <Skeleton class="h-12 w-full" />
          {/each}
        </div>
      {:else if $notificationsQuery.error}
        <div class="text-center p-4 text-red-500">
          Error loading notifications: {$notificationsQuery.error.message}
        </div>
      {:else if $notificationsQuery.data?.length === 0}
        <div class="text-center p-4 text-[#4F585E]">
          No notifications found.
        </div>
      {:else}
        <div class="divide-y">
          {#each $notificationsQuery?.data as notification (notification._id)}
            <div
              class="flex items-start gap-3 p-4 hover:bg-gray-50 {notification.isRead ? 'bg-gray-50' : 'bg-white'}"
            >
              <div
                class="{typeStyles[notification.type]?.color || 'bg-gray-100 text-gray-600'} p-2 rounded-full flex-shrink-0"
              >
                <Icon icon={typeStyles[notification.type]?.icon || 'mdi:bell'} class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-base text-[#30363C] font-medium truncate">
                  {notification.title}
                </p>
                <p class="text-sm text-[#30363Cd9] {notification.isRead ? '' : 'font-medium'} ">
                  {notification.message}
                </p>
                <p class="text-xs text-[#4f585Ebb] mt-1">
                  {formatDate(notification.createdAt)}
                </p>
                {#if notification.type === 'demand'}
                  {#if notification.response||userResponse!=''}
                    <div class="mt-0.5 p-1 text-sm border w-fit border-gray-300 capitalize rounded-md bg-gray-100 text-gray-700">
                      {notification.response||userResponse}
                    </div>
                  {:else}
                    <div class="flex gap-2 mt-2">
                      <button
                        class="px-3 text-sm py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                        onclick={(e) => handleDemandResponse(e,notification._id, 'yes')}
                      >
                        Yes
                      </button>
                      <button
                        class="px-3 text-sm py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                        onclick={(e) => handleDemandResponse(e,notification._id, 'no')}
                      >
                        No
                      </button>
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
          {#if $notificationsQuery.isFetchingNextPage}
            <div class="p-4 flex items-center justify-center w-full ">
              <!-- <Skeleton class="h-12 w-full" /> -->
              <Icon icon='line-md:loading-twotone-loop' class="w-8 h-8" />
            </div>
          {/if}
          <div bind:this={observerTarget} class="h-1"></div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Edit Profile Dialog -->
{#if isDialogOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50" onclick={closeDialog}></div>
  <div class="fixed top-0 right-0 h-full lg:w-[600px] w-screen bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out translate-x-0" class:translate-x-full={!isDialogOpen}>
    <div class="p-6 h-full flex flex-col">
      <div class="flex justify-between">
        <h2 class="text-3xl text-[#30363C] font-semibold mb-4 flex items-center gap-2">
          <Icon onclick={closeDialog} icon="lucide:arrow-left" class="w-6 h-6 text-[#4F585E] cursor-pointer" />
          Edit Profile
        </h2>
      </div>
      <form onsubmit={handleSubmit} class="space-y-4 flex-grow">
        <div class="flex flex-col justify-center items-center">
          <div class="relative bg-white">
            <img
              src={previewImage || imgUrl + $writableGlobalStore.userDetails.profileImage || '/images/profile.jpg'}
              alt="Profile"
              class="h-32 w-32 object-contain rounded-full border"
              onerror={() => previewImage = '/images/profile.jpg'}
            />
            <div class="absolute bottom-0 right-0">
              <Icon icon="hugeicons:pencil-edit-02" class="text-gray-600 bg-white rounded-lg" height={28} width={28} onclick={triggerFileUpload} />
            </div>
          </div>
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
            autocomplete="off"
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
