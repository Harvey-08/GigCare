# GigCare: Impact-Verified Parametric Insurance for Gig Delivery Workers
### Phase 1 Design Document — Deadline: March 20, 2026

---

## Executive Summary

GigCare is a mobile-first parametric insurance platform designed to protect India's gig delivery workers (Zomato/Swiggy partners) from weekly income loss caused by extreme environmental conditions and social disruptions. The platform combines **Impact-Verified Parametric Triggers** — validated not just by weather data but by real-time delivery volume drops — with a multi-layered anti-spoofing framework to ensure sustainable, fraud-resistant payouts.

Key design pillars:

- **Impact-verified parametric triggers** with dual validation (environmental thresholds + economic impact) covering rainfall, heat, AQI, curfews, and app outages
- **Hyperlocal 1 km² risk zones** with dynamic, forecast-adjusted, ML-driven premium pricing
- **Multi-signal fraud detection** using GPS, cellular, Wi-Fi, accelerometer, device fingerprinting, and real-time graph network analysis
- **Explainable AI** with continuous trust scores driving instant, partial, or reviewed payouts
- **Sustainable financial model** with 150% reserve buffer, < 65% loss ratio target, and platform co-payment subsidy

**Market context:** India's gig economy employs approximately 12 million workers (Economic Survey 2025–26), with roughly 40% earning under ₹15,000/month — highly exposed to income shocks from weather and social disruptions yet largely uninsured.

> **Scope:** Phase 1 deliverables are design and logic only — no production code. All content is derived from the provided problem statement and public domain sources.

---

## 1. Personas & Target Market

### 1.1 Persona A — Urban Food Delivery Worker

**Priya**, a Zomato partner in Mumbai, works 6 days/week across 8–10 hour shifts completing approximately 25 orders/day (baseline earnings ~₹5,000/week, ~₹21,000/month). During monsoon season she frequently goes offline for safety, losing 20–30% of weekly income with no compensation. GigCare provides her a weekly plan that automatically triggers a payout when rainfall halts her zone's delivery activity.

### 1.2 Persona B — E-Commerce Delivery Rider

**Ravi**, an Amazon delivery rider in Delhi, bikes through severe pollution waves (AQI > 400) that regularly force him off the road. When compelled to stop, he claims a payout through the app without having to submit manual paperwork or wait for an adjuster.

### 1.3 General Workflow

1. Worker downloads the mobile app and registers via phone/ID verification
2. Worker purchases a weekly insurance plan (paid via UPI/QR code)
3. The app runs quietly in the background, collecting sensor and earnings data
4. When an insured trigger event occurs, the app auto-submits a claim using stored location and sensor data
5. The system evaluates the claim for fraud risk and issues a payout — instantly if cleared, or via a verification step if flagged

---

## 2. Impact-Verified Parametric Triggers

### 2.1 Design Philosophy

Traditional parametric insurance pays out on environmental thresholds alone (e.g., rain ≥ 50 mm → fixed payout). GigCare adds an **economic impact layer**: a weather trigger must be accompanied by a measurable drop in platform delivery volume before a payout is validated. This eliminates false positives that inflate loss ratios and erode premium competitiveness.

| Approach | Traditional Parametric | GigCare Impact-Verified |
|---|---|---|
| Trigger basis | Weather threshold only | Weather threshold + delivery volume drop |
| False positive risk | High | Low |
| Payout accuracy | Approximate | Economically validated |
| Zone granularity | City-level | 1 km² micro-zones |

**Core payout logic:**

```
IF weather_trigger AND delivery_drop > 40% AND trust_score > 0.85:
    payout = avg_daily_income × disruption_hours × severity_factor × peak_multiplier
```

### 2.2 Trigger Thresholds

