"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, MessageSquare, ThumbsUp } from "lucide-react";
import { ReviewModal } from "./review-modal";
import { useSession } from "next-auth/react";

interface ReviewItem {
  id: number;
  product_id: number;
  customer_id: number;
  customer_name: string;
  rating: number;
  review_text?: string | null;
  created_at: string;
  seller_reply?: string | null;
  seller_replied_at?: string | null;
}

interface ReviewStats {
  avgRating: number;
  reviewCount: number;
  stars: Record<number, number>;
}

interface Props {
  productId: number;
  productName: string;
  productImage?: string;
}

export function ProductReviewsSection({ productId, productName, productImage }: Props) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    avgRating: 0,
    reviewCount: 0,
    stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews/product?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load product reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculatePercent = (count: number) => {
    if (!stats.reviewCount) return 0;
    return Math.round((count / stats.reviewCount) * 100);
  };

  return (
    <section className="mt-12 rounded-3xl border border-gray-100 bg-white p-6 sm:p-10 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            Verified Customer Reviews
          </div>
          <h2 className="text-2xl font-black text-gray-900">Ratings &amp; Reviews</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real feedback from buyers who purchased this product on Bushbuyer.
          </p>
        </div>

        {session?.user && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all self-start md:self-auto active:scale-95"
          >
            <Star className="w-4 h-4" />
            Write a Review
          </button>
        )}
      </div>

      {/* Review Summary Breakdown */}
      <div className="py-8 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Big Average Star Card */}
        <div className="text-center md:border-r border-gray-100 md:pr-8">
          <p className="text-5xl sm:text-6xl font-black text-gray-900">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "0.0"}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(stats.avgRating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1.5 font-semibold">
            Based on {stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* 5 to 1 Star Progress Bars */}
        <div className="md:col-span-2 space-y-2">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = stats.stars[s] || 0;
            const pct = calculatePercent(count);
            return (
              <div key={s} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-bold text-gray-600 flex items-center gap-1">
                  {s} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right font-semibold text-gray-500">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="pt-8">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">No reviews yet for this product</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Have you bought this item? Share your thoughts to help other shoppers in Cameroon!
            </p>
            {session?.user && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-3 px-5 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors"
              >
                Be the first to review
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 space-y-6">
            {reviews.map((rev) => (
              <div key={rev.id} className="pt-6 first:pt-0 space-y-2.5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {rev.customer_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          {rev.customer_name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified Buyer
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(rev.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.review_text && (
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-12">
                    {rev.review_text}
                  </p>
                )}

                {/* Seller Reply */}
                {rev.seller_reply && (
                  <div className="ml-12 mt-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                    <span className="font-bold text-emerald-800 block">
                      Store Response:
                    </span>
                    <p className="text-gray-600">{rev.seller_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="product"
        targetId={productId}
        title={productName}
        image={productImage}
        onSuccess={() => loadReviews()}
      />
    </section>
  );
}
