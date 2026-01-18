import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Restaurant, positiveReviews, negativeReviews } from "@/data/mockData";
import { Smile, Frown } from "lucide-react";
import { useState, useEffect } from "react";

interface ComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRestaurant: Restaurant;
  compareRestaurant: Restaurant;
}

interface ReviewSummary {
  positiveSummary: string;
  negativeSummary: string;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}


export const ComparisonDialog = ({
    open,
    onOpenChange,
    currentRestaurant,
    compareRestaurant,
}: ComparisonDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<{
        current: ReviewSummary;
        compare: ReviewSummary;
    } | null>(null);
    const [currPositiveReviews, setCurrPositiveReviews] = useState<string[]>(positiveReviews);
    const [currNegativeReviews, setCurrNegativeReviews] = useState<string[]>(negativeReviews);

    // useEffect(() => {
    //     const fetchReviews = async () => {
    //         if (open) {
    //             setLoading(true);
    //             try {

    //                 // Fetch summary for current restaurant
    //                 const currentResponse = await fetch("/reviews/summarize", {
    //                     method: "POST",
    //                     headers: { "Content-Type": "application/json" },
    //                     body: JSON.stringify({
    //                         restaurantName: currentRestaurant.name,
    //                         positiveReviews: positiveReviews,
    //                         negativeReviews: negativeReviews
    //                     }),
    //                 });
    //                 const currentData = await currentResponse.json();
    //                 console.log("Fetched review summary for current restaurant:", currentData);

    //                 // Fetch summary for compare restaurant
    //                 const compareResponse = await fetch("/reviews/summarize", {
    //                     method: "POST",
    //                     headers: { "Content-Type": "application/json" },
    //                     body: JSON.stringify({
    //                         restaurantName: compareRestaurant.name,
    //                         positiveReviews: positiveReviews,
    //                         negativeReviews: negativeReviews
    //                     }),
    //                 });
    //                 const compareData = await compareResponse.json();
    //                 console.log("Fetched review summaries:", currentData, compareData);

    //                 setReviews({
    //                     current: {
    //                         summary: currentData.summary || "No positive reviews"
    //                     },
    //                     compare: {
    //                         summary: compareData.summary || "No positive reviews"

    //                     },
    //                 });
    //             } catch (error) {
    //                 console.error("Error fetching reviews:", error);
    //             } finally {
    //                 setLoading(false);
    //             }
    //         }
    //     };

    //     fetchReviews();
    // }, [open, currentRestaurant.id, compareRestaurant.id]);

    useEffect(() => {
  const fetchReviews = async () => {
    if (!open) return;

    setLoading(true);
    try {
      const currentPayload = {
        restaurantName: currentRestaurant.name,
        positiveReviews: pickRandom(positiveReviews, 5),
        negativeReviews: pickRandom(negativeReviews, 5),
      };

      const comparePayload = {
        restaurantName: compareRestaurant.name,
        positiveReviews: pickRandom(positiveReviews, 5),
        negativeReviews: pickRandom(negativeReviews, 5),
      };

      const [currentRes, compareRes] = await Promise.all([
        fetch("/reviews/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentPayload),
        }),
        fetch("/reviews/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(comparePayload),
        }),
      ]);

      const [currentData, compareData] = await Promise.all([
        currentRes.json(),
        compareRes.json(),
      ]);

      setReviews({
        current: {
          positiveSummary: currentData.positiveSummary || "No positive summary.",
          negativeSummary: currentData.negativeSummary || "No negative summary.",
        },
        compare: {
          positiveSummary: compareData.positiveSummary || "No positive summary.",
          negativeSummary: compareData.negativeSummary || "No negative summary.",
        },
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchReviews();
}, [open, currentRestaurant.id, compareRestaurant.id]);


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md mx-auto p-0 rounded-t-3xl border-0 fixed bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom">
                <div className="p-6 pt-8">
                    <h2 className="text-xl font-bold text-foreground text-center mb-6">
                        {loading ? "Comparing..." : "What reviewers are saying..."}
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Current Restaurant */}
                            <div className="flex gap-4">
                                <img
                                    src={currentRestaurant.image}
                                    alt={currentRestaurant.name}
                                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-foreground mb-2">
                                        {currentRestaurant.name}
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <Smile className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-muted-foreground">
                                                {reviews?.current.positiveSummary}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Frown className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-muted-foreground">
                                                {reviews?.current.negativeSummary}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Compare Restaurant */}
                            <div className="flex gap-4">
                                <img
                                    src={compareRestaurant.image}
                                    alt={compareRestaurant.name}
                                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-foreground mb-2">
                                        {compareRestaurant.name}
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <Smile className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-muted-foreground">
                                                {reviews?.compare.positiveSummary}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Frown className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-muted-foreground">
                                                {reviews?.compare.negativeSummary}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};