| Trigger | Threshold | Impact Validation | Source |
|---|---|---|---|
| **Heavy Rain** | ≥ 50 mm / 24 h | Platform orders drop > 40% | IMD (conservative vs. 64.5 mm "heavy") |
| **Heat Wave** | Max temp ≥ 40°C | Rider absence > 25% OR orders drop | IMD plains heat wave criteria |
| **Air Quality** | AQI ≥ 300 | Order cancellations > 30% | CPCB "Very Poor" category |
| **Curfew / Strike** | Official government notice | Platform-wide orders drop > 50% | Government notification feeds |
| **App / Network Outage** | Worker online, no assignments > 30 min | Orders drop > 70% in zone | Platform API signal |

**Impact validation sources:**

```
Platform-level:  orders_today / orders_yesterday < 0.60
Worker-level:    worker_orders_today / avg_orders  < 0.60
```

Thresholds are grounded in official criteria. The 40°C heat wave threshold aligns with IMD's definition for plains regions (April–September). The 50 mm rainfall threshold is deliberately conservative (below IMD's 64.5 mm "heavy rain" definition) to catch events likely to halt scooter movement early. AQI ≥ 300 maps to CPCB's "Very Poor" category, with an elevated severity multiplier applied above 400.

### 2.3 Payout Formula

For each weekly policy:

```
Payout = min(MaxCoverage, avg_daily_income × disruption_hours × severity_factor × peak_multiplier)
```

**Context-aware examples:**

| Scenario | Estimated Payout |
|---|---|
| Light rain, 2 hours, lunch shift | ₹50 |
| Heavy rain, 6 hours, dinner peak | ₹200 |
| Heat wave, full day | ₹350 |
| Multi-trigger event (heat + AQI) | Single payout, elevated severity factor |

When multiple triggers fire simultaneously, a **single payout** is issued (no stacking), but the severity factor is elevated and the event is flagged for reserve adjustment.

---

## 3. Premium Pricing & Financial Model

### 3.1 Hyperlocal Risk Zones

Bengaluru (and future cities) are divided into **1 km × 1 km grid zones**. Each zone receives a continuously updated risk score:

```
Zone Risk Score = f(rain_history, claim_density, rider_density, flood_prone_classification)
```

| Zone | Flood Risk | Zone Risk Score | Weekly Premium |
|---|---|---|---|
| Koramangala (low flood) | Low | 0.8 | ₹100 |
| Whitefield lowlands | High | 1.5 | ₹150 |

### 3.2 Dynamic Premium Pricing Formula

```
Weekly Premium = BaseRate × zone_risk × forecast_risk × (1 − trust_score_penalty)
```

- **BaseRate:** ₹100 (baseline risk profile)
- **zone_risk:** Historical event frequency multiplier per 1 km² zone
- **forecast_risk:** AI-adjusted multiplier based on upcoming IMD/CPCB weather forecasts
- **trust_score_penalty:** Discount for workers with a clean, verified claim history

Weekly billing via UPI/QR code aligns with how gig workers earn (weekly payout cycles) and avoids locking them into long-term contracts. ML models (regression or decision-tree) retrain weekly on new weather impacts and user behavior data to keep risk factors current.

**Dynamic pricing examples:**

```
IMD forecast: "High rain probability next week"   → +20% premium
Clear weather forecast                            → −10% discount
Koramangala, established rider, clean history     → ₹120/week
Whitefield, new rider (higher uncertainty)        → ₹180/week
```

**Monthly worked example:** Zone RiskFactor = 1.5 → ₹150/week → ₹600/month over a 4-week period.

### 3.3 Reserve Sizing & Loss Ratio

| Metric | Target |
|---|---|
| Reserve buffer | 150% of expected weekly claims |
| Loss Ratio | < 65% (industry standard) |
| Catastrophic reinsurance | Treaty-based, activated above reserve capacity |

If expected weekly claims = ₹1,000, the reserve is maintained at ₹1,500. A further 10–20% buffer above statutory reserves is held from retained earnings to ensure rapid payouts. Excess claims draw on the reinsurance treaty.

### 3.4 Payer Model

