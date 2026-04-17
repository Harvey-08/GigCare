# GigCare

## Documentation Note (Important)

For current setup and runtime endpoints, use [SETUP_AFTER_CLONE.md](SETUP_AFTER_CLONE.md) as the source of truth.

Current default local endpoints:
- Worker app: http://localhost:3010
- Admin app: http://localhost:3013
- API base: http://localhost:3011/api
- API health: http://localhost:3011/health

Some historical sections below and in older phase documents may still mention legacy ports from earlier milestones.

GigCare is a parametric insurance platform for gig delivery workers. It gives weekly coverage, automatically creates claims when weather or disruption conditions are met, and routes claims through a fraud check before payout. The system is built to show a complete insurance flow: purchase, activation, trigger detection, claim creation, review, and payout.

## What This Repo Contains

- Worker app in [apps/worker](apps/worker) for registration, policy purchase, coverage status, and claim tracking.
- Admin app in [apps/admin](apps/admin) for dashboard metrics, manual trigger control, and fraud review.
- Backend API in [services/api](services/api) for auth, zones, premiums, policies, claims, admin actions, and webhooks.
- Premium pricing service in [services/ml/premium_service](services/ml/premium_service) that uses weather, zone risk, and coverage inputs to produce weekly pricing.
- Trigger engine in [services/trigger-engine](services/trigger-engine) that evaluates weather and disruption signals and creates claims automatically.
- Fraud layer in [services/api/routes](services/api/routes) and [services/api/models](services/api/models) that scores each claim before payout and applies caps, duplicate protection, and action escalation.

## Setup After Clone

The quickest local setup is documented in [SETUP_AFTER_CLONE.md](SETUP_AFTER_CLONE.md). It covers cloning, environment variables, service URLs, key sources, API fetch points, and demo mode.

Useful companion docs:

- [SETUP_GUIDE.md](SETUP_GUIDE.md) for the shorter setup walkthrough.
- [DEMO_NAVIGATION.md](DEMO_NAVIGATION.md) for the judge/demo flow.
- [HACKATHON_SUMMARY.md](HACKATHON_SUMMARY.md) for the submission summary.
- [StackSurge_PitchDeck.pdf](StackSurge_PitchDeck.pdf) for the final presentation deck PDF.

### Quick Start

```bash
git clone <repo-url>
cd gigcare_phase2_build
cp .env.example .env
docker compose up -d --build
```

### Where the apps run

- Worker app: http://localhost:3010
- Admin app: http://localhost:3013
- API server: http://localhost:3011/api
- API health: http://localhost:3011/health
- ML premium service: http://localhost:5001
- ML fraud service: http://localhost:5002

### Demo credentials

- Admin login for demo use: `gigcare@admin.com` / `Admin123@`
- Worker login uses the demo worker flow in the app

## System Overview

### Core flow

1. A worker signs in and buys a weekly policy.
2. Premium pricing is calculated from zone risk and weather inputs.
3. When conditions cross the configured thresholds, the trigger engine creates a claim.
4. The claim is evaluated by the fraud layer using worker history, location consistency, device/IP linkage, and timing signals.
5. Approved claims are paid out automatically; partial or flagged claims are held for review.

### Key metrics

- 3 coverage tiers: SEED, STANDARD, PREMIUM.
- 5 operational zones.
- 3 main environmental trigger types plus social disruption triggers.
- Automated trust score for claim screening.

## Key Features

- Weekly policy coverage instead of long insurance contracts.
- Automatic claims from trigger events with no manual paperwork.
- Live weather and AQI awareness.
- Admin-triggered demo path that can target a real active policy zone.
- Fraud hardening with reputation, identity linkage, and payout controls.
- Clear worker and admin dashboards that make the system easy to present in a hackathon.

## Fraud Detection

The fraud system is designed to catch claims that do not match normal worker behavior.

It checks for:

- repeated claims from the same trigger event
- unusual claim velocity in short windows
- device or IP reuse across multiple workers
- claims inconsistent with location history
- suspicious timing patterns across zones or cities
- high historical risk scores from previous outcomes

How it responds:

- clean claims can be approved quickly
- medium-risk claims can be partially paid or flagged
- high-risk claims can be denied or escalated
- daily payout caps prevent overpayment in a single day

## Premium Model

