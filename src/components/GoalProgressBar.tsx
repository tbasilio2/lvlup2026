import { motion } from "framer-motion";

interface GoalProgressBarProps {
  progress: number; // 0 to 1
  size?: "sm" | "md" | "lg";
}

const GoalProgressBar = ({ progress, size = "md" }: GoalProgressBarProps) => {
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" };
  const pct = Math.round(progress * 100);

  const getColor = () => {
    if (pct >= 100) return "bg-accent";
    if (pct >= 60) return "bg-primary";
    if (pct >= 30) return "bg-heatmap-mid";
    return "bg-heatmap-low";
  };

  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className={`flex-1 rounded-full bg-muted overflow-hidden ${heights[size]}`}>
        <motion.div
          className={`h-full rounded-full ${getColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  );
};

export default GoalProgressBar;
