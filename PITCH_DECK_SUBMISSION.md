# GigCare Pitch Deck (Submission Version)

## Slide 1: Title

## GigCare
Parametric Insurance for Gig Workers

Tagline: Protecting weekly income with automatic, evidence-driven payouts.

Team context:
- Built as a hackathon-ready, demoable, end-to-end system.
- Designed to prove both social impact and technical feasibility.

---

## Slide 2: The Problem

Gig workers face income volatility from events they cannot control:
- Heavy rain and flooding reduce orders and increase travel risk.
- Extreme heat lowers safe working hours.
- Poor air quality directly affects ability to work outdoors.
- Sudden city disruptions (curfew, app outage) can instantly halt earnings.

Why existing insurance fails this group:
- Traditional products are monthly or annual and not aligned to weekly gig income cycles.
- Claims are paperwork-heavy and slow.
- Small payout claims are often not worth filing.
- Trust gaps create high fraud concerns, which increases insurer hesitation.

Impact of the gap:
- High financial stress for workers.
- No quick cushion for short-term disruption.
- Lower trust in financial protection products.

---

## Slide 3: Opportunity and Vision

Vision:
- Make micro-insurance as fast and automatic as gig platforms themselves.

Opportunity:
- Convert weather/disruption signals into parametric events.
- Remove manual claims dependency where objective trigger evidence exists.
- Use a fraud-aware payout engine to protect both workers and insurer economics.

Core belief:
- If policy duration, pricing, and claims flow match gig work realities, adoption and retention improve.

---

## Slide 4: Our Approach (End-to-End)

GigCare uses a closed-loop architecture:
1. Worker buys short-cycle policy.
2. Premium is dynamically calculated by zone risk and forecast context.
3. Trigger engine watches weather/disruption inputs.
4. Matching trigger auto-creates claims for eligible active policies.
5. Fraud layer evaluates trust and abuse patterns.
6. Payout decision is executed and reflected in worker/admin dashboards.

Why this architecture:
- Parametric logic gives objective claim eligibility.
- Automation reduces operational delay and manual burden.
- Fraud controls preserve payout integrity and platform sustainability.

---

## Slide 5: Product Modules

### Worker App
- Registration and login.
- Premium quote and tier selection.
- Policy purchase and activation.
- Coverage visibility and claims history.

### Admin App
- Portfolio-level dashboard metrics.
- City-wise risk and policy monitoring.
- Manual trigger controls for operational and demo reliability.
- Fraud ring visibility and suspicious signal summary.

### Backend Services
- API gateway and domain routes.
- Trigger engine scheduler and evaluators.
- Premium model service.
- Fraud scoring and claim gating logic.
- Database persistence and compatibility fallbacks.

Why modular design was chosen:
- Clear responsibility boundaries.
- Easier debugging under hackathon timelines.
- Better path to production hardening after submission.

---

## Slide 6: What We Built (Feature Summary)

Primary capabilities delivered:
- Weekly coverage model for gig workers.
- Dynamic premium pricing with tiering.
- Automatic trigger-to-claim pipeline.
- Fraud-aware payout gating.
- Admin oversight with real-time operational metrics.
- Demo-safe payment simulation at policy purchase step.

Design intent:
- Keep the full value chain visible in one demo:
  purchase -> trigger -> claim -> fraud evaluation -> payout decision.

---

## Slide 7: Why Weekly Policies

Problem solved:
- Monthly products do not match weekly cash-flow realities of gig workers.

Decision:
- Offer short coverage windows with clear weekly start/end.

Why this was done:
- Improves affordability and commitment flexibility.
- Lets workers opt in based on current conditions.
- Makes risk and pricing updates more responsive.

Impact:
- Better product-fit for variable income users.
- Clearer understanding of protection period.
- Faster iteration on risk-pricing strategy.

---

## Slide 8: Why Parametric Triggers

Problem solved:
- Manual proof collection is slow, inconsistent, and expensive for small claims.

Decision:
- Use objective trigger thresholds:
  - Heavy rain
  - Extreme heat
  - Poor AQI
  - Curfew
  - App outage / other disruption

Why this was done:
- Objective conditions reduce adjudication friction.
- Allows event-driven automatic claim creation.
- Improves response speed when disruption is widespread.

Impact:
- Lower claim handling latency.
- Better worker trust due to transparent trigger rules.
- Operational scalability for city-level incidents.