The premium service is trained on synthetic samples that mirror weather, zone risk, and payout behavior. That lets the model produce realistic weekly pricing during the demo while still using live weather inputs at runtime. The model is used to differentiate zones so that higher-risk areas receive higher premiums than lower-risk areas.

### Hybrid Location Fallback

If a detected worker location is outside the currently supported 10-city map bounds, GigCare falls back to the nearest supported city and still returns a premium quote. The fallback quote uses nearest-city baseline pricing plus risk and seasonal guard parameters, so onboarding does not fail for edge locations.

## Main APIs

Worker-facing:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/zones`
- `GET /api/zones/:zone_id/status`
- `GET /api/zones/:zone_id/forecast`
- `POST /api/premiums/calculate`
- `POST /api/policies`
- `POST /api/policies/:policy_id/activate`
- `GET /api/policies/worker/:user_id`
- `GET /api/claims/worker/:user_id`

Admin-facing:

- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/cities/metrics`
- `GET /api/admin/fraud-rings`
- `POST /api/admin/trigger-event`
- `POST /api/admin/trigger-demo-payout`

Internal/demo endpoints:

- `POST /api/claims/auto-create`
- `POST /api/fraud/auto-create`
- `POST /api/webhooks/razorpay-payment`

## Service Layout

| Service | Purpose | Local URL |
|---|---|---|
| Worker app | Worker-facing UI | http://localhost:3010 |
| Admin app | Admin dashboard | http://localhost:3013 |
| API | Auth, policies, claims, admin | http://localhost:3011/api |
| Premium ML | Premium inference | http://localhost:5001 |
| Fraud ML | Fraud scoring | http://localhost:5002 |

## Future Improvements

- Move trigger and fraud runtime state fully into the database for multi-instance reliability.
- Replace demo payment mode with production payment integration when needed.
- Expand model retraining using real policy and claim history.
- Add broader automated integration tests for trigger, claim, and payout flows.
- Improve region coverage by adding more cities and more live data sources.

---

## Key Paths

Open these paths when you want to inspect the main implementation pieces:

- [database/migrations](database/migrations) for the schema migrations.
- [database/seeds](database/seeds) for seed data.
- [services/api/server.js](services/api/server.js) for the API entry point.
- [services/api/routes/admin.js](services/api/routes/admin.js) for admin actions and manual trigger flows.
- [services/api/routes/claims.js](services/api/routes/claims.js) for claim creation and retrieval.
- [services/api/routes/policies.js](services/api/routes/policies.js) for policy purchase and activation.
- [services/api/routes/premiums.js](services/api/routes/premiums.js) for premium calculation.
- [services/api/routes/zones.js](services/api/routes/zones.js) for zone resolution and forecast lookups.
- [services/api/routes/webhooks.js](services/api/routes/webhooks.js) for payment webhook handling.
- [services/api/models/db.js](services/api/models/db.js) for database helpers and policy/claim queries.
- [services/api/middleware/auth.js](services/api/middleware/auth.js) for auth and role checks.
- [services/trigger-engine/scheduler.js](services/trigger-engine/scheduler.js) for the trigger loop.
- [services/trigger-engine/evaluator.js](services/trigger-engine/evaluator.js) for trigger evaluation.
- [services/trigger-engine/sources](services/trigger-engine/sources) for live weather and AQI adapters.
- [apps/worker/src/pages](apps/worker/src/pages) for the worker screens.
- [apps/admin/src/pages](apps/admin/src/pages) for the admin screens.
- [apps/worker/src/services/api.js](apps/worker/src/services/api.js) and [apps/admin/src/services/api.js](apps/admin/src/services/api.js) for frontend API calls.
- [apps/worker/src/utils/auth.js](apps/worker/src/utils/auth.js) and [apps/admin/src/utils/auth.js](apps/admin/src/utils/auth.js) for frontend auth helpers.

## 🚨 Demo Checklist (For Judges)

- [ ] Worker registration: Register new worker with OTP
- [ ] Premium differentiation: Show different premiums for Koramangala vs Whitefield
- [ ] Policy purchase: Buy policy and see ACTIVE status
- [ ] Admin dashboard: Show metrics (loss ratio, payouts)
- [ ] Trigger firing: Fire weather event and see claims auto-create
- [ ] Claim detail: Show payout amount (critical feature)
- [ ] Trust score: Show trust score breakdown (GPS check, timing, history)
- [ ] UI polish: No stack traces, proper error handling, responsive design

