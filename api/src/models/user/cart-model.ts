import { model, Schema, Types } from "mongoose";

interface Dip {
  quantity: number;
  productId: Types.ObjectId;
  totalAmount: number;
  name: string;
  price: number;
}

interface CartProduct {
  productId: Types.ObjectId;
  quantity: number;
  totalAmount: number;
  options?: { [key: string]: any }; // Dynamic options object
  name?: string;
  price: number;
}

interface Cart {
  user: Types.ObjectId;
  products: CartProduct[];
  subtotal: number;
  tax: number;
  totalPrice: number;
  status: "active" | "completed" | "abandoned";
  lastUpdated: Date;
  totalDistance?: number;
  deliveryFee?: number;
  deliverySeconds?: number;
  platformFee?: number;
  tempCouponDiscount?: number;
  gstAmount?: number;
  finalPrice?: number;
  tempDeliveryFee?: number;
}


const CartProductSchema = new Schema<CartProduct>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, "Total amount cannot be negative"],
  },
  options: [
    {
      title: String,
      value: String,
    },
  ],
  name: String,
  price: {
    type: Number,
    required: true,
    default: 0,
  },
});

const CartSchema = new Schema<Cart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    products: [CartProductSchema],
    tempCouponDiscount: {
      type: Number,
      default: 0,
    },
    gstAmount: {
      type: Number,
    },
    finalPrice: {
      type: Number,
    },
    tempDeliveryFee: {
      type: Number,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: [0, "Subtotal cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: [0, "Total price cannot be negative"],
    },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    totalDistance: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    deliverySeconds: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

CartSchema.index({ user: 1, status: 1 });
CartSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // Auto-delete after 7 days

export const CartModel = model<Cart>("Cart", CartSchema);