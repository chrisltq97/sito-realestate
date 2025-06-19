#!/bin/bash

# Install Node.js
echo "Installing Node.js..."
brew install node

# Install MongoDB
echo "Installing MongoDB..."
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
echo "Starting MongoDB service..."
brew services start mongodb-community

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
PORT=5000
MONGODB_URI=mongodb://localhost:27017/costa-rica-real-estate
JWT_SECRET=your_jwt_secret_here
SNIT_API_KEY=your_snit_api_key_here
EOL
fi

# Add sample data
echo "Adding sample data..."
node scripts/seedData.js

# Start the backend server
echo "Starting backend server..."
npm run dev &

# Start the main site server
echo "Starting main site server..."
cd ..
python3 -m http.server 8080 