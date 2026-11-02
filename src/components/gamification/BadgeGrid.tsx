import { motion } from "framer-motion";
import { BadgeCheck, Lock } from "lucide-react";
import * as Icons from "lucide-react";
import type { EarnedBadge } from "@/lib/gamification";

interface BadgeGridProps {
  badges: EarnedBadge[];
}

const BadgeGrid = ({ badges }: BadgeGridProps) => {
  const earnedCount = badges.filter((b) => b.earned).length;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {earnedCount} of {badges.length} unlocked
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {badges.map((badge, i) => {
          const Icon = (Icons as any)[badge.icon] ?? BadgeCheck;
          return (
            <motion.div
              key={badge.id}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center ${
                badge.earned ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/40"
              }`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${badge.earned ? "bg-primary/15" : "bg-secondary/60"}`}>
                {badge.earned
                  ? <Icon className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
                  : <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />}
              </div>
              <p className={`text-xs font-semibold leading-tight ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>{badge.name}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeGrid;
