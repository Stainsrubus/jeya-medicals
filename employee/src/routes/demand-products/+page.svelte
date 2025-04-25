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
        message = '';
        uploadedImageUrl = null;
        files = null;
        if (fileInput) fileInput.value = ''; // Reset file input
      },
      onError: (error) => {
        toast.error(error.message || 'An error occurred while submitting the demand.');
      },
    });
  
    // Handle file input change
    const handleFileChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      files = target.files;
      if (files && files.length > 0) {
        const file = files[0]; // Use the first file for preview
        uploadedImageUrl = URL.createObjectURL(file); // Generate preview URL
      } else {
        uploadedImageUrl = null; // Clear if no files
      }
      console.log('Files selected:', files);
    };
  
    // Handle file drop
    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      const droppedFiles = event.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) {
        files = droppedFiles;
        const file = droppedFiles[0]; // Use the first file for preview
        uploadedImageUrl = URL.createObjectURL(file); // Generate preview URL
      } else {
        uploadedImageUrl = null; // Clear if no files
      }
      console.log('Files dropped:', files);
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
      if (!productName.trim()) {
        toast.error('Product name is required.');
        return;
      }
      if (!message.trim()) {
        toast.error('Message is required.');
        return;
      }
  
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('message', message);
      if (files) {
        for (let i = 0; i < files.length; i++) {
          formData.append('file', files[i]);
        }
      } else {
        toast.error('Please upload at least one file.');
        return;
      }
      console.log('Form Data:', formData);
      $demandMutation.mutate(formData); // Trigger mutation
    };
  </script>
  
  {#if isLoggedIn}
  <div class="max-w-2xl md:mx-auto mx-4 my-10 border p-6 bg-white rounded-lg shadow-lg">
    <h2 class="text-3xl font-semibold text-center mb-6">Demand Box</h2>
  
    <div>
      <p class="text-gray-400 text-center text-lg mb-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </p>
  
      <!-- File Upload Section -->
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
            Supported formats: JPEG, PNG, GIF, MP4, PDF, PSD, AI, Word, PPT
          </p>
          <input
            type="file"
            multiple
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
            placeholder="Enter product name"
            class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
          />
        </div>
  
        <div>
          <label for="message" class="block text-xl font-medium text-[#30363C]">Message</label>
          <textarea
            id="message"
            bind:value={message}
            placeholder="Enter message"
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
  