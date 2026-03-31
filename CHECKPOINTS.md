# GigCare Phase 2 - Build Checkpoints

**Team:** 3 members | **Deadline:** April 4, 2026 @ 2pm | **Target Rating:** 4-star minimum

---

## PHASE 2: April 1-4 (72 Hours)

### TODAY: April 1 (Remaining Hours)

#### Database & Docker (CRITICAL PATH)
- [ ] PostgreSQL schema created (001_initial_schema.sql)
- [ ] Seed data created (seed.sql)
- [ ] Docker Compose file created
- [ ] `.env.example` created and copied to `.env`
- [ ] Docker containers started: `docker-compose up -d`
- [ ] PostgreSQL seeded with zones + demo workers
- [ ] Test database connection: `docker exec gigcare-postgres psql ...`
- [ ] **COMMIT:** `git commit -m "chore: database schema and docker setup"`

#### Backend: API Scaffolds (Person A)
- [ ] `services/api/package.json` created (Express, cors, dotenv, pg, jsonwebtoken)
- [ ] `services/api/Dockerfile` created (Node 20)
- [ ] `services/api/server.js` created (Express app, middleware, routes)
- [ ] `services/api/middleware/auth.js` created (JWT middleware)
- [ ] `services/api/models/db.js` created (PostgreSQL client + helpers)
- [ ] `services/api/routes/auth.js` scaffold created
- [ ] `services/api/routes/zones.js` scaffold created
- [ ] `services/api/routes/premiums.js` scaffold created
- [ ] **CHECKPOINT:** `npm install` in `services/api/`, verify no errors
- [ ] **COMMIT:** `git commit -m "feat: api server setup and auth middleware"`

#### ML: Premium Service (Person C)
- [ ] `services/ml/premium_service/requirements.txt` created (scikit-learn, flask, numpy, pandas)
- [ ] `services/ml/premium_service/train.py` created (RandomForest training, saves to premium_model.pkl)
- [ ] `services/ml/premium_service/app.py` created (Flask server, POST /predict-premium)
- [ ] `services/ml/premium_service/Dockerfile` created (Python 3.11)
- [ ] Train the model: `python train.py` (verify premium_model.pkl created)
- [ ] **CHECKPOINT:** Test locally: `python app.py`, hit `/predict-premium` with sample data
- [ ] **COMMIT:** `git commit -m "feat: ml premium pricing service"`

#### React Frontend Scaffolds (Person B)
- [ ] `apps/worker/package.json` created (React, React Router, axios, tailwindcss)
- [ ] `apps/worker/public/index.html` created
- [ ] `apps/worker/src/App.jsx` created (routing setup)
- [ ] `apps/worker/src/api/client.js` created (axios instance)
- [ ] Create 3 registration screens: step1.jsx, step2.jsx, step3.jsx (UI only, no logic yet)
- [ ] `apps/worker/src/screens/splash.jsx` created (launch screen)
- [ ] `apps/admin/package.json` and basic structure created
- [ ] **CHECKPOINT:** `npm install` in both worker and admin, verify no errors
- [ ] **COMMIT:** `git commit -m "feat: react frontend scaffolds and auth client"`

#### End of April 1 Sign-Off
- [ ] Docker running and healthy
- [ ] All three services scaffold'd
- [ ] All three team members have their primary code files created
- [ ] No code runs yet, but structure is ready
- [ ] **FINAL COMMIT:** `git commit -m "checkpoint: april 1 eod - structure complete"`

---

### APRIL 2: MORNING (6am - 12pm)

#### Backend: Authentication API (Person A) — CRITICAL
- [ ] POST /api/auth/register endpoint working
  - [ ] Accepts `{ phone, name, platform, zone_id }`
  - [ ] Creates worker in DB
  - [ ] Returns JWT token + worker_id
  - [ ] Test with Postman: verify 201 response
