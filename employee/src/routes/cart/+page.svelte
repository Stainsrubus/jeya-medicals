<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb";
  import { createQuery, createMutation, createInfiniteQuery } from '@tanstack/svelte-query';
  import { _axios } from '$lib/_axios';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import Icon from '@iconify/svelte';
  import { imgUrl } from "$lib/config";
  import { toast } from 'svelte-sonner';
  import { queryClient } from "$lib/query-client";
  import { goto } from "$app/navigation";
  import { writableGlobalStore } from "$lib/stores/global-store";
  import Footer from "$lib/components/footer.svelte";
  import { onMount, onDestroy } from 'svelte';
  import debounce from 'lodash/debounce';

  // Define interfaces
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
    selectedOffer: any;
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

  interface Address {
    _id: string;
    receiverName: string;
    receiverMobile: string;
    flatHouseno: string;
    area: string;
    landmark: string;
    addressString: string;
    latitude: string;
    longitude: string;
    active: boolean;
    addressType: string;
    userId: string;
    isPrimary: boolean;
  }

  interface User {
    _id: string;
    mobile: number;
    username: string;
    role: string;
    active: boolean;
    type: string;
    address: {
      flatNo: string;
      area: string;
      nearbyPlaces: string;
    };
    HospitalMedicalName?: string;
    GSTIN?: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  }

  interface UsersResponse {
    status: boolean;
    message: string;
    users: User[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalCount: number;
    };
  }

  // Format user display to show only username and mobile
  function formatUserDisplay(user: User): string {
    return `${user.username} (${user.mobile})`;
  }

  $: isLoggedIn = $writableGlobalStore.isLoggedIn;

  let showShimmer = true;

  onMount(() => {
    showShimmer = true;
    const timer = setTimeout(() => {
      showShimmer = false;
    }, 1000);
    return () => clearTimeout(timer);
  });

  const placeOrderMutation = createMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }
      const selectedUserData = $usersQuery.data?.pages
      .flatMap((page: { users: any; }) => page.users)
      .find((u: { username: string; }) => u.username === selectedUser);

    if (!selectedUserData) {
      throw new Error('No user selected. Please select a user.');
    }

