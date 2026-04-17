# GigCare Hackathon Summary

GigCare is a parametric insurance platform for gig delivery workers. It gives weekly coverage, automatically creates claims when weather or disruption conditions are met, and routes claims through a fraud check before payout. The system is built to show a complete insurance flow: purchase, activation, trigger detection, claim creation, review, and payout.

For the main project overview, see [README.md](README.md). For clone-and-run instructions, see [SETUP_AFTER_CLONE.md](SETUP_AFTER_CLONE.md).

## Setup After Clone

For the full local setup, see [SETUP_AFTER_CLONE.md](SETUP_AFTER_CLONE.md). It lists the service URLs, required environment variables, startup steps, and the main API endpoints available after the stack is running.

## What Was Built

- A worker app for registration, policy purchase, active coverage, and claim tracking.
- An admin app for dashboard metrics, manual trigger control, and fraud review.
- A backend API that handles auth, zones, premiums, policies, claims, and admin operations.
- A premium pricing service that uses weather, zone risk, and coverage inputs to produce weekly pricing.
- A trigger engine that evaluates weather and disruption signals and creates claims automatically.
- A fraud layer that scores each claim before payout and applies caps, duplicate protection, and action escalation.

## Tools Used and Why

- React: used for the worker and admin interfaces because the demo needed fast, clear page-based navigation.
- Node.js and Express: used for the API because the project needs simple route handling, authentication, and integration logic.
- Python and Flask: used for the premium service because the pricing model is easier to train and serve in Python.
- PostgreSQL via Supabase: used for structured storage of workers, policies, zones, claims, and trigger events.
- Docker Compose: used to run the full stack consistently across services.
- Scikit-learn: used for the premium model training, with a RandomForest-based pricing model.
- Live weather and AQI sources: used so the system can respond to current environmental conditions.
- Razorpay-style payment flow in demo mode: used so the policy purchase experience looks real without requiring live payment setup for the hackathon.

## How the Core Flow Works

1. A worker signs in and buys a weekly policy.
2. Premium pricing is calculated from zone risk and weather inputs.
3. When conditions cross the configured thresholds, the trigger engine creates a claim.
4. The claim is evaluated by the fraud layer using worker history, location consistency, device/IP linkage, and timing signals.
5. Approved claims are paid out automatically; partial or flagged claims are held for review.

## Fraud Detection Approach

The fraud system is designed to catch claims that do not match normal worker behavior.

It checks for:

- Repeated claims from the same trigger event.
- Unusual claim velocity in a short time window.
- Device or IP reuse across multiple workers.
- Claims that look inconsistent with the worker’s location history.
- Suspicious timing patterns, such as claims clustered across cities or zones.
- High historical risk scores from previous outcomes.

Common abuse patterns the system is meant to reduce:

- A worker reusing the same trigger event more than once.
- Multiple accounts using the same device or IP.
- Claims submitted from a location that does not match the insured zone.
- Large bursts of claims after one trigger without a matching weather event.

How it responds:

- Clean claims can be approved quickly.
- Medium-risk claims can be partially paid or flagged.
- High-risk claims can be denied or escalated.
- Daily payout caps prevent the system from overpaying in a single day.

## Model Training Example

The premium service was trained on synthetic samples that mirror weather, zone risk, and payout behavior. That lets the model produce realistic weekly pricing during the demo while still using live weather inputs at runtime. The model is used to differentiate zones so that higher-risk areas receive higher premiums than lower-risk areas.

## Features That Stand Out

- Weekly policy coverage instead of long insurance contracts.
- Automatic claims from trigger events with no manual paperwork.
- Live weather and AQI awareness.
- Admin-triggered demo path that can target a real active policy zone.
- Fraud hardening with reputation, identity linkage, and payout controls.
- Clear worker and admin dashboards that make the system easy to show in a hackathon.

## Future Improvements

- Move trigger and fraud runtime state fully into the database for multi-instance reliability.
- Replace demo payment mode with production payment integration when needed.
- Expand model retraining using real policy and claim history.
- Add broader automated integration tests for trigger, claim, and payout flows.
- Improve region coverage by adding more cities and more live data sources.
