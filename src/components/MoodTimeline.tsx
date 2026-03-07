import { useMemo } from "react";
import { motion } from "framer-motion";
import { MOODS, getMoodColor, type JournalEntry } from "@/lib/journal";

interface Props {
  entries: JournalEntry[];
}

const MoodTimeline = ({ entries }: Props) => {
  const last14 = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).reverse();
    return sorted;
  }, [entries]);

  if (last14.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No entries yet. Start journaling to see your mood over time.
      </div>
    );
  }

  const moodToY: Record<string, number> = {
    amazing: 10,
    good: 30,
    okay: 50,
    low: 70,
    rough: 90,
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Mood Timeline
      </h3>
      <div className="rounded-2xl border border-border bg-card p-4">
        <svg viewBox="0 0 300 100" className="w-full h-24">
          {/* Grid lines */}
          {[10, 30, 50, 70, 90].map((y) => (
            <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" />
          ))}

          {/* Path */}
          {last14.length > 1 && (
            <motion.path
              d={last14
                .map((e, i) => {
                  const x = (i / (last14.length - 1)) * 280 + 10;
                  const y = moodToY[e.mood];
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}

          {/* Dots */}
          {last14.map((e, i) => {
            const x = last14.length === 1 ? 150 : (i / (last14.length - 1)) * 280 + 10;
            const y = moodToY[e.mood];
            const moodInfo = MOODS.find((m) => m.value === e.mood);
            return (
              <motion.circle
                key={e.id}
                cx={x}
                cy={y}
                r="4"
                fill={getMoodColor(e.mood)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 + 0.5 }}
              >
                <title>{`${e.date}: ${moodInfo?.label}`}</title>
              </motion.circle>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-muted-foreground">
            {last14[0]?.date.slice(5)}
          </span>
          <div className="flex gap-3">
            {MOODS.map((m) => (
              <span key={m.value} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                {m.emoji} {m.label}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {last14[last14.length - 1]?.date.slice(5)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MoodTimeline;
