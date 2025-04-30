<script lang="ts">
  import { onMount } from 'svelte';
  import Footer from '$lib/components/footer.svelte';
  import Icon from '@iconify/svelte';
  import { toast } from 'svelte-sonner';
  import { createMutation } from '@tanstack/svelte-query';
  import { _axios } from '$lib/_axios';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { goto } from '$app/navigation';

  interface DemandResponse {
    status: boolean;
    message: string;
    data?: any;
  }

  $: isLoggedIn = $writableGlobalStore.isLogedIn;
  let files: FileList | null = null;
  let productName = '';
  let preferredBrand = '';
  let quantity = '';
  let deliveryTimePreference = '';
  let ratePreference = '';
  let message = '';
  let uploadedImageUrl: string | null = null;
  let fileInput: HTMLInputElement;

  // Create mutation for demand submission
  const demandMutation = createMutation<DemandResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found. Please log in.');

      const response = await _axios.post('/demand/create', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.status) throw new Error(response.data.message || 'Failed to submit demand.');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Demand submitted successfully!');
      productName = '';
      preferredBrand = '';
      quantity = '';
      deliveryTimePreference = '';
      ratePreference = '';
      message = '';
      uploadedImageUrl = null;
      files = null;
      if (fileInput) fileInput.value = ''; // Reset file input
    },
    onError: (error) => {
      toast.error(error.message || 'An error occurred while submitting the demand.');
    },
  });

  // Validate file type is image (jpeg, jpg, png)
  const isValidImageType = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    return validTypes.includes(file.type);
  };

  // Handle file input change
  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const selectedFiles = target.files;

    if (selectedFiles && selectedFiles.length > 0) {
      const file = selectedFiles[0];

      if (!isValidImageType(file)) {
        toast.error('Please upload only JPEG, JPG or PNG images.');
        target.value = '';
        files = null;
        uploadedImageUrl = null;
        return;
      }

      files = selectedFiles;
      uploadedImageUrl = URL.createObjectURL(file); // Generate preview URL
    } else {
      uploadedImageUrl = null; // Clear if no files
    }
  };

  // Handle file drop
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer?.files;

    if (droppedFiles && droppedFiles.length > 0) {
      const file = droppedFiles[0];

      if (!isValidImageType(file)) {
        toast.error('Please upload only JPEG, JPG or PNG images.');
        return;
      }

      files = droppedFiles;
      uploadedImageUrl = URL.createObjectURL(file); // Generate preview URL
    } else {
      uploadedImageUrl = null; // Clear if no files
    }
  };

  // Handle drag over
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
  };

  // Remove uploaded image
  const removeImage = () => {
    uploadedImageUrl = null;
    files = null; // Clear the files list
    if (fileInput) fileInput.value = ''; // Reset file input
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInput) fileInput.click();
  };

  // Handle form submission with mutation
  const handleSubmit = (event: Event) => {
    event.preventDefault();

    // Validate fields
    if (!productName) {
      toast.error('Product name is required.');
      return;
    }
    if (!message) {
      toast.error('Message is required.');
      return;
    }
    if (!quantity) {
      toast.error('Quantity is required.');
      return;
    }


    const formData = new FormData();
    formData.append('productName', productName);
    formData.append('brandName', preferredBrand);
    formData.append('quantity', quantity);
    formData.append('timePreference', deliveryTimePreference);
    formData.append('ratePreference', ratePreference);
    formData.append('message', message);

    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
      }
    } else {
      toast.error('Please upload at least one image file.');
      return;
    }

    $demandMutation.mutate(formData); // Trigger mutation
  };
</script>

