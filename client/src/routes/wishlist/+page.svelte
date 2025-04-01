<!-- ProductsPage.svelte -->
<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { _axios } from '$lib/_axios';
    import { imgUrl } from '$lib/config';
    import { Skeleton } from "$lib/components/ui/skeleton/index.js";
    import ProductCard from '$lib/components/productCard.svelte';
    import * as Breadcrumb from "$lib/components/ui/breadcrumb";
    import Footer from '$lib/components/footer.svelte';
    import { writableGlobalStore } from '$lib/stores/global-store';
  
    // Define interfaces for API responses
    interface Category {
      name: string;
    }
  
    interface Brand {
      name: string;
    }
  
    interface Product {
      id: string | number;
      name: string;
      image: string;
      discount: number;
      MRP: number;
      strikePrice: number;
      description?: string;
      ratings?: number;
      categoryId?: string;
      categoryName?: string;
      favorite: boolean; // Ensure favorite is included
    }
  
    interface CategoryResponse {
      categories: Category[];
      status: string;
      showMessage: string;
    }
  
    interface BrandResponse {
      brands: Brand[];
      status: boolean;
      total: number;
      message: string;
    }
  
    $: isLoggedIn = $writableGlobalStore.isLogedIn; // Fixed typo: isLogedIn -> isLoggedIn
  
    // Fetch categories
    const categoryQuery = createQuery<Category[]>({
      queryKey: ['category'],
      queryFn: async () => {
        const response = await _axios.get('/categories/all?limit=10', {
          headers: { 'Content-Type': 'application/json' },
        });
        const data: CategoryResponse = response.data;
        if (data.status !== 'success') {
          throw new Error(data.showMessage || 'Failed to fetch categories');
        }
        return data.categories;
      },
      retry: 1,
      staleTime: 0,
      enabled: true,
    });
  
    // Fetch brands
    const brandsQuery = createQuery<Brand[]>({
      queryKey: ['brands'],
      queryFn: async () => {
        const response = await _axios.get('/brand/all', {
          headers: { 'Content-Type': 'application/json' },
        });
        const data: BrandResponse = response.data;
        if (!data.status) {
          throw new Error(data.message || 'Failed to fetch brands');
        }
        return data.brands;
      },
      retry: 1,
      staleTime: 0,
      enabled: true,
    });
  
    // Fetch favorite products
    const productsQuery = createQuery<Product[]>({
      queryKey: ['favorites'],
      queryFn: async () => {
        // Only fetch favorites if the user is logged in
        if (!isLoggedIn) {
          return []; // Return empty array if not logged in
        }
  
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found. Please log in.');
        }
  
        const response = await _axios.get('/favorites/getfavorites', {
          params: { limit: 1000, page: 1 }, // Removed userId from params
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.data.status) {
          throw new Error(response.data.error || 'Failed to fetch favorite products');
        }
  
        const favorites = response.data.favorites;
        if (!favorites || favorites.length === 0) {
          return []; // Return empty array if no favorites
        }
  
        // Flatten the products from all favorites documents
        const allProducts = favorites.flatMap((favorite: any) =>
          favorite.products.map((product: any) => ({
            id: product._id,
            name: product.productName,
            image: product.images && product.images.length > 0 ? product.images[0] : '',
            discount: product.discount || 0,
            MRP: product.price,
            strikePrice: product.strikePrice || product.price,
            description: product.description,
            ratings: product.ratings,
            categoryId: product.category,
            categoryName: product.categoryName, // Note: categoryName is not in the response, may need to adjust
            favorite: true, // All products from /getfavorites are favorites
          }))
        );
  
        return allProducts;
      },
      enabled: isLoggedIn, // Only fetch if the user is logged in
      retry: 1,
      staleTime: 0,
    });
  
    // Access query states
    $: categories = $categoryQuery.data ?? [];
    $: categoriesLoading = $categoryQuery.isLoading;
    $: categoriesError = $categoryQuery.error ? ($categoryQuery.error as Error).message : null;
  
    $: brands = $brandsQuery.data ?? [];
    $: brandsLoading = $brandsQuery.isLoading;
    $: brandsError = $brandsQuery.error ? ($brandsQuery.error as Error).message : null;
  
    $: products = $productsQuery.data ?? [];
    $: productsLoading = $productsQuery.isLoading;
    $: productsError = $productsQuery.error ? ($productsQuery.error as Error).message : null;
  
    // Filter states
    let selectedCategories: string[] = [];
    let selectedBrand: string | null = null;
    let selectedPrice: string | null = null;
  
    // Handle category filter
    function toggleCategory(category: string) {
      if (selectedCategories.includes(category)) {
        selectedCategories = selectedCategories.filter((cat) => cat !== category);
      } else {
        selectedCategories = [...selectedCategories, category];
      }
    }
  
    // Filtered products based on selections
    $: filteredProducts = products.filter((product) => {
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(product.categoryName || '');
      const matchesBrand = !selectedBrand || product.brand === selectedBrand;
      const matchesPrice = !selectedPrice || product.MRP <= parseInt(selectedPrice);
      return matchesCategory && matchesBrand && matchesPrice;
    });
  </script>
  
  <section class="bg-[#F2F4F5] py-4 px-4 md:px-6 lg:px-8">
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/" class='text-[#4F585E] hover:text-[#01A0E2] text-base'>Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/wishlist" class='text-[#01A0E2] text-base'>Wishlist</Breadcrumb.Link>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </section>
  
  <div class="flex min-h-screen px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
    <!-- Sidebar: Categories -->
    <aside class="w-64 p-6 border rounded-lg h-fit bg-white shadow-md">
      <h2 class="text-2xl font-bold text-[#30363C] mb-4">Categories</h2>
      {#if categoriesLoading || categoriesError}
        <div class="space-y-3">
          {#each Array(5) as _}
            <div class="flex items-center gap-2">
              <Skeleton class="h-5 w-5" />
              <Skeleton class="h-5 w-32" />
            </div>
          {/each}
        </div>
      {:else}
        <div class="space-y-3">
          {#each categories as category}
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                class="h-5 w-5 text-blue-600"
                checked={selectedCategories.includes(category.name)}
                on:change={() => toggleCategory(category.name)}
              />
              <span class="text-lg text-[#4F585E]">{category.name}</span>
            </label>
          {/each}
        </div>
      {/if}
    </aside>
  
    <!-- Main Content -->
    <main class="flex-1 p-6">
      <!-- Header -->
      <div class="flex items-center mb-6">
        <div class="w-1/2">
          <!-- <h1 class="text-2xl font-bold text-[#30363C]">
            Surgical Accessories - Instrument/Equipment Accessories
          </h1>
          <div class="flex gap-2 mt-2">
            {#if selectedBrand}
              <span class="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                {selectedBrand} <button on:click={() => (selectedBrand = null)}>✕</button>
              </span>
            {/if}
            {#if selectedPrice}
              <span class="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                ₹{selectedPrice} <button on:click={() => (selectedPrice = null)}>✕</button>
              </span>
            {/if}
          </div> -->
        </div>
        <div class="w-1/2 flex">
          <div class="w-1/2"></div>
          <div class="border py-7 flex w-1/2 rounded-full bg-white p-1">
            <div class="relative w-full">
              <input
                type="text"
                placeholder="Search medical products"
                class="w-full absolute top-1/2 transform -translate-y-1/2 text-xl pl-16 rounded-full focus:outline-none focus:ring-0 text-gray-700"
              />
              <img
                class="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400"
                src="/svg/search.svg"
                alt="search"
              />
            </div>
          </div>
        </div>
      </div>
  
      <!-- Product Grid -->
      <div class="mb-4 text-right text-[#4F585E]">{filteredProducts.length} results found</div>
      {#if productsLoading}
        <div class="flex flex-wrap gap-10">
          {#each Array(12) as _}
            <div class="w-56 bg-white rounded-xl shadow-md overflow-hidden">
              <Skeleton class="h-48 w-56" />
              <div class="px-4 py-2 space-y-2">
                <Skeleton class="h-5 w-3/4" />
                <div class="flex items-center gap-2">
                  <Skeleton class="h-4 w-12" />
                  <Skeleton class="h-4 w-12" />
                </div>
                <Skeleton class="h-4 w-20" />
              </div>
            </div>
          {/each}
        </div>
      {:else if productsError}
        <div class="text-red-500">{productsError}</div>
      {:else if filteredProducts.length === 0}
        <div class="text-center text-[#4F585E]">
          No favorite products found.
        </div>
      {:else}
        <div class="flex flex-wrap gap-10">
          {#each filteredProducts as product (product.id)}
            <ProductCard
              id={product.id}
              image={product.image}
              discount={product.discount}
              name={product.name}
              MRP={product.MRP}
              strikePrice={product.strikePrice}
              favorite={product.favorite}
            />
          {/each}
        </div>
      {/if}
    </main>
  </div>
  <Footer />