| Payer | Share | Example (₹150 premium) |
|---|---|---|
| Worker | 80% | ₹120 |
| Platform subsidy | 20% | ₹30 |

Premiums fund a **segregated reserve pool** held by the insurer, managed through weekly premium inflows and investment earnings on the pool.

---

## 4. Platform Architecture & Tech Stack

### 4.1 Platform Choice

- **Mobile (Android/iOS — React Native):** Primary worker interface — real-time geolocation, push notifications for weather alerts, background sensor collection, UPI payment integration, and photo/video upload for verification
- **Web Portal (React.js):** Administrator and platform manager interface — claims monitoring dashboard, fraud ring alerts, payout charts, and reserve analytics

### 4.2 Worker Journey

```
Register → ID/phone verification → Profile (zone, bike type, hours)
    → Choose weekly plan → UPI payment
    → Background sensor + earnings monitoring
    → Auto-claim on verified trigger → Trust score evaluated → Payout
```

### 4.3 System Architecture

```
flowchart TD
    A[IMD / CPCB APIs] --> B[Impact-Verified Trigger Engine]
    C[Platform Order API] --> B
    D[Worker App Sensors] --> E[Trust Score Engine]

    B --> F[Claims Engine]
    E --> F

    F -->|Trust > 0.85| G[Instant UPI Payout]
    F -->|Trust 0.6–0.85| J[Partial Payout + Selfie Verify]
    F -->|Trust < 0.6| H[Fraud Graph Analysis]

    H -->|Ring Detected| I[Block Accounts]
    H -->|Clean| J

    J --> K[Manual Review ~2% of claims]
    G --> L[Claim Closed ✅]
    K --> L
```

### 4.4 Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native (Android + iOS) |
| **Admin Web Portal** | React.js |
| **Backend API** | Node.js (Express) or Python (Flask) — hosted on AWS/Azure |
| **Database** | MongoDB or PostgreSQL (policies, claims, location signals) |
| **ML / Modeling** | Python — scikit-learn, TensorFlow/PyTorch; job scheduling via Airflow or cron |
| **External APIs** | IMD (weather), CPCB (AQI), Google Maps (geocoding), Razorpay (premium collection) |
| **DevOps** | Docker, GitHub CI/CD, AWS S3 (static assets), CloudWatch (logging & monitoring) |

---

## 5. AI/ML Integration

### 5.1 Dynamic Pricing Model

Regression or decision-tree models trained on historical earnings, zone weather events, and forecast data produce individualized weekly premiums. Models retrain weekly with updated claims and behavioral data to stay calibrated to evolving conditions.

### 5.2 Fraud Detection Engine

Real-time ML inference runs on each claim submission, outputting a continuous fraud probability score. High-risk claims route to verification; low-risk claims are auto-approved. See Section 6 for full detail.

### 5.3 Claims Severity Estimation

Predictive models estimate expected claim amounts and disruption durations per trigger type and zone. These outputs feed directly into reserve sizing calculations to ensure the pool remains adequately funded.

### 5.4 Continuous Learning

All models operate on a weekly retraining cycle, ingesting new weather impact data, confirmed fraud cases, and corrected false positives to progressively improve accuracy and reduce unnecessary claim friction.

---

## 6. Anti-Spoofing & Fraud Detection

### 6.1 Threat Model

The primary adversarial scenario is a **coordinated fraud ring** of ~500 delivery workers using GPS spoofing apps or hardware to simulate presence in an affected zone during safe conditions. Rings coordinate via messaging apps to submit simultaneous mass claims and drain the reserve pool.

### 6.2 Multi-Signal Data Collection

Every claim submission captures the following signals from the worker's device:

