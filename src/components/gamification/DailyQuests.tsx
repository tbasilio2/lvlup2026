import { motion } from "framer-motion";
import { CheckCircle2, Circle, CalendarCheck } from "lucide-react";
import type { EarnedQuest } from "@/lib/gamification";

interface DailyQuestsProps {
  quests: EarnedQuest[];
  completed: number;
  xpEarned: number;
}

const DailyQuests = ({ quests, completed, xpEarned }: DailyQuestsProps) => {
  const allDone = quests.length > 0 && completed === quests.length;
  return (
    <motion.section
      className="mb-8 rounded-2xl border border-border bg-card p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily quests</h2>
          <p className="mt-1 text-sm text-foreground">Three wins a day. {xpEarned > 0 ? `+${xpEarned} XP earned today.` : "Reset every day."}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarCheck className={`h-4 w-4 ${allDone ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-sm font-semibold tabular-nums">{completed}/{quests.length}</span>
        </div>
      </div>
      <div className="space-y-2">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              quest.completed ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/40"
            }`}
          >
            {quest.completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
            <div className="min-w-0 flex-1">
              <p className={`text-sm truncate ${quest.completed ? "text-foreground" : "text-foreground/80"}`}>{quest.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{quest.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xs font-semibold tabular-nums ${quest.completed ? "text-primary" : "text-muted-foreground"}`}>+{quest.xp} XP</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{quest.progressLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
};

export default DailyQuests;
