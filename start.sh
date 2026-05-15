#!/bin/bash
set -e

echo "=== Union Arena Platform - Start Script ==="
echo ""

# Pull latest code
echo "[1/4] Pulling latest code..."
git pull
echo ""

# Bring down existing containers and remove old images
echo "[2/4] Stopping existing containers..."
docker compose down --rmi local --volumes --remove-orphans 2>/dev/null || docker compose down
echo ""

# Build fresh (no cache to avoid stale code)
echo "[3/4] Building fresh (no cache)..."
docker compose build --no-cache
echo ""

# Start containers
echo "[4/4] Starting containers..."
docker compose up -d
echo ""

echo "=== Done! ==="
echo "Frontend:    http://localhost:3000"
echo "Game Server: ws://localhost:3001"
echo ""
echo "Waiting for containers to be ready..."
sleep 3
echo ""
echo "To view logs: docker compose logs -f"
echo "To stop:      docker compose down"
