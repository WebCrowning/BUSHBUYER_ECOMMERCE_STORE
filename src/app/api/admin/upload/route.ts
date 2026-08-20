import { randomUUID } from "crypto";
import { mkdir, readdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireStoreOrAdminApi } from "@/lib/authz";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Resolve the upload subfolder and URL prefix for a given type.
 *
 * type=product  → uploads/products/   (admin-curated; shown on the homepage hero)
 * type=seller   → uploads/seller/     (seller product images; NEVER shown on homepage)
 * type=store    → uploads/stores/     (store banners/logos; NEVER shown on homepage)
 *
 * No type / unknown → uploads/products/ (safe default for the admin products page)
 */
function resolveUploadTarget(type: string | null) {
  if (type === "store") {
    return {
      dir: path.join(process.cwd(), "public", "uploads", "stores"),
      urlPrefix: "/uploads/stores",
    };
  }
  if (type === "seller") {
    return {
      dir: path.join(process.cwd(), "public", "uploads", "seller"),
      urlPrefix: "/uploads/seller",
    };
  }
  // Default: "product" or anything else → admin-curated products folder (homepage reads this)
  return {
    dir: path.join(process.cwd(), "public", "uploads", "products"),
    urlPrefix: "/uploads/products",
  };
}

export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const { dir, urlPrefix } = resolveUploadTarget(type);

  try {
    await mkdir(dir, { recursive: true });
    const files = await readdir(dir, { withFileTypes: true });

    const images = files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name))
      .sort((a, b) => b.localeCompare(a))
      .map((name) => `${urlPrefix}/${name}`);

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: "Failed to load uploaded images" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const { dir, urlPrefix } = resolveUploadTarget(type);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WEBP are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File size must be <= 5MB" }, { status: 400 });
  }

  const extension = file.type.split("/")[1] ?? "jpg";
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(dir, fileName);

  try {
    await mkdir(dir, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(absolutePath, Buffer.from(arrayBuffer));

    return NextResponse.json({ imageUrl: `${urlPrefix}/${fileName}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