- [ ] POST /api/auth/login endpoint working (OTP mocked as fixed code 123456)
- [ ] GET /api/auth/me endpoint working (requires JWT)
- [ ] GET /api/zones endpoint returns all 5 zones with risk scores
- [ ] **CHECKPOINT:** Test all auth endpoints with Postman
- [ ] **COMMIT:** `git commit -m "feat: auth endpoints registration and login"`

#### Backend: Premium Calculation (Person A)
- [ ] POST /api/premiums/calculate endpoint working
  - [ ] Calls ML service at http://localhost:5001/predict-premium
  - [ ] Returns `{ premium_rupees, zone_risk, forecast_risk, breakdown }`
  - [ ] Stores quote in premium_quotes table
- [ ] GET /api/zones/:zone_id/risk endpoint returning zone details
- [ ] Test: Koramangala premium < Whitefield premium
- [ ] **CHECKPOINT:** Postman test shows different premiums for different zones
- [ ] **COMMIT:** `git commit -m "feat: premium calculation with ml inference"`

#### React Frontend: Registration Flow (Person B)
- [ ] Registration Step 1 (Phone + OTP) — UI + form validation
- [ ] Registration Step 2 (Profile: bike type, earnings, shift) — UI + form
- [ ] Registration Step 3 (Zone selection + premium quote) — UI + API call
- [ ] Wire up Step 1 → POST /api/auth/register → capture JWT
- [ ] Wire up Step 3 → GET /api/premiums/calculate → show result
- [ ] **CHECKPOINT:** Manually test in browser: register → see premium quote
- [ ] **COMMIT:** `git commit -m "feat: worker registration UI and flow"`

#### End April 2 Morning Sign-Off
- [ ] Backend auth and premium fully working
- [ ] Frontend registration captures phone + profile + zone, gets premium quote
- [ ] No database errors or 500s
- [ ] **CRITICAL BACKUP COMMIT:** `git commit -m "checkpoint: april 2 am - auth and premium working"`

---

### APRIL 2: AFTERNOON (1pm - 5pm)

#### Backend: Policy Management (Person A)
- [ ] POST /api/policies endpoint
  - [ ] Takes policy_id, worker_id, quote_id, tier, premium_paid
  - [ ] Creates policy record, sets status=PENDING_PAYMENT
  - [ ] Returns policy_id for payment flow
- [ ] GET /api/policies/worker/:id endpoint
- [ ] GET /api/policies/:id endpoint
- [ ] POST /api/policies/:id/activate endpoint (webhook from Razorpay, simulated)
- [ ] Razorpay Test Mode: Create account + test key pair ready
- [ ] **CHECKPOINT:** Postman: create policy → see it in DB with PENDING_PAYMENT status
- [ ] **COMMIT:** `git commit -m "feat: policy management endpoints"`

#### Backend: Trigger Engine & Claims (Person C)
- [ ] `services/trigger-engine/sources/openmeteo.js` — mock rainfall API
- [ ] `services/trigger-engine/sources/openweather.js` — mock temperature API
- [ ] `services/trigger-engine/sources/waqi.js` — mock AQI API
- [ ] `services/trigger-engine/sources/platform-mock.js` — mock order drop
- [ ] `services/trigger-engine/evaluator.js` — checks all 5 triggers
- [ ] POST /api/claims/auto-create endpoint (for trigger engine to call)
  - [ ] Takes `{ zone_id, trigger_type, trigger_value, started_at, ended_at }`
  - [ ] Fetches all active policies in zone
  - [ ] For each policy: creates claim with auto-calculated payout
  - [ ] Returns list of created claims
- [ ] GET /api/claims/worker/:id endpoint
- [ ] Basic trust_score: all claims start with trust=1.0 (no fraud yet)
- [ ] **CHECKPOINT:** Fire manual curl to POST /api/claims/auto-create, see claims in DB
- [ ] **COMMIT:** `git commit -m "feat: trigger engine and claims auto-creation"`

