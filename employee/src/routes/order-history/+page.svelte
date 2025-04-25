<script lang="ts">
  import { createMutation, createQuery } from '@tanstack/svelte-query';
  import { _axios } from '$lib/_axios';
  import { toast } from 'svelte-sonner';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import Icon from '@iconify/svelte';
  import { imgUrl } from '$lib/config';
  import Footer from '$lib/components/footer.svelte';
  import { goto } from '$app/navigation';
  import { writableGlobalStore } from '$lib/stores/global-store';
	import { queryClient } from '$lib/query-client';

  interface Address {
  flatNo: string;
  area: string;
  nearbyPlaces: string;
}

interface ProductId {
  _id: string;
  productName: string;
  price: number;
  images: string[];
  brand?: {
    _id: string;
    name: string;
  };
  size?: any; // Adjust based on actual structure if known
}

interface Product {
  _id: string;
  productId: ProductId;
  name: string;
  quantity: number;
  totalAmount: number;
  options: Array<{
    title: string;
    value: string;
    _id: string;
  }>;
}

interface User {
  HospitalMedicalName: boolean;
  type: string;
  _id: string;
  mobile: number;
  username: string;
}

interface Order {
  _id: string;
  orderId: string;
  invoiceId: string;
  employee: string;
  user: User;
  store: string;
  address: Address;
  products: Product[];
  subtotal: number;
  tax: number;
  totalPrice: number;
  platformFee: number;
  deliveryPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface OrderResponse {
  message: string;
  status: boolean;
  orders: Order[];
}

let isDialogOpen = false;
    let dialogElement: HTMLDivElement | null = null;
  let isLoggedIn = $writableGlobalStore.isLoggedIn;
  const ordersQuery = createQuery<OrderResponse>({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      try {
        const response = await _axios.get('/orders/orderhistory', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to fetch orders');
        }
        return response.data;
      } catch (error) {
        throw error instanceof Error ? error : new Error('An unexpected error occurred');
      }
    },
    retry: 1,
    staleTime: 0,
    enabled: true,
  });

  let activeTab = 'not yet shipped';
  let showDialog = false;
  let selectedOrderId = '';
  let selectedProductId = '';
  const orderToCancel = {
  _id :'',
  orderId:'',
  status:''
};
  $: filteredOrders = $ordersQuery.data?.orders.filter(order => {
    if (activeTab === 'not yet shipped' && order.status === 'pending') return true;
    if (activeTab === 'not yet shipped' && order.status === 'accepted') return true;
    if (activeTab === 'not yet shipped' && order.status === 'ready for delivery') return true;
    if (activeTab === 'cancelled' && order.status === 'cancelled') return true;
    if (activeTab === 'cancelled' && order.status === 'rejected') return true;
    if (activeTab === 'delivered' && order.status === 'delivered') return true;
    return false;
  }) || [];

  const cancelOrderMutation = createMutation({
    mutationFn: async (orderId) => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      try {
        const response = await _axios.post(`/orders/cancel/${orderId}`, {}, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to cancel the order');
        }
        goto('/order-history')
        return response.data;
      } catch (error) {
        throw error instanceof Error ? error : new Error('An unexpected error occurred');
      }
    },
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      // Refetch the order to update the status
      $ordersQuery.refetch();
      orderToCancel.status='';
      orderToCancel._id=''
      orderToCancel.orderId=''
    },
    onError: (error:any) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order. Please try again.');
      orderToCancel.status='';
      orderToCancel._id='';
      orderToCancel.orderId=''
    },
  });

  const handleCancelOrder = async (orderId:any,status:any) => {
    try {
      if (!$ordersQuery.data?.orders) {
        toast.error('Order details not available');
        return;
      }
      const orderStatus = status;

      // Check if order can be cancelled
      if (orderStatus !== 'pending' && orderStatus !== 'accepted') {
        toast.error('This order cannot be cancelled.');
        return;
      }
      else{
        isDialogOpen=false
        $cancelOrderMutation.mutate(orderId);
      }
    } catch (error) {
      toast.error('Failed to cancel order. Please try again.');
    }
  };

  // Reorder mutation
  const reorderMutation = createMutation({
    mutationFn: async ({ products }: { products: any[] }) => {
      const token = localStorage.getItem('empToken');
      if (!token) {
        throw new Error('No token found. Please log in.');
      }

      const response = await _axios.post(
        '/cart/reorder',
        { products },
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to reorder products');
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Products reordered successfully!');
    //@ts-ignore
    queryClient.invalidateQueries(['cart']);
      //@ts-ignore
      queryClient.invalidateQueries(['cartCount']);
      goto('/cart')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder products');
    },
  });

  // Handle reorder
  const handleReorder = async (orderId: string) => {
    try {
      const order = $ordersQuery.data?.orders.find(o => o._id === orderId);
      if (!order) {
        toast.error('Order details not available');
        return;
      }

      const productsToReorder = order.products.map(product => ({
        productId: product.productId._id,
        quantity: product.quantity,
        options: product.options || [],
        // selectedOffer: product.selectedOffer?.offerType === 'Flat' ? product.selectedOffer : null,
      }));

      const hasSelectedOffer = productsToReorder.some(product => product.selectedOffer !== null);

      if (hasSelectedOffer) {
        selectedOrderId = orderId;
        selectedProductId = productsToReorder.find(product => product.selectedOffer !== null)?.productId;
        showDialog = true;
      } else {
        $reorderMutation.mutate({ products: productsToReorder });
      }
    } catch (error) {
      toast.error('Failed to reorder. Please try again.');
    }
  };

  const handleDialogAction = (action: string) => {
    if (action === 'revisit') {
      goto(`/Products/${selectedProductId}`);
    } else if (action === 'reorder') {
      const order = $ordersQuery.data?.orders.find(o => o._id === selectedOrderId);
      if (order) {
        const productsToReorder = order.products.map(product => ({
          productId: product.productId._id,
          quantity: product.quantity,
          options: product.options || [],
          selectedOffer: product.selectedOffer?.offerType === 'Flat' ? product.selectedOffer : null,
        }));
        $reorderMutation.mutate({ products: productsToReorder });
      }
    }
    showDialog = false;
  };
</script>

{#if isLoggedIn}
<div class="xl:max-w-[75%] 2xl:max-w-[60%] lg:max-w-[85%] md:max-w-[75%] bg-white mx-auto p-4 pb-20">
  <div class="fixed bg-white w-full pt-5 -mt-4">
    <h2 class="lg:text-3xl md:text-2xl text-xl font-bold text-[#30363C] mb-4">Your Orders</h2>

    <!-- Tab Navigation -->
    <div class="flex space-x-4 mb-4">
      <button
        class="px-4 py-2 lg:text-xl text-lg font-medium {activeTab === 'not yet shipped' ? 'border-b-2 border-[#01A0E2] text-[#01A0E2]' : 'text-[#4F585E] hover:text-gray-700'}"
        on:click={() => (activeTab = 'not yet shipped')}
      >
        Not yet Shipped
      </button>
      <button
        class="px-4 py-2 lg:text-xl text-lg font-medium {activeTab === 'cancelled' ? 'border-b-2 border-[#01A0E2] text-[#01A0E2]' : 'text-[#4F585E] hover:text-gray-700'}"
        on:click={() => (activeTab = 'cancelled')}
      >
        Cancelled
      </button>
      <!-- <button
        class="px-4 py-2 lg:text-xl text-lg font-medium {activeTab === 'delivered' ? 'border-b-2 border-[#01A0E2] text-[#01A0E2]' : 'text-[#4F585E] hover:text-gray-700'}"
        on:click={() => (activeTab = 'delivered')}
      >
        Order Delivered
      </button> -->
    </div>
  </div>

  <!-- Order List -->
  <div class="mt-32">
    {#if $ordersQuery.isLoading}
      <Skeleton class="w-full h-24" />
    {:else if $ordersQuery.error}
      <p class="text-red-500">Error: {$ordersQuery.error.message}</p>
    {:else if filteredOrders.length === 0}
      <p class="text-gray-500">No orders found in this category</p>
    {:else}
      <div class="lg:space-y-4 space-y-6">
        {#each filteredOrders as order}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div on:click={() => goto(`/order-history/${order._id}`)} class="border rounded-lg bg-white shadow-md cursor-pointer">
            <!-- Order Details -->
            <div class="flex space-x-3 justify-between p-4 bg-[#F2F4F5]">
              <div>
                <p class="text-lg text-[#4F585E]">Order Placed</p>
                <p class="font-semibold text-[#30363C] text-base">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p class="text-lg text-[#4F585E]">Ordered For</p>
                {#if order.user.type==='FirmUser'&& order?.user.HospitalMedicalName}
                <p class="font-semibold text-[#30363C] text-base capitalize">{order.user.HospitalMedicalName}, {order.user.mobile}</p> <!-- Update if delivery date is available -->
{:else}
                <p class="font-semibold text-[#30363C] text-base capitalize">{order.user.username}, {order.user.mobile}</p> <!-- Update if delivery date is available -->
             {/if}
              </div>
              <div class="lg:block hidden max-w-xs">
                <p class="text-lg text-[#4F585E]">Ship To</p>
                <p class="font-semibold text-[#30363C] text-base truncate">
                  {order.address.flatNo}, {order.address.area}
                </p>
              </div>
           
              <div class="lg:block hidden">
                <p class="text-lg text-[#4F585E]">Order Id</p>
                <p class="font-semibold text-[#30363C] text-base">#{order.orderId}</p>
              </div>
              <div class="lg:flex items-center hidden">
                {#if order.status === 'pending' || order.status === 'accepted'}
                  <button
                    class="text-[#FF080C] lg:text-lg text-base font-medium rounded-md"
                    on:click|stopPropagation={() => {
                      orderToCancel._id = order._id;
                      orderToCancel.status=order.status;
                      orderToCancel.orderId=order.orderId;
                      isDialogOpen = true;
                    }}
                  >
                    Cancel Order
                  </button>
                {:else if order.status === 'delivered'}
                  <!-- <button
                    class="text-[#147097] lg:text-xl md:text-lg text-base font-medium rounded-md"
                    on:click|stopPropagation={() => handleReorder(order._id)}
                  >
                    Reorder
                  </button> -->
                {/if}
              </div>
              <div class="flex flex-col items-end lg:hidden">
                <p class="font-semibold text-[#30363C] text-base">₹{order.totalPrice.toFixed(2)}</p>
                {#if order.status === 'pending' || order.status === 'accepted'}
                  <button
                    class="text-[#FF080C] lg:text-lg text-base font-medium rounded-md"
                    on:click|stopPropagation={() => {
                      orderToCancel._id = order._id;
                      orderToCancel.orderId=order.orderId;
                      orderToCancel.status=order.status;
                      isDialogOpen = true;
                    }}
                  >
                    Cancel Order
                  </button>
                {:else if order.status === 'delivered'}
                  <!-- <button
                    class="text-[#147097] lg:text-xl md:text-lg text-base font-medium rounded-md"
                    on:click|stopPropagation={() => handleReorder(order._id)}
                  >
                    Reorder
                  </button> -->
                {/if}
              </div>
            </div>

            <div class="lg:hidden flex px-4 py-2 justify-between">
              <div class="block lg:hidden">
                <div class="text-base">
                  <span class="text-[#4F585E]">Ship To: </span>
                  <p class="font-semibold text-[#30363C] text-base truncate">
                    {order.address.flatNo}, {order.address.area}
                  </p>
                </div>
              </div>
              <p class="font-semibold text-[#30363C] text-base">#{order.orderId}</p>
            </div>

            <!-- Product List -->
            {#each order.products as product}
              <div class="flex items-center space-x-4 py-2 p-4 lg:border-t border-b">
                <div class="bg-[#F5F5F5] border-[#EDEDED] border rounded-lg">
                  <img
                    src={imgUrl + (product.productId.images[0] || 'placeholder.png')}
                    alt={product.productId.productName}
                    class="w-20 h-16 object-contain rounded px-2 py-1"
                  />
                </div>
                <div class="flex-1">
                  <p class="lg:text-xl text-lg font-semibold text-[#30363C]">{product.productId.productName}</p>
                  <div class="flex flex-wrap gap-4 mt-2">
                    <p class="text-sm text-gray-500">
                      <span class="text-[#147097]">BRAND:</span> {product.productId.brand?.name || 'N/A'}
                    </p>
                    {#if product.options && product.options.length > 0}
                      {#each product.options as option}
                        <p class="text-sm text-gray-500">
                          <span class="text-[#147097]">{option.title.toUpperCase()}:</span> {option.value}
                        </p>
                      {/each}
                    {/if}
                    <p class="text-sm text-gray-500">
                      <span class="text-[#147097]">QUANTITY:</span> {product.quantity}
                    </p>
                  
                  </div>
                </div>
                <button
                  class="text-[#01A0E2] lg:block hidden text-lg hover:underline"
                  on:click|stopPropagation={() => handleReorder(order._id)}
                >
                  Buy Again
                </button>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
{/if}


{#if isDialogOpen}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 transition-all duration-300">
          <div
            class="bg-white rounded-lg flex gap-3 flex-col items-center  shadow-lg p-6 w-full max-w-md max-h-[60vh] overflow-y-auto scrollbar-hide"
            role="dialog"
            aria-label="Add user form"
            bind:this={dialogElement}
          >
          <p>Are sure need to cancel the order ({`${orderToCancel.orderId}`})?</p>
        <div class="flex justify-center gap-5 items-center">
          <button on:click={handleCancelOrder(orderToCancel?._id,orderToCancel?.status)} class="px-3 py-2 shadow-sm bg-[#01A0E2] text-white rounded-lg font-medium">Confirm</button>
          <button on:click={()=>{isDialogOpen=false;  orderToCancel.status='';
      orderToCancel._id=''}} class="px-3 py-2 shadow-sm bg-red-600 border text-white rounded-lg font-medium">Decline</button>
        </div>
          </div>
        </div>
      {/if}
<Footer />
