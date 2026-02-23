import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CheckSquare, Target } from "lucide-react";
import Index from "./pages/Index";
import Goals from "./pages/Goals";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const navItems = [
  { to: "/", icon: <CheckSquare className="h-5 w-5" />, label: "Habits" },
  { to: "/goals", icon: <Target className="h-5 w-5" />, label: "Goals" },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/goals" element={<Goals />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav items={navItems} />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
