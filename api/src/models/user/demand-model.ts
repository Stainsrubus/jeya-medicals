import { model, Schema } from "mongoose";

interface Demand {
  userId: Schema.Types.ObjectId;
  productName: string;
  message: string;
  file: string; // Assuming file paths or URLs are stored as strings
}

const DemandSchema = new Schema<Demand>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    file:
      {
        type: String,
      },
  },
  {
    timestamps: true,
  }
);

export const DemandProduct = model<Demand>("DemandProduct", DemandSchema);
