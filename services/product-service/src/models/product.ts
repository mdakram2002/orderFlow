import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    priceMinor: { type: Number, required: true, min: 0, index: true },
    currency: { type: String, default: "INR", required: true },
    stock: { type: Number, required: true, min: 0 },
    attributes: { type: Schema.Types.Mixed, default: {} },
    reservations: {
      type: [{ orderId: String, quantity: Number }],
      default: [],
    },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text", category: "text" });

export const Product = model("Product", productSchema);

