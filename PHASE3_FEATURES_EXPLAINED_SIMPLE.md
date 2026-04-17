# Phase 3 Features Explained (Simple Version)

This document explains the most important Phase 3 features in simple language:
- What we built
- How we built it
- Why we chose that feature

Date: April 16, 2026

---

## 1) XGBoost Fraud Detection

### What we built
We built an ML fraud scoring system that gives each claim a fraud probability and trust score.

### How we built it
- Trained a model using claim signal features (speed, GPS mismatch, device sharing, claim spikes, etc.)
- Used XGBoost as the main classifier
- Added Isolation Forest to catch unusual patterns (anomaly detection)
- Exposed the model through the fraud scoring API endpoint

### Why we chose XGBoost
- It works very well on tabular data (which is exactly what claim signals are)
- It handles non-linear relationships better than simple models
- It is fast enough for real-time claim checks
- It gives better fraud accuracy than rule-only systems

---

## 2) SHAP Explainability

### What we built
We added explainability so each fraud decision can show the top factors behind the score.

### How we built it
- Used SHAP TreeExplainer with the trained XGBoost model
- Picked top feature contributions for each claim
- Returned a simple explanation string in the response
- Added safe fallback explanation if SHAP is not available

### Why we chose SHAP
- It makes model decisions easier to understand for ops/admin teams
- It helps audits and trust (important for insurance-like workflows)
- It is a standard explainability tool for tree-based models

---

## 3) Fraud Ring Detection (Graph Analysis)

### What we built
We built fraud ring detection to find groups of accounts sharing suspicious signals.

### How we built it
- Created a graph of workers, devices, IPs, and WiFi identifiers
- Connected related nodes in NetworkX
- Found suspicious connected components (coordinated groups)
- Added endpoint to list detected rings and shared signals

### Why we chose graph analysis
- Fraud rings are network problems, not single-claim problems
- Graphs are the best way to detect shared infrastructure abuse
- It helps catch organized fraud that point models may miss

---

## 4) NLP Trust Enhancement

### What we built
We added a lightweight NLP layer to adjust trust decisions using text and behavior context.

### How we built it
- Parsed claim notes for useful language patterns
- Extracted simple linguistic signals (coherence, keywords, risky wording)
- Combined with worker behavior history (approval ratio, claim frequency)
- Applied a bounded boost/penalty to trust score

### Why we chose this feature
- Fraud is not only numeric; text and behavior add useful context
- It improves borderline decisions where model confidence is medium
- A lightweight heuristic NLP layer is easier to maintain and deploy quickly

---

## 5) India-Specific Trigger Sources (IMD + CPCB)

### What we built
We integrated India-focused weather and pollution sources for parametric triggers.

### How we built it
- Added IMD source for rainfall and temperature
- Added CPCB source for air quality (AQI)
- Added fallback chain when a source is unavailable
- Tagged trigger events with source information

### Why we chose IMD and CPCB
- These are India-relevant data sources for the product use case
- Better local context than generic-only sources
- Helps keep trigger logic closer to real conditions in target cities

---

## 6) Razorpay Production Mode Support

### What we built
We improved payout handling so it can run in sandbox, production, or safe fallback mode.

### How we built it
- Added config-based mode selection
- Used Razorpay contacts/fund accounts/payout APIs in live flow
- Kept fallback simulation for reliability if provider fails
- Updated claim payout fields and status tracking

### Why we chose this design
- Gives a clear path from testing to production without rewriting flow
- Keeps the system resilient when payment provider is unavailable
- Supports safer operations during rollout

---

## 7) Geolocation + Hard Fraud Rules

### What we built
We enforced strict fraud rules for impossible or high-risk claims.

### How we built it
- Added rule checks like teleport speed, zone mismatch, sensor mismatch, stale payload, and shared devices
- Applied immediate deny/flag in hard-risk scenarios
- Kept model scoring for softer cases

### Why we chose this feature
- Some fraud patterns are obvious and should be blocked instantly
- Hard rules reduce false approvals on extreme fraud behavior
- Rule + ML hybrid design is stronger than using either one alone

---

## 8) k6 Load Testing Suite

### What we built
We created a performance test suite to validate behavior under high traffic.

### How we built it
- Added k6 script with staged load (up to 100 virtual users)
- Tested key flows: auth, premium, fraud scoring, triggers, admin APIs
- Added thresholds for latency and error rate

### Why we chose k6
- Easy to run and maintain for API-heavy systems
- Good fit for CI/CD performance checks
- Helps prove readiness before production traffic

---

## Final Summary

The Phase 3 design uses a practical mix of:
- Strong ML (XGBoost)
- Explainability (SHAP)
- Network intelligence (fraud rings)
- Context signals (NLP and behavior)
- India-relevant trigger data (IMD/CPCB)
- Production-safe payout and performance validation

This was chosen to balance:
- Accuracy
- Speed
- Reliability
- Explainability
- Real-world deployment readiness
