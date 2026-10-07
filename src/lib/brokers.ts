export const BROKER_STATUS = [
  { name: "MT5", status: "Available" },
  { name: "TradeLocker", status: "Beta" },
  { name: "Match-Trader", status: "Beta" },
  { name: "cTrader", status: "Coming Soon" },
] as const;
export const BROKER_SECURITY_NOTE = "Connections are used to read account history, not place trades. Use MT5 investor credentials where available. Other platforms may require a full login; saved credentials are restricted to server-side sync and never included in analytics. Beta results should be checked against your broker statement.";
