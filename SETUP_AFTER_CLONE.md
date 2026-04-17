# GigCare Setup After Clone

This guide is for anyone who clones the repository and wants to run the full stack locally.

For the shorter overview, see [README.md](README.md). For the judge/demo walkthrough, see [DEMO_NAVIGATION.md](DEMO_NAVIGATION.md). For the submission summary, see [HACKATHON_SUMMARY.md](HACKATHON_SUMMARY.md).

## 1. Clone the Repository

```bash
git clone <repo-url>
cd gigcare_phase2_build
```

## 2. Prerequisites

- Docker and Docker Compose
- Node.js 18+ for frontend builds
- Python 3.11+ for the premium and fraud ML services

## 3. Configure Environment

Copy the template and fill in the required values:

```bash
cp .env.example .env
```

Minimum values to check:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `INTERNAL_SERVICE_KEY`
- `OPENWEATHER_API_KEY` or `USE_MOCK_DATA=true` for demo mode
- `WAQI_TOKEN` or `USE_MOCK_DATA=true` for demo mode
- `RAZORPAY_KEY_ID=none` and `RAZORPAY_KEY_SECRET=none` if you want mock payment only

### Where To Get Each Key

| Key | Where to fetch it |
|---|---|
| `SUPABASE_URL` | Supabase project dashboard, Project Settings, API section |
| `SUPABASE_ANON_KEY` | Supabase project dashboard, Project Settings, API section |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project dashboard, Project Settings, API section; keep backend-only |
| `JWT_SECRET` | Generate locally with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `INTERNAL_SERVICE_KEY` | Generate locally with any strong random string; used only between services |
| `OPENWEATHER_API_KEY` | OpenWeather account dashboard after creating a free API key |
| `WAQI_TOKEN` | WAQI / AQICN developer token page after signing up |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Your email provider or SMTP service dashboard |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard in test mode |

If you are only running the hackathon demo, you can leave payment disabled by setting Razorpay values to `none` and use `USE_MOCK_DATA=true` for weather/AQI.

## 4. Start the Stack

From the project root:

```bash
docker compose up -d --build
```

If you want to rebuild just the API or UI after a change:

```bash
docker compose up -d --build api worker-app admin-app ml-premium ml-fraud trigger-engine
```

## 5. Where Each Service Runs

- Worker app: http://localhost:3010
- Admin app: http://localhost:3013
- API server: http://localhost:3011/api
- API health check: http://localhost:3011/health
- ML premium service: http://localhost:5001
- ML fraud service: http://localhost:5002

## 6. Main API Endpoints

Worker-facing endpoints:

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

Admin-facing endpoints:

- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/cities/metrics`
- `GET /api/admin/fraud-rings`
- `POST /api/admin/trigger-event`
- `POST /api/admin/trigger-demo-payout`

Background and internal endpoints:

- `POST /api/claims/auto-create`  
  Used internally by the trigger engine.
- `POST /api/fraud/auto-create`  
  Used by the trigger engine and admin-trigger flow.
- `POST /api/webhooks/razorpay-payment`  
  Demo payment callback used during policy activation.

## 7. How To Fetch Data During Setup

Use `curl` or a browser to validate the system:

```bash
curl http://localhost:3011/health
curl http://localhost:3011/api/zones
curl -X POST http://localhost:3011/api/premiums/calculate \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <worker-jwt>' \
  -d '{"zone_id":"HYD_27_02","week_start":"2026-04-17"}'
```

For admin testing:

```bash
curl -X POST http://localhost:3011/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"gigcare@admin.com","password":"Admin123@"}'
```

## 8. Optional Demo Mode

If live weather or AQI keys are not available, set `USE_MOCK_DATA=true`. That keeps the demo running without blocking on external services.

If you only want mock payment:

- keep Razorpay credentials set to `none`
- use the policy purchase flow in the worker app
- the app will simulate payment activation instead of opening a live payment gateway

## 9. Common Checks

1. Confirm containers are up:

```bash
docker compose ps
```

2. Confirm API is healthy:

```bash
curl http://localhost:3011/health
```

3. Confirm worker and admin apps open in the browser:

- http://localhost:3010
- http://localhost:3013

4. Confirm the trigger engine is running:

```bash
docker compose logs --tail 40 trigger-engine
```

## 10. Notes For Hackathon Judges

- Premiums are calculated before policy purchase.
- Claims are created only when triggers occur.
- Fraud checks run before payout.
- The guaranteed demo payout button in the admin panel is the fastest way to show the full parametric flow.
