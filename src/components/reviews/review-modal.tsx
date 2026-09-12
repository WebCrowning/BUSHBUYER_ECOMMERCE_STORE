"use client";

import { useState } from "react";
import { Star, X, CheckCircle, Loader2, ShieldCheck } from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "product" | "store";
  targetId: number;
  orderId?: number;
  title: string;
  subtitle?: string;
  image?: string;
  onSuccess?: (rating: number, reviewText: string) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor — Disappointed",
  2: "Fair — Below expectations",
  3: "Good — Satisfactory",
  4: "Very Good — Met expectations",
  5: "Excellent — Exceeded expectations!",
};

export function ReviewModal({
  isOpen,
  onClose,
  type,
  targetId,
  orderId,
  title,
  subtitle,
  image,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const activeRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!rating || rating < 1) {
      setErrorMsg("Please select a star rating.");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = type === "product" ? "/api/reviews/product" : "/api/reviews/store";
      const payload =
        type === "product"
          ? { productId: targetId, orderId, rating, reviewText }
          : { storeId: targetId, rating, reviewText };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setSubmitted(true);
      if (onSuccess) {
        onSuccess(rating, reviewText);
      }

      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setReviewText("");
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-5 top-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-10 text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-600 mb-2 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900">Thank You for Your Review!</h3>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">
              Your feedback helps other buyers on Bushbuyer make informed decisions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header / Target Item Card */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Buyer Review
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                {type === "product" ? "Review Product" : "Rate & Review Store"}
              </h2>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={title}
                  className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                  ★
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-900 truncate">{title}</p>
                {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
              </div>
            </div>

            {/* Interactive Star Picker */}
            <div className="text-center py-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Your Overall Rating
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-gray-300 hover:scale-125 transition-transform duration-150 focus:outline-none"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        star <= activeRating
                          ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                          : "text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-600 mt-2">
                {RATING_LABELS[activeRating] || "Tap a star to rate"}
              </p>
            </div>

            {/* Review Comment Textarea */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Written Review &amp; Feedback (Optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                placeholder={
                  type === "product"
                    ? "How was the product quality, packaging, freshness, and accuracy?"
                    : "How was the vendor's service, communication, and delivery speed?"
                }
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
