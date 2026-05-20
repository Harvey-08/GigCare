# Parametric Triggers & Data Logic

---

This document specifies the exact conditions, data sources, and severity multipliers that drive automated claims in the GigCare Trigger Engine.

## 1. Environmental Monitoring

The Trigger Engine continuously polls external oracles for city-specific disruptions. Every event is localized using **Geogrid Mapping** to match workers within a 2km radius of the disruption.

### 1.1 Heavy Rainfall
- **Threshold**: **>= 50mm** recorded rainfall.
- **Primary Oracle**: **IMD (India Meteorological Department)**.
- **Severity Factor**: **1.3**.
- **Peak Multiplier**: **1.2** (if event occurs between 18:00 and 21:00 IST).
- **Simulated Impact**: 30%–60% drop in order volume detected.

### 1.2 Extreme Heat
- **Threshold**: **>= 40°C** ambient temperature.
- **Primary Oracle**: **IMD** Temperature Forecasts.
- **Severity Factor**: **1.0**.
- **Context**: Focuses on worker health risk and operational fatigue.

### 1.3 Poor Air Quality (AQI)
- **Threshold**: **>= 300 AQI**.
- **Primary Oracle**: **CPCB (Central Pollution Control Board)**.
- **Severity Logic**:
    - **1.0** for AQI between 300 and 400.
    - **1.5** for AQI >= 400 ("Severe" category).

---

## 2. Infrastructure & Social Triggers

These triggers are derived from social disruption feeds and platform monitoring.

### 2.1 Unplanned Curfews / Section 144
- **Mechanism**: Regional movement restrictions or civil disruptions.
- **Source**: **Social Feed Adapter** (Mocked via `social.js`).
- **Severity**: Variable (typically **1.5**+).

### 2.2 Platform Outage
- **Mechanism**: Major delivery platform downtime or UPI payment gateway failure.
- **Source**: Simulated via Platform Probes.
- **Severity**: **1.0**.

---

## 3. The Evaluation Loop (`evaluator.js`)

The engine operates on a stateless loop:
1. **City Config**: Loads supported operational zones (e.g., South Mumbai, Bangalore North).
2. **Oracle Polling**: Fetches concurrent data from IMD, CPCB, and Open-Meteo for fallback.
3. **Threshold Check**: Evaluates if the `trigger_value` crosses the safety boundary.
4. **Claim Dispatch**: If fired, calls the internal **Fraud/Claim API** with:
    - `city_id` / `zone_id`
    - `trigger_type`
    - `severity_factor`
    - `peak_multiplier`

---

## 4. Oracle Fallback Strategy
To ensure 100% uptime, GigCare uses a multi-source fallback strategy:
- **Rain**: IMD → Open-Meteo → OpenWeather.
- **AQI**: CPCB → WAQI.
- **Social**: GDELT (Planned) → Manual Admin Override (Demo Path).

*This redundant approach ensures that even if a government API is down, the parametric safety net remains active.*
