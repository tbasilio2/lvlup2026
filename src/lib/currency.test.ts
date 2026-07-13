import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  CURRENCIES,
  formatMoney,
  formatMoneyCompact,
  getCurrency,
  setCurrency,
  type CurrencyCode,
} from "./currency";

// Expected per-currency full format for 1,234,567.50 and 1,234.50 and 0.10.
// Derived from Intl.NumberFormat output on Node/V8 (stable across recent versions).
const cases: Record<
  CurrencyCode,
  { symbol: string; big: string; mid: string; small: string; digits: number }
> = {
  ZAR: { symbol: "R",   big: "1 234 567,50",  mid: "1 234,50",   small: "0,10", digits: 2 },
  USD: { symbol: "$",   big: "1,234,567.50",  mid: "1,234.50",   small: "0.10", digits: 2 },
  EUR: { symbol: "€",   big: "1,234,567.50",  mid: "1,234.50",   small: "0.10", digits: 2 },
  GBP: { symbol: "£",   big: "1,234,567.50",  mid: "1,234.50",   small: "0.10", digits: 2 },
  AUD: { symbol: "A$",  big: "1,234,567.50",  mid: "1,234.50",   small: "0.10", digits: 2 },
  CAD: { symbol: "C$",  big: "1,234,567.50",  mid: "1,234.50",   small: "0.10", digits: 2 },
  JPY: { symbol: "¥",   big: "1,234,568",     mid: "1,235",      small: "0",    digits: 0 },
  CHF: { symbol: "CHF", big: "1\u2019234\u2019567.50", mid: "1\u2019234.50", small: "0.10", digits: 2 },
  NZD: { symbol: "NZ$", big: "1,234,567.50",  mid: "1,234.50",   small: "0.10", digits: 2 },
  INR: { symbol: "₹",   big: "12,34,567.50",  mid: "1,234.50",   small: "0.10", digits: 2 },
};

const original = getCurrency();

beforeEach(() => {
  // Reset to a known baseline before each test.
  setCurrency("USD");
});

afterAll(() => {
  setCurrency(original);
});

describe("formatMoney", () => {
  for (const code of Object.keys(cases) as CurrencyCode[]) {
    const c = cases[code];

    describe(code, () => {
      beforeEach(() => setCurrency(code));

      it("uses the correct symbol and grouping/decimal separators", () => {
        expect(formatMoney(1_234_567.5)).toBe(`${c.symbol} ${c.big}`);
        expect(formatMoney(1_234.5)).toBe(`${c.symbol} ${c.mid}`);
      });

      it("rounds to the currency's default digit count", () => {
        expect(formatMoney(0.1)).toBe(`${c.symbol} ${c.small}`);
        if (c.digits === 0) {
          // JPY has no minor units — halves round up (banker vs half-up may vary,
          // but Intl currently uses half-to-even for JA/JP; 1234.5 -> 1234 here).
          expect(formatMoney(1234.4)).toBe(`${c.symbol} 1,234`);
        }
      });

      it("prefixes a minus for negatives, no plus by default", () => {
        expect(formatMoney(-1_234.5)).toBe(`-${c.symbol} ${c.mid}`);
        expect(formatMoney(1_234.5)).toBe(`${c.symbol} ${c.mid}`);
      });

      it("prefixes a plus when signed and value is positive", () => {
        expect(formatMoney(1_234.5, { signed: true })).toBe(`+${c.symbol} ${c.mid}`);
        expect(formatMoney(-1_234.5, { signed: true })).toBe(`-${c.symbol} ${c.mid}`);
      });

      it("uses zero without a sign when signed=true and value is 0", () => {
        // 0 is not < 0, and JS treats 0 as falsy for the sign branch: no "+".
        expect(formatMoney(0, { signed: true })).toMatch(new RegExp(`^\\${c.symbol.replace(/\$/g, "\\$")} `));
      });
    });
  }

  it("honors an explicit digits override", () => {
    setCurrency("USD");
    expect(formatMoney(1.2345, { digits: 4 })).toBe("$ 1.2345");
    expect(formatMoney(1.2345, { digits: 0 })).toBe("$ 1");
  });

  it("returns em-dash for null, undefined, NaN, and Infinity", () => {
    setCurrency("USD");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney(NaN)).toBe("—");
    expect(formatMoney(Infinity)).toBe("—");
    expect(formatMoney(-Infinity)).toBe("—");
  });
});

describe("formatMoneyCompact", () => {
  it("keeps sub-1k values as whole numbers", () => {
    setCurrency("USD");
    expect(formatMoneyCompact(950)).toBe("$ 950");
    expect(formatMoneyCompact(0)).toBe("$ 0");
    expect(formatMoneyCompact(-42)).toBe("-$ 42");
  });

  it("uses k for thousands and M for millions", () => {
    setCurrency("USD");
    expect(formatMoneyCompact(1_200)).toBe("$ 1.2k");
    expect(formatMoneyCompact(12_345)).toBe("$ 12.3k");
    expect(formatMoneyCompact(1_500_000)).toBe("$ 1.5M");
    expect(formatMoneyCompact(-2_400)).toBe("-$ 2.4k");
  });

  it("uses the correct symbol per currency", () => {
    for (const code of Object.keys(cases) as CurrencyCode[]) {
      setCurrency(code);
      expect(formatMoneyCompact(1_500)).toBe(`${cases[code].symbol} 1.5k`);
      expect(formatMoneyCompact(-1_500_000)).toBe(`-${cases[code].symbol} 1.5M`);
    }
  });

  it("prefixes + when signed and positive", () => {
    setCurrency("USD");
    expect(formatMoneyCompact(1_200, { signed: true })).toBe("+$ 1.2k");
    expect(formatMoneyCompact(-1_200, { signed: true })).toBe("-$ 1.2k");
  });

  it("returns em-dash for null/undefined/NaN", () => {
    setCurrency("USD");
    expect(formatMoneyCompact(null)).toBe("—");
    expect(formatMoneyCompact(undefined)).toBe("—");
    expect(formatMoneyCompact(NaN)).toBe("—");
  });
});

describe("CURRENCIES registry", () => {
  it("has an entry with a symbol for every supported code", () => {
    for (const code of Object.keys(cases) as CurrencyCode[]) {
      expect(CURRENCIES[code]).toBeDefined();
      expect(CURRENCIES[code].symbol).toBe(cases[code].symbol);
      expect(CURRENCIES[code].code).toBe(code);
    }
  });
});
