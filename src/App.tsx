import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CheckSquare, Target, BookOpen, UserCircle, TrendingUp } from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import WorldClassOnboarding from "./components/WorldClassOnboarding";
import Index from "./pages/Index";
import Goals from "./pages/Goals";
import Journal from "./pages/Journal";
import Profile from "./pages/Profile";
import Trading from "./pages/Trading";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();
const ONBOARDING_KEY = "lvlup:onboarding-complete";

const navItems = [
  { to: "/", icon: <CheckSquare className="h-5 w-5" />, label: "Habits" },
  { to: "/goals", icon: <Target className="h-5 w-5" />, label: "Goals" },
  { to: "/journal", icon: <BookOpen className="h-5 w-5" />, label: "Journal" },
  { to: "/trading", icon: <TrendingUp className="h-5 w-5" />, label: "Trades" },
  { to: "/profile", icon: <UserCircle className="h-5 w-5" />, label: "Profile" },
];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    if (!user) {
      setOnboardingComplete(false);
      return;
    }
    setOnboardingComplete(localStorage.getItem(`${ONBOARDING_KEY}:${user.id}`) === "true");
  }, [user]);

  const completeOnboarding = () => {
    if (user) localStorage.setItem(`${ONBOARDING_KEY}:${user.id}`, "true");
    setOnboardingComplete(true);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && <BottomNav items={navItems} />}
      {user && !onboardingComplete && (
        <WorldClassOnboarding
          userName={user.user_metadata?.display_name ?? user.email?.split("@")[0]}
          onComplete={completeOnboarding}
        />
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
