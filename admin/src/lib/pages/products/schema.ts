import { writable } from 'svelte/store';
import { z } from 'zod';

// Define the schema for options
export const optionSchema = z.object({
	title: z.string({ message: 'Option title is required' }),
	values: z.array(z.string({ message: 'Option values are required' }))
});
export const specificationSchema = z.object({
	name: z.string({ message: 'Specification name is required' }),
	fields:  z.record(z.string(), z.string()),
});

// Define the main product schema
export const _productsSchema = z.object({
	productName: z
		.string({
			message: 'Name is required'
		})
		.max(50),
	category: z
		.string({
			message: 'Category is required'
		})
		.min(1),
		brand: z.string({ message: 'Brand is required' }).min(1),
	price: z.string().refine((val) => /^[0-9]+$/.test(val), {
		message: 'Price must be a numeric string'
	}),
	strikePrice: z.string().refine((val) => /^[0-9]+$/.test(val), {
		message: 'strikePrice must be a numeric string'
	}),
	// rating: z.string().refine((val) => /^[0-5]$/.test(val), {
	// 	message: 'Must be a numeric string and between 0 and 5'
	// }),
	productCode: z.string(),
	description: z.string({
		message: 'Description is required'
	}),
	images: z.any(),
	topSeller: z.boolean(),
	gst: z.string().refine((val) => /^[0-9]+$/.test(val), {
		message: 'Gst must be a numeric string'
	}),
	active: z.boolean(),
	options: z.array(optionSchema).optional() ,
	specifications: z.array(specificationSchema).optional() ,
	
});

// Store for managing product-related UI states


// Store for managing product edit state
export const productEditStore = writable({
	mode: 'list',
	id: '',
	category: {} as TCategory,
	description: '',
	productName: '',
	brand: {} as TBrand,
	price: '',
	strikePrice: '',
	// rating: '',
	productCode: '',
	topSeller: null as boolean | null,
	images: '',
	gst: '',
	active: true, // Default to true
	options: [] as Option[], // Array of options
	specifications:[] as Specifications[]
});

// Type definitions
export type productCreateProps = {
	productEditStore: typeof productEditStore;
};

export type TCategory = {
	categoryNumber: number;
	_id: string;
	name: string;
};
export type TBrand = {
	_id: string;
	name: string;
};
export type Option = {
	title: string;
	values: string[];
};
export type Specifications = {
	name: string;
	fields: string[];
};