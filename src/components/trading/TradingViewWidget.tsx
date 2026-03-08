import { useEffect, useRef } from "react";

interface Props {
  symbol?: string;
}

const TradingViewWidget = ({ symbol = "OANDA:EURUSD" }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
    });

    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card" style={{ height: 400 }}>
      <div ref={containerRef} className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
        <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
};

export default TradingViewWidget;