---

## Slide 9: Why Dynamic Premiums

Problem solved:
- Flat pricing is unfair: low-risk workers overpay, high-risk exposure is underpriced.

Decision:
- Use risk-aware premium calculation with zone and weather context.

Why this was done:
- Align pricing with expected risk.
- Improve sustainability of reserve and payout pool.
- Provide explainable premium differences by zone.

Impact:
- Better actuarial alignment for prototype stage.
- Clear demo evidence that pricing is not arbitrary.
- Basis for future retraining on production outcomes.

### Hybrid Location-Pricing Plan (Important for Submission)

What happens when a worker location is outside our 10 supported cities:
1. We detect that the coordinates are outside supported city boundaries.
2. We find the nearest supported city using distance to city centroid.
3. We assign a fallback city zone (city centroid zone) for continuity.
4. We compute premium using nearest city base premium and guardrails:
  - nearest-city climate context
  - seasonal multiplier
  - fallback tier multiplier where applicable
5. Worker still receives a quote instead of getting blocked.

Why we implemented this hybrid plan:
- Avoids hard rejection for users outside currently mapped polygons.
- Preserves product accessibility while city expansion is in progress.
- Keeps pricing explainable with deterministic fallback rules.

Impact observed:
- Better user coverage continuity in unsupported coordinates.
- Fewer onboarding drop-offs due to location mismatch.
- Reliable demo behavior for edge-location scenarios.

---

## Slide 10: Why Tiered Coverage

Problem solved:
- One-size coverage cannot fit different worker risk appetite and budget.

Decision:
- Offer SEED, STANDARD, PREMIUM tiers with different premium and max payout.

Why this was done:
- Lets workers choose affordability vs protection depth.
- Creates product ladder for broader adoption.

Impact:
- Higher flexibility and potential conversion.
- More realistic portfolio composition in admin dashboard.

---

## Slide 11: Why Fraud-Aware Claims

Problem solved:
- Automated claims can be abused without risk controls.

Decision:
- Add fraud scoring and policy-level safeguards:
  - Duplicate-event suppression
  - Claim velocity checks
  - Device/IP linkage analysis
  - Reputation-informed risk patterns
  - Daily payout caps

Why this was done:
- Preserve fairness to genuine workers.
- Protect payout pool from coordinated abuse.
- Maintain confidence for operator/insurer side.

Impact:
- Better balance between speed and control.
- Reduced chance of runaway payout leakage.
- Stronger narrative for responsible automation.

---

## Slide 12: Why Admin Trigger Controls

Problem solved:
- Purely background-only trigger systems are hard to validate under demo time constraints.

Decision:
- Provide manual trigger panel and guaranteed demo trigger path.

Why this was done:
- Ensures deterministic demonstration even if live external feeds are noisy.
- Supports operator intervention and testing workflows.

Impact:
- Reliable end-to-end demos.
- Faster debugging and issue isolation.
- Better confidence in the trigger-claim linkage.

---

## Slide 13: Why Demo Payment Simulation at Purchase

Problem solved:
- Hackathon environments need realistic flow without production payment risk.

Decision:
- Simulate payment at policy purchase and activate policy in demo mode.

Why this was done:
- Keeps insurance logic correct: premium payment occurs at policy buy.
- Avoids unsafe live payment dependencies for submission timelines.

Impact:
- Clear user experience and correct business flow.
- Faster demos with fewer external failure points.
- Easy path to swap to real gateway later.

---

## Slide 14: System Architecture

Logical layers:
- Frontend: Worker app and Admin app.
- API layer: Auth, zones, premiums, policies, claims, admin, webhooks.
- Intelligence layer: Premium service and fraud service.
- Trigger layer: Scheduler + source adapters + evaluator.
- Data layer: Supabase/PostgreSQL.

Why this architecture:
- Independent scaling of trigger, inference, and API concerns.
- Fault isolation: source failures do not require full platform shutdown.
- Clear CI and deployment boundaries.

Impact:
- Better maintainability.
- Easier horizontal extension to more cities/events.

---

## Slide 15: Data and Trigger Pipeline

Event flow:
1. Source adapters fetch weather/AQI inputs.
2. Evaluator checks threshold crossing per city/zone.
3. Trigger event is stored.
4. Eligible active policies are located.
5. Claims are auto-created.
6. Fraud checks produce risk-aware claim status.
7. Dashboard and worker views update.

