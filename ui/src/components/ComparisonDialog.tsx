import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Restaurant, positiveReviews, negativeReviews } from "@/data/mockData";
import { Smile, Frown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { RestaurantImage } from "./RestaurantImage";

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

interface ExpandedState {
  current: { positive: boolean; negative: boolean };
  compare: { positive: boolean; negative: boolean };
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

// Helper component for expandable text
const ExpandableText = ({
  text,
  isExpanded,
  onToggle,
  maxLines = 2,
}: {
  text: string;
  isExpanded: boolean;
  onToggle: () => void;
  maxLines?: number;
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight || "20");
      const maxHeight = lineHeight * maxLines;
      setNeedsTruncation(textRef.current.scrollHeight > maxHeight);
    }
  }, [text, maxLines]);

  return (
    <div className="flex-1 min-w-0">
      <p
        ref={textRef}
        className="text-sm text-muted-foreground overflow-hidden"
        style={
          isExpanded || !needsTruncation
            ? {}
            : {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
                textOverflow: "ellipsis",
              }
        }
      >
        {text}
      </p>
      {needsTruncation && (
        <button
          onClick={onToggle}
          className="text-xs text-primary mt-1 hover:underline"
        >
          {isExpanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
};


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
    const [expanded, setExpanded] = useState<ExpandedState>({
        current: { positive: false, negative: false },
        compare: { positive: false, negative: false },
    });

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
            fetch(apiEndpoint("reviews/summarize"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(currentPayload),
            }),
            fetch(apiEndpoint("reviews/summarize"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(comparePayload),
            }),
          ]);

          // Check if responses are OK
          if (!currentRes.ok) {
            const errorData = await currentRes.json().catch(() => ({ error: "Unknown error" }));
            console.error("[ComparisonDialog] Current restaurant API error:", errorData);
            throw new Error(`Failed to fetch current restaurant reviews: ${errorData.error || currentRes.statusText}`);
          }

          if (!compareRes.ok) {
            const errorData = await compareRes.json().catch(() => ({ error: "Unknown error" }));
            console.error("[ComparisonDialog] Compare restaurant API error:", errorData);
            throw new Error(`Failed to fetch compare restaurant reviews: ${errorData.error || compareRes.statusText}`);
          }

          const [currentData, compareData] = await Promise.all([
            currentRes.json(),
            compareRes.json(),
          ]);

          console.log("[ComparisonDialog] API responses:", { currentData, compareData });

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

    // Reset expanded state when dialog opens/closes or restaurants change
    useEffect(() => {
      if (open) {
        setExpanded({
          current: { positive: false, negative: false },
          compare: { positive: false, negative: false },
        });
      }
    }, [open, currentRestaurant.id, compareRestaurant.id]);

    const toggleExpand = (restaurant: "current" | "compare", type: "positive" | "negative") => {
      setExpanded((prev) => ({
        ...prev,
        [restaurant]: {
          ...prev[restaurant],
          [type]: !prev[restaurant][type],
        },
      }));
    };


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
                                <RestaurantImage
                                    src={currentRestaurant.image}
                                    alt={currentRestaurant.name}
                                    category={currentRestaurant.category}
                                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <h3 className="font-bold text-foreground mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
                                        {currentRestaurant.name}
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <Smile className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                            <ExpandableText
                                                text={reviews?.current.positiveSummary || ""}
                                                isExpanded={expanded.current.positive}
                                                onToggle={() => toggleExpand("current", "positive")}
                                            />
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Frown className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                            <ExpandableText
                                                text={reviews?.current.negativeSummary || ""}
                                                isExpanded={expanded.current.negative}
                                                onToggle={() => toggleExpand("current", "negative")}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Compare Restaurant */}
                            <div className="flex gap-4">
                                <RestaurantImage
                                    src={compareRestaurant.image}
                                    alt={compareRestaurant.name}
                                    category={compareRestaurant.category}
                                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <h3 className="font-bold text-foreground mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
                                        {compareRestaurant.name}
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <Smile className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                            <ExpandableText
                                                text={reviews?.compare.positiveSummary || ""}
                                                isExpanded={expanded.compare.positive}
                                                onToggle={() => toggleExpand("compare", "positive")}
                                            />
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Frown className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                            <ExpandableText
                                                text={reviews?.compare.negativeSummary || ""}
                                                isExpanded={expanded.compare.negative}
                                                onToggle={() => toggleExpand("compare", "negative")}
                                            />
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