#### Backend: Admin Trigger Button (Person A)
- [ ] POST /api/admin/trigger-event endpoint
  - [ ] Takes `{ zone_id, trigger_type, trigger_value }`
  - [ ] Calls internal evaluator to fire trigger
  - [ ] Returns event_id + count of claims created
- [ ] GET /api/admin/claims endpoint (list all claims with filters)
- [ ] GET /api/admin/dashboard endpoint (basic metrics)
- [ ] **CHECKPOINT:** Postman: fire trigger in Whitefield → see claims created
- [ ] **COMMIT:** `git commit -m "feat: admin trigger and claims dashboard endpoints"`

#### React Frontend: Policy & Dashboard (Person B)
- [ ] Policy Purchase Screen: 3 tier cards (Seed/Standard/Premium)
- [ ] Wire payment: "Pay Rs.X" button → simulated payment → updates policy to ACTIVE
- [ ] Home Dashboard Screen
  - [ ] Coverage Status Card (shows active policy or "Get Covered Now" CTA)
  - [ ] Zone Status Row (placeholder)
  - [ ] Latest Claim Card (if any claims exist)
  - [ ] Earnings Protected metric
- [ ] Create Claim Detail Screen (shows claim info + trust score + payout)
- [ ] **CHECKPOINT:** Browser test: buy policy → get ACTIVE status → see on dashboard
- [ ] **COMMIT:** `git commit -m "feat: policy purchase and dashboard ui"`

#### End April 2 Afternoon Sign-Off
- [ ] Complete flow: register → buy policy → trigger fires → claims auto-created
- [ ] Admin can fire trigger events
- [ ] Worker sees active policy and claims
- [ ] No crashes or major 500 errors
- [ ] **CRITICAL BACKUP COMMIT:** `git commit -m "checkpoint: april 2 pm - trigger and claims flowing"`

---

### APRIL 2: EVENING (6pm - 11pm)

#### Integration Test: Full Path (All 3 people)
- [ ] Clear database: `npm run seed`
- [ ] Start Docker: `docker-compose up -d`
- [ ] Start API: `npm start` in `services/api/`
- [ ] Start ML Premium: `python app.py` in `services/ml/premium_service/`
- [ ] Start React: `npm start` in `apps/worker/`
- [ ] Test path:
  1. Worker registration (phone → OTP 123456 → profile → zone selection)
  2. See premium quote populate for selected zone
  3. Buy policy (select Standard tier → see Razorpay payment form)
  4. Policy activates (ACTIVE status visible)
  5. Admin panel: fire HEAVY_RAIN trigger in Whitefield
  6. Worker app refreshes, see new claim auto-appeared
  7. Click claim detail: see trust score, payout amount, status APPROVED
- [ ] **CHECKPOINT:** Run through once, note any bugs/crashes, fix them
- [ ] Repeat test path 2 more times without errors
- [ ] **FINAL COMMIT:** `git commit -m "checkpoint: april 2 pm integration test passing"`

---

### APRIL 3: MORNING (6am - 12pm)

#### Trust Score Implementation (Person A & Person C)
- [ ] Implement basic rule-based trust score (no ML yet, Phase 3 adds ML)
  - [ ] Start trust_score = 1.0
  - [ ] GPS outside zone (if available): trust_score -= 0.35
  - [ ] Claim in < 5 min of trigger: trust_score -= 0.10
  - [ ] Claim density (3+ in 7 days): trust_score -= 0.15
  - [ ] Clean history: trust_score += 0.05
- [ ] Evaluate trust score on claim creation
- [ ] Set claim status:
  - [ ] trust_score > 0.85 → APPROVED (instant payout)
  - [ ] 0.60–0.85 → PARTIAL (50% payout, needs verification)
  - [ ] < 0.60 → FLAGGED (manual review)
