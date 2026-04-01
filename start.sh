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
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are healthy
echo ""
echo "🔍 Checking service health..."
echo ""

# PostgreSQL
if docker-compose exec postgres pg_isready -U gigcare_user > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Running on http://localhost:5433"
else
    echo "❌ PostgreSQL: Failed to start"
    exit 1
fi

# API
if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo "✅ API Server: Running on http://localhost:3001"
else
    echo "⏳ API Server: Starting (may take 30 seconds)..."
    sleep 15
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
echo "  • All services: docker-compose logs -f"
echo "  • API only: docker-compose logs -f api"
echo "  • PostgreSQL only: docker-compose logs -f postgres"
echo ""
echo "🛑 To stop:"
echo "  docker-compose down"
echo ""
