"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Camera, Image as ImageIcon, Loader2, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface StoreBannerHeaderProps {
  storeId: number;
  storeName: string;
  initialBanner: string | null;
}

export function StoreBannerHeader({
  storeId,
  storeName,
  initialBanner,
}: StoreBannerHeaderProps) {
  const { data: session } = useSession();
  const [banner, setBanner] = useState<string | null>(initialBanner);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if current logged-in user can customize this store
  const user = session?.user as { role?: string; storeIds?: number[] } | undefined;
  const role = user?.role || "";
  const userStoreIds = user?.storeIds || [];

  const isAdmin = ["admin", "sub_admin", "super_admin", "platform_admin"].includes(role);
  const isStoreOwner = userStoreIds.includes(storeId);
  const canEdit = isAdmin || isStoreOwner;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({ type: "error", message: "Only JPG, PNG, and WEBP image files are allowed." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Image size must be 5MB or less." });
      return;
    }

    try {
      setUploading(true);
      setFeedback(null);

      // 1. Upload image to server
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/admin/upload?type=store", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.imageUrl) {
        throw new Error(uploadData.error || "Failed to upload cover image.");
      }

      const newImageUrl = uploadData.imageUrl;

      // 2. Save store banner URL to database
      const saveRes = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner: newImageUrl }),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to update store cover image.");
      }

      setBanner(newImageUrl);
      setFeedback({ type: "success", message: "Store cover background updated successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error("Cover image upload error:", err);
      setFeedback({ type: "error", message: err.message || "Failed to upload cover image." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveBanner = async () => {
    if (!confirm("Are you sure you want to remove the store background cover image?")) return;

    try {
      setUploading(true);
      setFeedback(null);

      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner: "" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove cover image.");
      }

      setBanner(null);
      setFeedback({ type: "success", message: "Store cover image removed. Default green theme restored." });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error("Remove banner error:", err);
      setFeedback({ type: "error", message: err.message || "Failed to remove cover image." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative h-64 sm:h-80 w-full bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-950 overflow-hidden group">
      {/* Background Image or Gradient Pattern */}
      {banner ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={banner}
          alt={`${storeName} cover header`}
          className="w-full h-full object-cover opacity-90 transition-all duration-500"
        />
      ) : (
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      )}

      {/* Subtle overlay gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

      {/* Owner/Admin Controls for Background Image */}
      {canEdit && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {banner && (
            <button
              type="button"
              onClick={handleRemoveBanner}
              disabled={uploading}
              title="Remove Cover Image"
              className="p-2.5 rounded-xl bg-black/60 hover:bg-red-600/90 text-white backdrop-blur-md border border-white/20 text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Remove Banner</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white backdrop-blur-md border border-emerald-400/40 text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-white" />
                <span>{banner ? "Change Cover Photo" : "Upload Background Image"}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-30 max-w-md">
          <div
            className={`p-3 rounded-2xl backdrop-blur-md shadow-xl text-xs font-bold flex items-center justify-between gap-3 border ${
              feedback.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
                : "bg-red-950/90 border-red-500/50 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-white/60 hover:text-white ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
