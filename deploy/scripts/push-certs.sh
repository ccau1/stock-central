#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
TF_DIR="$DEPLOY_DIR/terraform"
SSL_DIR="$DEPLOY_DIR/ssl"

# Read the public key path from terraform.tfvars, derive private key path
TFVARS="$TF_DIR/terraform.tfvars"
if [ -f "$TFVARS" ] && grep -q "^ssh_public_key_path" "$TFVARS" 2>/dev/null; then
  PUB_KEY=$(grep "^ssh_public_key_path" "$TFVARS" | sed -E 's/.*= *"(.+)".*/\1/')
  DERIVED_PRIV="${PUB_KEY%.pub}"
else
  DERIVED_PRIV="$HOME/.ssh/id_ed25519"
fi

SSH_KEY="${SSH_KEY:-$DERIVED_PRIV}"

if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH private key not found: $SSH_KEY"
    echo "   Options:"
    echo "   1. Set SSH_KEY env var: SSH_KEY=~/.ssh/my-key ./deploy/scripts/push-certs.sh"
    echo "   2. Update ssh_public_key_path in deploy/terraform/terraform.tfvars"
    exit 1
fi

echo "🔑 Using SSH key: $SSH_KEY"

cd "$TF_DIR"

SERVER_IP=$(terraform output -raw server_ip)

# Clear stale host key (server may have been recreated with same IP)
ssh-keygen -R "$SERVER_IP" 2>/dev/null || true

echo ""
echo "⏳ Waiting for SSH on root@$SERVER_IP ..."
for i in {1..30}; do
  if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 -o BatchMode=yes "root@$SERVER_IP" "echo ready" >/dev/null 2>&1; then
    echo "✅ SSH is ready"
    break
  fi
  echo "   Attempt $i/30: not ready, waiting 5s..."
  sleep 5
done

echo ""
echo "📤 Extracting SSL certificates from Terraform outputs..."
mkdir -p "$SSL_DIR"
terraform output -raw stockcentral_origin_certificate > "$SSL_DIR/cloudflare-origin.pem"
terraform output -raw stockcentral_origin_private_key > "$SSL_DIR/cloudflare-origin.key"
chmod 600 "$SSL_DIR/cloudflare-origin.key"

echo ""
echo "🚀 Pushing certs to root@$SERVER_IP:/opt/stock-central/ssl/ ..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "root@$SERVER_IP" "mkdir -p /opt/stock-central/ssl"
scp -i "$SSH_KEY" "$SSL_DIR/cloudflare-origin.pem" "$SSL_DIR/cloudflare-origin.key" "root@$SERVER_IP:/opt/stock-central/ssl/"
ssh -i "$SSH_KEY" "root@$SERVER_IP" "chmod 600 /opt/stock-central/ssl/cloudflare-origin.key && chmod 644 /opt/stock-central/ssl/cloudflare-origin.pem"

echo ""
echo "✅ Certificates deployed successfully!"
