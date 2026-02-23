import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { Target, TrendingUp, CheckCircle2, Layers } from "lucide-react";
import { getGoals, saveGoals, getGoalProgress, getGoalCounts } from "@/lib/goals";
import type { Goal } from "@/lib/goals";
import GoalNode from "@/components/GoalNode";
import GoalProgressBar from "@/components/GoalProgressBar";
import AddGoalInline from "@/components/AddGoalInline";

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>(getGoals);

  const annualGoals = useMemo(() => goals.filter((g) => g.level === "annual"), [goals]);

  const updateGoals = useCallback((updater: (prev: Goal[]) => Goal[]) => {
    setGoals((prev) => {
      const next = updater(prev);
      saveGoals(next);
      return next;
    });
  }, []);

  const addGoal = useCallback(
    (goal: Goal) => updateGoals((prev) => [...prev, goal]),
    [updateGoals]
  );

  const toggleGoal = useCallback(
    (id: string) =>
      updateGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
      ),
    [updateGoals]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      // Delete goal and all descendants
      updateGoals((prev) => {
        const toDelete = new Set<string>();
        const collect = (parentId: string) => {
          toDelete.add(parentId);
          prev.filter((g) => g.parentId === parentId).forEach((g) => collect(g.id));
        };
        collect(id);
        return prev.filter((g) => !toDelete.has(g.id));
      });
    },
    [updateGoals]
  );

  // Overall stats
  const stats = useMemo(() => {
    const totalAnnual = annualGoals.length;
    const overallProgress =
      totalAnnual > 0
        ? annualGoals.reduce((sum, g) => sum + getGoalProgress(g.id, goals), 0) / totalAnnual
        : 0;

    const allLeaves = goals.filter((g) => g.level === "daily" || !goals.some((c) => c.parentId === g.id));
    const completedLeaves = allLeaves.filter((g) => g.completed).length;

    return {
      totalGoals: goals.length,
      overallProgress,
      completedLeaves,
      totalLeaves: allLeaves.length,
    };
  }, [goals, annualGoals]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-8 pb-20">
        {/* Header */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl text-foreground">2026 Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top-down goal planning — break big dreams into daily actions
          </p>
        </motion.header>

        {/* Overview Stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <Target className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{annualGoals.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Annual Goals
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <Layers className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.totalGoals}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Total Goals
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <CheckCircle2 className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">
              {stats.completedLeaves}/{stats.totalLeaves}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Tasks Done
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <TrendingUp className="h-4 w-4 text-streak-glow mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">
              {Math.round(stats.overallProgress * 100)}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Overall
            </p>
          </div>
        </motion.div>

        {/* Overall Progress */}
        {annualGoals.length > 0 && (
          <motion.div
            className="mb-6 rounded-2xl border border-border bg-card p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Overall Progress
            </h3>
            <GoalProgressBar progress={stats.overallProgress} size="lg" />
          </motion.div>
        )}

        {/* Goal Tree */}
        <motion.section
          className="rounded-2xl border border-border bg-card p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Goal Hierarchy
            </h2>
          </div>

          {annualGoals.length === 0 ? (
            <div className="text-center py-10">
              <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No annual goals yet</p>
              <p className="text-xs text-muted-foreground/60 mb-4">
                Start by adding your big-picture goals for 2026
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence>
                {annualGoals.map((goal) => (
                  <GoalNode
                    key={goal.id}
                    goal={goal}
                    allGoals={goals}
                    onToggle={toggleGoal}
                    onDelete={deleteGoal}
                    onAdd={addGoal}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-3 px-3">
            <AddGoalInline level="annual" parentId={null} onAdd={addGoal} />
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Goals;
