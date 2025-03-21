<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Switch } from '$lib/components/ui/switch';
    import { offerStore, saveOfferData, updateOfferField, initializeOfferStore } from '$lib/pages/offer/offer-store';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
  
    let isSubmitting = false;
    let percentage: string = '';
    let minPrd: string = '';
    let isActive: boolean = true;
  
    // Initialize component with store data
    onMount(() => {
      initializeOfferStore();
    });
  
    // Subscribe to store changes
    $: if ($offerStore.data) {
      percentage = $offerStore.data.percentage?.toString() || '';
      minPrd = $offerStore.data.minPrd?.toString() || '';
      isActive = $offerStore.data.isActive !== undefined ? $offerStore.data.isActive : true;
    }
  
    // Validate input
    function validateNumber(value: string): boolean {
      return /^[0-9]+$/.test(value);
    }
  
    // Handle form submission
    async function handleSubmit() {
      if (!validateNumber(percentage)) {
        toast.error('Discount must be a valid number');
        return;
      }
  
      if (!validateNumber(minPrd)) {
        toast.error('Minimum product quantity must be a valid number');
        return;
      }
  
      // Update store with form values
      updateOfferField('percentage', parseInt(percentage));
      updateOfferField('minPrd', parseInt(minPrd));
      updateOfferField('isActive', isActive);
  
      // Save data
      isSubmitting = true;
      try {
        const result = await saveOfferData();
        if (result && result.status) {
          toast.success('Flat offer saved successfully');
        } else {
          toast.error('Failed to save flat offer');
        }
      } catch (error) {
        console.error('Error saving flat offer:', error);
        toast.error('An error occurred while saving');
      } finally {
        isSubmitting = false;
      }
    }
  </script>
  
  <div class="max-w-[50%] text-maintext mt-10 pl-[10%]">
    <form on:submit|preventDefault={handleSubmit} class="grid gap-4 py-4">
      <!-- Discount Field -->
      <div>
        <Label for="discount">Discount (%)</Label>
        <Input
          id="discount"
          class="pr-10 mt-1"
          placeholder="Ex: 10"
          bind:value={percentage}
        />
        {#if percentage && !validateNumber(percentage)}
          <span class="text-xs text-red-500">Discount must be a valid number</span>
        {/if}
      </div>
  
      <!-- Minimum Quantity Field -->
      <div>
        <Label for="minQty">Minimum Product Quantity</Label>
        <Input
          id="minQty"
          class="pr-10 mt-1"
          placeholder="Ex: 5"
          bind:value={minPrd}
        />
        {#if minPrd && !validateNumber(minPrd)}
          <span class="text-xs text-red-500">Minimum quantity must be a valid number</span>
        {/if}
      </div>
  
      <!-- Active Status -->
      <div class="flex items-center space-x-2">
        <Switch id="active-status" checked={isActive} onCheckedChange={(checked) => isActive = checked} />
        <Label for="active-status">Active</Label>
      </div>
  
      <!-- Save Button -->
      <Button class="w-[100px]" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </Button>
    </form>
  </div>