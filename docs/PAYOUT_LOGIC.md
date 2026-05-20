# Parametric Payout Logic

---

This document details the financial structure, coverage tiers, and payout heuristics implemented in the GigCare platform.

## 1. Parametric Coverage Philosophy
GigCare operates on a **Parametric** model, where payouts are triggered by data (IMD/CPCB sensors) rather than manual damage assessment.
- **Lost Income Coverage**: Specifically protects against reduced hours due to external disruptions.
- **Asset Exclusion**: Strictly excludes vehicle repairs, medical bills, or life/accidental insurance.

## 2. Product Tiers & Pricing
Policies are issued for a **7-day coverage window**. The premium is calculated by the AI engine and adjusted by the selected coverage tier.

| Coverage Tier | Premium Multiplier | Max Payout (Cap) | Daily Payout Limit |
| :--- | :--- | :--- | :--- |
| **SEED** | **0.65x** | ₹600 | ₹600 |
| **STANDARD** | **1.00x** | ₹1,200 | ₹1,200 |
| **PREMIUM** | **1.35x** | ₹1,800 | ₹1,800 |

*Base premiums typically range from ₹60 to ₹280 depending on the worker's zone and seasonal risk profile.*

---

## 3. Automated Payout Formula
The system calculates the disruption loss at the moment of the trigger.

### Calculation Logic:
`Payout = (Hourly_Income_Proxy * Disruption_Hours * Severity_Factor * Peak_Multiplier)`

- **Hourly Income Proxy**: Calculated as `Average_Daily_Income ÷ 8`. New workers use a regression-based city proxy.
- **Disruption Hours**: The duration of the event (Clamped between 0.5 and 8 hours).
- **Severity Factor**: Impact weight assigned by the evaluator (e.g., 1.3 for Heavy Rain).
- **Peak Multiplier**: An extra weight (up to 1.5) for disruptions occurring during high-demand dinner/lunch windows.

### Example Scenario:
- **Worker**: Standard Tier in Bangalore.
- **Event**: Heavy Rain (50mm+) for 3 hours during 7 PM Peak.
- **Math**: `₹80/hr * 3hrs * 1.3 Severity * 1.2 Peak = ₹374.40`
- **Result**: ₹374 is automatically credited to the worker's wallet.

---

## 4. System Guardrails
To ensure platform sustainability and prevent fraud:
1. **Cooling Period**: Policies require a **48-hour activation window** before claims can be processed.
2. **Daily Payout Cap**: The system imposes a `DAILY_PAYOUT_CAP_RUPEES` (default ₹3,600) across all claims for a single worker to prevent over-extraction.
3. **Zone Locking**: Claims are only generated if the worker's registered zone or real-time GPS ping matches the disruption coordinates.
4. **Reputation Buffering**: Workers with high "Risk Scores" (calculated from historical outcomes) are automatically moved to **FLAGGED** or **DENIED** statuses by the orchestrator.

## 5. Lifecycle Flow
1. **Quote**: Worker requests a quote; GBM model calculates risk.
2. **Purchase**: Worker selects tier (SEED/STD/PREM) and pays premium.
3. **Trigger**: External Oracle detects disruption.
4. **Score**: Fraud Service evaluates legitimacy (FRS).
5. **Release**: Approved funds move via UPI/Razorpay instantly.
