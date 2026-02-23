import { motion } from "framer-motion";
import { Flame, Trash2 } from "lucide-react";
import type { Habit } from "@/lib/habits";

interface HabitItemProps {
  habit: Habit;
  completed: boolean;
  streak: number;
  onToggle: () => void;
  onDelete: () => void;
}

const HabitItem = ({ habit, completed, streak, onToggle, onDelete }: HabitItemProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 transition-colors cursor-pointer ${
        completed
          ? "bg-accent/20 border-accent/30"
          : "bg-card border-border hover:border-primary/30"
      }`}
      onClick={onToggle}
    >
      <motion.div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-colors ${
          completed ? "bg-accent text-accent-foreground" : "bg-muted"
        }`}
        whileTap={{ scale: 0.85 }}
        animate={completed ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {completed ? "✓" : habit.emoji}
      </motion.div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm transition-colors ${completed ? "text-accent line-through" : "text-foreground"}`}>
          {habit.name}
        </p>
        {streak > 0 && (
          <motion.div
            className="flex items-center gap-1 mt-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Flame className="h-3 w-3 text-streak-glow" />
            <span className="text-xs font-medium text-streak-glow">
              {streak} day{streak !== 1 ? "s" : ""}
            </span>
          </motion.div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export default HabitItem;
