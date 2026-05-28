#!/bin/bash
set -e

echo "=== Stock Central Droplet Setup ==="

# Update system
apt-get update && apt-get upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

# Create app directory
APP_DIR="/opt/stock-central"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repo (adjust if you deploy via SCP/GitHub instead)
if [ ! -d ".git" ]; then
    echo "Please clone your repository into $APP_DIR"
    echo "Example: git clone https://github.com/yourname/stock-central.git ."
    exit 1
fi

# Create production env file if missing
if [ ! -f "deploy/.env" ]; then
    cat > deploy/.env << 'EOF'
POSTGRES_USER=stockcentral
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=stockcentral
CORS_ORIGIN=http://YOUR_DROPLET_IP
EOF
    echo "Created deploy/.env — PLEASE EDIT IT with your actual values!"
    exit 1
fi

# Build web
pushd packages/web
npm install
npm run build
popd

# Start services
cd deploy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d

echo "=== Setup complete ==="
echo "App should be available at http://$(curl -s ifconfig.me)"
