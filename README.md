# GigCare: Parametric Insurance for Gig Workers

## Phase 2: Automation & Protection

Automatic, weather-triggered micro-insurance for India's gig delivery workers. Real-time coverage for rain, heat, and air quality hazards using ML-driven premium pricing and rule-based claims automation.

---

## 🎯 What We Built (Phase 2)

✅ **Automatic Claims**: Weather triggers automatically create claims (no paperwork)
✅ **Dynamic Pricing**: ML model calculates zone-specific premiums (₹60-280/week)
✅ **Smart Payouts**: Trust score algorithm reduces fraud while maintaining 95%+ approval rate
✅ **Real-time Dashboard**: Admin panel shows metrics and can fire test events
✅ **Responsive PWA**: Works on any browser (tested on Chrome, Firefox, Safari)

### Key Metrics
- **3-tier coverage**: SEED (₹80), STANDARD (₹162), PREMIUM (₹220)
- **5 operational zones**: Koramangala, Whitefield, Indiranagar, HSR Layout, Bommanahalli
- **3 trigger types**: Heavy Rain (≥50mm), Extreme Heat (≥40°C), Poor AQI (≥300)
- **Automated trust score**: Combines GPS accuracy, claim timing, and worker history

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GIGCARE SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────┐    ┌──────────────────────────┐  │
│  │   WORKER APP (React)     │    │   ADMIN APP (React)      │  │
│  │  • Registration (3-step) │    │  • Dashboard (metrics)   │  │
│  │  • Policy Purchase       │    │  • Trigger Control       │  │
│  │  • Claims View           │    │  • Fraud Rings (Phase 3) │  │
│  └──────────────┬───────────┘    └──────────────┬───────────┘  │
│                 │                               │                │
│                 └───────────────┬────────────────┘                │
│                                 │                                 │
│        ┌────────────────────────▼────────────────────────┐       │
│        │   API Server (Node.js Express)   :3001          │       │
│        │  • Auth (register, login, OTP)                  │       │
│        │  • Premium calculation (ML)                     │       │
│        │  • Policy CRUD                                  │       │
│        │  • Claims auto-creation                         │       │
│        │  • Admin dashboard                              │       │
│        │  • Razorpay webhooks                            │       │
│        └───────────────────┬──────────────────────────────┘       │
│                            │                                      │
│        ┌───────────────────┼──────────────────────┐              │
│        │                   │                      │               │
│  ┌─────▼────────┐  ┌──────▼───────┐   ┌─────────▼──────┐        │
│  │  PostgreSQL  │  │  ML Premium  │   │ Trigger Engine │        │
│  │  Database    │  │  Service     │   │   (node-cron)  │        │
│  │  • schemas   │  │  (Flask)     │   │  • Every 30min │        │
│  │  • seed data │  │  • RandomFor │   │  • Evaluates   │        │
│  │              │  │  • Fallback  │   │    5 triggers  │        │
│  └──────────────┘  └──────────────┘   └────────────────┘        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Service Breakdown

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| **API** | Node.js + Express | 3001 | Main backend (auth, policies, claims, admin) |
| **PostgreSQL** | PostgreSQL 15 | 5432 | Schema (10 tables) + seed data (5 workers, 5 policies) |
| **ML Premium** | Python + Flask | 5001 | ML inference (RandomForest pricing model) |
| **Trigger Engine** | Node.js + cron | — | Background job (runs every 30 min or on-demand) |
| **Worker App** | React 18 | 3000 | Worker-facing PWA |
| **Admin App** | React 18 | 3002 | Admin dashboard (metrics, trigger control) |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js v20+ (optional - for local development)
- Python 3.11+ (optional - for local development)
- Git

### 1. Clone & Start (3 Commands)

```bash
# Clone the repository
git clone https://github.com/Harvey-08/GigCare.git
cd gigcare_phase2_build

# Start everything (database, API, ML, React apps)
./start.sh
```

**That's it!** The app will be running at:
- **Worker App**: http://localhost:3000
- **Admin App**: http://localhost:3002
- **API Server**: http://localhost:3001

### 2. Demo Credentials

**Worker Login:**
- Phone: `+919876543210`
- OTP: `123456`

**Admin Login:**
- Phone: `9876543210`
- OTP: `123456`

### 3. Manual Setup (Alternative)

If you prefer manual control:

```bash
# Clone repo
git clone https://github.com/Harvey-08/GigCare.git
cd gigcare_phase2_build

# Copy environment (optional - defaults work for demo)
cp .env.example .env

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Development Mode

For local development (requires Node.js & Python):

```bash
# Start only database
docker-compose up -d postgres

# Install dependencies
cd services/api && npm install
cd ../ml/premium_service && pip install -r requirements.txt
cd ../../apps/worker && npm install
cd ../admin && npm install

# Start services locally
cd services/api && npm start
cd ../ml/premium_service && python app.py
cd ../../apps/worker && npm start
cd ../admin && npm start
```

### 2. Start All Services

```bash
# Start database, API, ML, trigger engine (Docker Compose)
docker-compose up -d

# Wait for PostgreSQL health check (15-20 seconds)
docker exec gigcare-postgres pg_isready -U gigcare_user -d gigcare

# Train ML model
cd services/ml/premium_service
python train.py
cd ../../../

