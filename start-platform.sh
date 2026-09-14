#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"

echo "=========================================================="
echo "🏎️  Starting Grand Prix Ultimate Offline Exam Platform"
echo "=========================================================="

# 1. Start Database
echo "1️⃣  Ensuring PostgreSQL database is running..."
bash "$SERVER_DIR/scripts/start-db.sh"

# Trap exit signals to terminate child processes cleanly
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    if [ -n "$CLIENT_PID" ]; then
        kill "$CLIENT_PID" 2>/dev/null || true
    fi
    echo "👋 Shutdown complete."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Start Backend Server
echo "2️⃣  Starting Backend Express + Socket.IO Server (Port 3000)..."
cd "$SERVER_DIR"
node index.js &
SERVER_PID=$!

# Wait briefly for backend to initialize
sleep 2

# 3. Start Frontend Client
echo "3️⃣  Starting Frontend React + Vite Dev Server (Port 5173)..."
cd "$CLIENT_DIR"
npx vite --host 0.0.0.0 --port 5173 &
CLIENT_PID=$!

echo ""
echo "=========================================================="
echo "🎉 Grand Prix Platform is up and running!"
echo "----------------------------------------------------------"
echo "🌐 Frontend Candidate Portal:  http://localhost:5173"
echo "🔑 Candidate Access Tokens:    123, 456, 789, 101, 102..."
echo "⚙️  Admin Dashboard:            http://localhost:5173/admin/login"
echo "🔐 Admin Credentials:          Username: admin | Password: admin123"
echo "📡 Backend Server & APIs:      http://localhost:3000"
echo "=========================================================="
echo "Press Ctrl+C to stop all services."

# Wait for both processes
wait
