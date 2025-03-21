<script lang="ts">
	import { _axios } from '$lib/_axios';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { imgUrl } from '$lib/config';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';

	let avatarImage = $state<null | File>(null);

	export const _settingsSchema = z.object({
		restaurentName: z.string({
			message: 'Restaurent Name is required'
		}),
		restaurentAddress: z.string({
			message: 'Restaurent Address is required'
		}),

		latitude: z
			.string({
				message: 'Latitude is required'
			})
			.refine((val) => /^-?\d+(\.\d+)?$/.test(val), {
				message: 'Latitude must be a valid number'
			}),

		longitude: z
			.string({
				message: 'Longitude is required'
			})
			.refine((val) => /^-?\d+(\.\d+)?$/.test(val), {
				message: 'Longitude must be a valid number'
			}),

		restaurentPhone: z.string({
			message: 'Restaurent Phone is required'
		}),
		restaurentDescription: z.string({
			message: 'Restaurent Description is required'
		}),
		gstNumber: z.string({
			message: 'GST Number is required'
		}),
		fssaiNumber: z
			.string({
				message: 'FSSAI Number is required'
			})
			.min(14, {
				message: 'FSSAI Number must be 14 digits'
			})
			.max(14, {
				message: 'FSSAI Number must be 14 digits'
			})
			.refine((val) => /^\d+$/.test(val), {
				message: 'FSSAI Number must be a valid number'
			}),
		legalEntityName: z.string({
			message: 'Legal Entity Name is required'
		}),
		restaurentEmail: z.string({
			message: 'Restaurent Email is required'
		})
	});

	const { form, errors, enhance, constraints, validateForm } = superForm(
		defaults(zod(_settingsSchema)),
		{
			SPA: true,
			validationMethod: 'oninput',
			validators: zod(_settingsSchema),
			clearOnSubmit: 'none',
			invalidateAll: false,
			resetForm: false,
			async onSubmit() {
				const { valid } = await validateForm({
					focusOnError: true
				});

				if (!valid) return toast.error('Please fill all the fields');
				if (!$query.data?.restaurent?.restaurentImage && !avatarImage)
					return toast.error('Please upload restaurent image');

				let _data: any = new FormData();
				_data.append('restaurentName', $form.restaurentName);
				_data.append('restaurentAddress', $form.restaurentAddress);

				_data.append('restaurentPhone', $form.restaurentPhone);
				_data.append('restaurentDescription', $form.restaurentDescription);

				_data.append('latitude', $form.latitude);
				_data.append('longitude', $form.longitude);

				_data.append('gstNumber', $form.gstNumber);
				_data.append('fssaiNumber', $form.fssaiNumber);
				_data.append('legalEntityName', $form.legalEntityName);

				_data.append('restaurentEmail', $form.restaurentEmail);

				if (avatarImage) _data.append('restaurentImage', avatarImage);

				$restaurentUpdateMutation.mutate(_data);
			}
		}
	);

	const query = createQuery({
		queryKey: ['restaurent fetch'],
		queryFn: () => _axios.get('/restaurent'),
		select(data) {
			return data.data;
		}
	});

	const restaurentUpdateMutation = createMutation({
		mutationFn: (data: any) => _axios.post('/restaurent/update', data),
		onSuccess({}) {
			toast('Restaurent Updated ✅');
		},
		onError(error, variables, context) {
			console.error('onError', error, variables, context);
		}
	});

	$effect(() => {
		$form.restaurentName =
			$query.data?.restaurent?.restaurentName || 'King’s Chic Signature Restaurant';
		$form.restaurentAddress =
			$query.data?.restaurent?.restaurentAddress ||
			'No 147, Kottar-Parvathipuram Rd, Ramavarmapuram, Nagercoil, Tamil Nadu 629001';
		$form.restaurentPhone = $query.data?.restaurent?.restaurentPhone || '9994433764';
		$form.restaurentEmail = $query.data?.restaurent?.restaurentEmail || 'info@kingschic.com';
		$form.restaurentDescription =
			$query.data?.restaurent?.restaurentDescription ||
			`Best Multi-Cuisine Family Restaurant in Nagercoil. We offer a wide variety of delicious dishes, from traditional Tamil dishes to international cuisines. Our restaurant is a perfect place to enjoy a meal with your loved ones.`;
		$form.latitude = $query.data?.restaurent?.latitude || '8.734295046362766';
		$form.longitude = $query.data?.restaurent?.longitude || '77.72244331166014';
		$form.gstNumber = $query.data?.restaurent?.gstNumber || '33AAABC1234D';
		$form.fssaiNumber = $query.data?.restaurent?.fssaiNumber || '12345678901234';
		$form.legalEntityName =
			$query.data?.restaurent?.legalEntityName || 'King’s Chic Signature Restaurant';
	});
