import { model, Schema, Types } from "mongoose";

interface Option {
  title: string;
  values: string[]; 
}
interface Specification {
  name: string;
  fields: Record<string, string>;
}
interface ProductInterface {
  productName: string;
  category: Types.ObjectId;
  price: number;
  strikePrice: number;
  timing: Types.ObjectId[];
  ratings: number;
  productCode: string;
  description: string;
  images: string[];
  topSeller: boolean;
  gst: number;
  discount: number;
  onMRP: number;
  brand:Types.ObjectId;
  active: boolean;
  isDeleted: boolean;
  reEnabledAt: Date | null;
  options?: Option[];
  specifications?: Specification[];
}



const ProductSchema = new Schema<ProductInterface>(
  {
    productName: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    strikePrice: {
      type: Number,
      required: true,
    },
    ratings: {
      type: Number,
      required: true,
      default: 1,
    },
    productCode: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    topSeller: {
      type: Boolean,
      default: false,
    },
    gst: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    reEnabledAt: {
      type: Date,
      default: null,
    },
    discount: { type: Number, default: 0 }, // For discount offer (percentage)
  onMRP: { type: Number, default: 0 },
    options: [
      {
        title: { type: String, required: true },
        values: [{ type: String, required: true }],
      },
    ],
    specifications: [
      {
        name: { type: String, required: true },
        fields: { type: Map, of: String },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const Product = model<ProductInterface>("Product", ProductSchema);
