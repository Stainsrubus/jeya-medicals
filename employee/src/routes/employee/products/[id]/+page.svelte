<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { _axios } from '$lib/_axios';
    import { imgUrl } from '$lib/config';
    import { Skeleton } from '$lib/components/ui/skeleton/index.js';
    import { writableGlobalStore } from '$lib/stores/global-store';
    import Icon from '@iconify/svelte';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';

    interface Product {
        id: string;
        name: string;
        images: string[];
        description?: string;
        brandName?: string;
        categoryName?: string;
        specifications?: {
            name: string;
            fields: Record<string, string>;
        }[];
    }

    // Extract product ID from URL
    $: productId = $page.params.id;
    $: token = browser ? localStorage.getItem('empToken') || '' : $writableGlobalStore.token;

    // Track selected image index
    let selectedImageIndex = 0;

    // Query for fetching product details
    const productQuery = createQuery<Product>({
        queryKey: ['product', productId],
        queryFn: async () => {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await _axios.get(`/products/${productId}`, { headers });
            if (!response.data.status) {
                throw new Error(response.data.message || 'Failed to fetch product');
            }
            const product = response.data.data;
            return {
                id: product._id,
                name: product.productName,
                images: product.images || [],
                description: product.description,
                brandName: product.brand.name,
                categoryName: product.category.name,
                specifications: product.specifications
            };
        },
        retry: 1,
        staleTime: 0,
    });

    $: product = $productQuery.data;
    $: isLoading = $productQuery.isLoading;
    $: error = $productQuery.error ? ($productQuery.error as Error).message : null;

    // Function to handle image selection
    function selectImage(index: number) {
        selectedImageIndex = index;
    }
</script>

<div class="container px-4 py-8 h-[100dvh-20px]">
    {#if isLoading}
        <div class="max-w-4xl mx-auto">
            <div class="flex flex-col md:flex-row gap-8">
                <Skeleton class="w-full md:w-1/2 h-96 rounded-lg" />
                <div class="w-full md:w-1/2 space-y-4">
                    <Skeleton class="h-8 w-3/4" />
                    <Skeleton class="h-6 w-1/2" />
                    <Skeleton class="h-16 w-full" />
                    <Skeleton class="h-6 w-1/3" />
                    <Skeleton class="h-6 w-2/3" />
                    <Skeleton class="h-6 w-1/2" />
                </div>
            </div>
        </div>
    {:else if error}
        <div class="text-center py-10 text-red-500">
            <p>{error}</p>
            <button
                on:click={() => $productQuery.refetch()}
                class="mt-4 bg-[#008ECC] text-white px-6 py-2 rounded-full"
            >
                Retry
            </button>
        </div>
    {:else if product}
        <div class="">
            <div class="flex flex-col md:flex-row gap-8 w-full">
                <!-- Product Images -->
                <div class="  flex gap-5 ">
                    <!-- Main Image -->
                    <div class="bg-gray-100  rounded-lg flex items-center justify-center h-96">
                        {#if product.images.length > 0}
                            <img
                                src={imgUrl + product.images[selectedImageIndex]}
                                alt={product.name}
                                class="h-96 w-96  object-contain"
                               
                            />
                        {:else}
                            <Icon icon="mdi:image-off" class="w-32 h-32 text-gray-400" />
                        {/if}
                    </div>

                    <!-- Thumbnail Navigation -->
                    {#if product.images.length > 1}
                        <div class="flex gap-2 flex-col overflow-x-auto ">
                            {#each product.images as image, index}
                                <button
                                    on:click={() => selectImage(index)}
                                    class={`w-16 h-16 flex-shrink-0 rounded border ${selectedImageIndex === index ? 'border-blue-500' : 'border-gray-300'}`}
                                >
                                    <img
                                        src={imgUrl + image}
                                        alt={`Thumbnail ${index + 1}`}
                                        class="w-full h-full object-cover"
                                    />
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Product Details -->

                <div class=" space-y-6">
                 
                    <div class="flex gap-2 text-sm text-[#4F585E]">
                        <span class="text-sm text-[#4F585E]"> <span class="text-[#147097]">BRAND:</span> {product.brandName}</span>
                        <span class="text-sm text-[#4F585E]"> <span class="text-[#147097]">CATEGORY:</span> {product.categoryName}</span>
                        {#each product.options || [] as option}
                          <span class="text-sm text-[#4F585E]"> <span class="text-[#147097]">{option.title.toUpperCase()}</span>: {selectedOptions[option.title]?.toUpperCase()}</span>
                        {/each}
                      </div>
                    <h1 class="text-3xl font-bold text-gray-800">{product.name}</h1>

                    {#if product.description}
                        <div class="prose max-w-none text-gray-600">
                            {@html product.description.replace(/\n/g, '<br>')}
                        </div>
                    {/if}

                    <!-- Specifications -->
                    {#if product.specifications?.length > 0}
                        <div class="space-y-4">
                            <h2 class="text-xl font-semibold text-gray-800">Specifications</h2>
                            {#each product.specifications as spec}
                                <div class="space-y-2">
                                    {#if spec.name}
                                        <h3 class="font-medium text-gray-700">{spec.name}</h3>
                                    {/if}
                                    <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {#each Object.entries(spec.fields) as [key, value]}
                                            {#if value && value.trim() !== ''}
                                                <div class="text-sm">
                                                    <span class="font-medium text-gray-600">{key}:</span>
                                                    <span class="ml-2 text-gray-800">{value}</span>
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-gray-500">No specifications available</p>
                    {/if}

                 
                </div>
            </div>
        </div>
    {:else}
        <div class="text-center py-10">
            <p class="text-lg text-gray-600">Product not found</p>
        </div>
    {/if}
</div>

<style>
    @media (max-width: 768px) {
        .container {
            padding: 1rem;
        }
    }
</style>