| Signal | Anti-Spoof Strength | Key Limitation |
|---|---|---|
| **GPS** | Precise coordinates | Spoofable via apps or jammers |
| **Cell Tower IDs** | Hard to fake at scale; broad area | Low precision; requires telecom DB |
| **Wi-Fi SSIDs** | Accurate indoor/outdoor reference | Only available where hotspots exist |
| **Bluetooth Beacons** | Short-range location confirmation | Requires pre-deployed beacons |
| **IP Address / Timezone** | Confirms general region and time consistency | VPNs or manual changes can mask truth |
| **Accelerometer** | Detects real physical movement | Noise; may miss slow movement |
| **Gyroscope** | Orientation and direction of travel | Requires calibration |
| **Magnetometer** | Compass heading cross-check | Disturbed by metal objects; coarse |
| **Device Fingerprint** | Ties sessions and devices together | Privacy-sensitive; spoofable on rooted devices |

### 6.3 Continuous Trust Score

Each claim is assigned a real-time trust score (0–1):

```
trust_score = 1.0 − fraud_probability(
    gps_cell_wifi_offset_km,
    speed_anomaly_kmh,
    device_shared_accounts,
    claim_cluster_density
)
```

| Trust Score | Action | Estimated Volume |
|---|---|---|
| > 0.90 | Instant UPI payout | ~92% of claims |
| 0.60 – 0.90 | 50% partial payout + selfie verification | ~5% of claims |
| < 0.60 | Manual review | ~3% of claims |

### 6.4 ML Architecture

The fraud detection engine combines **supervised classification** and **anomaly detection**:

- **Supervised model:** Random forest or XGBoost classifier (binary: fraud vs. legitimate), trained on labeled synthetic data
- **Anomaly detector:** Autoencoder or one-class SVM to catch novel attack patterns outside the training distribution
- **Training data:** Synthetic dataset simulating spoofed claims (static GPS, no sensor change, clustered patterns) and normal claims (varied paths, realistic speeds, sensor coherence). Pilot field data supplements normal-class representation.

#### Feature Engineering

| Category | Feature | Description |
|---|---|---|
| **Location Consistency** | GPS–Cell/Wi-Fi offset | Distance (km) between GPS and network-based location fix |
| | Jump distance / time | Implied speed (km/h) between consecutive GPS points |
| **Sensor Coherence** | Motion vs. reported speed | Accelerometer magnitude compared to GPS speed |
| **Network / Geo** | IP–GPS discrepancy | Boolean: IP geolocation matches GPS location? |
| | Timezone mismatch | Boolean: device timezone matches GPS region? |
| **Device Context** | Shared device count | Number of user accounts linked to one device fingerprint |
| | Rooted / emulator flag | Boolean: device is rooted or running in emulator? |
| | Fingerprint entropy | Uniqueness measure of device/app instance |
| **Group / Temporal** | Claim cluster density | Claims within 1 km radius / 10-minute window |
| | Multi-account switch | Distinct devices per user in a 24-hour window |

### 6.5 Fraud Ring Detection

A real-time **graph network** runs in parallel with the ML layer:

```
Nodes = users / devices / IPs / Wi-Fi SSIDs
Edges = shared signals (same IP, device fingerprint, simultaneous claims)

Connected component size > 10 users → FRAUD RING ALERT
```

Temporal spikes (e.g., 100+ claims in the same zone within minutes) also trigger bulk alerts independent of the graph.

### 6.6 Rule-Based Heuristics

Hard-block rules execute before the ML layer for minimum-latency detection:

| Rule | Condition | Action |
|---|---|---|
| Teleport Check | Implied speed > 150 km/h between GPS points | Block claim |
| Sensor Mismatch | No accelerometer activity + significant GPS movement | Block claim |
| IP / Timezone Check | IP country or timezone differs from GPS location | Flag for review |
| Wi-Fi / Cell Triangulation | GPS location falls outside radius of known nearby signals | Flag for review |
| Simultaneous Cluster | Same GPS coordinates across multiple claims in same window | Block cluster |
| Multi-Account Device | 5+ accounts associated with same device fingerprint | Block accounts |
| Replay Protection | Stale or reused timestamp on sensor data | Reject claim |