</script>

<div
	class="w-[80%] text-maintext pl-[10%] m-auto h-[calc(100vh-120px)] overflow-y-auto hidescrollbarthumb"
>
	<form method="POST" use:enhance class="grid gap-4 my-4 grid-cols-2">
		<div class="flex justify-center items-center col-span-2">
			<Avatar.Root
				class="w-[100px] h-[100px] rounded-full cursor-pointer"
				onclick={() => {
					let avatar = document.getElementById('avatar');
					avatar?.click();
				}}
			>
				<Avatar.Image
					src={avatarImage
						? URL.createObjectURL(avatarImage)
						: $query.data?.restaurent?.restaurentImage
							? `${imgUrl + $query.data.restaurent.restaurentImage}`
							: 'https://github.com/shadcn.png'}
					alt="Restaurant Avatar"
					class="w-[100px] h-[100px] rounded-full cursor-pointer object-cover"
				/>
				<Avatar.Fallback class="text-white text-2xl"
					>{$form.restaurentName
						? $form.restaurentName.charAt(0).toUpperCase()
						: 'KC'}</Avatar.Fallback
				>
			</Avatar.Root>
		</div>
		<div>
			<Label for="restaurentName">Restaurent Name</Label>
			<Input
				id="restaurentName"
				class="pr-10 mt-1"
				disabled
				placeholder="King’s Chic Signature Restaurant"
				aria-invalid={$errors.restaurentName ? 'true' : undefined}
				bind:value={$form.restaurentName}
				{...$constraints.restaurentName}
			/>

			{#if $errors.restaurentName}<span class="invalid text-xs text-red-500"
					>{$errors.restaurentName}</span
				>{/if}
		</div>

		<div>
			<Label for="restaurentPhone">Restaurent Phone</Label>
			<Input
				id="restaurentPhone"
				class="pr-10 mt-1"
				placeholder="Ex: 0000999988"
				aria-invalid={$errors.restaurentPhone ? 'true' : undefined}
				bind:value={$form.restaurentPhone}
				{...$constraints.restaurentPhone}
			/>

			{#if $errors.restaurentPhone}<span class="invalid text-xs text-red-500"
					>{$errors.restaurentPhone}</span
				>{/if}
		</div>

		<div>
			<Label for="restaurentEmail">Restaurent Email</Label>
			<Input
				id="restaurentEmail"
				class="pr-10 mt-1"
				type="email"
				placeholder="Ex: 0000999988"
				aria-invalid={$errors.restaurentEmail ? 'true' : undefined}
				bind:value={$form.restaurentEmail}
				{...$constraints.restaurentEmail}
			/>

			{#if $errors.restaurentEmail}<span class="invalid text-xs text-red-500"
					>{$errors.restaurentEmail}</span
				>{/if}
		</div>

		<div>
			<Label for="latitude">Latitude</Label>
			<Input
				id="latitude"
				class="pr-10 mt-1"
				placeholder="Ex: 8.176368054991757"
				aria-invalid={$errors.latitude ? 'true' : undefined}
				bind:value={$form.latitude}
				{...$constraints.latitude}
			/>

			{#if $errors.latitude}<span class="invalid text-xs text-red-500">{$errors.latitude}</span
				>{/if}
		</div>

		<div>
			<Label for="longitude">Longitude</Label>
			<Input
				id="longitude"
				class="pr-10 mt-1"
				placeholder="Ex: 77.42883217933648"
				aria-invalid={$errors.longitude ? 'true' : undefined}
				bind:value={$form.longitude}
				{...$constraints.longitude}
			/>

			{#if $errors.longitude}<span class="invalid text-xs text-red-500">{$errors.longitude}</span
				>{/if}
		</div>

		<div>
			<Label for="gstNumber">GST Number</Label>
			<Input
				id="gstNumber"
				class="pr-10 mt-1"
				placeholder="Ex: 33AAJJKDHFDJFHJD"
				aria-invalid={$errors.gstNumber ? 'true' : undefined}
				bind:value={$form.gstNumber}
				{...$constraints.gstNumber}
			/>

			{#if $errors.gstNumber}<span class="invalid text-xs text-red-500">{$errors.gstNumber}</span
				>{/if}
		</div>

		<div>
			<Label for="fssaiNumber">FSSAI Number</Label>
			<Input
				id="fssaiNumber"
				class="pr-10 mt-1"
				placeholder="Ex: 100190110000123"
				aria-invalid={$errors.fssaiNumber ? 'true' : undefined}
				bind:value={$form.fssaiNumber}
				{...$constraints.fssaiNumber}
			/>

			{#if $errors.fssaiNumber}<span class="invalid text-xs text-red-500"
					>{$errors.fssaiNumber}</span
				>{/if}
		</div>

		<div class="">
			<Label for="legalEntityName">Legal Entity Name</Label>
			<Input
				id="legalEntityName"
				class="pr-10 mt-1"
				placeholder="Ex: 100190110000123"
				aria-invalid={$errors.legalEntityName ? 'true' : undefined}
				bind:value={$form.legalEntityName}
				{...$constraints.legalEntityName}
			/>

			{#if $errors.legalEntityName}<span class="invalid text-xs text-red-500"
					>{$errors.legalEntityName}</span
				>{/if}
		</div>

		<div class="col-span-2">
			<Label for="restaurentAddress">Restaurent Address</Label>
			<Textarea
				id="restaurentAddress"
				class="pr-10 mt-1"
				placeholder="No 147, Kottar-Parvathipuram Rd, Ramavarmapuram, Nagercoil, Tamil Nadu 629001"
				aria-invalid={$errors.restaurentAddress ? 'true' : undefined}
				bind:value={$form.restaurentAddress}
				{...$constraints.restaurentAddress}
			/>

			{#if $errors.restaurentAddress}<span class="invalid text-xs text-red-500"
					>{$errors.restaurentAddress}</span
				>{/if}
		</div>

		<div class="col-span-2">
			<Label for="restaurentDescription">Restaurent Description</Label>
			<Textarea
				id="restaurentDescription"
				class="pr-10 mt-1"
				placeholder="Ex: New York"
				aria-invalid={$errors.restaurentDescription ? 'true' : undefined}
				bind:value={$form.restaurentDescription}
				{...$constraints.restaurentDescription}
			/>

			{#if $errors.restaurentDescription}<span class="invalid text-xs text-red-500"
					>{$errors.restaurentDescription}</span
				>{/if}
		</div>

		<Button disabled={$restaurentUpdateMutation.isPending} class="w-[100px]" type="submit"
			>{$restaurentUpdateMutation.isPending ? 'Updating...' : 'Update'}</Button
		>
	</form>

	<input
		id="avatar"
		type="file"
		accept=".jpg, .jpeg, .png, .webp"
		style="display: none;"
		onchange={(event: Event) => {
			if (event.target) {
				avatarImage = (event.target as HTMLInputElement).files?.[0] as File;
			}
		}}
	/>
</div>
