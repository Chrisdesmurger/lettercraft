import { useState, useEffect } from "react";
import { ContributorBadge } from "@/types/reviews";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase-client";

interface UseContributorBadgeResult {
  badge: ContributorBadge;
  isLoading: boolean;
  checkBadge: () => Promise<void>;
}

/**
 * Hook to check if user has earned the contributor badge
 */
export function useContributorBadge(): UseContributorBadgeResult {
  const { user } = useUser();
  const [badge, setBadge] = useState<ContributorBadge>({
    earned: false,
    reviewCount: 0,
    requiredReviews: 3,
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkBadge = async () => {
    if (!user) {
      setBadge({ earned: false, reviewCount: 0, requiredReviews: 3 });
      return;
    }

    setIsLoading(true);

    try {
      // Call the database function to check contributor badge
      const { data, error } = await supabase.rpc("check_contributor_badge", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error checking contributor badge:", error);
        return;
      }

      // Get the actual review count
      const { count, error: countError } = await supabase
        .from("letter_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        console.error("Error getting review count:", countError);
        return;
      }

      const reviewCount = count || 0;
      const earned = data === true; // The function returns a boolean

      setBadge({
        earned,
        reviewCount,
        requiredReviews: 3,
      });
    } catch (error) {
      console.error("Unexpected error checking badge:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check badge on mount and when user changes
  useEffect(() => {
    checkBadge();
  }, [user?.id]);

  return {
    badge,
    isLoading,
    checkBadge,
  };
}
