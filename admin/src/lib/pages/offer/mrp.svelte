<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Switch } from '$lib/components/ui/switch';
    import { offerStore, saveOfferData, updateOfferField, initializeOfferStore, changeOfferMode } from '$lib/pages/offer/offer-store';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import Icon from '@iconify/svelte';
    import { _axios } from '$lib/_axios';
  
    let isSubmitting = false;
    let isActive: boolean = true;
    let searchQuery = '';
    let productResults: any[] = [];
    let isLoading = false;
    let newProduct = { productId: '', productName: '', mrpReduction: '', price: 0 };
    let dropdownOpen = false;
    let isSearching = false;
    let page = 1;
    let hasMore = true;
    let showDeleteDialog = false;
    let productToDelete: { productId: string; productName: string } | null = null;
    let localItems: any[] = [];
  
    onMount(async () => {
      await changeOfferMode('mrp');
      await initializeOfferStore();
      await searchProducts('');
    });
  
    $: if ($offerStore.data && $offerStore.data.items) {
      localItems = $offerStore.data.items.map((item) => {
        const product = typeof item.productId === 'object' && item.productId ? item.productId : { _id: item.productId, productName: '', price: 0 };
        return {
          productId: product._id || item.productId,
          productName: product.productName || '',
          price: product.price || 0,
          mrpReduction: item.mrpReduction?.toString() || '0',
          strikePrice: product.strikePrice || 0,
        };
      });
    }
  
    $: if ($offerStore.data) {
      isActive = $offerStore.data.isActive !== undefined ? $offerStore.data.isActive : true;
    }
  
    async function searchProducts(term: string, isLoadMore = false) {
      if (isLoadMore && !hasMore) return;
  
      isLoading = true;
      isSearching = true;
  
      try {
        const currentPage = isLoadMore ? page : 1;
        const response = await _axios.get(`/product/all?q=${term}&page=${currentPage}&limit=10`);
        const newProducts = response.data.products || [];
  
        if (isLoadMore) {
          productResults = [...productResults, ...newProducts];
        } else {
          productResults = newProducts;
        }
  
        hasMore = newProducts.length === 10;
        page = currentPage + 1;
      } catch (error) {
        console.error('Error searching products:', error);
        productResults = [];
      } finally {
        isLoading = false;
        isSearching = false;
      }
    }
  
    function validateNumber(value: string): boolean {
      return /^[0-9]+$/.test(value);
    }
  
    function removeItem(index: number) {
      openDeleteDialog(index);
    }
  
    function openDeleteDialog(index: number) {
      productToDelete = localItems[index];
      showDeleteDialog = true;
    }
  
    async function confirmDelete() {
      if (!productToDelete) return;
  
      try {
        const offerId = $offerStore.data?._id;
        if (!offerId) {
          toast.error('No offer ID found. Please save the offer first.');
          return;
        }
  
        const response = await _axios.delete(`/offer/remove-product`, {
          params: {
            id: offerId,
            productId: productToDelete.productId,
          },
        });
  
        if (response.data.status) {
          await initializeOfferStore();
          toast.success('Product removed successfully');
        } else {
          toast.error(response.data.message || 'Failed to remove product');
        }
      } catch (error) {
        console.error('Error removing product:', error);
        toast.error('An error occurred while removing the product');
      } finally {
        showDeleteDialog = false;
        productToDelete = null;
      }
    }
  
    function cancelDelete() {
      showDeleteDialog = false;
      productToDelete = null;
    }
  
    function selectProduct(product: { _id: string; productName: string; price: number; strikePrice?: number }) {
      newProduct.productId = product._id;
      newProduct.productName = product.productName;
      newProduct.price = product.price;
      searchQuery = product.productName;
      dropdownOpen = false;
    }
  
    async function addNewProduct() {
      if (!newProduct.productId || !validateNumber(newProduct.mrpReduction)) {
        toast.error('Please select a product and enter a valid MRP reduction value');
        return;
      }
  
      const existingProductIndex = localItems.findIndex((item) => item.productId === newProduct.productId);
  
      if (existingProductIndex >= 0) {
        toast.error('This product is already in the MRP offer list');
        newProduct = { productId: '', productName: '', mrpReduction: '', price: 0 };
        searchQuery = '';
        return;
      }
  
      try {
        const offerId = $offerStore.data?._id;
        if (!offerId) {
          toast.error('No offer ID found. Please save the offer first.');
          return;
        }
  
        const response = await _axios.post(`/offer/${offerId}/add-product`, {
          productId: newProduct.productId,
          mrpReduction: parseInt(newProduct.mrpReduction),
        });
  
        if (response.data.status) {
          await initializeOfferStore();
          toast.success('Product added successfully');
        } else {
          toast.error(response.data.message || 'Failed to add product');
        }
      } catch (error) {
        console.error('Error adding product:', error);
        toast.error('An error occurred while adding the product');
      }
  
      newProduct = { productId: '', productName: '', mrpReduction: '', price: 0 };
      searchQuery = '';
    }
  
    function updateMRPReduction(index: number, value: string) {
      if (validateNumber(value)) {
        localItems = [...localItems];
        localItems[index].mrpReduction = value;
      }
    }
  
    function calculateReducedPrice(price: number, mrpReduction: number): number {
      return price - mrpReduction;
    }
  
    async function handleSubmit() {
  if (localItems.length === 0) {
    toast.error('Please add at least one product with an MRP reduction');
    return;
  }

  isSubmitting = true;
  try {
    const offerId = $offerStore.data?._id;
    if (!offerId) {
      toast.error('No offer ID found. Please save the offer first.');
      return;
    }

    // First update the products
    const response = await _axios.patch(
      `/offer/update-products`,
      {
        products: localItems.map((item) => ({
          productId: item.productId,
          mrpReduction: parseInt(item.mrpReduction),
        })),
      },
      {
        params: { id: offerId },
      }
    );

    if (response.data.status) {
      // Refresh the store with the latest data
      await initializeOfferStore();
      
      // Now update just the isActive status if needed
      if ($offerStore?.data.isActive !== isActive) {
        updateOfferField('isActive', isActive);
        const saveResult = await saveOfferData();
        if (saveResult && saveResult.status) {
          toast.success('MRP offer saved successfully');
        } else {
          toast.error('Failed to update active status');
        }
      } else {
        toast.success('MRP offer saved successfully');
      }
    } else {
      toast.error(response.data.message || 'Failed to update MRP reductions');
    }
  } catch (error) {
    console.error('Error saving MRP offer:', error);
    toast.error('An error occurred while saving');
  } finally {
    isSubmitting = false;
  }
}
  
    function handleProductSearch(event: { target: { value: any } }) {
      const term = event.target.value;
      searchQuery = term;
      page = 1;
      hasMore = true;
      searchProducts(term);
    }
  
    function handleFocus() {
      dropdownOpen = true;
    }
  
    function handleBlur() {
      setTimeout(() => {
        dropdownOpen = false;
      }, 200);
    }
  
    function handleScroll(event: Event) {
      const dropdown = event.target as HTMLElement;
      if (dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - 10) {
        searchProducts(searchQuery, true);
      }
    }
  </script>
  
  <div class="flex w-full gap-6 mt-10">
    <div class="w-full lg:w-1/3 p-4 shadow rounded-md bg-white dark:bg-gray-800">
      <h3 class="text-lg font-medium mb-4">Add New Product MRP Offer</h3>
      
      <div class="mb-4">
          <Label class="block text-sm font-medium mb-1">Select Product</Label>
          <div class="relative">
              <Input
                  id="product-search"
                  type="text"
                  placeholder="Select or search for a product..."
                  bind:value={searchQuery}
                  autocomplete="off"
                  oninput={handleProductSearch}
                  onfocus={handleFocus}
                  onblur={handleBlur}
                  class="w-full"
              />
              {#if dropdownOpen}
              <div
              class="dropdown-container absolute z-20 w-full bg-white dark:bg-gray-900 mt-1 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto"
              onscroll={handleScroll}
            >
              {#if isSearching}
                <div class="p-2 text-gray-500">Searching...</div>
              {:else if productResults.length > 0}
                {#each productResults as product}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center"
                    onmousedown={() => selectProduct({
                      _id: product._id,
                      productName: product.productName,
                      price: product.price,
                      strikePrice: product.strikePrice
                    })}
                  >
                    <span class="text-black dark:text-white">{product.productName}</span>
                    <span class="text-black dark:text-white">₹{product.price}</span>
                  </div>
                {/each}
                {#if hasMore && !isSearching}
                  <div class="p-2 text-gray-500">Loading more...</div>
                {/if}
              {:else}
                <div class="p-2 text-gray-500">No products found</div>
              {/if}
            </div>
              {/if}
          </div>
      </div>
  
      <div class="mb-4">
          <Label class="block text-sm font-medium mb-1">MRP Reduction Value (₹)</Label>
          <Input
              type="number"
              placeholder="Enter MRP reduction value"
              bind:value={newProduct.mrpReduction}
              class="w-full"
          />
      </div>
  
      {#if newProduct.productId && newProduct.mrpReduction}
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
              <div class="text-sm text-gray-500 dark:text-gray-400">Preview</div>
              <div class="flex justify-between items-center mt-1">
                  <div>
                      <div class="font-medium">{newProduct.productName}</div>
                      <div class="text-sm">Original: ₹{newProduct.price.toFixed(2)}</div>
                  </div>
                  <div class="text-right">
                      <div class="font-medium text-green-600 dark:text-green-400">
                          ₹{calculateReducedPrice(newProduct.price, parseInt(newProduct.mrpReduction)).toFixed(2)}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">Reduction: ₹{newProduct.mrpReduction}</div>
                  </div>
              </div>
          </div>
      {/if}
  
      <Button onclick={addNewProduct} class="w-full">
          <Icon icon="lucide:plus" class="h-4 w-4 mr-2" />
          Add Product
      </Button>
    </div>
    
    <div class="w-2/3 pr-4 shadow bg-white p-5 rounded-lg">
      <div class="mb-4 flex justify-between">
        <h3 class="text-lg font-medium mb-2">Product MRP Offers</h3>
        <div class="flex items-center space-x-2">
          <Label for="active-status">Active</Label>
          <Switch id="active-status" checked={isActive} onchange={(e) => isActive = e.currentTarget.checked} />
        </div>
      </div>
      
      {#if localItems.length === 0}
        <div class="text-center py-16 border rounded-md bg-gray-50">
          <Icon icon="lucide:package" class="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p class="text-gray-500">No products added yet.</p>
          <p class="text-sm text-gray-400">Add products from the form on the right</p>
        </div>
      {:else}
        <div class="border rounded-md overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-100 text-black">
              <tr>
                <th class="py-2 px-4 text-left font-medium">Product</th>
                <th class="py-2 px-4 text-left font-medium">Price</th>
                <th class="py-2 px-4 text-left font-medium w-24">Reduction</th>
                <th class="py-2 px-4 text-left font-medium">Final</th>
                <th class="py-2 px-4 text-right font-medium w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {#each localItems as item, index}
                <tr class="border-t hover:bg-gray-50">
                  <td class="py-2 px-4">
                    <div>
                      <span class="font-medium text-gray-600">{item.productName || 'Unknown Product'}</span>
                    </div>
                  </td>
                  <td class="py-2 px-4 text-gray-600">
                    {#if item.price}
                      ₹{item.price.toFixed(2)}
                    {/if}
                  </td>
                  <td class="py-2 px-4">
                    <Input 
                      value={item.mrpReduction} 
                      class="h-8"
                      oninput={(e) => updateMRPReduction(index, e.currentTarget.value)}
                    />
                  </td>
                  <td class="py-2 px-4 text-gray-600">
                    {#if item.price && item.mrpReduction}
                      ₹{calculateReducedPrice(item.price, parseInt(item.mrpReduction)).toFixed(2)}
                    {/if}
                  </td>
                  <td class="py-2 px-4 text-right">
                    <Button 
                      type="button" 
                      size="icon" 
                      class="h-8 w-8 bg-red-600 hover:bg-red-700"
                      onclick={() => removeItem(index)}
                    >
                      <Icon icon="lucide:trash-2" class="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
  
        <div class="mt-4 flex justify-between items-center">
          <div></div>
          <Button onclick={handleSubmit} disabled={isSubmitting} class="px-6">
            {#if isSubmitting}
              <Icon icon="lucide:loader" class="h-4 w-4 animate-spin mr-2" />
              Saving...
            {:else}
              <Icon icon="lucide:save" class="h-4 w-4 mr-2" />
              Save Changes
            {/if}
          </Button>
        </div>
      {/if}
    </div>
  </div>
  
  {#if showDeleteDialog && productToDelete}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 class="text-lg font-medium mb-4">Confirm Deletion</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to remove <span class="font-medium">{productToDelete.productName}</span> from the MRP offer list?
        </p>
        <div class="flex justify-end space-x-2">
          <Button variant="outline" onclick={cancelDelete}>Cancel</Button>
          <Button class="bg-red-600 hover:bg-red-700" onclick={confirmDelete}>Confirm</Button>
        </div>
      </div>
    </div>
  {/if}