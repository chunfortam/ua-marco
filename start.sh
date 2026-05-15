#!/bin/bash
set -e

echo "=== Union Arena Platform - Start Script ==="
echo ""

# Pull latest code
echo "[1/3] Pulling latest code..."
git pull
echo ""

# Bring down existing containers
echo "[2/3] Stopping existing containers..."
docker compose down
echo ""

# Build and start containers
echo "[3/3] Building and starting containers..."
docker compose up --build -d
echo ""

echo "=== Done! ==="
echo "Frontend:    http://localhost:3000"
echo "Game Server: ws://localhost:3001"
echo ""
echo "To view logs: docker compose logs -f"
echo "To stop:      docker compose down"