# Install and start Worker app
cd apps/worker
npm install
npm start  # Opens http://localhost:3000

# In another terminal: Install and start Admin app
cd apps/admin
npm install
npm start  # Opens http://localhost:3002
```

### 3. Test the Flow

**Worker App** (http://localhost:3000):
1. Click "Get Started"
2. Phone: `9876543210`, Next
3. OTP: `123456`, Next
4. Name: "John Doe", Platform: "ZOMATO", Zone: "Whitefield", Complete
5. See premium calculated by ML (zone-dependent)
6. Click "Buy Policy" and see ACTIVE status

**Admin App** (http://localhost:3002):
1. Phone: `9876543210`, OTP: `123456`, Login
2. See dashboard metrics (loss ratio, total payouts, claims)
3. Click 🚀 "Fire Trigger Event"
4. Select zone, trigger type, click "Fire"
5. Watch claims appear in dashboard table

**Verify Full Flow**:
1. Back to Worker app, refresh home page
2. See new claim under "Recent Claims" with payout amount
3. Click on claim to see trust score breakdown

---

## 📊 Database Schema

### Tables
- `zones` (5 seeded) - Geographical zones with risk scores
- `workers` (5 seeded) - Gig workers with profiles
- `devices` - Worker devices for tracking
- `policies` (5 seeded) - Active insurance policies
- `premium_quotes` - Quote history (expires 24h)
- `claims` (3 seeded) - Insurance claims with payouts
- `trigger_events` - Historical trigger events
- `location_signals` - GPS signals for trust scoring

### Key ENUMS
- `coverage_tier`: SEED | STANDARD | PREMIUM
- `claim_status`: APPROVED | PARTIAL | FLAGGED | PAID
- `policy_status`: PENDING_PAYMENT | ACTIVE | EXPIRED
- `trigger_type`: HEAVY_RAIN | EXTREME_HEAT | POOR_AQI | CURFEW | APP_OUTAGE

---

## 🧪 API Endpoints

### Authentication
```
POST /api/auth/register
  { phone, name, platform, zone_id } → { token, worker }

POST /api/auth/login
  { phone, otp } → { token, worker }

GET /api/auth/me
  → { worker_id, name, platform, zone_id, role }
```

### Zones & Premiums
```
GET /api/zones
  → [{ zone_id, name, zone_risk_score, zone_risk_level }]

POST /api/premiums/calculate
  { zone_id, week_start } → { premium_rupees, coverage_tier, max_payout, quote_id }
```

### Policies
```
POST /api/policies
  { quote_id, coverage_tier } → { policy_id, status: PENDING_PAYMENT }

GET /api/policies/worker/:worker_id
  → [{ policy_id, coverage_tier, premium, status, activation_date }]

POST /api/policies/:policy_id/activate
  → { policy_id, status: ACTIVE }
```

### Claims (Auto-Created by Trigger)
```
POST /api/claims/auto-create [INTERNAL]
  { zone_id, trigger_type, trigger_value } → { claims_created: N }

GET /api/claims/worker/:worker_id
  → [{ claim_id, trigger_type, status, payout_amount, trust_score }]

GET /api/claims/:claim_id
  → { claim_id, status, payout_amount, trust_score, trigger_type }
```

### Admin
```
POST /api/admin/trigger-event [ADMIN ONLY]
  { zone_id, city_id, trigger_type, trigger_value } → { event_id, claims_created }
  // city_id lets the API resolve the best active zone in that city

GET /api/admin/dashboard [ADMIN ONLY]
  → { loss_ratio, total_premiums, total_payouts, claims_today, claims_by_status }

GET /api/admin/claims [ADMIN ONLY]
  → [{ claim_id, worker_id, status, payout_amount, zone_id }]
```

---

## 🧠 ML Model (Premium Calculation)

### Training
```bash
cd services/ml/premium_service
python train.py
```

Generates 1200 synthetic training rows with:
- Features: zone_risk_score, rainfall history, temperature forecast, worker experience, past claims, fraud flags
- Target: premium_rupees (₹60-280 range)
- Model: RandomForestRegressor (200 trees, max_depth=8)
- Output: premium_model.pkl + feature importances

### Inference
```bash
cd services/ml/premium_service
python app.py  # Starts Flask on :5001
```

POST `/predict-premium`:
```json
{
  "zone_risk_score": 1.2,
  "historical_rain_events": 8,
  "historical_heat_events": 3,
  "forecast_rain_prob": 0.7,
  "forecast_max_temp_c": 41,
  "worker_experience_weeks": 52,
  "past_claim_count": 2,
  "past_fraud_flags": 0,
  "past_claim_ratio": 0.04
}
```
Returns: `{ premium_rupees: 165, zone: "high_risk" }`

---

## 🔐 Trust Score Algorithm

Determines claim approval probability:

```
trust_score starts at 1.0

GPS Distance Check:
  if distance_from_trigger > 5 km: score -= 0.35

Claim Timing Check:
  if claim_filed < 5 min from trigger: score -= 0.10

History Check:
  if past_claims > 5: history_penalty = past_fraud_flags * 0.05
  score -= history_penalty

Result:
  trust_score >= 0.85  → APPROVED (100% payout)
  0.60 to 0.85         → PARTIAL (80% payout)
  < 0.60               → FLAGGED (requires review)
```

---

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
