import { describe, it, expect } from "vitest";
import { resolvePnl } from "./pnl";

describe("resolvePnl - auto-calculation", () => {
  it("computes long trade profit minus fees", () => {
    const r = resolvePnl({
      direction: "long",
      entry_price: 100,
      exit_price: 110,
      quantity: 2,
      fees: 5,
    });
    // (110 - 100) * 2 - 5 = 15
    expect(r).toEqual({ pnl: 15, status: "closed" });
  });

  it("computes long trade loss minus fees", () => {
    const r = resolvePnl({
      direction: "long",
      entry_price: 100,
      exit_price: 90,
      quantity: 3,
      fees: 2,
    });
    // (90 - 100) * 3 - 2 = -32
    expect(r).toEqual({ pnl: -32, status: "closed" });
  });

  it("computes short trade profit minus fees", () => {
    const r = resolvePnl({
      direction: "short",
      entry_price: 200,
      exit_price: 180,
      quantity: 1,
      fees: 4,
    });
    // (200 - 180) * 1 - 4 = 16
    expect(r).toEqual({ pnl: 16, status: "closed" });
  });

  it("computes short trade loss minus fees", () => {
    const r = resolvePnl({
      direction: "short",
      entry_price: 50,
      exit_price: 55,
      quantity: 4,
      fees: 1,
    });
    // (50 - 55) * 4 - 1 = -21
    expect(r).toEqual({ pnl: -21, status: "closed" });
  });

  it("treats missing fees as zero", () => {
    const r = resolvePnl({
      direction: "long",
      entry_price: 10,
      exit_price: 12,
      quantity: 5,
      fees: null,
    });
    expect(r).toEqual({ pnl: 10, status: "closed" });
  });

  it("returns open with null pnl when exit_price is missing", () => {
    const r = resolvePnl({
      direction: "long",
      entry_price: 100,
      exit_price: null,
      quantity: 1,
      fees: 0,
    });
    expect(r).toEqual({ pnl: null, status: "open" });
  });
});

describe("resolvePnl - manual override", () => {
  it("manual override wins over auto-calc on a long trade", () => {
    const r = resolvePnl({
      direction: "long",
      entry_price: 100,
      exit_price: 110,
      quantity: 2,
      fees: 5,
      manual_pnl: 42,
    });
    expect(r).toEqual({ pnl: 42, status: "closed" });
  });

  it("manual override wins over auto-calc on a short trade", () => {
    const r = resolvePnl({
      direction: "short",
      entry_price: 200,
      exit_price: 180,
      quantity: 1,
      fees: 4,
      manual_pnl: -7.5,
    });
    expect(r).toEqual({ pnl: -7.5, status: "closed" });
  });

  it("manual override marks trade closed even with no exit_price", () => {
    const r = resolvePnl({
      direction: "long",
      entry_price: 100,
      exit_price: null,
      quantity: 1,
      manual_pnl: 25,
    });
    expect(r).toEqual({ pnl: 25, status: "closed" });
  });

  it("supports zero as a valid manual override", () => {
    const r = resolvePnl({
      direction: "long",
      entry_price: 100,
      exit_price: 110,
      quantity: 2,
      fees: 5,
      manual_pnl: 0,
    });
    expect(r).toEqual({ pnl: 0, status: "closed" });
  });

  it("ignores null manual override and falls back to auto-calc", () => {
    const r = resolvePnl({
      direction: "short",
      entry_price: 100,
      exit_price: 95,
      quantity: 2,
      fees: 1,
      manual_pnl: null,
    });
    // (100 - 95) * 2 - 1 = 9
    expect(r).toEqual({ pnl: 9, status: "closed" });
  });
});