const userId=selectedUserData._id
    // Use editedAddress if modified, otherwise use selectedUserData's address
    const address = {
      flatNo: editedAddress.flatNo || selectedUserData.address.flatNo,
      area: editedAddress.area || selectedUserData.address.area,
      nearbyPlaces: editedAddress.nearbyPlaces || selectedUserData.address.nearbyPlaces,
    };

    if (!address.flatNo || !address.area || !address.nearbyPlaces) {
      throw new Error('Complete address details are required.');
    }

      const response = await _axios.post(
        '/orders/order',
        { address ,userId},
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to place order');
      }
      return response.data;
    },
    onSuccess: (data: { order: { _id: any; }; }) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cartCount'] });
      toast.success('Order placed successfully!');
      goto(`/order-confirmation/${data.order._id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to place order');
    },
  });

  const addressesQuery = createQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const token = localStorage.getItem('empToken');
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
    enabled: isLoggedIn,
  });

  const cartQuery = createQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async () => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      try {
        const response = await _axios.get(`/cart`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
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
    enabled: isLoggedIn,
  });

  const updateQuantityMutation = createMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const token = localStorage.getItem('empToken');
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
      $cartQuery.refetch();
      toast.success('Quantity updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update quantity');
    },
  });

  const removeProductMutation = createMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem('empToken');
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
      queryClient.invalidateQueries({ queryKey: ['cartCount'] });
      $cartQuery.refetch();
      toast.success('Product removed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove product');
    },
  });

  let searchQuery = '';
  const usersQuery = createInfiniteQuery<UsersResponse>({
    queryKey: ['users', searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      const params = new URLSearchParams();
      if (searchQuery) {
        if (/^\d+$/.test(searchQuery)) {
          params.append('mobile', searchQuery);
        } else {
          params.append('username', searchQuery);
        }
      }
      params.append('limit', '10');
      params.append('page', pageParam.toString());

      try {
        const response = await _axios.get(`/user?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to fetch users');
        }

        return response.data;
      } catch (error) {
        throw error instanceof Error ? error : new Error('An unexpected error occurred');
      }
    },
    getNextPageParam: (lastPage: { pagination: { page: any; totalPages: any; }; }) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    retry: 1,
    staleTime: 0,
    enabled: isLoggedIn,
  });

  const createUserMutation = createMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.phone)) {
        throw new Error('Phone number must be 10 digits');
      }

      // if (userType === 'firm') {
      //   const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      //   if (!gstinRegex.test(formData.gstin)) {
      //     throw new Error('Invalid GSTIN format');
      //   }
      // }

      const payload = {
        mobile: parseInt(formData.phone),
        username: formData.name.toLowerCase().replace(/\s+/g, ''),
        role: 'preuser',
        active: true,
        address: {
          flatNo: formData.flatNumber,
          area: formData.area,
          nearbyPlaces: formData.landmark,
        },
        userType: userType,
        ...(userType === 'individual' && {
          HospitalMedicalName: '',
        }),
        ...(userType === 'firm' && {
          HospitalMedicalName: formData.hospitalName,
          GSTIN: formData.gstin,
        }),
      };

      const response = await _axios.post('/user/create', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create user');
      }

      return response.data;
    },
    onSuccess: (data: { message: any; }) => {
      const userDisplay = `${formData.name}`;
      searchResults = [...searchResults, userDisplay];
      selectUser(userDisplay);
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.message || 'User created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  const updateUserAddressMutation = createMutation({
    mutationFn: async ({ userId, address }: { userId: string; address: { flatNo: string; area: string; nearbyPlaces: string } }) => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      const response = await _axios.patch(
        `/user/updateAddress`,
        { address ,userId},
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to update address');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Address updated successfully!');
      isEditingAddress = false;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update address');
    },
  });


  $: cartData = $cartQuery.data;
  $: cartItems = showShimmer ? [] : (cartData?.cart?.products || []);
  $: isCartLoading = showShimmer || $cartQuery.isLoading;
  $: isAddressesLoading = showShimmer || $addressesQuery.isLoading;
  $: error = $cartQuery.error ? ($cartQuery.error as Error).message : null;
  $: primaryAddress = showShimmer ? null : ($addressesQuery.data?.find((address: { isPrimary: any; }) => address.isPrimary) || null);

  $: totalAmount = isCartLoading ? 0 : (cartData?.cart?.subtotal || 0);
  $: totalDiscount = isCartLoading ? 0 : cartItems.reduce((sum: number, item: { productId: { discount: any; }; quantity: number; }) => sum + (item.productId.discount || 0) * item.quantity, 0);
  $: deliveryFee = isCartLoading ? 0 : (cartData?.deliveryFee || 0);
  $: platformFee = isCartLoading ? 0 : (cartData?.platformFee || 0);
  $: tax = isCartLoading ? 0 : (cartData?.cart?.tax || 0);
  $: totalPrice = isCartLoading ? 0 : (cartData?.cart?.totalPrice || 0);

  function updateQuantity(productId: string, change: number) {
    const item = cartItems.find((item: { productId: { _id: string; }; }) => item.productId._id === productId);

    if (item) {
      const newQuantity = Math.max(1, item.quantity + change);
      item.quantity = newQuantity;
      item.totalAmount = item.price * newQuantity;
      $updateQuantityMutation.mutate({ productId, quantity: newQuantity });
    }
  }

  function removeProduct(productId: string) {
    cartItems = cartItems.filter((item: { productId: { _id: string; }; }) => item.productId._id !== productId);
    $removeProductMutation.mutate(productId);
  }

  async function handleAddressClick() {
    await goto('/address-management', {
      state: { editAddressId: primaryAddress?._id }
    });
  }

  let selectedUser = '';
  let searchResults: string[] = [];
  let isDrawerOpen = false;
  let isDialogOpen = false;
  let isEditingAddress = false;
  let userType: 'individual' | 'firm' = 'individual';
  let formData = {
    name: '',
    phone: '',
    area: '',
    flatNumber: '',
    landmark: '',
    hospitalName: '',
    gstin: ''
  };
  let editedAddress = {
    flatNo: '',
    area: '',
    nearbyPlaces: ''
  };

  // Combine all pages of users into searchResults
  $: searchResults = $usersQuery.data?.pages.flatMap((page) => page.users.map(formatUserDisplay)) || [];

  // Debounced search function
  const debouncedSearch = debounce((query: string) => {
    searchQuery = query;
    $usersQuery.refetch();
  }, 300);

  function handleSearch(query: string) {
    debouncedSearch(query);
  }
