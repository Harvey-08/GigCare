# Deployment & Testing Guide (Phase 2)

## Documentation Note (Current Runtime)

This is a phase-era deployment document. For current clone-and-run steps and canonical endpoints, use [SETUP_AFTER_CLONE.md](SETUP_AFTER_CLONE.md).

Current default local endpoints:
- Worker app: http://localhost:3010
- Admin app: http://localhost:3013
- API base: http://localhost:3011/api
- API health: http://localhost:3011/health

## 🚀 Pre-Deployment Checklist

- [ ] All files pushed to GitHub
- [ ] Team cloned repository
- [ ] `.env` file created from `.env.example` with API keys
- [ ] Docker and Docker Compose installed
- [ ] Node.js v20+ and Python 3.11+ available

---

## 📦 Quick Start (5 minutes)

### Step 1: Start Services
```bash
# Start all services in background
docker-compose up -d

# Wait for PostgreSQL to be ready (~20 seconds)
docker-compose exec postgres pg_isready

# Verify all services are running
docker-compose ps
# Expected: postgres (healthy), api (running), ml-premium (running), trigger-engine (running)
```

### Step 2: Train ML Model
```bash
# Install Python dependencies
cd services/ml/premium_service
pip install -r requirements.txt

# Train RandomForest model
python train.py
# Expected output: RMSE ≈ 25-35, R² ≈ 0.85-0.95, premium_model.pkl created

# Start ML inference server
python app.py
# Leave running; open new terminal for next steps
```

### Step 3: Start React Apps
```bash
# In new terminal: Worker app
cd apps/worker
npm install
npm start  # Opens http://localhost:3000

# In another new terminal: Admin app
cd apps/admin
npm install
npm start  # Opens http://localhost:3002
```

---

## ✅ Validation Tests (In Order)

### Test 1: Worker Registration
**Goal**: Verify authentication and JWT token generation

```bash
# Method 1: Browser UI (simplest)
1. Open http://localhost:3000
2. Click "Get Started"
3. Phone: 9876543210, Next
4. OTP: 123456, Next
5. Name: "John", Platform: ZOMATO, Zone: Whitefield, Complete
Expected: Redirect to Home, see welcome message

# Method 2: API (for debugging)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "name": "Test",
    "platform": "SWIGGY",
    "zone_id": "zone_01"
  }'
Expected response: { "data": { "id": "...", "token": "eyJ..." } }
```

### Test 2: Premium Zone Differentiation
**Goal**: Verify ML pricing differs by zone (CRITICAL FOR 4-STAR)

```bash
# Browser: Home → Click "Buy Policy"
1. Select Koramangala → note premium amount (should be ~₹110-130)
2. Select Whitefield → note premium amount (should be ~₹150-180)
3. Verify Whitefield > Koramangala (higher risk)

# API test
# Zone 1 (Koramangala - low risk)
curl -X POST http://localhost:3001/api/premiums/calculate \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "zone_01",
    "week_start": "2026-04-01"
  }' | jq '.data.premium_rupees'

# Zone 2 (Whitefield - high risk)  
curl -X POST http://localhost:3001/api/premiums/calculate \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "zone_02",
    "week_start": "2026-04-01"
  }' | jq '.data.premium_rupees'

Expected: zone_02 premium > zone_01 premium by 20-40%
```

### Test 3: Policy Purchase & Activation
**Goal**: Verify policy state transitions (PENDING → ACTIVE)

```bash
# Browser: Policy Purchase page
1. Select any zone
2. Click "Buy Policy"
3. See policy created
4. Expected: Policy status = ACTIVE (simulated Razorpay payment)

# API verification
curl -X GET http://localhost:3001/api/policies/worker/<WORKER_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].status'
Expected: "ACTIVE"
```

### Test 4: Trigger Event Firing (CRITICAL FOR DEMO)
**Goal**: Admin fires trigger, claims auto-create immediately

```bash
# Browser: Admin Dashboard
1. Login with phone=9876543210, OTP=123456
2. See metrics (loss ratio ≈ 0%, claims_today ≈ 0)
3. Click 🚀 "Fire Trigger Event"
4. Select: City = Bengaluru or another supported city, Trigger = Heavy Rain, Value = 60
5. Click "Fire"
Expected: "Event Fired Successfully! Claims Created: X"

# Wait 2-3 seconds, then verify
6. Refresh dashboard → claims_today should increase
7. Check "Recent Claims" table → new claim(s) appear

# API test (if browser shows no claims)
curl -X POST http://localhost:3001/api/admin/trigger-event \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "x-internal-service-key: $(grep INTERNAL_SERVICE_KEY .env | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "zone_02",
    "trigger_type": "HEAVY_RAIN",
    "trigger_value": 60
  }'
Expected response: { "data": { "event_id": "...", "claims_created": X } }
```

### Test 5: Claim Payout Amount (CRITICAL FOR 4-STAR)
**Goal**: Verify payout amount is visible in claim detail

```bash
# Browser: Worker App
1. Home page → Recent Claims → click any claim
2. See "Payout Amount" in large green box at top
3. Verify amount > 0 and < max_payout

Expected display:
┌─────────────────────────────┐
│ Payout Amount               │
│ ₹680                        │  ← THIS MUST BE VISIBLE
└─────────────────────────────┘

# If not visible: Check browser console for JS errors
# API test
curl -X GET http://localhost:3001/api/claims/<CLAIM_ID> \
  -H "Authorization: Bearer <JWT>" | jq '.data.payout_amount'
Expected: number > 0
```

### Test 6: Trust Score Calculation
**Goal**: Verify trust score is shown and calculated correctly

