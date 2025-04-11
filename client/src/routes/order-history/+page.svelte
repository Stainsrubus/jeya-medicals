<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { _axios } from '$lib/_axios';
    import { toast } from 'svelte-sonner';
    import { Skeleton } from "$lib/components/ui/skeleton/index.js";
    import Icon from '@iconify/svelte';
    import { imgUrl } from '$lib/config';
	import Footer from '$lib/components/footer.svelte';
	import { goto } from '$app/navigation';
	import { writableGlobalStore } from '$lib/stores/global-store';
  
    interface Product {
      _id: string;
      productId: {
		size: any;
		brand: any;
        _id: string;
        productName: string;
        price: number;
        images: string[];
      };
      quantity: number;
      totalAmount: number;
      customSuggestion: string;
    }
  

    interface Order {
      _id: string;
      orderId: string;
      products: Product[];
      store: string;
      deliveryAgent: string | null;
      preparationTime: number;
      mapPloygonResponse: string;
      deliveryTime: string | null;
      deliverySeconds: number;
      distance: string;
      couponDiscount: number;
      deliveryPrice: number;
      platformFee: number;
      subtotal: number;
      tax: number;
      totalPrice: number;
      status: string;
      paymentMethod: string;
      paymentStatus: string;
      razorPayResponse: string;
      razorOrderId: string;
      razorPayId: string;
      tipsRazorPayId: string;
      tipsRazorPayResponse: string;
      tips: number;
      preparedAt: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
    }
  
    interface OrderResponse {
      message: string;
      status: boolean;
      orders: Order[];
    }
    $: isLoggedIn = $writableGlobalStore.isLogedIn;
    const ordersQuery = createQuery<OrderResponse>({
      queryKey: ['orders'],
      queryFn: async () => {
        const token = localStorage.getItem('token');
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
  
    $: filteredOrders = $ordersQuery.data?.orders.filter(order => {
      if (activeTab === 'not yet shipped' && order.status === 'pending') return true;
      if (activeTab === 'cancelled' && order.status === 'cancelled') return true;
      if (activeTab === 'delivered' && order.status === 'delivered') return true;
      return false;
    }) || [];
  </script>
  {#if isLoggedIn}
  <div class="xl:max-w-[75%] 2xl:max-w-[60%] lg:max-w-[85%] md:max-w-[75%]   mx-auto p-4 pt-10 pb-20">
    <h2 class="lg:text-3xl md:text-2xl text-xl font-bold text-[#30363C] mb-4">Your Orders</h2>
  
    <!-- Tab Navigation -->
    <div class="flex space-x-4  mb-4">
      <button
        class="px-4 py-2 lg:text-xl text-lg  font-medium {activeTab === 'not yet shipped' ? 'border-b-2 border-[#01A0E2] text-[#01A0E2]' : 'text-[#4F585E] hover:text-gray-700'}"
        onclick={() => (activeTab = 'not yet shipped')}
      >
        Not yet Shipped
      </button>
      <button
        class="px-4 py-2 lg:text-xl text-lg font-medium {activeTab === 'cancelled' ? 'border-b-2 border-[#01A0E2] text-[#01A0E2]' : 'text-[#4F585E] hover:text-gray-700'}"
        onclick={() => (activeTab = 'cancelled')}
      >
        Cancelled
      </button>
      <button
        class="px-4 py-2 lg:text-xl text-lg font-medium {activeTab === 'delivered' ? 'border-b-2 border-[#01A0E2] text-[#01A0E2]' : 'text-[#4F585E] hover:text-gray-700'}"
        onclick={() => (activeTab = 'delivered')}
      >
        Order Delivered
      </button>
    </div>
  
    <!-- Order List -->
    {#if $ordersQuery.isLoading}
      <Skeleton class="w-full h-24" />
    {:else if $ordersQuery.error}
      <p class="text-red-500">Error: {$ordersQuery.error.message}</p>
    {:else if filteredOrders.length === 0}
      <p class="text-gray-500">No orders found in this category</p>
    {:else}
      <div class="lg:space-y-4 space-y-6">
        {#each filteredOrders as order}
          <div onclick={()=>{goto(`/order-history/${order._id}`)}} class="border rounded-lg  bg-white shadow-md">
            <!-- Order Details -->
            <div class="flex  space-x-3 justify-between p-4 bg-[#F2F4F5] ">
              <div>
                <p class="text-lg text-[#4F585E]">Order Placed</p>
                <p class="font-semibold text-[#30363C] text-base">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p class="text-lg text-[#4F585E]">Order Delivered</p>
                <p class="font-semibold text-[#30363C] text-base">{order.deliveryTime ? new Date(order.deliveryTime).toLocaleDateString() : '-'}</p>
              </div>
              <div class="lg:block hidden">
                <p class="text-lg text-[#4F585E]">Ship To</p>
                <p class="font-semibold text-[#30363C] text-base">12 Gandhi Street, vadasery...</p>
              </div>
              <div class="lg:block hidden">
                <p class="text-lg text-[#4F585E]">Total Amount</p>
                <p class="font-semibold text-[#30363C] text-base">₹{order.totalPrice.toFixed(2)}</p>
              </div>
              <div class="lg:block hidden">
                <p class="text-lg text-[#4F585E]">Order Id</p>
                <p class="font-semibold text-[#30363C] text-base">#{order.orderId}</p>
              </div>
              <div class="lg:flex items-center  hidden">
                <button class="text-[#147097] hover:underline">Reorder</button>
              </div>
              <div class=" flex flex-col items-end  lg:hidden">
                <p class="font-semibold text-[#30363C] text-base">₹{order.totalPrice.toFixed(2)}</p>
                <button class="text-[#147097] text-xl hover:underline">Reorder</button>
              </div>
            </div>
  <div class="lg:hidden  flex px-4 py-2 justify-between">
    <div class="block lg:hidden">
      <p class="text-base "> <span class="text-[#4F585E]">Ship To: </span>  <span class="text-sm !text-[#30363C] font-semibold">12 Gandhi Street, vadasery...</span></p>
    </div>
    <p class="font-semibold text-[#30363C] text-base">#{order.orderId}</p>
  </div>
            <!-- Product List -->
            {#each order.products as product}
              <div class="flex items-center space-x-4 py-2 p-4 lg:border-t border-b ">
                <img
                  src={imgUrl + product.productId.images[0] || 'placeholder.png'}
                  alt={product.productId.productName}
                  class="w-12 h-12 object-cover rounded"
                />
                <div class="flex-1">
                  <p class="lg:text-xl text-lg font-semibold text-[#30363C] ">{product.productId.productName}</p>
                 <div class="flex gap-4">
                    <p class="text-sm text-gray-500">
                        <span class="text-[#147097]">BRAND:</span>{product.productId.brand} 
                       </p>
                       <!-- <p class="text-xs text-gray-500">
                         <span class="text-[#147097]">SIZE:</span> {product.productId.size} 
                        </p> -->
                        <p class="text-sm text-gray-500">
                            <span class="text-[#147097]">QUANTITY: </span> {product.quantity} 
                           </p>
                           <p class="text-sm text-gray-500">
                            <span class="text-[#147097]">AMOUNT::</span> ₹{product.totalAmount.toFixed(2)}
                           </p>
                 </div>
                </div>
                <button class="text-[#01A0E2] lg:block hidden text-lg hover:underline">Buy Again</button>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>
 {:else}
  <div class="container max-w-2xl my-20 py-20 rounded-lg shadow-lg flex-col gap-3 flex justify-center items-center">
    <p class="text-lg font-medium">Please login to access Order History</p>
    <button onclick={()=>{goto('/login')}} class="bg-[#01A0E2] hover:bg-[#01A0E2] rounded-lg px-4 text-lg text-white py-2">Login</button>
    </div>
    {/if}
  <Footer />

  