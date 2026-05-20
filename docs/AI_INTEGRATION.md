# AI Integration & Fraud Pipeline

---

## 1. AI Ecosystem Overview

GigCare utilizes a multi-layered AI stack to automate insurance lifecycle decisions without human intervention.

| AI Service | Model Architecture | Primary Objective |
| :--- | :--- | :--- |
| **Risk & Pricing** | Gradient Boosting (GBM) | Predicts optimal weekly premiums based on hyper-local environmental risk and seasonal cycles. |
| **Fraud Scorer** | XGBoost Classifier | Analyzes behavioral, device, and network signals to assign a fraud probability to every automated claim. |
| **Anomaly Guard** | Isolation Forest | Detects "outlier" claims where worker behavior deviates significantly from their historical baseline. |
| **Trust Layer** | SHAP (Explainability) | Generates feature-level justifications for every automated denial or flag (XGBoost interpretation). |

---

## 2. Risk Assessment AI (Premium Pricing)

### 2.1 Feature Engineering
The **Gradient Boosting Regressor** ingests 11 primary signals to calculate the "Zone-Safe" weekly premium.

| Input Signal | Significance |
| :--- | :--- |
| `rain_mm_7day` | Total predicted rainfall over the next 7 days (mm). |
| `max_temp_c` | Determines heat-wave risk for outdoor delivery partners. |
| `min_temp_c` | Minimum temperature recorded in the forecast window. |
| `rain_days_count` | Number of days with rainfall ≥ 10mm in the forecast. |
| `heavy_rain_days` | Frequency of threshold-breaking events (≥ 50mm) in the forecast. |
| `heat_days` | Number of days with temperature ≥ 40°C in the forecast. |
| `zone_risk_score` | Historical disruption frequency for the specific grid cell. |
| `flood_prone` | Binary flag for low-lying geospatial areas. |
| `month` | Calendar month (1–12) for seasonal trend capture. |
| `is_monsoon` | Binary flag: 1 if month is June–September. |
| `is_summer` | Binary flag: 1 if month is March–May. |

### 2.2 Dynamic Underwriting
- **Retraining**: The model is updated via `train.py` using real-time weather datasets collected through `build_real_dataset.py`.
- **Pricing Range**: Outputs a recommended premium between **₹60 and ₹280** per week.
- **Fallback**: If GPS is outside mapped city bounds, a hybrid fallback quote is generated using nearest-city baseline metadata.

---

## 3. Fraud Detection AI (FRS Engine)

The **Fraud Risk Score (FRS)** engine is a 4-stage validation pipeline that evaluates legitimacy within seconds of a trigger event.

### 3.1 Advanced Feature Set
The **XGBoost** model evaluates 15 signals per claim, including:
- **Geospatial**: `gps_cell_offset_km`, `gps_wifi_offset_km`, `gps_zone_offset_km`, `implied_max_speed_kmh`.
- **Hardware**: `accelerometer_mag`, `accel_gps_delta` (to detect stationary spoofing), `rooted_device`.
- **Behavioral**: `claim_cluster_10min`, `claims_last_7_days`, `seconds_since_trigger`, `cross_city_claim`.
- **Identity**: `shared_device_count`, `ip_gps_mismatch`, `timezone_mismatch`, `platform_login_match`.

### 3.2 Detection Logic (The "Gates")
1. **The Bouncer (Rules)**: Rejects duplicate hashes and claims on policies < 48 hours old.
2. **The Speed Camera (Geospatial AI)**: Flags impossible travel speeds between GPS pings.
3. **The Outlier Detector (Isolation Forest)**: Identifies statistical anomalies in earnings spikes.
4. **The Network Mapper (NetworkX)**: Identifies clusters of claims sharing the same Device/IP/Location in a short window.

### 3.3 Automated Decisioning
The engine produces four distinct actions based on the FRS, reputation score, and rule-based hard blocks:

| Action | Trust Score | Resolution |
| :--- | :--- | :--- |
| **APPROVED** | > 0.85 | Automatic payout initiated via UPI. |
| **PARTIAL** | 0.60 – 0.85 | Capped payout released; remainder held for review. |
| **FLAGGED** | < 0.60 | Payout withheld; escalating to manual review. |
| **DENIED** | Hard Block | Immediate rejection by rules engine (teleport, fraud ring, device farm, GPS spoofing). |

---

## 4. Engineering Boundaries: ML vs. Rules

| Component | Logic Type | Rationale |
| :--- | :--- | :--- |
| **Claim Initiation** | **Rule-Based** | Triggers (Rain/AQI) must be 100% deterministic for compliance. |
| **Fraud Scoring** | **AI-Based** | Behavioral patterns are too complex for hardcoded if/else rules. |
| **Payment Release** | **Rule-Based** | Final money release follows hard FRS thresholds for safety. |
| **Risk Tiering** | **AI-Based** | GBM handles high-dimensional interaction between weather and zone. |

---

## 5. Unified System Flow
*AI models produce probability scores, but the **Node.js Integrator** applies the financial guardrails (Daily Payout Caps, Policy Tiers) before funds are moved. This ensures the system remains "AI-Assisted" but "Policy-Governed."*
