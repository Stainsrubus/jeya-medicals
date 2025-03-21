<script lang="ts">
	import { goto } from '$app/navigation';
	import { _axios } from '$lib/_axios';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { imgUrl } from '$lib/config';
	import { queryClient } from '$lib/query-client';
	import Icon from '@iconify/svelte';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { _productsSchema, productEditStore, type Option } from './schema';

	async function fetchCategories() {
		const res = await _axios.get(`/productcategory/select`);
		const data = await res.data;
		return data;
	}

	const categoryQuery = createQuery({
		queryKey: ['category select'],
		queryFn: () => fetchCategories()
	});

	async function fetchBrands() {
  const res = await _axios.get(`/brands/select`); 
  const data = await res.data;
  return data;
}

const brandQuery = createQuery({
  queryKey: ['brand select'],
  queryFn: () => fetchBrands(),
});

	let files = $state<File[]>([]);
	let edit = $state(false);
	let existingImages = $state<string[]>([]);
	let options = $state<Option[]>([]); // Track product options

	$effect(() => {
		if ($productEditStore.id) {
			edit = true;
			$form.category = $productEditStore.category?._id
				? `${$productEditStore.category._id} -&- ${$productEditStore.category.name}`
				: '';
				$form.brand = $productEditStore.brand?._id
      ? `${$productEditStore.brand._id} -&- ${$productEditStore.brand.name}`
      : '';
			$form.description = $productEditStore.description || '';
			$form.productName = $productEditStore.productName || '';
			$form.price = $productEditStore.price || '';
			$form.strikePrice = $productEditStore.strikePrice || '';
			// $form.rating = $productEditStore.rating || '';
			$form.productCode = $productEditStore.productCode || '';
			$form.topSeller = $productEditStore.topSeller || false;
			$form.gst = $productEditStore.gst || '';
			$form.active = $productEditStore.active || true;

			existingImages = Array.isArray($productEditStore.images)
				? $productEditStore.images
				: typeof $productEditStore.images === 'string' && $productEditStore.images
					? [$productEditStore.images]
					: [];

					if ($productEditStore.options?.length > 0) {
			options = $productEditStore.options;
		}
		} else {
			edit = false;
			reset();
			files = [];
			existingImages = [];
			options = [];
		}
	});
	const createProductMutation = createMutation({
		mutationFn: (data: FormData) =>
			edit
				? _axios.put(`/product/${$productEditStore.id}`, data)
				: _axios.post('/product/create', data),
		onSuccess({ data }) {
			queryClient.refetchQueries({
				queryKey: ['products fetch']
			});

			if (data.status === true) {
				if (edit) {
					$productEditStore.mode = 'list';
					reset();
					toast('Product Updated ✅');
					goto('/hidden-admin-base-007/dashboard/products?mode=list');

					$productEditStore.id = '';
					$productEditStore.category = {
						categoryNumber: 0,
						_id: '',
						name: ''
					};
					$productEditStore.brand = {
						_id: '',
						name: ''
					};
					$productEditStore.description = '';
					$productEditStore.productName = '';
					$productEditStore.price = '';
					$productEditStore.strikePrice = '';
					// $productEditStore.rating = '';
					$productEditStore.productCode = '';
					$productEditStore.topSeller = false;
					$productEditStore.images = '';
					$productEditStore.gst = '';
					$productEditStore.options = [];
				} else {
					toast('Product Created ✅');
				}
				reset();
				files = [];
				existingImages = [];
				options = [];
			} else {
				toast.error(data.message);
			}
		},
		onError(error, variables, context) {
			console.error('onError', error, variables, context);
			toast.error('An error occurred while processing your request.');
		}
	});

	const { form, errors, enhance, constraints, reset, validateForm } = superForm(
		defaults(zod(_productsSchema)),
		{
			SPA: true,
			validationMethod: 'oninput',
			validators: zod(_productsSchema),
			clearOnSubmit: 'none',
			invalidateAll: false,
			resetForm: false,
			async onSubmit() {
				const { valid } = await validateForm({
					focusOnError: true
				});

				if (!$form.category) {
					toast.error('Please select a category');
					return;
				}

				if (!valid) {
					// Show specific validation errors for each field
					for (const field in $errors) {
						if ($errors[field]) {
							toast.error(`${field}: ${$errors[field]}`);
						}
					}
					return;
				}

				if (files.length === 0 && (!edit || existingImages.length === 0)) {
					toast.error('Please upload at least one image');
					return;
				}

				let formdata = new FormData();
				formdata.append('productName', $form.productName);
				formdata.append('category', $form.category.split(' -&- ')[0]);
				formdata.append('brand', $form.brand.split(' -&- ')[0]); 
				formdata.append('price', $form.price);
				formdata.append('strikePrice', $form.strikePrice);
				// formdata.append('rating', $form.rating);
				formdata.append('productCode', $form.productCode);
				formdata.append('description', $form.description);
				for (let img of files) {
					formdata.append('images', img);
				}
				formdata.append('existingImages', JSON.stringify(existingImages));
				formdata.append('topSeller', $form.topSeller.toString());
				formdata.append('gst', $form.gst.toString());
				formdata.append('options', JSON.stringify(options));

				// Log the form data for debugging
				console.log('Form Data:', Object.fromEntries(formdata.entries()));

				$createProductMutation.mutate(formdata);
			}
		}
	);

	function addOption() {
		options = [...options, { title: '', values: [] }];
	}

	function removeOption(index: number) {
		options = options.filter((_, i) => i !== index);
	}

	function updateOptionTitle(index: number, title: string) {
		options = options.map((opt, i) => (i === index ? { ...opt, title } : opt));
	}

	function updateOptionValues(index: number, values: string[]) {
		options = options.map((opt, i) => (i === index ? { ...opt, values } : opt));
	}