Why this flow design:
- Makes each stage observable and testable.
- Keeps auditability for compliance-like review.

Impact:
- Faster incident debugging.
- More reliable operations under mixed live/mock conditions.

---

## Slide 16: Decision Log (Why -> Impact)

| Decision | Why we did it | Impact observed |
|---|---|---|
| Added city fallback when zone match fails | Prevent valid workers from being missed due to zone data mismatch | Improved claim reflection consistency |
| Added force_create path for manual/admin trigger | Avoid accidental dedupe for explicit operator actions | Manual triggers reliably create expected claims |
| Added schema-compat logic (id/policy_id, user_id/worker_id) | Environment schema differences caused integration breakage | Reduced runtime failures across variants |
| Added fallback claim store merge in dashboard | Keep visibility when claim write path has partial issues | Admin sees near-real-time operational picture |
| Capped payouts by available premiums in summary metrics | Prevent misleading payout optics and preserve solvency narrative | More realistic reserve and loss-ratio reporting |
| Added dedicated fraud section UI | Compact widgets hid actionable fraud context | Better readability and judge-facing storytelling |
| Added deterministic demo trigger and mock source behavior | Live APIs can be noisy/unreliable during demos | Higher demo success rate |
| Moved demo payment to purchase flow | Align with correct insurance business logic | Cleaner user understanding and logical correctness |
| Added nearest-city hybrid premium fallback for out-of-coverage coordinates | Prevent quote failures outside currently supported 10-city bounds | Continuous pricing flow and improved onboarding conversion |

---

## Slide 17: Innovation Highlights

1. Parametric micro-insurance for weekly gig cycles
- Innovation is not just automation, but matching protection duration to worker cash cycles.

2. Hybrid live + deterministic demo reliability
- Uses real feeds where available, but keeps deterministic fallback for dependable demonstration.

3. Fraud-aware automation
- Auto-claims are paired with layered abuse checks, not blind payouts.

4. Admin observability with operational controls
- City metrics, fraud insights, and manual triggers provide practical control-plane design.

5. Schema-compatible engineering strategy
- Built resilience against evolving DB schemas to keep velocity under real constraints.

6. Hybrid location-to-premium fallback
- If a worker is outside mapped city bounds, the nearest supported city is used with transparent fallback pricing parameters.

---

## Slide 18: User Journey

Worker journey:
1. Register/login.
2. View premium quote and choose tier.
3. Purchase and activate policy.
4. Receive automatic claim if trigger occurs.
5. Track claim status and payout outcome.

Admin journey:
1. Login to dashboard.
2. Monitor loss ratio, reserve, claims status.
3. Inspect city-level exposure and fraud posture.
4. Trigger events manually when needed.
5. Validate end-to-end claim creation path.

Why this dual-journey design:
- Worker trust and admin control must both be first-class.

Impact:
- Product demonstrates both user value and operator viability.

---

## Slide 19: Business and Social Impact

Worker impact:
- Faster financial relief after disruption.
- Lower claims complexity.
- Higher confidence in short-term protection.

Operator impact:
- Better risk visibility.
- Controlled payout exposure.
- Faster response during city-wide events.

Ecosystem impact:
- Strong use case for embedded financial protection in gig platforms.
- Foundation for policy innovation in climate-affected urban labor markets.

---

## Slide 20: Metrics We Track

Operational metrics:
- Total premiums collected.
- Total payouts and reserve pool.
- Loss ratio percentage.
- Claims by status.
- Claims created in last 24 hours.

Risk and fraud metrics:
- Ring count and cross-city linkage indicators.
- High-risk claim density.
- Payout caps and liability gap indicators.

Why these metrics:
- Needed to balance growth, fairness, and solvency.

Impact:
- Better decision quality for pricing, trigger thresholds, and fraud policy.

---

## Slide 21: Testing and Validation Strategy

Validation done:
- API route verification for core workflows.
- Integration checks for purchase, activation, trigger, claim creation.
- Dashboard correctness checks for premium/payout metrics.
- Frontend builds and runtime checks.

Why this strategy:
- End-to-end correctness matters more than isolated unit coverage for demo readiness.

Impact:
- Reduced regression risk in submission phase.
- Higher confidence in live presentation.

---

## Slide 22: Technical Trade-Offs

Trade-off 1: Demo reliability vs pure live dependency
- Chosen: controlled fallback in demo mode.
- Reason: avoid demo failure due to external API volatility.