---

## 📝 File Structure

```
gigcare_phase2_build/
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seeds/
│       └── seed.sql
├── services/
│   ├── api/
│   │   ├── server.js
│   │   ├── models/
│   │   │   └── db.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── zones.js
│   │   │   ├── premiums.js
│   │   │   ├── policies.js
│   │   │   ├── claims.js
│   │   │   ├── admin.js
│   │   │   └── webhooks.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── ml/
│   │   └── premium_service/
│   │       ├── train.py
│   │       ├── app.py
│   │       ├── requirements.txt
│   │       └── premium_model.pkl (generated)
│   └── trigger-engine/
│       ├── scheduler.js
│       ├── evaluator.js
│       ├── sources/
│       │   ├── openmeteo.js
│       │   ├── openweather.js
│       │   └── waqi.js
│       ├── package.json
│       └── Dockerfile
├── apps/
│   ├── worker/
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Splash.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── Home.jsx
│   │   │   │   ├── PoliciesList.jsx
│   │   │   │   ├── PolicyPurchase.jsx
│   │   │   │   └── ClaimDetail.jsx
│   │   │   ├── services/
│   │   │   │   └── api.js
│   │   │   ├── utils/
│   │   │   │   └── auth.js
│   │   │   ├── App.js
│   │   │   ├── index.js
│   │   │   └── index.css
│   │   ├── public/
│   │   │   └── index.html
│   │   └── package.json
│   └── admin/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── AdminLogin.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   └── TriggerPanel.jsx
│       │   ├── services/
│       │   │   └── api.js
│       │   ├── utils/
│       │   │   └── auth.js
│       │   ├── App.js
│       │   ├── index.js
│       │   └── index.css
│       ├── public/
│       │   └── index.html
│       └── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
├── SETUP_GUIDE.md
├── CHECKPOINTS.md
└── README.md (this file)
```

---

## ✅ Phase 2 Implementation Status

### What's Tested & Working

#### Backend API (100% Functional)
- ✅ POST /api/auth/register - Worker registration with JWT token
- ✅ POST /api/auth/login - Login with OTP (mock code: 123456)
- ✅ GET /api/auth/me - Get current worker profile
- ✅ GET /api/zones - List all 5 zones with risk scores
- ✅ GET /api/zones/:id/risk - Get individual zone risk data
- ✅ POST /api/premiums/calculate - Dynamic weekly premium calculation with ML model (diff zones = diff prices)
- ✅ POST /api/policies - Create policy (PENDING_PAYMENT status)
- ✅ POST /api/policies/:id/activate - Activate policy (webhook simulation)
- ✅ GET /api/policies/worker/:id - Worker's active policies
- ✅ GET /api/policies/:id - Single policy detail
- ✅ POST /api/claims/auto-create - Trigger engine creates claims automatically
- ✅ GET /api/claims/worker/:id - Worker views own claims
- ✅ GET /api/claims/:id - Claim detail (status, payout, trust score)
- ✅ GET /api/admin/dashboard - Admin metrics (loss ratio: 37%, payouts, claims by status)
- ✅ Response formats: All endpoints return proper JSON with meta.timestamp
- ✅ Error handling: 422 validation errors, 401 auth errors, 404 not found, 500 server errors

#### Database (100% Functional)
- ✅ PostgreSQL schema with 10 required tables
- ✅ All ENUMS properly defined (platform, coverage_tier, trigger_type, claim_status, etc.)
- ✅ Seed data loaded: 5 zones, 5 demo workers, 5 active policies, 6 test claims
- ✅ Database constraints and foreign keys working correctly
- ✅ Indexes on frequently queried columns (worker_id, status, trust_score)

#### ML Premium Service (100% Functional)
- ✅ RandomForestRegressor trained on 1200 synthetic samples
- ✅ Model R² score: 0.9694 (excellent fit)
- ✅ RMSE: 8.48 Rs (very low error)
- ✅ Flask server responding: POST /predict-premium returns premium_rupees
- ✅ Fallback formula when ML service down (never crashes)
- ✅ Zone differentiation working: zone_01 (risk 0.85) < zone_02 (risk 1.6)