function handleOrderNow(){
  $placeOrderMutation.mutate()
}
  function openDrawer() {
    isDrawerOpen = true;
  }

  function closeDrawer() {
    isDrawerOpen = false;
  }

  function selectUser(user: string) {
    const usernameOnly = user.split(' (')[0];
    selectedUser = usernameOnly;
    searchQuery = usernameOnly;
    isDrawerOpen = false;

    // Initialize editedAddress with selected user's address
    const selectedUserData = $usersQuery.data?.pages
      .flatMap((page: { users: any; }) => page.users)
      .find((u: { username: string; }) => u.username === usernameOnly);

    if (selectedUserData) {
      editedAddress = {
        flatNo: selectedUserData.address.flatNo,
        area: selectedUserData.address.area,
        nearbyPlaces: selectedUserData.address.nearbyPlaces
      };
    }
  }

  function openDialog() {
    isDrawerOpen = false;
    isDialogOpen = true;
  }

  function closeDialog() {
    isDialogOpen = false;
    formData = {
      name: '',
      phone: '',
      area: '',
      flatNumber: '',
      landmark: '',
      hospitalName: '',
      gstin: ''
    };
    userType = 'individual';
  }

  function handleFormSubmit() {
    $createUserMutation.mutate();
  }

  let drawerElement: HTMLDivElement | null = null;
  let inputElement: HTMLInputElement | null = null;
  let dialogElement: HTMLDivElement | null = null;

  // Infinite scroll handling
  let scrollContainer: HTMLDivElement | null = null;

  function handleScroll() {
    if (!scrollContainer || $usersQuery.isFetchingNextPage || !$usersQuery.hasNextPage) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      $usersQuery.fetchNextPage();
    }
  }

  onMount(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isDrawerOpen && drawerElement && inputElement && !drawerElement.contains(target) && !inputElement.contains(target)) {
        closeDrawer();
      }

      if (isDialogOpen && dialogElement && !dialogElement.contains(target)) {
        closeDialog();
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDialogOpen) {
        closeDialog();
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);

    // Add scroll event listener
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeydown);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  });
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
<div class="!flex !justify-center !items-center">
  <div class="flex lg:flex-row flex-col lg:w-full md:w-[65%] justify-between lg:px-20 px-4 md:px-6 gap-5">
    <!-- Mobile Address Section -->
    <div class="border bg-white max-w-2xl lg:hidden flex justify-between rounded-lg shadow-lg p-3">
      <div>
        <h3 class="text-base text-[#4F585E] font-medium mb-3">Deliver To</h3>
        {#if isAddressesLoading}
          <div class="space-y-2">
            <Skeleton class="h-6 w-full" />
            <Skeleton class="h-6 w-3/4" />
          </div>
        {:else if $addressesQuery.error && !showShimmer}
          <p class="text-red-500 text-sm">Error fetching address: {$addressesQuery.error.message}</p>
        {:else if !primaryAddress && !showShimmer}
          <p class="text-gray-500 text-sm">No address available</p>
        {:else if primaryAddress}
          <p class="text-lg text-[#30363C] font-semibold mb-2">{primaryAddress.flatHouseno}, {primaryAddress.area}, {primaryAddress.landmark}</p>
          <p class="text-base text-[#4F585E] mb-1.25">☎ {primaryAddress.receiverMobile} - {primaryAddress.receiverName}</p>
        {/if}
      </div>
      <button
        on:click={handleAddressClick}
        class="h-fit bg-[#01A0E2] text-white px-3 py-1.5 rounded-md cursor-pointer lg:text-lg text-base whitespace-nowrap font-medium"
      >
        {primaryAddress && !showShimmer ? 'Edit address' : 'Add address'}
      </button>
    </div>

    <!-- Mobile Cart Items Section -->
    <div class="cart-items max-w-2xl lg:hidden block bg-white rounded-lg shadow-lg p-2 h-fit border">
      {#if isCartLoading}
        <div class="space-y-4 py-4">
          {#each Array(3) as _}
            <div class="flex items-center py-3.5 border-b border-gray-300">
              <div style="width: 30%;" class="flex gap-4 items-center">
                <Skeleton class="w-12 h-12" />
                <Skeleton class="h-6 w-3/4" />
              </div>
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 7%;" class="h-6" />
            </div>
          {/each}
        </div>
      {:else if error && !showShimmer}
        <p class="text-center py-4 text-red-500">Error: {error}</p>
      {:else if cartItems.length === 0 && !showShimmer}
        <div class="flex flex-col items-center py-8">
          <Icon icon="mdi:cart-off" class="w-10 h-10 text-[#d8dee3]" />
          <p class="text-center text-lg text-[#b5bbc1] mt-4">Your cart is empty</p>
        </div>
      {:else}
        {#each cartItems as item}
          <div class="cart-item gap-5 grid grid-cols-3 items-center py-3.5 border-b border-gray-300">
            <div class="flex gap-4 col-span-2 items-center">
              <div class="w-20 h-20 rounded-lg mr-3.75 bg-[#F5F5F5] border-[#EDEDED]">
                <!-- svelte-ignore a11y_img_redundant_alt -->
                <img
                  src={imgUrl + item.productId.images[0] || 'placeholder.png'}
                  alt="Product Image"
                  class="p-3"
                />
              </div>
              <div class="item-details flex-1">
                <p class="text-[#30363C] font-bold text-lg mb-0.5">{item.productId.productName}</p>
                <p><span class="line-through">₹{item.productId.strikePrice}</span> <span class="text-[#249B3E]">₹{item.price}</span></p>
              </div>
            </div>
            <div class="item-total text-center font-semibold text-base text-[#4F585E]">
              ₹{item.totalAmount.toFixed(2)}
              <div class="quantity flex items-center justify-between border rounded-md bg-[#F3FBFF] border-[#0EA5E9]">
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

    <!-- Desktop Cart Items Section -->
    <div class="cart-items hidden lg:block bg-white rounded-lg shadow-lg p-2 lg:w-[65%] h-fit border">
      <div class="cart-header flex items-center justify-between rounded-sm text-sm py-2 text-[#475156] border border-gray-300 bg-[#F2F4F5]">
        <span style="width: 70%; text-align: left; padding-left: 20px;">PRODUCT</span>
        <span style="width: 20%; text-align: center;">QUANTITY</span>
        <span style="width: 10%; text-align: center;"></span>
      </div>
      {#if isCartLoading}
        <div class="space-y-4 py-4">
          {#each Array(3) as _}
            <div class="flex items-center py-3.5 border-b border-gray-300">
              <div style="width: 30%;" class="flex gap-4 items-center">
                <Skeleton class="w-12 h-12" />
                <Skeleton class="h-6 w-3/4" />
              </div>
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 17%;" class="h-6" />
              <Skeleton style="width: 7%;" class="h-6" />
            </div>
          {/each}
        </div>
      {:else if error && !showShimmer}
        <p class="text-center py-4 text-red-500">Error: {error}</p>
      {:else if cartItems.length === 0 && !showShimmer}
        <div class="flex flex-col items-center py-8">
          <Icon icon="mdi:cart-off" class="w-10 h-10 text-[#d8dee3]" />
          <p class="text-center text-lg text-[#b5bbc1] mt-4">Your cart is empty</p>
        </div>
      {:else}
        {#each cartItems as item}
          <div class="cart-item flex items-center justify-between py-3.5 border-b border-gray-300">
            <div style="width: 70%;" class="flex gap-4 items-center">
              <div class="w-20 h-20 rounded-lg mr-3.75 bg-[#F5F5F5] border-[#EDEDED]">
                <!-- svelte-ignore a11y_img_redundant_alt -->
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
            <div style="width: 20%;" class="quantity flex items-center justify-between border rounded-md bg-[#F3FBFF] border-[#0EA5E9]">
              <button
                on:click={() => updateQuantity(item.productId._id, -1)}
                class={`w-7.5 h-7.5 pl-2 border-gray-300 text-base flex items-center justify-center ${item.quantity === 1 ? 'text-[#019ee27a] cursor-not-allowed' : 'text-[#01A0E2] cursor-pointer'}`}
                disabled={$updateQuantityMutation.isPending || item.quantity === 1}
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
            <div style="width: 10%;" class="remove flex items-center justify-center">
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
      <!-- User Selection Section -->
      <div class="bg-white mb-5 relative">
        {#if selectedUser}
          <!-- Selected User Display -->
          <div class="border bg-white rounded-lg shadow-lg p-4">
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                {#each $usersQuery.data?.pages.flatMap((page: { users: any; }) => page.users) as user}
                  {#if user.username === selectedUser}
                    <div>
                      <p class="text-lg font-semibold text-[#30363C]">{user.username}</p>
                      <p class="text-base text-[#4F585E]">☎ {user.mobile}</p>
                      {#if user.type === 'FirmUser'}
                        <p class="text-base text-[#4F585E]">Hospital/Medical Name: {user.HospitalMedicalName || 'N/A'}</p>
                        <p class="text-base text-[#4F585E]">GSTIN: {user.GSTIN || 'N/A'}</p>
                      {/if}
                    </div>
                    <!-- Address Section -->
                    <div class="mt-4">
                      <div class="flex justify-between items-center">
                        <h4 class="text-base font-medium text-[#4F585E]">Address</h4>
                        <button
                          on:click={() => {
                            if (isEditingAddress) {
                              $updateUserAddressMutation.mutate({
                                userId: user._id,
                                address: editedAddress
                              });
                            } else {
                              isEditingAddress = true;
                            }
                          }}
                          class="text-[#01A0E2] text-sm font-medium"
                          disabled={$updateUserAddressMutation.isPending}
                        >
                          {isEditingAddress ? ($updateUserAddressMutation.isPending ? 'Saving...' : 'Save') : 'Edit'}
                        </button>
                      </div>
                      {#if isEditingAddress}
                        <div class=" gap-5 items-center  flex  flex-wrap mt-2">
                          <div>
                            <label class="block text-sm text-[#4F585E] mb-1">Area</label>
                            <input
                              type="text"
                              bind:value={editedAddress.area}
                              class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                            />
                          </div>
                          <div>
                            <label class="block text-sm text-[#4F585E] mb-1">Flat Number</label>
                            <input
                              type="text"
                              bind:value={editedAddress.flatNo}
                              class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                            />
                          </div>
                          <div>
                            <label class="block text-sm text-[#4F585E] mb-1">Nearby Landmark</label>
                            <input
                              type="text"
                              bind:value={editedAddress.nearbyPlaces}
                              class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                            />
                          </div>
                        </div>
                      {:else}
                        <p class="text-base text-[#4F585E] mt-2">
                          {user.address.flatNo}, {user.address.area}, {user.address.nearbyPlaces}
                        </p>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
              <button
                on:click={() => {
                  selectedUser = '';
                  searchQuery = '';
                  isEditingAddress = false;
                  $usersQuery.refetch();
                }}
                class="text-red-500"
              >
                <Icon icon="mdi:cancel-octagon-outline" class="w-5 h-5" />
              </button>
            </div>
          </div>
        {:else}
          <!-- Search Box -->
          <div class="relative w-full h-12">
            <input
              type="text"
              placeholder="Search Users"
              class="w-full absolute top-1/2 border transform h-14 -translate-y-1/2 text-base md:pl-16 pl-10 rounded-full focus:outline-none focus:ring-0 text-gray-700"
              bind:value={searchQuery}
              on:input={(e: { currentTarget: { value: any; }; }) => debouncedSearch(e.currentTarget.value)}
              on:click={openDrawer}
              bind:this={inputElement}
            />
            <img
              class="absolute left-1 md:w-[45px] w-[32px] top-1/2 transform -translate-y-1/2 text-gray-400"
              src="/svg/search.svg"
              alt="search"
            />
          </div>
          {#if isDrawerOpen}
            <div
              class="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[300px] overflow-y-auto"
              role="dialog"
              aria-label="User search results"
              bind:this={drawerElement}
              bind:this={scrollContainer}
            >
              <div class="p-4">
                {#if $usersQuery.isLoading}
                  <p class="text-base text-[#4F585E] text-center py-4">Loading users...</p>
                {:else if $usersQuery.error}
                  <p class="text-base text-red-500 text-center py-4">Error: {$usersQuery.error.message}</p>
                {:else if searchResults.length > 0}
                  {#each searchResults as result}
                    <button
                      class="w-full text-left px-4 py-2 text-base text-[#30363C] hover:bg-[#F3FBFF] rounded-md"
                      on:click={() => selectUser(result)}
                      on:keydown={(e: { key: string; }) => {
                        if (e.key === 'Enter' || e.key === ' ') selectUser(result);
                      }}
                      role="option"
                      aria-selected={selectedUser === result}
                    >
                      {result}
                    </button>
                  {/each}
                  {#if $usersQuery.isFetchingNextPage}
                    <p class="text-base text-[#4F585E] text-center py-4">Loading more users...</p>
                  {/if}
                {:else}
                  <p class="text-base text-[#4F585E] text-center py-4">No users found</p>
                {/if}
              </div>
              <button
                class="w-full text-center flex items-center justify-center gap-2 px-4 py-2 text-lg text-[#01A0E2] border-t border-gray-200 hover:bg-gray-100"
                on:click|stopPropagation={openDialog}
                on:keydown={(e: { key: string; }) => {
                  if (e.key === 'Enter' || e.key === ' ') openDialog();
                }}
              >
                <Icon icon="mdi:add-to-photos" />
                Add User
              </button>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Dialog for Adding User -->
      {#if isDialogOpen}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 transition-all duration-300">
          <div
            class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[60vh] overflow-y-auto scrollbar-hide"
            role="dialog"
            aria-label="Add user form"
            bind:this={dialogElement}
          >
            <div class="flex justify-between">
              <h3 class="text-lg font-semibold text-[#30363C] mb-4">Add New User</h3>
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div on:click={closeDialog} class="cursor-pointer">
                <Icon icon="mdi:cancel-octagon-outline" class="text-red-500 h-5 w-5" />
              </div>
            </div>
            <form on:submit|preventDefault={handleFormSubmit} class="space-y-4">
              <!-- Radio Buttons -->
              <div class="flex gap-4">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    value="individual"
                    bind:group={userType}
                    class="h-4 w-4 text-[#01A0E2] focus:ring-[#01A0E2]"
                  />
                  <span class="text-base text-[#4F585E]">Individual</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    value="firm"
                    bind:group={userType}
                    class="h-4 w-4 text-[#01A0E2] focus:ring-[#01A0E2]"
                  />
                  <span class="text-base text-[#4F585E]">Firm</span>
                </label>
              </div>

              <!-- Common Fields -->
              <div>
                <label class="block text-sm text-[#4F585E] mb-1" for="name">Name</label>
                <input
                  id="name"
                  type="text"
                  bind:value={formData.name}
                  class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                  required
                />
              </div>
              <div>
                <label class="block text-sm text-[#4F585E] mb-1" for="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  bind:value={formData.phone}
                  class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                  required
                  maxlength="10"
                  title="Phone number must be 10 digits"
                />
              </div>

              <!-- Firm-Specific Fields -->
              {#if userType === 'firm'}
                <div>
                  <label class="block text-sm text-[#4F585E] mb-1" for="hospitalName">Hospital/Medical Name</label>
                  <input
                    id="hospitalName"
                    type="text"
                    bind:value={formData.hospitalName}
                    class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm text-[#4F585E] mb-1" for="gstin">GSTIN</label>
                  <input
                    id="gstin"
                    type="text"
                    bind:value={formData.gstin}
                    class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                    required
                    title="Invalid GSTIN format"
                  />
                </div>
              {/if}

              <!-- Address Fields -->
              <div>
                <h4 class="text-sm font-medium text-[#4F585E] mb-2">Address</h4>
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm text-[#4F585E] mb-1" for="area">Area</label>
                    <input
                      id="area"
                      type="text"
                      bind:value={formData.area}
                      class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-sm text-[#4F585E] mb-1" for="flatNumber">Flat Number</label>
                    <input
                      id="flatNumber"
                      type="text"
                      bind:value={formData.flatNumber}
                      class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-sm text-[#4F585E] mb-1" for="landmark">Nearby Landmark</label>
                    <input
                      id="landmark"
                      type="text"
                      bind:value={formData.landmark}
                      class="w-full border border-gray-300 rounded-lg p-2 text-base text-[#4F585E] focus:outline-none focus:ring-2 focus:ring-[#01A0E2]"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Save Button -->
              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  class="px-4 py-2 text-base text-[#4F585E] hover:bg-gray-100 rounded-lg"
                  on:click={closeDialog}
                  on:keydown={(e: { key: string; }) => {
                    if (e.key === 'Enter' || e.key === ' ') closeDialog();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-[#01A0E2] text-white rounded-lg text-base hover:bg-[#0190C8]"
                  disabled={$createUserMutation.isPending}
                >
                  {#if $createUserMutation.isPending}
                    Saving...
                  {:else}
                    Save
                  {/if}
                </button>
              </div>
            </form>
          </div>
        </div>
      {/if}

      <!-- Desktop Address Section -->
      <div class="border hidden bg-white lg:flex justify-between rounded-lg shadow-lg p-3">
      <div on:click={()=>{$placeOrderMutation.mutate()}} class="bg-[#01A0E2] w-full text-center py-2  rounded-md text-white font-medium  lg:text-lg md:text-md text-sm">
        Order Now
      </div>
      </div>
    </div>
  </div>
</div>
{:else}
<div class="container max-w-2xl my-20 py-20 rounded-lg shadow-lg flex-col gap-3 flex justify-center items-center">
  <p class="text-lg font-medium">Please login to access Cart</p>
  <button on:click={() => goto('/login')} class="bg-[#01A0E2] hover:bg-[#01A0E2] rounded-lg px-4 text-lg text-white py-2">Login</button>
</div>
{/if}

<Footer />