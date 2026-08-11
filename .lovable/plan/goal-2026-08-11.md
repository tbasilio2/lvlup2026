## Goal

Complete the existing product tour so the trading step is meaningful and the focus personalisation actually works.

## What's wrong today

- `App.tsx` renders `<ProductTour onNavigate={...} />` without passing `onboardingFocus`, so the "Your focus" personalisation in the tour never appears — even after the user picks a focus during onboarding.
- The trading step copy is a single generic line ("Track discipline and decisions") that doesn't mention any of the journal's actual capabilities (MT5 sync, calendar/equity, Copilot, Pro analytics).
- The tour navigates on "Next" but never navigates to the first step's route, so a user starting on a different page sees mismatched copy and screen.

## Changes

1. Pass `onboardingFocus` from `AppRoutes` into `ProductTour` so the focus-first ordering and "Your focus" badge work as designed.
2. Navigate to the first step's route when the tour opens, so the highlighted page always matches the copy.
3. Expand the trading step into a proper trading-journal introduction: what the journal does (log trades manually, import from MT5/CSV, auto-sync), where results live (dashboard, P&L calendar, equity curve), and the AI Copilot review. Keep it concise — split into two short tour cards rather than one long one.
4. Keep the "Trading discipline" focus copy consistent with the expanded trading step wording.

## Technical notes

- Files touched: `src/App.tsx` (pass the prop), `src/components/ProductTour.tsx` (step definitions, initial navigation).
- No backend or schema changes; tour completion still tracked via the existing `lvlup:product-tour-complete` localStorage key.
