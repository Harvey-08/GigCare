# Phase 3 Load Testing Guide

## Overview
GigCare includes comprehensive load testing with k6 to validate scalability and performance under high concurrency.

## Prerequisites

```bash
# Install k6
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Or via Docker
docker run -i grafana/k6 run - < k6-loadtest-gigcare.js
```

## Running Load Tests

### Standard Load Test (100 VUs for 10 minutes)
```bash
k6 run k6-loadtest-gigcare.js
```

### Custom Load Stages
```bash
k6 run k6-loadtest-gigcare.js --stage 1m:10 --stage 3m:50 --stage 2m:0
```

### Against Specific Server
```bash
BASE_URL=http://staging-api.gigcare.app k6 run k6-loadtest-gigcare.js
```

### With Custom ML Service URL
```bash
BASE_URL=http://localhost:3011 ML_BASE_URL=http://localhost:5002 k6 run k6-loadtest-gigcare.js
```

### In Docker Compose
```bash
cd /home/rithvikmukka/gigcare_phase2_build
docker compose exec api npm run load-test
```

## Test Scenarios Covered

1. **Worker Authentication** - Registration endpoint throughput
2. **Premium Calculation** - ML service latency under load
3. **Fraud Scoring** - XGBoost model inference speed (p95 < 500ms)
4. **Trigger Events** - Admin API throughput
5. **Admin Dashboard** - Metrics aggregation performance
6. **Fraud Ring Detection** - Graph analysis on large datasets

## Performance Thresholds

- Response time: p95 < 500ms, p99 < 1000ms
- Error rate: < 10%
- Custom fraud response time: 200ms

## Output Metrics

The test generates:
- Request duration histogram
- Success/failure rate
- Error breakdown by endpoint
- Custom metrics:
  - `errors` - Error rate
  - `fraud_response_time` - Fraud service latency

## Continuous Integration

Add to CI/CD pipeline:
```yaml
load-test:
  stage: performance
  script:
    - k6 run k6-loadtest-gigcare.js --vus 100 --duration 10m
  artifacts:
    reports:
      performance: results.json
```

## Benchmarking Results (Baseline)

Expected results on standard hardware:
- Auth: 95%ile < 300ms
- Premium: 95%ile < 200ms
- Fraud: 95%ile < 250ms (with ML inference)
- Triggers: 95%ile < 400ms
- Dashboard: 95%ile < 500ms
- Fraud Rings: 95%ile < 600ms