### 6.7 Explainable AI

Every flagged claim produces a human-readable explanation to support worker appeals and auditable manual review:

```
"Claim flagged (Trust Score = 0.42):
  • GPS–Wi-Fi mismatch detected:       40% contribution
  • Speed anomaly (180 km/h implied):  30% contribution
  • 12 similar claims in nearby zone:  30% contribution"
```

### 6.8 Claims Flow

```
flowchart LR
    Claim[Claim Submitted] --> Verify[Multi-Signal Analysis + Trust Score]
    Verify -->|Trust > 0.85| AutoPay[Instant UPI Payout ✅]
    Verify -->|Trust 0.6–0.85| Flagged[Partial Payout + Verification Request]
    Verify -->|Trust < 0.6| GraphCheck[Fraud Graph Analysis]

    Flagged --> Notify[Worker Notified: Review Pending]
    Notify --> Proof[Worker Provides Geotagged Selfie / Live Video]
    Proof --> ManualCheck[Manual Review]

    GraphCheck -->|Ring Detected| Deny[Reject Claim + Block Accounts ✗]
    GraphCheck -->|Clean| ManualCheck

    ManualCheck -->|Genuine| FullPay[Full Remaining Payout]
    ManualCheck -->|Fraud| Deny

    FullPay --> Done[Claim Closed ✅]
    AutoPay --> Done
    Deny --> Done
```

### 6.9 UX for Flagged Claims

- **Soft notification:** "Claim under review – please verify." No stigma language.
- **Partial payment:** 50% paid instantly from reserve; remainder held pending verification.
- **Verification options:** Geotagged selfie, short live video, or confirmation of local Wi-Fi association.
- **Appeals:** In-app chat or support hotline for wrongly flagged workers; verified appeals receive full remaining payout.
- **Feedback loop:** Confirmed false positives are tagged and fed back into model retraining to progressively reduce friction for honest workers.
- **Privacy compliance:** Camera and sensor access require explicit user consent; all collected data is encrypted on-device and transmitted over TLS.

---

## 7. Data Schema

### 7.1 Entity Relationship Diagram

```
erDiagram
    WORKER ||--o{ POLICY : purchases
    WORKER ||--o{ CLAIM : files
    CLAIM ||--o{ LOCATION_SIGNAL : includes
    DEVICE ||--|| WORKER : belongs_to
    DEVICE ||--o{ LOCATION_SIGNAL : records
    FRAUD_GRAPH ||--o{ WORKER : connects
```

### 7.2 Key Entities

| Entity | Key Attributes |
|---|---|
| **Worker** | worker_id, name, zone_id, bike_type, avg_daily_income, trust_score |
| **Policy** | policy_id, worker_id, week_start, premium_paid, max_coverage |
| **Claim** | claim_id, worker_id, policy_id, trigger_type, trigger_value, payout_amount, status |
| **LocationSignal** | signal_id, claim_id, device_id, gps_lat, gps_lon, cell_towers, wifi_ssids, accelerometer_mag, timestamp |
| **Device** | device_id, worker_id, fingerprint_hash, rooted_flag, shared_account_count |
| **FraudGraph** | node_id, node_type (user / device / IP), edges (shared_signal_type) |

### 7.3 Key API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/submit_claim` | POST | Worker submits a new claim with sensor payload |
| `/payment/notify` | POST | Razorpay webhook for premium payment confirmation |
| `/verify_step` | POST | Worker submits verification media (selfie/video) |
| `/claim/status` | GET | Worker retrieves current claim status and payout |
| `/admin/fraud_alerts` | GET | Admin retrieves active fraud ring alerts |

---

## 8. Implementation Roadmap

### Phase 1 — Design & Logic (Mar 4–20, 2026) ✅

