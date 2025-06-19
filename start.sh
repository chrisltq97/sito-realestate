#!/bin/bash

echo "Starting Costa Rica Real Estate Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    echo "Visit https://nodejs.org/ to download and install Node.js"
    exit 1
fi

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "MongoDB is not installed. Please install MongoDB first."
    echo "Visit https://www.mongodb.com/try/download/community to download MongoDB"
    exit 1
fi

# Kill any existing servers
echo "Stopping any existing servers..."
pkill -f "python3" || true
pkill -f "node" || true
pkill -f "mongod" || true

# Start MongoDB
echo "Starting MongoDB..."
mongod --dbpath ./data/db &

# Install backend dependencies
cd backend
npm install

# Start backend server (dev mode)
echo "Starting backend server..."
npm run dev &

# Start main site server
cd ..
echo "Starting main site server..."
python3 server.py &

echo "All servers started! The application is running at:"
echo "Frontend: http://localhost:8080"
echo "Backend: http://localhost:3000"
echo ""
echo "To stop all servers, run: pkill -f 'python3' && pkill -f 'node' && pkill -f 'mongod'"

# Wait for any key to exit
read -p "Press any key to stop all servers..." -n1 -s
echo ""

# Stop all servers
pkill -f "python3"
pkill -f "node"
pkill -f "mongod"

echo "All servers stopped."

# Start the property scraping process

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Run the scraper
node scrape_all_properties.js 