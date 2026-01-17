import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index";
import { RestaurantDetailPage } from "./pages/RestaurantDetailPage";
import { InviteFriendsPage } from "./pages/InviteFriendsPage";
import { CreateEventPage } from "./pages/CreateEventPage";
import { FriendsPage } from "./pages/FriendsPage";
import { AvailabilityPage } from "./pages/AvailabilityPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
            <Route path="/restaurant/:id/invite" element={<InviteFriendsPage />} />
            <Route path="/restaurant/:id/create-event" element={<CreateEventPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
