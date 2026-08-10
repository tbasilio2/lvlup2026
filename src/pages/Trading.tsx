import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrades } from "@/hooks/useTrades";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import AddTradeDialog from "@/components/trading/AddTradeDialog";
import PracticeTradeDialog from "@/components/trading/PracticeTradeDialog";
import CSVImport from "@/components/trading/CSVImport";
import MT5ImportWizard from "@/components/trading/MT5ImportWizard";
import MT5ConnectDialog from "@/components/trading/MT5ConnectDialog";
import ConnectedAccountsList from "@/components/trading/ConnectedAccountsList";
import SyncAllButton from "@/components/trading/SyncAllButton";
import TradeRow from "@/components/trading/TradeRow";
import TradeStats from "@/components/trading/TradeStats";
import TradeHeroStats from "@/components/trading/TradeHeroStats";
import RecentTradesTable from "@/components/trading/RecentTradesTable";
import PnLCalendar from "@/components/trading/PnLCalendar";
import EquityCurve from "@/components/trading/EquityCurve";
import TradingViewWidget from "@/components/trading/TradingViewWidget";
import TradeAIAnalysis from "@/components/trading/TradeAIAnalysis";
import AICopilot from "@/components/trading/AICopilot";
import AnalysesHistory from "@/components/trading/AnalysesHistory";
import WeeklyReport from "@/components/trading/WeeklyReport";
import AdvancedMetrics from "@/components/trading/analytics/AdvancedMetrics";
import DrawdownChart from "@/components/trading/analytics/DrawdownChart";
import MonthlyHeatmap from "@/components/trading/analytics/MonthlyHeatmap";
import BreakdownTable from "@/components/trading/analytics/BreakdownTable";
import StrategyPerformance from "@/components/trading/analytics/StrategyPerformance";
import TimeOfDayChart from "@/components/trading/analytics/TimeOfDayChart";
import LongShortCompare from "@/components/trading/analytics/LongShortCompare";
import { useTradeAnalytics } from "@/hooks/useTradeAnalytics";
import { TrendingUp } from "lucide-react";

const Trading = () => {
  const { trades, loading, addTrade, addTradesBatch, deleteTrade, updateTrade, refetch } = useTrades();
  const [chartSymbol, setChartSymbol] = useState("OANDA:EURUSD");
  const [mt5Refresh, setMt5Refresh] = useState(0);
  const analytics = useTradeAnalytics(trades);

  if (loading) {
    return <div className="min-h-screen bg-background"><div className="mx-auto max-w-7xl px-5 py-8 pb-24 space-y-4"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-3 gap-2">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div></div>;
  }

  return <div className="min-h-screen bg-background"><div className="mx-auto max-w-7xl px-5 py-8 pb-24">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}><div className="flex items-center justify-between mb-6 flex-wrap gap-3"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10 border border-primary/20"><TrendingUp className="h-5 w-5 text-primary" /></div><div><h1 className="text-xl font-semibold text-foreground tracking-tight">Trading Journal</h1><p className="text-xs text-muted-foreground font-mono">Track · Analyze · Improve</p></div></div><div className="flex gap-2 flex-wrap"><PracticeTradeDialog /><MT5ConnectDialog onConnected={() => setMt5Refresh((n) => n + 1)} /><SyncAllButton refreshKey={mt5Refresh} onSynced={() => { refetch(); setMt5Refresh((n) => n + 1); }} /><MT5ImportWizard onImport={addTradesBatch} /><CSVImport onImport={addTradesBatch} /><AddTradeDialog onAdd={addTrade} /></div></div></motion.div>
    <div className="mb-4"><ConnectedAccountsList refreshKey={mt5Refresh} onSynced={() => { refetch(); setMt5Refresh((n) => n + 1); }} /></div>
    <Tabs defaultValue="journal" className="space-y-4"><TabsList className="grid w-full grid-cols-6 rounded-xl bg-secondary"><TabsTrigger value="journal" className="rounded-lg text-[10px] font-mono data-[state=active]:bg-card data-[state=active]:text-primary">Dashboard</TabsTrigger><TabsTrigger value="analytics" className="rounded-lg text-[10px] font-mono data-[state=active]:bg-card data-[state=active]:text-primary">Stats</TabsTrigger><TabsTrigger value="advanced" className="rounded-lg text-[10px] font-mono data-[state=active]:bg-card data-[state=active]:text-primary">Pro</TabsTrigger><TabsTrigger value="ai-trade" className="rounded-lg text-[10px] font-mono data-[state=active]:bg-card data-[state=active]:text-primary">Copilot</TabsTrigger><TabsTrigger value="history" className="rounded-lg text-[10px] font-mono data-[state=active]:bg-card data-[state=active]:text-primary">History</TabsTrigger><TabsTrigger value="chart" className="rounded-lg text-[10px] font-mono data-[state=active]:bg-card data-[state=active]:text-primary">Chart</TabsTrigger></TabsList>
      <TabsContent value="journal" className="space-y-4"><TradeHeroStats trades={trades} />{trades.length === 0 ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 rounded-xl border border-dashed border-border bg-card/50"><TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground text-sm">No trades yet.</p><p className="text-muted-foreground/60 text-xs mt-1">Practice a trade first, or add your first real trade / import from MT5 / CSV.</p></motion.div> : <><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2"><PnLCalendar trades={trades} /></div><div><EquityCurve trades={trades} /></div></div><RecentTradesTable trades={trades} /><div><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em] font-mono mb-2 mt-2">All Trades</h3><div className="space-y-2"><AnimatePresence>{trades.map((trade) => <TradeRow key={trade.id} trade={trade} onDelete={deleteTrade} onUpdate={updateTrade} />)}</AnimatePresence></div></div></>}</TabsContent>
      <TabsContent value="analytics" className="space-y-4"><TradeStats trades={trades} /><TradeAIAnalysis trades={trades} /><PnLCalendar trades={trades} /><EquityCurve trades={trades} /><WeeklyReport /></TabsContent>
      <TabsContent value="advanced" className="space-y-4"><AdvancedMetrics a={analytics} /><DrawdownChart a={analytics} /><MonthlyHeatmap a={analytics} /><LongShortCompare a={analytics} /><StrategyPerformance trades={trades} /><BreakdownTable title="By Symbol" rows={analytics.bySymbol} /><TimeOfDayChart a={analytics} /></TabsContent>
      <TabsContent value="ai-trade" className="space-y-4"><AICopilot /></TabsContent>
      <TabsContent value="history" className="space-y-4"><AnalysesHistory /></TabsContent>
      <TabsContent value="chart" className="space-y-3"><div className="flex gap-2"><input type="text" value={chartSymbol} onChange={(e) => setChartSymbol(e.target.value)} placeholder="e.g. OANDA:EURUSD" className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60" /></div><TradingViewWidget symbol={chartSymbol} /></TabsContent>
    </Tabs>
  </div></div>;
};
export default Trading;
