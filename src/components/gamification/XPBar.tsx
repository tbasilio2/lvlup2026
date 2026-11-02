import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { LevelInfo } from "@/lib/gamification";

interface XPBarProps {
  level: LevelInfo;
  compact?: boolean;
}

const XPBar = ({ level, compact = false }: XPBarProps) => {
  const remaining = level.nextLevelXp !== null ? level.nextLevelXp - level.xp : 0;
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/25">
            <span className="text-xs font-bold text-primary tabular-nums">{level.level}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">LvL {level.level} · {level.name}</p>
            {!compact && <p className="text-[10px] text-muted-foreground tabular-nums">{level.xp.toLocaleString()} XP total</p>}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {level.nextLevelXp !== null ? `${remaining} XP to LvL ${level.level + 1}` : "Max level"}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(level.progress * 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      {!compact && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Zap className="h-3 w-3 text-primary" /> Earn XP: habit check-ins, journal entries, trades, chart analyses, goals
        </p>
      )}
    </div>
  );
};

export default XPBar;
