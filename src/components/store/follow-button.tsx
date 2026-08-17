"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

interface FollowButtonProps {
  storeId: number;
  initialFollowersCount?: number;
}

export function FollowButton({ storeId, initialFollowersCount = 0 }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function checkStatus() {
      try {
        const res = await fetch(`/api/stores/${storeId}/follow`);
        if (res.ok && active) {
          const data = await res.json();
          setIsFollowing(data.isFollowing ?? false);
          if (data.followersCount !== undefined) {
            setFollowersCount(data.followersCount);
          }
        }
      } catch {
        // Ignore unauthenticated or fetch error
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkStatus();
    return () => { active = false; };
  }, [storeId]);

  const toggleFollow = async () => {
    setLoading(true);
    try {
      const method = isFollowing ? "DELETE" : "POST";
      const res = await fetch(`/api/stores/${storeId}/follow`, { method });
      if (res.status === 401) {
        window.location.href = "/signin";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        setFollowersCount(data.followersCount);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFollow}
      disabled={loading || checking}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
        isFollowing
          ? "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span>Follow Store ({followersCount})</span>
        </>
      )}
    </button>
  );
}
