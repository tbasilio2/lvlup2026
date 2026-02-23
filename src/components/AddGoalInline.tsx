import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { GoalLevel } from "@/lib/goals";
import { generateGoalId, levelLabels } from "@/lib/goals";
import type { Goal } from "@/lib/goals";

interface AddGoalInlineProps {
  level: GoalLevel;
  parentId: string | null;
  onAdd: (goal: Goal) => void;
}

const AddGoalInline = ({ level, parentId, onAdd }: AddGoalInlineProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      id: generateGoalId(),
      title: title.trim(),
      level,
      parentId,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setOpen(false);
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={`New ${levelLabels[level].toLowerCase()} goal...`}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Add
            </motion.button>
            <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="trigger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-1"
          >
            <Plus className="h-3 w-3" />
            Add {levelLabels[level].toLowerCase()} goal
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddGoalInline;
