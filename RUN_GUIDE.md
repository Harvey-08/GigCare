# GigCare - Quick Start & Execution Guide

This guide explains how to launch and verify the full GigCare Parametric Insurance stack.

## 🚀 Recommended: Running via Docker (Full Stack)
The entire platform is containerized and can be started with a single command.

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 2. Start Services
Run this from the project root:
```bash
docker-compose up -d --build
```

### 3. Verify
Access the applications once the containers are ready:
- **Worker App**: [http://localhost:3010](http://localhost:3010)
- **Admin App**: [http://localhost:3013](http://localhost:3013)
- **API Health**: [http://localhost:3011/health](http://localhost:3011/health)

---

## 🛠️ Alternative: Manual Local Setup
If you prefer running without Docker (requires Node.js 18+ and a local PostgreSQL instance).

### 1. Database
- Ensure PostgreSQL is running on port **5435**.
- Run `database/migrations/001_initial_schema.sql`.
- Run `database/seeds/seed.sql`.

### 2. Backend (API)
```bash
cd services/api
npm install
npm start
```

### 3. Frontend (Apps)
Open two separate terminals:
**Worker App:**
```bash
cd apps/worker
npm install
npm start
```

**Admin App:**
```bash
cd apps/admin
npm install
npm start
```

---

## 🔑 Demo Access & Credentials

### **Worker App**
- **Phone Number**: `9876543210`
- **OTP**: `123456`
- *Use the "Sign In" button to skip registration.*

### **Admin App**
- **Phone Number**: `9876543210`
- **OTP**: `123456`

---

## 🏗️ Project Architecture
- **Frontend**: React (Vanilla CSS / Tailwind)
- **Backend**: Node.js / Express
- **Database**: PostgreSQL
- **ML Service**: Python / Flask (Premium Pricing)
- **Engine**: Node.js (Trigger/Claim Processing)

## 🐳 Troubleshooting
If ports are occupied, check the mappings in `docker-compose.yml` and `.env`. All ports are remapped to avoid common conflicts (3000/3001).