Trade-off 2: Rapid delivery vs full production hardening
- Chosen: robust MVP with clear upgrade path.
- Reason: submission timeline with priority on complete user journey.

Trade-off 3: Strict schema assumptions vs compatibility handling
- Chosen: compatibility logic for key entity identifiers.
- Reason: environment variability observed during integration.

---

## Slide 23: Security and Integrity Posture

Current safeguards:
- Role-based access control for worker/admin routes.
- JWT-based authenticated flows.
- Duplicate suppression and velocity-aware checks.
- Internal service key validation for privileged internal paths.

Why this level now:
- Strong baseline needed for trusted financial behavior in demos.
- Balanced against hackathon implementation constraints.

Impact:
- Meaningful abuse resistance without blocking product usability.

---

## Slide 24: Limitations (Transparent)

Current limitations:
- Some model training still uses synthetic outcome assumptions.
- Fraud ring persistence can be further hardened for multi-instance durability.
- Broader temporal anomaly modeling is limited.
- Real external verification signals can be expanded.

Why we call this out:
- Credibility with judges and stakeholders.
- Shows clear understanding of production-readiness gaps.

---

## Slide 25: Roadmap (Post-Hackathon)

Phase A: Reliability hardening
- Persist all runtime fraud/trigger artifacts in DB.
- Increase integration coverage for edge cases.

Phase B: Intelligence upgrade
- Retrain premium and fraud models with real claim outcomes.
- Add richer sequence-based anomaly detection.

Phase C: Scale and partnerships
- Expand city coverage.
- Add more verified disruption data sources.
- Integrate production payment rails.

Expected impact:
- Higher model trustworthiness.
- Better pricing precision.
- Stronger abuse resilience.

---

## Slide 26: Demo Storyline (2-3 Minutes)

1. Worker buys weekly policy.
2. Admin dashboard reflects premium and portfolio state.
3. Trigger event is fired.
4. Claim auto-creates and passes through fraud checks.
5. Dashboard and worker claim status update.

Why this storyline:
- Shows complete loop in minimal time.
- Makes innovation and impact visible without deep technical setup.

---

## Slide 27: What Makes GigCare Different

- Built for weekly gig economics, not traditional monthly insurance assumptions.
- Converts objective environmental risk into automatic income protection.
- Couples speed with fraud-aware controls instead of either-or design.
- Built as an operational system, not only a model demo.

---

## Slide 28: Ask / Closing

Our ask:
- Support pilot expansion to more zones and partners.
- Enable access to richer outcome data for model improvement.
- Validate gig-worker adoption and payout experience at larger scale.

Closing statement:
GigCare demonstrates that climate-disruption protection for gig workers can be fast, fair, and operationally viable when pricing, triggers, and fraud controls are designed as one system.

---

## Appendix A: Submission-Ready Talking Points

- Problem: Gig workers lose earnings during disruption and lack fast protection.
- Approach: Parametric weekly micro-insurance with automated claims.
- Innovation: Trigger-driven payouts plus fraud-aware governance.
- Impact: Faster relief, clearer operations, sustainable risk controls.
- Readiness: End-to-end workflow implemented, tested, and demoable.

## Appendix B: Why Each Major Component Exists

### Worker App
Why:
- Needed a direct user-facing proof of adoption path.
Impact:
- Demonstrates real onboarding-to-protection journey.

### Admin Dashboard
Why:
- Needed operational transparency for trust and control.
Impact:
- Makes risk, payouts, and anomalies actionable.

### Trigger Engine
Why:
- Core of parametric promise: no manual claim initiation dependency.
Impact:
- Enables automatic, scalable incident response.

### Premium Service
Why:
- Risk-aware pricing is required for fairness and sustainability.
Impact:
- Differentiated pricing by zone and conditions.

### Fraud Layer
Why:
- Automation without abuse controls is not sustainable.
Impact:
- Protects reserve pool and platform credibility.

### Payment Webhook Layer
Why:
- Needed business-correct policy activation flow.
Impact:
- Aligns user understanding and insurance logic.

## Appendix C: Suggested Presenter Split (Optional)

- Presenter 1: Problem, market gap, user pain.
- Presenter 2: Approach, architecture, feature decisions.
- Presenter 3: Innovation, fraud controls, metrics.
- Presenter 4: Impact, roadmap, closing ask.