| Deliverable | Description |
|---|---|
| README / Idea Document | This document — full system design |
| `data_schema.sql` | ER diagram with complete table definitions |
| `api_contracts.json` | OpenAPI spec for all endpoints |
| `mock_data_generator.py` | Synthetic normal and spoofed signal datasets |
| `trigger_logic_tests.py` | Unit tests for premium calculation, trigger logic, and fraud rules |
| `fraud_simulation.html` | Interactive demo of trust score and fraud detection logic |
| Dashboard mockups | Admin UI screenshots — active claims, fraud alerts, payout charts |

### Phase 2 — Core Build (Mar 21–Apr 4, 2026)

- Worker onboarding, policy management, and premium calculation engine
- Claims API with initial ML fraud detection on synthetic data
- Platform webhook integration (IMD/CPCB + delivery platform)
- Unit and integration tests for fraud checks and premium logic
- Demo: complete claim lifecycle on simulated weather trigger data
- Initial admin dashboard with fraud metrics

### Phase 3 — Integration & Scale (Apr 5–17, 2026)

- Live IMD and CPCB API integration replacing mock data
- ML model refinement with pilot field data from real workers
- Full fraud graph network deployment with real-time ring detection
- Reinsurance logic implementation and reserve management automation
- OWASP security hardening across API surface
- Load and stress testing for production-scale traffic
- Full mobile UI/UX polish and accessibility review
- Business viability analysis and unit economics report

---

## 9. Evaluation Targets

| Metric | Target | Notes |
|---|---|---|
| False Positive Rate | < 1% | Honest workers rarely flagged |
| Fraud Recall | > 95% | Catch nearly all spoof attempts, including coordinated rings |
| Detection Latency | < 10 seconds | Real-time processing after claim submission |
| Loss Ratio | < 65% | Industry standard for sustainable parametric insurance |
| Instant Payout Rate | ~92% of claims | Trust score > 0.90 |

All targets are provisional for Phase 1. They will be validated through controlled simulation in Phase 2 and against real pilot data in Phase 3, with model parameters adjusted accordingly.

---

## 10. Compliance & Constraints

- All Phase 1 deliverables derive solely from the provided problem statement and publicly available sources — no proprietary internal logs used.
- **Indian privacy law (DPDP Act):** On-device encryption for all sensor data; explicit opt-in consent for GPS and sensor collection; purpose-limited data retention; no unnecessary PII storage.
- **Camera / microphone access:** Requested only during the verification step, with clear in-app disclosure.
- Phase 1 is design-only — no production code committed.
- The 500-partner coordinated fraud ring scenario is fully addressed by the graph network, cluster heuristics, and the device multi-account rules.
- Weekly premium model is designed for flexibility — workers can opt out at any week boundary without penalty.

---

## 11. Authoritative Sources

| Source | Relevance |
|---|---|
| **Economic Survey 2025–26 (India)** | ~12 million gig workers; ~40% earn < ₹15,000/month — market sizing and vulnerability baseline |
| **IMD (India Meteorological Department)** | Heat wave criteria (≥ 40°C for plains), rainfall classification thresholds |
| **CPCB (Central Pollution Control Board)** | National AQI scale; "Very Poor" defined as > 300 |
| **Bajaj Allianz ClimateSafe** *(Reuters, Apr 2025)* | First Indian parametric insurance product targeting gig workers |
| **Digit Insurance + KMD AQI Policy** *(Economic Times, Feb 2025)* | Pilot parametric cover for construction workers in Delhi; AQI trigger precedent |
| **Oligeri et al., *Computer Networks* (2022)** | GPS spoof detection via crowd-sourced Wi-Fi/cell data; ~0.01 FPR, ~6 s detection latency — basis for evaluation targets |
| **SenseAI Geolocation Whitepaper** | Industry guidance on multi-sensor anti-spoofing and fraud-ring clustering |
| **InsTech / Parametric Post (2023)** | Highlights absence of income insurance for gig workers; market gap validation |

---

*GigCare — Phase 1 Design Document | Deadline: March 20, 2026*
