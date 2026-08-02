/** Map a journal/MT5 symbol to a TradingView-compatible symbol. */
const FOREX = new Set([
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "NZDUSD", "USDCAD",
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CHFJPY", "EURAUD", "EURCHF",
  "CADJPY", "NZDJPY", "GBPAUD", "GBPCAD", "AUDCAD", "AUDNZD", "USDZAR",
]);

const METALS: Record<string, string> = {
  XAUUSD: "OANDA:XAUUSD",
  GOLD: "OANDA:XAUUSD",
  XAGUSD: "OANDA:XAGUSD",
  SILVER: "OANDA:XAGUSD",
};

const INDICES: Record<string, string> = {
  US30: "CAPITALCOM:US30",
  NAS100: "CAPITALCOM:US100",
  US100: "CAPITALCOM:US100",
  SPX500: "CAPITALCOM:US500",
  US500: "CAPITALCOM:US500",
  GER40: "CAPITALCOM:DE40",
  DE40: "CAPITALCOM:DE40",
  UK100: "CAPITALCOM:UK100",
  JP225: "CAPITALCOM:J225",
};

const CRYPTO = /^(BTC|ETH|SOL|XRP|ADA|DOGE|BNB|LTC)(USD|USDT)$/;

export function toTradingViewSymbol(raw: string): string {
  if (!raw) return "OANDA:EURUSD";
  if (raw.includes(":")) return raw.toUpperCase();

  // Strip common broker suffixes: EURUSD.a, EURUSDm, XAUUSD_ecn
  const cleaned = raw.toUpperCase().replace(/[._-].*$/, "").replace(/(?<=[A-Z]{6})[A-Z]$/, "");

  if (METALS[cleaned]) return METALS[cleaned];
  if (INDICES[cleaned]) return INDICES[cleaned];
  if (CRYPTO.test(cleaned)) return `BINANCE:${cleaned.endsWith("USDT") ? cleaned : cleaned + "T"}`;
  if (FOREX.has(cleaned)) return `OANDA:${cleaned}`;
  if (/^[A-Z]{6}$/.test(cleaned)) return `OANDA:${cleaned}`;
  return cleaned; // stocks etc. — TradingView resolves the default exchange
}
