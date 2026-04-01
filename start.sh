#!/bin/bash
# Quick start script for GigCare
# Usage: ./start.sh

echo "🚀 Starting GigCare Phase 2..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Edit it if needed for Razorpay/weather APIs."
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Starting Docker containers..."
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "❌ docker-compose not found. Install docker-compose or Docker Compose plugin."
  exit 1
fi

$COMPOSE_CMD up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are healthy
echo ""
echo "🔍 Checking service health..."
echo ""

# PostgreSQL
if $COMPOSE_CMD exec postgres pg_isready -U gigcare_user > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Running on http://localhost:5433"
else
    echo "❌ PostgreSQL: Failed to start"
    exit 1
fi

# API
API_TIMEOUT=30
API_INTERVAL=2
API_READY=false
for ((i=0; i<API_TIMEOUT; i+=API_INTERVAL)); do
    if curl -s http://localhost:3001/health | grep -q "ok"; then
        API_READY=true
        break
    fi
    echo "⏳ Waiting for API Server... ($i/$API_TIMEOUT)"
    sleep $API_INTERVAL
done
if [ "$API_READY" = true ]; then
    echo "✅ API Server: Running on http://localhost:3001"
else
    echo "❌ API Server: Failed to start within $API_TIMEOUT seconds"
    exit 1
fi

# ML Service
if curl -s http://localhost:5001/health | grep -q "ok" 2>/dev/null || true; then
    echo "✅ ML Premium Service: Running on http://localhost:5001"
else
    echo "⏳ ML Premium Service: Starting..."
fi

echo ""
echo "🎯 GigCare Phase 2 is running!"
echo ""
echo "📱 Access points:"
echo "  • Worker App: http://localhost:3000"
echo "  • Admin App: http://localhost:3002"  
echo "  • API Server: http://localhost:3001"
echo "  • Database: localhost:5433 (user: gigcare_user, pass: gigcare_pass)"
echo ""
echo "🗣️  Demo credentials:"
echo "  • Phone: +919876543210"
echo "  • OTP: 123456"
echo "  • Admin Phone: 9876543210"
echo "  • Admin OTP: 123456"
echo ""
echo "📖 View logs:"
echo "  • All services: $COMPOSE_CMD logs -f"
echo "  • API only: $COMPOSE_CMD logs -f api"
echo "  • PostgreSQL only: $COMPOSE_CMD logs -f postgres"
echo ""
echo "🛑 To stop:"
echo "  $COMPOSE_CMD down"
echo ""
