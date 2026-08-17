/**
 * /seller/products/new
 *
 * The product creation form lives inline on /seller/products (SellerProductsClient).
 * This page redirects there so any deep-link or nav to /seller/products/new
 * lands the seller on the correct page with the "Add New Product" form visible.
 */
import { redirect } from "next/navigation";

export default function NewProductRedirectPage() {
  redirect("/seller/products?new=1");
}
