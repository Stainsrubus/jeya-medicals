<!-- Footer.svelte -->
<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { _axios } from '$lib/_axios';
    import { imgUrl } from '$lib/config';
    import Icon from '@iconify/svelte';
    import { Skeleton } from "$lib/components/ui/skeleton/index.js"; // Import ShadCN Skeleton
  
    // Define the type for a brand
    interface Brand {
      name: string;
      image: string;
    }
  
    // Define the type for a category
    interface Category {
      name: string;
    }
  
    // Define the type for the brand API response
    interface BrandResponse {
      brands: Brand[];
      status: boolean;
      total: number;
      message: string;
    }
  
    // Define the type for the category API response
    interface CategoryResponse {
      categories: Category[];
      status: string;
      showMessage: string;
    }
  
    // Fetch brands using Svelte Query
    const brandsQuery = createQuery<Brand[]>({
      queryKey: ['brands'],
      queryFn: async () => {
        try {
          const response = await _axios.get('/brand/all', {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('Brands API Response:', response.data);
          const data: BrandResponse = response.data;
          if (!data.status) {
            throw new Error(data.message || 'Failed to fetch brands');
          }
          return data.brands;
        } catch (error) {
          console.error('Error fetching brands:', error);
          throw error;
        }
      },
      retry: 1,
      staleTime: 0,
      enabled: true,
    });
  
    // Fetch categories using Svelte Query
    const categoryQuery = createQuery<Category[]>({
      queryKey: ['category'],
      queryFn: async () => {
        try {
          const response = await _axios.get('/categories/all?limit=5', {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('Categories API Response:', response.data);
          const data: CategoryResponse = response.data;
          if (data.status !== 'success') {
            throw new Error(data.showMessage || 'Failed to fetch categories');
          }
          return data.categories;
        } catch (error) {
          console.error('Error fetching categories:', error);
          throw error;
        }
      },
      retry: 1,
      staleTime: 0,
      enabled: true,
    });
  
    // Access query states for brands
    $: brands = $brandsQuery.data ?? [];
    $: brandsLoading = $brandsQuery.isLoading;
    $: brandsError = $brandsQuery.error ? ($brandsQuery.error as Error).message : null;
  
    // Access query states for categories
    $: categories = $categoryQuery.data ?? [];
    $: categoriesLoading = $categoryQuery.isLoading;
    $: categoriesError = $categoryQuery.error ? ($categoryQuery.error as Error).message : null;
  </script>
  
  <footer class="text-[#30363C] py-10 bg-footer-gradient">
    <!-- Trusted Brand Partners Section -->
    <div class="px-4 md:px-6 lg:px-8">
      <h2 class="md:text-3xl text-2xl font-bold text-[#30363C] text-center">Trusted Brand Partners</h2>
      <div class="flex justify-center lg:gap-20 md:gap-12 gap-5 md:my-14 my-8">
        {#if brandsLoading || brandsError}
          <!-- Skeleton Loader for Brands -->
          <div class="flex justify-center lg:gap-20 md:gap-12 gap-5">
            {#each Array(5) as _} <!-- Adjust based on typical number of brands -->
              <Skeleton class="h-32 w-32 rounded-full" />
            {/each}
          </div>
        {:else}
          {#if brands.length === 0}
            <div class="text-center text-lg">No brands available</div>
          {:else}
          <div class="overflow-x-auto flex gap-10 scrollbar-hide">
            {#each brands as brand}
            <img
              src={imgUrl + brand.image}
              alt={brand.name}
              class="lg:max-h-20 md:max-h-14 max-h-12 object-contain"
            />
          {/each}
          </div>
          {/if}
        {/if}
      </div>
    </div>
  
    <!-- Main Footer Section -->
    <div class="px-4 md:px-6 lg:px-8 lg:mt-20 md:mt-14 mt-10 ">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <!-- Column 1: Company Description -->
        <div>
          <div class="flex items-center gap-3 mb-4">
            <img
              src="/logo.png"
              alt="Jeya Medical Enterprises"
              class="lg:h-28 md:h-20 h-16"
            />
          </div>
          <p class="lg:text-xl md:text-lg text-base text-[#4F585E] leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </div>
  
        <!-- Column 2: Categories -->
        <div class="lg:pl-32">
          <h3 class="lg:text-3xl md:text-2xl text-xl text-[#30363C] font-bold mb-4">Categories</h3>
          {#if categoriesLoading || categoriesError}
            <!-- Skeleton Loader for Categories -->
            <ul class="space-y-2">
              {#each Array(6) as _} <!-- 5 categories + "View More" -->
                <li>
                  <Skeleton class="h-6 w-32" />
                </li>
              {/each}
            </ul>
          {:else}
            {#if categories.length === 0}
              <div class="text-xl text-[#4F585E]">No categories available</div>
            {:else}
              <ul class="space-y-2">
                {#each categories as category}
                  <li>
                    <a href={`/`} class="lg:text-xl md:text-lg text-base hover:underline text-[#4F585E]">
                      {category.name}
                    </a>
                  </li>
                {/each}
                <li>
                  <a href="/Products" class="md:text-lg text-base text-[#01A0E2] hover:underline">View More</a>
                </li>
              </ul>
            {/if}
          {/if}
        </div>
  
        <!-- Column 3: Quick Links -->
        <div class="lg:pl-10">
          <h3 class="lg:text-3xl md:text-2xl text-xl text-[#30363C] font-bold mb-4">Quick Links</h3>
          <ul class="space-y-2 text-[#4F585E]">
            <li>
              <a href="/address-management" class="lg:text-xl md:text-lg text-base hover:underline">Address Management</a>
            </li>
            <li>
              <a href="/order-history" class="lg:text-xl md:text-lg text-base hover:underline">Order History</a>
            </li>
            <li>
              <a href="/demand-products" class="lg:text-xl md:text-lg text-base hover:underline">Demand Products</a>
            </li>
            <li>
              <a href="/wishlist" class="lg:text-xl md:text-lg text-base hover:underline">Wishlist</a>
            </li>
            <li>
              <a href="/" class="lg:text-xl md:text-lg text-base hover:underline">Notification</a>
            </li>
            <li>
              <a href="/cart" class="lg:text-xl md:text-lg text-base hover:underline">Cart</a>
            </li>
          </ul>
        </div>
  
        <!-- Column 4: Contact Us -->
        <div class="pr-10">
          <h3 class="lg:text-3xl md:text-2xl text-xl text-[#30363C] font-bold mb-4">Contact Us</h3>
          <ul class="space-y-3">
            <li class="flex items-start gap-2">
              <Icon icon="mynaui:location-selected" class="text-[#01A0E2] h-12 w-12 mt-1" />
              <span class="lg:text-lg text-base text-[#4F585E]">
                12A Gandhi Street, Vadassery, Nagercoil, PIN Code - 629001
              </span>
            </li>
            <li class="flex items-center gap-2">
              <Icon icon="mynaui:telephone-call" class="text-[#01A0E2] h-7 w-7" />
              <span class="lg:text-lg text-base text-[#4F585E]">+91 8873958948</span>
            </li>
            <li class="flex items-center gap-2">
              <Icon icon="iconoir:mail" class="text-[#01A0E2] h-7 w-7" />
              <a href="mailto:jeyamedical@gmail.com" class="lg:text-lg text-base text-[#4F585E] hover:underline">
                jeyamedical@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>