import { model, Schema, Types } from "mongoose";

interface OrderProduct {
  productId: Types.ObjectId;
  quantity: number;
  totalAmount: number;
  customSuggestion?: string;
  suggestions?: Types.ObjectId[];
  name: string;
  price: number;
}

interface Order {
  user: Types.ObjectId;
  products: OrderProduct[];
  addressId: Types.ObjectId;
  deliveryAgent?: Types.ObjectId;
  deliveryTime?: Date;
  store?: Types.ObjectId;
  deliverySeconds?: number;
  distance: string;
  coupon?: Types.ObjectId;
  couponCode: string;
  orderId: string;
  couponDiscount: number;
  deliveryPrice: number;
  platformFee: number;
  subtotal: number;
  tax: number;
  totalPrice: number;
  status: string;
  rating: Number;
  feedback: string;
  invoiceId: string;
  paymentMethod: string;
  paymentStatus: "pending" | "completed" | "failed";
  preparationTime: number;
  deliveryAgentCords?: {
    lat: string;
    lng: string;
  };
  mapPloygonResponse: string;
  razorPayResponse: string;
  razorOrderId: string;
  tipsRazorPayId: string;
  tipsRazorPayResponse: string;
  tips: number;
  preparedAt: Date;
  razorPayId: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<Order>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: String,
    },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
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
        customSuggestion: {
          type: String,
          trim: true,
        },
        suggestions: [
          {
            type: Schema.Types.ObjectId,
            ref: "Suggetions",
          },
        ],
        name: String,
        price: {
          type: Number,
          required: true,
          default: 0,
        },
      },
    ],
    addressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    deliveryAgent: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryAgent",
    },
    preparationTime: {
      type: Number,
      default: 0,
    },
    preparedAt: {
      type: Date,
      default: Date.now,
    },
    deliveryAgentCords: {
      lat: String,
      lng: String,
    },
    mapPloygonResponse: {
      type: String,
      default: "",
    },
    deliveryTime: Date,
    deliverySeconds: Number,
    distance: String,
    rating: Number,
    invoiceId: String,
    feedback: String,
    coupon: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
    },
    couponCode: String,
    couponDiscount: {
      type: Number,
      default: 0,
      min: [0, "Coupon discount cannot be negative"],
    },
    deliveryPrice: {
      type: Number,
      min: [0, "Delivery price cannot be negative"],
    },
    platformFee: {
      type: Number,
      default: 0,
      min: [0, "Platform fee cannot be negative"],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    tax: {
      type: Number,
      required: true,
      min: [0, "Tax cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"],
    },
    status: {
      type: String,
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    razorPayResponse: {
      type: String,
      default: "",
    },
    razorOrderId: {
      type: String,
      default: "",
    },
    razorPayId: {
      type: String,
      default: "",
    },
    tipsRazorPayId: {
      type: String,
      default: "",
    },
    tipsRazorPayResponse: {
      type: String,
      default: "",
    },
    tips: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ deliveryAgent: 1, status: 1 });

export const OrderModel = model<Order>("Order", OrderSchema);
