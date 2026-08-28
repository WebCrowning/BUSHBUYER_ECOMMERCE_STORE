import { z } from "zod";

export const productSchema = z
  .object({
    name: z.string().min(2).max(190),
    price: z.number().min(0),
    transportFee: z.number().min(0).default(0),
    image: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .refine((value) => !/^javascript:/i.test(value), {
        message: "Invalid image URL",
      }),
    description: z.string().min(10).max(2000),
    category: z.string().min(2).max(80).default("General"),
    featured: z.number().int().min(0).max(1).default(0),
    packageName: z.enum(["pack", "bag", "bundle", "carton"]),
    unitType: z.enum(["pcs", "kg"]),
    unitValue: z.number().positive(),
    stockPackages: z.number().int().min(0).default(0),
    imageZoom: z.number().int().min(80).max(180).default(100),
    galleryImages: z.array(
      z.string().trim().min(1).max(2048).refine((v) => !/^javascript:/i.test(v), { message: "Invalid image URL" })
    ).max(8).optional().default([]),
  });

export const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantityPackages: z.number().int().positive().max(10000),
});

export const orderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email().max(190),
  phone: z.string().min(7).max(40),
  address: z.string().min(10).max(500),
  country: z.string().min(2).max(80),
  paymentId: z.string().min(3).max(120),
  items: z.array(orderItemSchema).min(1),
});

export const messageSchema = z.object({
  email: z.string().email().max(190),
  message: z.string().min(4).max(2000),
});

export const replySchema = z.object({
  reply: z.string().min(2).max(2000),
});

export const orderStatusSchema = z.object({
  status: z.enum(["Pending", "Paid", "Shipped", "Delivered"]),
});

export const paypalOrderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantityPackages: z.number().int().positive().max(10000),
  price: z.number().nonnegative(),
  transportFee: z.number().min(0),
});

export const paypalCreateOrderSchema = z.object({
  items: z.array(paypalOrderItemSchema).min(1).max(100),
  total: z.number().positive(),
});

export const paypalCaptureOrderSchema = z.object({
  paypalOrderId: z.string().min(3, "Invalid PayPal order ID").max(120),
  items: z.array(paypalOrderItemSchema).min(1).max(100).optional(),
  total: z.number().positive().optional(),
  customerName: z.string().min(2, "Name must be at least 2 characters").max(120).optional(),
  customerEmail: z.string().email("Enter a valid email address").max(190).optional(),
  phone: z.string().min(7, "Phone number is too short").max(40).optional(),
  address: z.string().min(10, "Address must be at least 10 characters").max(500).optional(),
  country: z.string().min(2, "Country is required").max(80).optional(),
});
