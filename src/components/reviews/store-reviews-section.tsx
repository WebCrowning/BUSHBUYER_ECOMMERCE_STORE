"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, MessageSquare, Award } from "lucide-react";
import { ReviewModal } from "./review-modal";
import { useSession } from "next-auth/react";

interface StoreReviewItem {
  id: number;
  store_id: number;
  customer_id: number;
  customer_name: string;
  rating: number;
  review_text?: string | null;
  reply_text?: string | null;
  replied_at?: string | null;
  created_at: string;
}

interface Props {
  storeId: number;
  storeName: string;
  initialRatingAvg?: number;
  initialRatingCount?: number;
}

export function StoreReviewsSection({
  storeId,
  storeName,
  initialRatingAvg = 5.0,
  initialRatingCount = 0,
}: Props) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<StoreReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingAvg, setRatingAvg] = useState(initialRatingAvg);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews/store?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        const revList: StoreReviewItem[] = data.reviews || [];
        setReviews(revList);
        if (revList.length > 0) {
          const sum = revList.reduce((acc, r) => acc + Number(r.rating || 5), 0);
          setRatingAvg(Number((sum / revList.length).toFixed(1)));
          setRatingCount(revList.length);
        }
      }
    } catch (err) {
      console.error("Failed to load store reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate star breakdown
  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    starCounts[star] = (starCounts[star] || 0) + 1;
  });

  const calculatePercent = (count: number) => {
    if (!reviews.length) return 0;
    return Math.round((count / reviews.length) * 100);
  };

  return (
    <section className="mt-14 rounded-3xl border border-gray-100 bg-white p-6 sm:p-10 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5" />
            Store Reputation &amp; Feedback
          </div>
          <h2 className="text-2xl font-black text-gray-900">Store Reviews &amp; Ratings</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Read authentic reviews from buyers who have purchased from {storeName}.
          </p>
        </div>

        {session?.user && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all self-start md:self-auto active:scale-95"
          >
            <Star className="w-4 h-4" />
            Review This Store
          </button>
        )}
      </div>

      {/* Review Summary Breakdown */}
      <div className="py-8 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Big Average Star Card */}
        <div className="text-center md:border-r border-gray-100 md:pr-8">
          <p className="text-5xl sm:text-6xl font-black text-gray-900">
            {ratingCount > 0 ? ratingAvg.toFixed(1) : "5.0"}
          </p>
          <div className="flex items-center justify-center gap-1 my-3 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.round(ratingAvg)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-500">
            Based on {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Breakdown Bars */}
        <div className="md:col-span-2 space-y-2.5 max-w-lg">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = starCounts[s] || 0;
            const pct = calculatePercent(count);
            return (
              <div key={s} className="flex items-center gap-3 text-xs font-semibold">
                <span className="w-12 text-gray-600 flex items-center gap-1">
                  {s} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-gray-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="pt-8">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm animate-pulse">
            Loading customer reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800">No store reviews yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Be among the first customers to leave feedback for {storeName} after receiving your order!
            </p>
          </div>
        ) : (
          <div className="space-y-6 divide-y divide-gray-100">
            {reviews.map((rev) => (
              <div key={rev.id} className="pt-6 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-xs font-black flex items-center justify-center shadow-sm">
                        {rev.customer_name ? rev.customer_name.substring(0, 2).toUpperCase() : "CU"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 leading-tight">
                          {rev.customer_name}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Buyer
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(rev.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {rev.review_text && (
                  <p className="mt-3 text-sm text-gray-700 leading-relaxed pl-10">
                    {rev.review_text}
                  </p>
                )}

                {/* Seller Reply */}
                {rev.reply_text && (
                  <div className="mt-3 ml-10 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Response from {storeName}
                      {rev.replied_at && (
                        <span className="text-[10px] font-normal text-emerald-600/70">
                          • {new Date(rev.replied_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-950 leading-relaxed">
                      {rev.reply_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Store Review */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="store"
        targetId={storeId}
        title={storeName}
        subtitle="Share your overall experience ordering from this store"
        onSuccess={() => {
          loadReviews();
        }}
      />
    </section>
  );
}