{#if isLoggedIn}
<div class="max-w-2xl md:mx-auto mx-4 my-10 border p-6 bg-white rounded-lg shadow-lg">
  <h2 class="text-3xl font-semibold text-center mb-6">Demand Box</h2>

  <div>
    <p class="text-gray-400 text-center text-lg mb-4">
      Submit your product request with all necessary details.
    </p>

    <!-- File Upload Section -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      ondrop={handleDrop}
      ondragover={handleDragOver}
      style="border: dashed; border-width: 1px; border-color: #BEC5E9; background-color: #F8F8FF;"
      class="flex flex-col items-center border rounded-lg mb-6 p-4 relative"
    >
      {#if uploadedImageUrl}
        <!-- Display uploaded image with remove button -->
        <div class="relative w-full h-48">
          <img
            src={uploadedImageUrl}
            alt="Uploaded Preview"
            class="w-full h-full object-contain rounded-lg"
          />
          <button
            onclick={removeImage}
            class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
          >
            ×
          </button>
        </div>
      {:else}
        <!-- Default upload area -->
        <div class="flex items-center justify-center py-4">
          <Icon icon="mdi:cloud-upload" class="text-4xl text-blue-500" />
        </div>
        <p class="text-[#333333] text-2xl mb-4 font-semibold">
          Drag & drop files or
          <button type="button" onclick={triggerFileInput} class="underline text-[#483EA8] cursor-pointer">
            Browse
          </button>
        </p>
        <p class="text-sm text-[#676767]">
          Supported formats: JPEG, JPG, PNG only
        </p>
        <input
          type="file"
          accept="image/jpeg, image/jpg, image/png"
          class="hidden"
          onchange={handleFileChange}
          bind:this={fileInput}
        />
      {/if}
    </div>

    <!-- Form Section -->
    <form onsubmit={handleSubmit} class="space-y-4">
      <div>
        <label for="productName" class="block text-xl font-medium text-[#30363C]">Product Name</label>
        <input
          type="text"
          id="productName"
          bind:value={productName}
          placeholder="Enter the product name you're looking for"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
        />
      </div>
      <div>
        <label for="preferredBrand" class="block text-xl font-medium text-[#30363C]">Preferred Brand</label>
        <input
          type="text"
          id="preferredBrand"
          bind:value={preferredBrand}
          placeholder="Enter your preferred brand"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
        />
      </div>
      <div>
        <label for="quantity" class="block text-xl font-medium text-[#30363C]">Quantity</label>
        <input
          type="number"
          id="quantity"
          bind:value={quantity}
          placeholder="How many items do you need?"
          min="1"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
        />
      </div>

      <div>
        <label for="deliveryTimePreference" class="block text-xl font-medium text-[#30363C]">Delivery Time Preference</label>
        <input
          type="text"
          id="deliveryTimePreference"
          bind:value={deliveryTimePreference}
          placeholder="When do you need this delivered? (12hrs, 24hrs)"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
        />
      </div>
      <div>
        <label for="ratePreference" class="block text-xl font-medium text-[#30363C]">Rate Preference</label>
        <input
          type="text"
          id="ratePreference"
          bind:value={ratePreference}
          placeholder="Your budget or rate expectations"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
        />
      </div>
      <div>
        <label for="message" class="block text-xl font-medium text-[#30363C]">Message</label>
        <textarea
          id="message"
          bind:value={message}
          placeholder="Provide additional details about your request"
          rows="4"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
        ></textarea>
      </div>

      <button
        type="submit"
        class="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xl font-medium text-white bg-[#01A0E2] focus:outline-none focus:ring-0"
        disabled={$demandMutation.isPending}
      >
        {#if $demandMutation.isPending}
          Submitting...
        {:else}
          Demand Product
        {/if}
      </button>
    </form>
  </div>
</div>
{:else}
<div class="container max-w-2xl my-20 py-20 rounded-lg shadow-lg flex-col gap-3 flex justify-center items-center">
  <p class="text-lg font-medium">Please login to Demand Products</p>
  <button onclick={()=>{goto('/login')}} class="bg-[#01A0E2] hover:bg-[#01A0E2] rounded-lg px-4 text-lg text-white py-2">Login</button>
  </div>
{/if}
<Footer />
