import { cn } from "@/lib/utils";

const RestaurantSkeleton = ({ visible }: { visible: boolean }) => (
  <div
    className={cn(
      "rounded-lg border border-border p-4 space-y-3 transition-opacity duration-300",
      visible ? "opacity-100 animate-pulse" : "opacity-0 pointer-events-none fixed"
    )}
  >
    <div className="h-40 w-full rounded-md bg-muted" />

    <div className="space-y-2">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
    </div>
  </div>
);

export { RestaurantSkeleton };