import { model, Schema } from "mongoose";

interface Restaurent {
  restaurentName: string;
  restaurentAddress: string;
  restaurentPhone: string;
  restaurentEmail: string;
  restaurentDescription: string;
  restaurentImage: string;
  latitude: string;
  longitude: string;
  gstNumber: string;
  fssaiNumber: string;
  legalEntityName: string;
  active: boolean;
  isDeleted: boolean;
}

const RestaurentSchema = new Schema<Restaurent>(
  {
    restaurentName: {
      type: String,
      required: true,
    },
    restaurentAddress: {
      type: String,
    },

    restaurentPhone: {
      type: String,
    },

    restaurentEmail: {
      type: String,
    },

    restaurentDescription: {
      type: String,
    },
    latitude: {
      type: String,
    },
    longitude: {
      type: String,
    },
    restaurentImage: {
      type: String,
    },
    gstNumber: {
      type: String,
    },
    fssaiNumber: {
      type: String,
    },
    legalEntityName: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const RestaurentModel = model<Restaurent>(
  "Restaurent",
  RestaurentSchema
);
