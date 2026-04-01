# GigCare Phase 2 - Folder Structure & Setup Guide

## STEP 1: Create Project Folder Structure

Run these commands in your terminal to create the complete folder structure:

```bash
cd /path/to/your/gigcare/repo

# Create all directories
mkdir -p apps/worker/src/{screens,components,api,store,utils}
mkdir -p apps/admin/src/{pages,components,api,utils}
mkdir -p services/api/{routes,middleware,models}
mkdir -p services/trigger-engine/sources
mkdir -p services/ml/premium_service
mkdir -p services/ml/fraud_service
mkdir -p database/{migrations,seeds}
mkdir -p mock-data
mkdir -p docs
mkdir -p scripts
```

## STEP 2: Copy Database Files

Copy these files you already have:
- `database/migrations/001_initial_schema.sql` ← the schema file
- `database/seeds/seed.sql` ← the seed data
- `docker-compose.yml` ← Docker configuration
- `.env.example` ← Environment template

## STEP 3: Create .env File

```bash
cp .env.example .env
```

Then edit `.env` and fill in:
```
JWT_SECRET=your_generated_secret_use_this: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
RAZORPAY_KEY_ID=rzp_test_XXXX (from Razorpay dashboard)
RAZORPAY_KEY_SECRET=XXXX (from Razorpay dashboard)
OPENWEATHER_API_KEY=get_free_at_openweathermap.org
WAQI_TOKEN=get_free_at_aqicn.org
```

## STEP 4: Start Docker

```bash
# From project root
docker-compose up -d

# Check services are running
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f postgres

# To stop everything
docker-compose down
```

## STEP 5: Verify Database Connection

```bash
# From project root, exec into postgres container
docker exec -it gigcare-postgres psql -U gigcare_user -d gigcare

# Inside psql:
\dt  -- list tables
SELECT * FROM zones;  -- check zones seeded
\q   -- quit
```

## STEP 6: Initialize Database

```bash
# The schema and seed data run automatically via docker-compose volumes
# But if you need to manually reset:
docker exec -it gigcare-postgres psql -U gigcare_user -d gigcare < database/migrations/001_initial_schema.sql
docker exec -it gigcare-postgres psql -U gigcare_user -d gigcare < database/seeds/seed.sql
```

---

## Critical Files - Task Assignment

### **Person A: Backend & Database**
These are YOUR files:
- `services/api/routes/auth.js` — registration, login, JWT
- `services/api/routes/zones.js` — GET /api/zones
- `services/api/routes/premiums.js` — POST /api/premiums/calculate (calls ML)
- `services/api/routes/policies.js` — policy creation & activation
- `services/api/routes/claims.js` — claim manipulation (auto-create, get)
- `services/api/routes/admin.js` — admin trigger button, dashboard
- `services/api/middleware/auth.js` — JWT middleware
- `services/api/middleware/validate.js` — input validation
- `services/api/models/db.js` — database client + query helpers
- `services/api/server.js` — Express app setup
- `services/api/Dockerfile` — Docker image
- `services/api/package.json` — dependencies

---

### **Person B: React UI (Both Worker & Admin)**
These are YOUR files:
- `apps/worker/src/screens/splash.jsx` — launch screen
- `apps/worker/src/screens/register-step1.jsx` — phone + OTP
- `apps/worker/src/screens/register-step2.jsx` — profile (bike type, earnings, shift)
- `apps/worker/src/screens/register-step3.jsx` — zone selection + premium quote
- `apps/worker/src/screens/home.jsx` — main dashboard
- `apps/worker/src/screens/policy-purchase.jsx` — tier selection & payment
- `apps/worker/src/screens/claim-detail.jsx` — single claim view
- `apps/worker/src/screens/claims-list.jsx` — all claims for worker
- `apps/worker/src/components/card-policy.jsx` — policy card component
- `apps/worker/src/components/card-claim.jsx` — claim card component
- `apps/worker/src/components/button-primary.jsx` — styled primary button
- `apps/worker/src/components/badge-status.jsx` — status badges
- `apps/worker/src/api/client.js` — axios instance + auth header setup
- `apps/worker/App.jsx` — React app entry, routing
- `apps/worker/package.json` — dependencies
- `apps/admin/src/pages/dashboard.jsx` — claims table, metrics
- `apps/admin/src/pages/trigger-panel.jsx` — fire trigger events
- `apps/admin/src/pages/fraud-rings.jsx` — fraud detection view
- `apps/admin/src/components/chart-loss-ratio.jsx` — loss ratio metric
- `apps/admin/src/api/client.js` — axios instance
- `apps/admin/App.jsx` — React app entry
- `apps/admin/package.json` — dependencies

---

### **Person C: ML Services & Trigger Engine**
These are YOUR files:
- `services/ml/premium_service/train.py` — RandomForest training
- `services/ml/premium_service/app.py` — Flask server + inference
- `services/ml/premium_service/Dockerfile` — Docker image
- `services/ml/premium_service/requirements.txt` — Python dependencies
- `services/ml/fraud_service/train.py` — XGBoost + IsolationForest training
- `services/ml/fraud_service/app.py` — Flask server + inference
- `services/ml/fraud_service/Dockerfile` — Docker image
- `services/ml/fraud_service/requirements.txt` — Python dependencies
- `services/trigger-engine/sources/openmeteo.js` — rainfall API
- `services/trigger-engine/sources/openweather.js` — temperature API
- `services/trigger-engine/sources/waqi.js` — AQI API
- `services/trigger-engine/sources/platform-mock.js` — simulated order drops
- `services/trigger-engine/evaluator.js` — applies all trigger conditions
- `services/trigger-engine/claim-dispatcher.js` — calls API to create claims
- `services/trigger-engine/scheduler.js` — node-cron job runner
- `services/trigger-engine/server.js` — entry point
- `services/trigger-engine/Dockerfile` — Docker image
- `services/trigger-engine/package.json` — Node dependencies

---

## Checkpoint: Docker Running Test

After Docker is up, test that the API server is running:

```bash
curl http://localhost:3001/health
# Expected: { "status": "ok" }
```

If this fails:
```bash
docker logs gigcare-api
# Will show you what's wrong
```

---

## Know Before Building

1. **Person A starts first** — without the backend running, nobody can test anything
2. **Database must be seeded** — the zones and demo worker must exist before testing
3. **Mock data is your friend** — use mock weather/platform data (USE_MOCK_DATA=true)
4. **Push early, push often** — every working endpoint gets a git commit
5. **No merge conflicts** — stick to your assigned folders, ask before touching someone else's code

---

Done. Folder structure ready. Move to STEP 2 now.