- [ ] Demo spoofed claim: submit claim with GPS way outside zone
- [ ] Verify: spoofed claim gets trust < 0.60, status = FLAGGED
- [ ] **CHECKPOINT:** Postman: create two claims, one clean (APPROVED), one spoofed (FLAGGED)
- [ ] **COMMIT:** `git commit -m "feat: basic rule-based trust score"`

#### Razorpay Payout Integration (Person A)
- [ ] APPROVED claims trigger Razorpay payout call
- [ ] POST /api/webhooks/razorpay endpoint (receives payout.processed webhook)
- [ ] On webhook: update claim status to PAID, store razorpay_payout_id
- [ ] For demo: fallback to "Simulate Payout" button (hardcoded: move claim to PAID)
- [ ] **CHECKPOINT:** Fire trigger → claim created → check Razorpay test dashboard (or fallback button)
- [ ] **COMMIT:** `git commit -m "feat: razorpay payout integration"`

#### React Frontend: UI Polish & Trust Score Display (Person B)
- [ ] Update Claim Detail Screen to show trust score with color-coding
  - [ ] trust > 0.85: green APPROVED
  - [ ] trust 0.60–0.85: yellow PARTIAL
  - [ ] trust < 0.60: red FLAGGED
- [ ] Add loading states (skeleton loaders, spinners)
- [ ] Add error toast notifications (red alerts for failures)
- [ ] Add success toast notifications (green confirmations)
- [ ] Add status badges everywhere (ACTIVE, PAID, APPROVED, FLAGGED, PARTIAL, DENIED)
- [ ] Fix layout/spacing issues (use TailwindCSS consistently)
- [ ] Dark patterns check: make cancellation visible, no hidden flows
- [ ] **CHECKPOINT:** Open app in browser, test full flow aesthetically
- [ ] **COMMIT:** `git commit -m "feat: trust score display and ui polish"`

#### Admin Panel Features (Person B)
- [ ] Admin Dashboard Page
  - [ ] Metric cards: Loss Ratio %, Total Claims, Pending Review, Fraud Rings Active
  - [ ] Claims Table: sortable, filterable by status/zone/date
- [ ] Trigger Event Panel
  - [ ] Left: form to fire trigger (zone, type, value)
  - [ ] Right: log of recent trigger events
- [ ] Fraud Rings Panel (simple version for Phase 2, advanced in Phase 3)
- [ ] Simple auth check: admin can only see /admin pages if JWT role='ADMIN'
- [ ] **CHECKPOINT:** Visit admin dashboard, fire trigger from UI
- [ ] **COMMIT:** `git commit -m "feat: admin dashboard and trigger panel"`

#### README: Phase 2 Section (All)
- [ ] Add "## Phase 2: Automation & Protection" section
- [ ] Document what was built
- [ ] Add setup instructions (Docker, npm install, start commands)
- [ ] Add testing instructions (critical path tests)
- [ ] Add architecture diagram (simple text or ASCII)
- [ ] **COMMIT:** `git commit -m "docs: phase 2 readme and architecture"`

#### End April 3 Morning Sign-Off
- [ ] Trust score calculation working
- [ ] APPROVED, PARTIAL, FLAGGED claims flowing correctly
- [ ] Payout simulation working (Razorpay test or fallback button)
- [ ] Admin panel fully functional
- [ ] UI polished (no raw errors, proper spacing, status badges)
- [ ] README updated
- [ ] **CRITICAL BACKUP COMMIT:** `git commit -m "checkpoint: april 3 am - trust score and payouts working"`

---

### APRIL 3: AFTERNOON & EVENING (1pm - 11pm)

#### Demo Video Recording (Person B) — CRITICAL
- **Script (2 minutes):**
  - 0:00-0:30: "This is GigCare..." (problem statement voiceover)
  - 0:30-1:00: Registration flow (register with phone, confirm OTP, enter profile, select zone)
  - 1:00-1:30: Buy policy (see premium, select tier, simulate payment)
  - 1:30-2:00: Trigger demo (admin fires rainfall event, worker refreshes, see claim auto-appear, trust score shows)