```bash
# Browser: Worker App → Claim Detail
1. Scroll to "Trust Score Analysis"
2. See trust score percentage (0-100%)
3. See breakdown:
   - GPS accuracy check ✓
   - Claim timing check ✓
   - History penalty ✓

Expected formula:
trust_score = 1.0
  - 0.35 if GPS distance > 5km
  - 0.10 if claim filed > 5 min after trigger
  - history_penalty (past_fraud_flags × 0.05)

Result categories:
  >= 0.85 → APPROVED (green)
  0.60-0.85 → PARTIAL (yellow)
  < 0.60 → FLAGGED (red)
```

### Test 7: Admin Dashboard Auto-Refresh
**Goal**: Real-time metrics update

```bash
# Browser: Admin Dashboard
1. Check "Auto-refresh" checkbox
2. Fire trigger in another browser tab
3. Verify without page refresh:
   - claims_today increments
   - Recent Claims table updates
   - loss_ratio recalculates

Expected: Updates within 5 seconds (refresh interval)
```

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot connect to docker daemon"
```bash
# Restart Docker
sudo systemctl restart docker  # Linux
# or launch Docker Desktop (macOS/Windows)
```

### Issue: PostgreSQL "database does not exist"
```bash
# Check if seed ran
docker-compose logs postgres | grep "seed.sql"

# Manually run seed
docker-compose exec postgres psql -U gigcare_user -d gigcare < database/seeds/seed.sql
```

### Issue: ML service returns 500 error
```bash
# Check if model exists
ls -la services/ml/premium_service/premium_model.pkl

# If missing, train it
cd services/ml/premium_service
python train.py
```

### Issue: React app shows "Cannot GET /api/zones"
```bash
# Verify API is running
docker-compose logs api | tail -20

# Verify CORS is enabled (should be in api/server.js)
grep -n "cors" services/api/server.js

# Check API URL in .env
grep REACT_APP_API_URL .env
```

### Issue: "OTP is incorrect"
```bash
# For Phase 2 demo, hardcoded OTP is: 123456
# Not 111111 or any other value
```

---

## 📊 Load Testing Scenario

**Goal**: Test system with multiple concurrent users

```bash
# Step 1: Create 5 workers
for i in {1..5}; do
  PHONE="999999999$i"
  curl -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"phone\": \"$PHONE\",
      \"name\": \"Worker $i\",
      \"platform\": \"ZOMATO\",
      \"zone_id\": \"zone_0$((i % 5 + 1))\"
    }"
  echo "Created worker $i"
done

# Step 2: Create 5 policies
# In browser: Each worker → Buy Policy → Complete

# Step 3: Fire trigger
curl -X POST http://localhost:3001/api/admin/trigger-event \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "zone_01",
    "trigger_type": "HEAVY_RAIN",
    "trigger_value": 70
  }'

# Step 4: Verify all 5 workers got claims
curl -X GET http://localhost:3001/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_JWT>" | jq '.data.claims_today'
Expected: 5
```

---

## 🎥 Demo Video Recording Checklist

**Goal**: 3-minute video showing full flow

### Scene 1: Introduction (30 seconds)
- [ ] Show GigCare logo on splash page
- [ ] Narrate: "GigCare provides automatic insurance for gig workers..."

### Scene 2: Registration (45 seconds)
- [ ] Click "Get Started"
- [ ] Fill registration: Phone, OTP, Name, Platform, Zone
- [ ] Show successful registration with active policy

### Scene 3: Premium Differentiation (30 seconds)
- [ ] Show premium for Koramangala: ~₹120
- [ ] Show premium for Whitefield: ~₹160
- [ ] Narrate: "Premiums are zone-specific using ML..."

### Scene 4: Trigger & Auto-Claim (45 seconds)
- [ ] Open admin dashboard in split-screen
- [ ] Fire "Heavy Rain" trigger in Whitefield
- [ ] Watch claim appear in worker app automatically
- [ ] Show claim detail with payout amount

### Scene 5: Admin Metrics (15 seconds)
- [ ] Show dashboard metrics (loss ratio, total payouts)
- [ ] Show claims table auto-updating

### Recording Tips
- [ ] Use OBS Studio or Zoom screen share
- [ ] Set resolution to 1920x1080
- [ ] Zoom into UI elements (buttons, numbers) for visibility
- [ ] Speak clearly; no background noise
- [ ] Do 3 takes; pick cleanest one

---

## ✨ Final Verification (Pre-Submission)

- [ ] All 4 services running (`docker-compose ps`)
- [ ] Worker app loads at localhost:3000 (no Blank page)
- [ ] Admin app loads at localhost:3002 (no 404)
- [ ] Test 1 passes: Registration creates JWT
- [ ] Test 2 passes: Koramangala < Whitefield premium
- [ ] Test 3 passes: Policy becomes ACTIVE
- [ ] Test 4 passes: Trigger fires, claims auto-create
- [ ] Test 5 passes: Claim detail shows payout amount (not zero)
- [ ] Test 6 passes: Trust score shown (≥0.60 for approval)
- [ ] Test 7 passes: Admin dashboard auto-refreshes (<5 sec)
- [ ] No console errors in browser (F12 → Console tab)
- [ ] No 500 errors in terminal logs
- [ ] Demo video recorded and uploaded
- [ ] README updated with Phase 2 section
- [ ] All code committed to GitHub with atomic commits

---

## 📞 Support

If tests fail:
1. Check logs: `docker-compose logs <service_name>`
2. Verify .env has all required keys
3. Ensure ports 3000, 3001, 3002, 5001, 5432 are free
4. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
5. Restart services: `docker-compose restart`

**Good luck! 🚀**
