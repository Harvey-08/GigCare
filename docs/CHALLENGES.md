# Engineering Challenges & Solutions

This document outlines the complex technical hurdles encountered during the development of the GigCare platform and the engineering strategies used to overcome them.

---

## 1. Basis Risk Mitigation
**Challenge**: A major issue in parametric insurance is "Basis Risk"—the gap between a sensor reading (e.g., at the airport) and the actual experience of a worker in a specific neighborhood.
**Solution**:
- **Geogrid Resolution**: Instead of city-wide triggers, we implemented a 2km x 2km hexagonal geogrid. 
- **Multi-Source Consensus**: The system cross-references IMD data with Open-Meteo and real-time "order drop" signals from the delivery platform to confirm localized disruption.

## 2. Advanced Fraud Collusion
**Challenge**: Professional fraud rings often use "device farms" and linked UPI accounts to file thousands of simultaneous claims during a legitimate disruption event.
**Solution**:
- **Identity Linkage Graph**: Using **NetworkX**, we build a weekly graph of worker relationships based on shared device IDs, IP addresses, and consistent GPS co-location. 
- **Cluster Freezing**: If a specific cluster (linked accounts) files more than 5 claims within 10 minutes, the entire group is moved to **FLAGGED** status for manual verification.

## 3. High-Concurrency Claim Spikes
**Challenge**: A city-wide flood can trigger claims for 10,000+ workers simultaneously, creating a massive write-load on the PostgreSQL database and potential race conditions in payout initiation.
**Solution**:
- **Atomic Payout Checks**: Implemented a "Daily Payout State" map with atomic accumulation to ensure the `DAILY_PAYOUT_CAP_RUPEES` is never exceeded, even under heavy load.
- **Queue-Based Dispatch**: Claims are processed via a non-blocking orchestrator that rate-limits UPI transfers to prevent hitting bank/gateway throttle limits.

## 4. GPS Spoofing & Velocity Checks
**Challenge**: Workers using "Mock Location" apps to teleport into a "Heavy Rain" zone while remaining in a dry area.
**Solution**:
- **Haversine Velocity Filter**: The Fraud Engine calculates the implied speed between the last 10 GPS pings. If `speed > 1.5 km/min`, the claim is flagged for impossible travel.
- **Hardware Signal Validation**: The system checks `accelerometer_mag` and `rooted_device` flags. Stationary accelerometer readings combined with moving GPS pings are a primary indicator of "Joystick" spoofing.

## 5. Cold-Start Problem for Risk Models
**Challenge**: New cities lack the historical disruption data required to train an accurate **Gradient Boosting (GBM)** premium model.
**Solution**:
- **Transfer Learning Baseline**: We use "Feature Mapping" to assign new cities a risk profile based on similar metros (e.g., using Chennai's flood-prone metadata as a baseline for new coastal expansion zones) until 90 days of local data is collected.
