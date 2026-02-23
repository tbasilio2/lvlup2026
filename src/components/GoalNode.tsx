import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, Trash2, ChevronDown } from "lucide-react";
import type { Goal } from "@/lib/goals";
import { getGoalProgress, getGoalCounts, childLevel, levelLabels, levelEmoji } from "@/lib/goals";
import GoalProgressBar from "@/components/GoalProgressBar";
import AddGoalInline from "@/components/AddGoalInline";

interface GoalNodeProps {
  goal: Goal;
  allGoals: Goal[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (goal: Goal) => void;
  depth?: number;
}

const GoalNode = ({ goal, allGoals, onToggle, onDelete, onAdd, depth = 0 }: GoalNodeProps) => {
  const [expanded, setExpanded] = useState(depth < 2);

  const children = useMemo(
    () => allGoals.filter((g) => g.parentId === goal.id),
    [allGoals, goal.id]
  );
  const progress = useMemo(() => getGoalProgress(goal.id, allGoals), [goal.id, allGoals]);
  const counts = useMemo(() => getGoalCounts(goal.id, allGoals), [goal.id, allGoals]);
  const nextLevel = childLevel[goal.level];
  const hasChildren = children.length > 0;
  const isLeaf = !nextLevel;
  const isComplete = isLeaf ? goal.completed : progress === 1;

  const indentPadding = depth * 4;

  return (
    <div>
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors cursor-pointer hover:bg-secondary/50`}
        style={{ paddingLeft: `${12 + indentPadding}px` }}
      >
        {/* Expand/collapse or check */}
        {!isLeaf ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted hover:bg-secondary transition-colors"
          >
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => onToggle(goal.id)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isComplete
                ? "bg-accent text-accent-foreground"
                : "bg-muted hover:bg-secondary text-muted-foreground"
            }`}
          >
            {isComplete && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </motion.button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={() => !isLeaf && setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <span className="text-xs">{levelEmoji[goal.level]}</span>
            <p
              className={`text-sm font-medium truncate ${
                isComplete ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {goal.title}
            </p>
          </div>
          {hasChildren && (
            <div className="mt-1.5 max-w-[200px]">
              <GoalProgressBar progress={progress} size="sm" />
            </div>
          )}
          {hasChildren && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {counts.done}/{counts.total} completed
            </p>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(goal.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="border-l-2 border-border ml-6"
              style={{ marginLeft: `${24 + indentPadding}px` }}
            >
              {children.map((child) => (
                <GoalNode
                  key={child.id}
                  goal={child}
                  allGoals={allGoals}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onAdd={onAdd}
                  depth={depth + 1}
                />
              ))}
              {nextLevel && (
                <div className="pl-3 py-1">
                  <AddGoalInline
                    level={nextLevel}
                    parentId={goal.id}
                    onAdd={onAdd}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalNode;
