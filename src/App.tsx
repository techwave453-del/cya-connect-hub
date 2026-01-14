import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import GamesPage from "./pages/GamesPage";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import OfflineIndicator from "@/components/OfflineIndicator";
import DynamicPwaHead from "@/components/DynamicPwaHead";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <OfflineProvider>
        <TooltipProvider>
          <DynamicPwaHead />
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/install" element={<Install />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OfflineProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