#### Trigger Engine (100% Functional)
- ✅ Monitors all 5 trigger types: HEAVY_RAIN, EXTREME_HEAT, POOR_AQI, CURFEW, APP_OUTAGE
- ✅ Mock data sources for all weather APIs
- ✅ Automatic claim creation when trigger fires
- ✅ Correctly calculates payout based on workers' daily income and disruption hours
- ✅ Applies severity factors and peak time multipliers

#### Claims Auto-Creation (100% Functional)
- ✅ Trigger fires → Claims created for all workers with active policies in that zone
- ✅ Two test workers in zone_02 both received automatic claims when trigger fired
- ✅ Claims show correct: trigger_type, disruption_hours, calculated payout, trust_score, status
- ✅ Claims status properly transitions: AUTO_CREATED → APPROVED → PAID

#### Trust Score (100% Functional)
- ✅ Workers with clean history get trust_score ≈ 0.95 (APPROVED instant payout)
- ✅ GPS distance checks implemented (spoofed locations would reduce score)
- ✅ Claim timing checks implemented (suspicious timing reduces score)
- ✅ Trust score 0.60-0.85 → PARTIAL payout + verification
- ✅ Trust score < 0.60 → FLAGGED for manual review

#### Worker App Screens (Code Complete)
- ✅ Splash.jsx - Launch screen with logo and tagline
- ✅ Register.jsx - 3-step registration (phone → profile → zone)
- ✅ Home.jsx - Dashboard with coverage card, zone status, earnings protected, recent claims
- ✅ PoliciesList.jsx - View active and past policies
- ✅ PolicyPurchase.jsx - Select coverage tier (Seed/Standard/Premium) with pricing
- ✅ ClaimDetail.jsx - Full claim view with trust score breakdown
- ✅ API client - Configured to hit http://localhost:3001
- ✅ Auth utilities - JWT token management

#### Admin App Screens (Code Complete)
- ✅ AdminLogin.jsx - Admin authentication
- ✅ Dashboard.jsx - Real-time metrics widget (loss ratio, total payouts, claims by status, recent claims table)
- ✅ TriggerPanel.jsx - Manual trigger event firing for demo

### Test Results (Real Workflow)

1. **Registration Flow**: ✅ New worker registered, received JWT token
2. **Premium Calculation**: ✅ Calculated premium for zone_02, shows ML model inference working
3. **Policy Creation**: ✅ Policy created with PENDING_PAYMENT, then activated to ACTIVE
4. **Trigger Event**: ✅ Manual trigger fired in zone_02 with HEAVY_RAIN
5. **Auto-Claim**: ✅ Two workers in zone_02 received automatic claims
6. **Claim Payout**: ✅ ₹317-₹341 payouts calculated correctly based on workers' income
7. **Admin Dashboard**: ✅ Shows 37% loss ratio, 6 claims today, claims broken down by status

### Performance Metrics
- ✅ API response time: < 100ms for most endpoints  
- ✅ Database queries optimized with indexes
- ✅ ML model inference: < 50ms
- ✅ Docker startup time: ~30 seconds

---

## 🐛 Troubleshooting

### PostgreSQL container fails to start
```bash
# Check logs
docker-compose logs postgres

# Rebuild
docker-compose down -v  # Remove volumes
docker-compose up -d postgres
```

### ML service won't load model
```bash
# Train model first
cd services/ml/premium_service
pip install -r requirements.txt
python train.py

# Then run app
python app.py
```

### API returns 500 errors
```bash
# Check API logs
docker-compose logs api

# Verify database connection
docker exec gigcare-api npm test  # (if test script exists)
```

### React apps won't connect to API
```bash
# Check CORS in docker-compose
# API_CORS_ORIGIN should match React app URL

# Or set env var in React app
export REACT_APP_API_URL=http://localhost:3001
```

---

## 📞 Support

For Phase 2 questions:
- **Database Issues**: See `database/migrations/001_initial_schema.sql`
- **API Issues**: Check `services/api/routes/*.js`
- **ML Issues**: See `services/ml/premium_service/train.py`
- **Frontend Issues**: Check `apps/worker/src/pages/*.jsx`

---

## 📅 Phase 3 (Coming Next)

- XGBoost fraud detection model
- Multi-level fraud rings analysis
- Enhanced trust scoring with NLP
- Real payment integration (Razorpay production)
- Geolocation verification with cell tower data
- Payout history and analytics

---

**Built with ❤️ for India's Gig Workers**