- Recording steps:
  1. Clear database: `npm run seed`
  2. Start all services in separate terminals
  3. Open browser to worker app (localhost:3000)
  4. Open browser to admin app (localhost:3000/admin) in second monitor
  5. Use OBS Studio or similar to record screen at 1920x1080
  6. Do full run-through, record 3 times, pick best take
  7. Upload to YouTube (unlisted) or Google Drive
  8. Get public link ready for submission

- [ ] **CHECKPOINT:** Demo video recorded successfully (2 min, clear audio, no crashes)
- [ ] **COMMIT:** `git commit -m "docs: demo video recorded and uploaded"`

#### Final Code Review (All)
- [ ] Check all `/services/api` endpoints return proper JSON format
- [ ] Check all error responses have error + code + field (if validation)
- [ ] Check no raw stack traces visible in error responses
- [ ] Check no console.error() statements left in production code
- [ ] Check all API endpoints have proper HTTP status codes (201, 400, 401, 403, 404, 500)
- [ ] Run Postman collection through all endpoints
- [ ] Manual test in browser: go through full flow once more
- [ ] **CHECKPOINT:** No crashes, no errors, full path works end-to-end
- [ ] **COMMIT:** `git commit -m "refactor: code review and error handling cleanup"`

---

### APRIL 4: SUBMIT DAY

#### Morning (6am - 12pm)
- [ ] Any hotfixes needed (if something broke overnight)
- [ ] Verify demo video uploaded and link works
- [ ] Verify GitHub repo is public and all code pushed
- [ ] **COMMIT:** final hotfixes if any
- [ ] **PUSH:** `git push origin main`

#### Afternoon: SUBMIT (by 2pm)
- [ ] GitHub repo link verified and accessible
- [ ] Demo video link verified and accessible
- [ ] README with Phase 2 section complete
- [ ] Submit to Guidewire DEVTrails portal
- [ ] **DO NOT submit at 1:59pm.** Submit by 1:30pm to allow for portal slowness.

---

## Success Criteria: 4-Star Phase 2

You get 4 stars if:

✅ **Registration works end-to-end** (no crashes, returns JWT)  
✅ **Premium calculation shows zone differences** (Koramangala ≠ Whitefield by >50 Rs)  
✅ **Policy purchase + payment simulation working** (PENDING → ACTIVE transition)  
✅ **Trigger events auto-create claims** (no manual form submission)  
✅ **Trust score visible** (clean vs spoofed claims look different)  
✅ **Payout amount appears** (at least APPROVED claims show 380 Rs or similar)  
✅ **Admin can trigger events** (UI button, not curl command)  
✅ **UI is clean and polished** (no raw errors, proper colors, readable fonts)  
✅ **Demo video is clear** (no crashes during recording, audio understandable)  
✅ **Code quality is good** (proper error handling, consistent format)  

You get 3 stars if 8/10 of above are true. You get 5 stars if ALL are true plus Razorpay test payout is confirmed.

---

## Critical Kill List: Things That Drop You Below 3-Star

❌ Registration crashes or doesn't create worker  
❌ Premium calculation fails or uses hardcoded formula  
❌ Claims don't auto-create (manual form required)  
❌ Demo has 500 errors or crashes  
❌ Payout amount never appears (workers can't see what they'll get)  
❌ Admin trigger button doesn't work  
❌ Code has raw `console.log()` or stack traces in responses  
❌ Database not seeded (zones / demo worker missing)  
❌ Submit after April 4 2pm (automatic penalty)  

---

## Commits to Push (Daily)

Each checkpoint above should be a `git commit` and `git push origin`. Format:

```
git add .
git commit -m "feat: <what you built>" OR "fix: <what you fixed>"
git push origin main
```

Keep commits atomic: one feature per commit.

---

Done. This is your roadmap. Print it out. Check off as you go. Don't deviate. Execute.

**Let's go build a 4-star product. 72 hours. GO.**