</script>

<div
	class="max-w-[95%] mx-auto text-maintext h-[calc(100vh-60px)] overflow-y-auto hidescrollbarthumb"
>
<form method="POST" use:enhance class="grid gap-4 py-4 grid-cols-2">
	<div
		class="col-span-2 bg-zinc-200 text-zinc-900 p-2 rounded-md select-none"
		id="productformcreate"
	>
		<p class="font-bold">Product Details</p>
	</div>

	<div class="col-span-2 flex flex-col gap-2">
		<Label for="topSeller">Top Seller</Label>
		<Switch
			id="topSeller"
			class="mt-1"
			aria-invalid={$errors.topSeller ? 'true' : undefined}
			bind:checked={$form.topSeller}
			{...$constraints.topSeller}
		/>
		{#if $errors.topSeller}
			<span class="invalid text-xs text-red-500">{$errors.topSeller}</span>
		{/if}
	</div>

	<div>
		<Label>Product Name</Label>
		<Input
			class="pr-10 mt-1"
			placeholder="Ex: Roller Bandage"
			aria-invalid={$errors.productName ? 'true' : undefined}
			bind:value={$form.productName}
			{...$constraints.productName}
		/>
		{#if $errors.productName}
			<span class="invalid text-xs text-red-500">{$errors.productName}</span>
		{/if}
	</div>
	<div>
		<Label for="productCode">Product Code</Label>
		<Input
			id="productCode"
			class="pr-10 mt-1 uppercase"
			placeholder="Ex: RB001"
			aria-invalid={$errors.productCode ? 'true' : undefined}
			bind:value={$form.productCode}
			{...$constraints.productCode}
		/>
		{#if $errors.productCode}
			<span class="invalid text-xs text-red-500">{$errors.productCode}</span>
		{/if}
	</div>
	<div>
		<Label for="category">Category</Label>
		<Select.Root
			type="single"
			name="category"
			bind:value={$form.category}
			onValueChange={(value) => {
				$form.category = value;
			}}
		>
			<Select.Trigger class="pr-10 mt-1">
				{$form.category
					? $form.category.includes(' -&- ')
						? $form.category.split(' -&- ')[1]
						: $form.category
					: 'Select Category'}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.GroupHeading>Categories</Select.GroupHeading>
					{#each $categoryQuery.data?.categories || [] as category}
						<Select.Item value={`${category._id} -&- ${category.name}`} label={category.name}
							>{category.name}</Select.Item
						>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
		{#if $errors.category}
			<span class="invalid text-xs text-red-500">{$errors.category}</span>
		{/if}
	</div>
	<div>
		<Label for="brand">Brand</Label>
		<Select.Root
		  type="single"
		  name="brand"
		  bind:value={$form.brand}
		  onValueChange={(value) => {
			$form.brand = value;
		  }}
		>
		  <Select.Trigger class="pr-10 mt-1">
			{$form.brand
			  ? $form.brand.includes(' -&- ')
				? $form.brand.split(' -&- ')[1]
				: $form.brand
			  : 'Select Brand'}
		  </Select.Trigger>
		  <Select.Content>
			<Select.Group>
			  <Select.GroupHeading>Brands</Select.GroupHeading>
			  {#each $brandQuery.data?.brand || [] as brand}
				<Select.Item value={`${brand._id} -&- ${brand.name}`} label={brand.name}>
				  {brand.name}
				</Select.Item>
			  {/each}
			</Select.Group>
		  </Select.Content>
		</Select.Root>
		{#if $errors.brand}
		  <span class="invalid text-xs text-red-500">{$errors.brand}</span>
		{/if}
	  </div>
	<div>
		<Label for="price">Price</Label>
		<Input
			id="price"
			min="1"
			type="text"
			class="pr-10 mt-1"
			placeholder="Ex: 300"
			aria-invalid={$errors.price ? 'true' : undefined}
			bind:value={$form.price}
			{...$constraints.price}
		/>
		{#if $errors.price}
			<span class="invalid text-xs text-red-500">{$errors.price}</span>
		{/if}
	</div>
	<div>
		<Label for="price">Strike Price</Label>
		<Input
			id="strikePrice"
			min="1"
			type="text"
			class="pr-10 mt-1"
			placeholder="Ex: 400"
			aria-invalid={$errors.strikePrice ? 'true' : undefined}
			bind:value={$form.strikePrice}
			{...$constraints.strikePrice}
		/>
		{#if $errors.strikePrice}
			<span class="invalid text-xs text-red-500">{$errors.strikePrice}</span>
		{/if}
	</div>


	<div>
		<Label for="gst">Gst (%)</Label>
		<Input
			id="gst"
			class="pr-10 mt-1"
			placeholder="Ex: 1"
			aria-invalid={$errors.gst ? 'true' : undefined}
			bind:value={$form.gst}
			{...$constraints.gst}
		/>
		{#if $errors.gst}
			<span class="invalid text-xs text-red-500">{$errors.gst}</span>
		{/if}
	</div>

	<div class="col-span-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			class="pr-10 mt-1"
			placeholder="Ex: Fundamental tool is first aid and medical care"
			rows={5}
			aria-invalid={$errors.description ? 'true' : undefined}
			bind:value={$form.description}
			{...$constraints.description}
		/>
		{#if $errors.description}
			<span class="invalid text-xs text-red-500">{$errors.description}</span>
		{/if}
	</div>

	<div class="col-span-2">
		<Label>Images</Label>
		<button
			type="button"
			class="flex flex-col cursor-pointer justify-center items-center gap-2 h-[130px] bg-zinc-200 rounded-lg border-black border-[1px] w-full mt-2"
			onclick={() => {
				document.getElementById('files')?.click();
			}}
		>
			<Icon icon={'gravity-ui:files'} class="w-[50px] h-[50px] text-zinc-700" />
			<h4 class="text-gray-700">Click to Upload Files</h4>
			<h6 class="text-sm text-gray-500">(96 X 69) ~ 2 mb</h6>
		</button>

		<div class="flex flex-wrap gap-2 p-2">
			{#if edit && existingImages.length > 0}
				{#each existingImages as image}
					<div class="relative">
						<img
							class="w-[100px] h-[100px] object-cover rounded-md"
							src={`${imgUrl}${image}`}
							alt="Existing product"
						/>
						<button
							type="button"
							class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1"
							onclick={() => {
								existingImages = existingImages.filter((img) => img !== image);
							}}
						>
							<Icon icon="mdi:close" class="w-4 h-4 text-white" />
						</button>
					</div>
				{/each}
			{/if}
			{#each files as file}
				<div class="relative">
					<img
						class="w-[100px] h-[100px] object-cover rounded-md"
						src={URL.createObjectURL(file)}
						alt="New upload"
					/>
					<button
						type="button"
						class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1"
						onclick={() => {
							const newFiles = Array.from(files);
							newFiles.splice(newFiles.indexOf(file), 1);
							files = newFiles;
						}}
					>
						<Icon icon="mdi:close" class="w-4 h-4 text-white" />
					</button>
				</div>
			{/each}
		</div>
		{#if $errors.images}
			<span class="invalid text-xs text-red-500">{$errors.images}</span>
		{/if}
	</div>

	<div class="col-span-2">
		<Label>Options</Label>
		<button
			type="button"
			class="bg-blue-500 text-white px-4 py-2 rounded-md mb-4"
			onclick={addOption}
		>
		<Icon icon="mdi:add" class="w-4 h-4 text-white" />
		</button>
	
		{#each options as option, index}
			<div class="mb-4">
			<div class="flex justify-end">
				<button
				type="button"
				class="bg-red-500 text-white px-4 py-2 rounded-md mt-2"
				onclick={() => removeOption(index)}
			>
				Remove
			</button>
			</div>
				<Input
					class="pr-10 mt-1"
					placeholder="Option Title"
					bind:value={option.title}
					oninput={(e: any) => updateOptionTitle(index, e.target.value)}
				/>
				<Input
					class="pr-10 mt-1"
					placeholder="Option Values (comma-separated)"
					value={option.values.join(', ')} 
					oninput={(e: any) => {
						const values = e.target.value.split(',').map((v: string) => v.trim());
						updateOptionValues(index, values);
					}}
				/>
			
			</div>
		{/each}
		{#if $errors.options}
			<span class="invalid text-xs text-red-500">{$errors.options}</span>
		{/if}
	</div>

	<Button class="w-[100px]" type="submit" disabled={$createProductMutation.isPending}>
		{$createProductMutation.isPending
			? edit
				? 'Updating...'
				: 'Creating...'
			: edit
				? 'Update'
				: 'Create'}
	</Button>
</form>

	<Input
		type="file"
		class="hidden"
		accept=".jpg, .jpeg, .png, .webp"
		multiple
		id="files"
		onchange={async (e: any) => {
			const file = e.target.files[0];

			if (!file) return;

			if (file.size > 1024 * 1024 * 2) {
				toast.error('Image size is too large! Max size is 2 MB');
				return;
			}
			// @ts-ignore
			files = e.target.files;
		}}
	/>
	<div class="h-[100px] text-transparent"></div>
</div>