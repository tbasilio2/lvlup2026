import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrades } from "@/hooks/useTrades";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import AddTradeDialog from "@/components/trading/AddTradeDialog";
import CSVImport from "@/components/trading/CSVImport";
import TradeRow from "@/components/trading/TradeRow";
import TradeStats from "@/components/trading/TradeStats";
import PnLCalendar from "@/components/trading/PnLCalendar";
import EquityCurve from "@/components/trading/EquityCurve";
import TradingViewWidget from "@/components/trading/TradingViewWidget";

const Trading = () => {
  const { trades, loading, addTrade, addTradesBatch, deleteTrade } = useTrades();
  const [chartSymbol, setChartSymbol] = useState("OANDA:EURUSD");

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-5 py-8 pb-24 space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-8 pb-24">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Trading Journal</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Track, analyze, improve</p>
            </div>
            <div className="flex gap-2">
              <CSVImport onImport={addTradesBatch} />
              <AddTradeDialog onAdd={addTrade} />
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="journal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="journal" className="rounded-lg text-xs">Journal</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-xs">Analytics</TabsTrigger>
            <TabsTrigger value="chart" className="rounded-lg text-xs">Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="space-y-3">
            <TradeStats trades={trades} />

            {trades.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <p className="text-muted-foreground text-sm">No trades yet. Add your first trade or import from CSV.</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {trades.map((trade) => (
                    <TradeRow key={trade.id} trade={trade} onDelete={deleteTrade} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <TradeStats trades={trades} />
            <PnLCalendar trades={trades} />
            <EquityCurve trades={trades} />
          </TabsContent>

          <TabsContent value="chart" className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={chartSymbol}
                onChange={(e) => setChartSymbol(e.target.value)}
                placeholder="e.g. OANDA:EURUSD"
                className="flex-1 rounded-xl border border-input bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
              />
            </div>
            <TradingViewWidget symbol={chartSymbol} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Trading;
