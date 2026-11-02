import { motion } from "framer-motion";
import { Flame, Trophy, Zap } from "lucide-react";
import XPBar from "@/components/gamification/XPBar";
import type { LevelInfo, EarnedBadge } from "@/lib/gamification";

interface LevelSummaryProps {
  level: LevelInfo;
  badges: EarnedBadge[];
  streak: number;
}

const LevelSummary = ({ level, badges, streak }: LevelSummaryProps) => {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <motion.div
      className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-transparent p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 border border-primary/25">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">LvL {level.level} · {level.name}</p>
            <p className="text-[10px] text-muted-foreground tabular-nums">{level.xp.toLocaleString()} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-primary" : ""}`} />{streak}d</span>
          <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{earned}/{badges.length}</span>
        </div>
      </div>
      <XPBar level={level} compact />
    </motion.div>
  );
};

export default LevelSummary;
