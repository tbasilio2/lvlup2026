import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Check your email for a reset link");
        setIsForgot(false);
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-border bg-secondary pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="fixed inset-0 bg-[linear-gradient(hsl(220,15%,12%)_1px,transparent_1px),linear-gradient(90deg,hsl(220,15%,12%)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <motion.div className="w-full max-w-sm relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 mb-4 rounded-2xl bg-primary/10 border border-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">LvLUp</h1>
          <p className="text-sm text-muted-foreground">
            {isForgot ? "Reset your password" : isSignUp ? "Build your personal system" : "Your life. Your system. Your next level."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && !isForgot && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What should we call you?" className={inputCls} />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={inputCls} />
          </div>
          {!isForgot && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className={inputCls} />
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full rounded-xl py-3 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{isForgot ? "Send Reset Link" : isSignUp ? "Create my LvLUp account" : "Continue"}<ArrowRight className="h-4 w-4" /></>}
          </Button>

          {!isForgot && (
            <>
              <div className="flex items-center gap-3 my-1"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">or</span><Separator className="flex-1" /></div>
              <Button type="button" variant="outline" className="w-full rounded-xl py-3 gap-2 border-border hover:bg-secondary" disabled={!!oauthLoading} onClick={() => handleOAuth("google")}>
                {oauthLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-sm font-bold">G</span>}
                Continue with Google
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-xl py-3 gap-2 border-border hover:bg-secondary" disabled={!!oauthLoading} onClick={() => handleOAuth("apple")}>
                {oauthLoading === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-sm">●</span>}
                Continue with Apple
              </Button>
            </>
          )}
        </form>

        <div className="mt-6 text-center space-y-2">
          {!isForgot && <button onClick={() => setIsForgot(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors">Forgot password?</button>}
          <div><button onClick={() => { setIsSignUp(!isSignUp); setIsForgot(false); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">{isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}</button></div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
