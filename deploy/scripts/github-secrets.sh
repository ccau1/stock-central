#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
TF_DIR="$DEPLOY_DIR/terraform"
SSL_DIR="$DEPLOY_DIR/ssl"

cd "$TF_DIR"

SERVER_IP=$(terraform output -raw server_ip)

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  GitHub Secrets — copy-paste into:"
echo "  Settings → Secrets and variables → Actions → New repository secret"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Shared secret (used by all environments):"
echo ""

# GH_TOKEN
echo "──────────── GH_TOKEN ─────────────────────────────────────────"
echo "Create a Classic PAT: https://github.com/settings/tokens/new?type=classic"
echo "Required scope: read:packages"
echo "Used by staging, shared prod, and standalone prod to pull images from GHCR."
echo ""

echo ""
echo "Staging secrets (used by deploy-staging):"
echo "  Files copied to: /opt/stock-central-staging"
echo "  Compose file:    deploy/docker-compose.staging.yml"
echo ""

# STAGING_HETZNER_HOST
echo "──────────── STAGING_HETZNER_HOST ─────────────────────────────"
echo "Staging server's public IP"
echo ""

# STAGING_HETZNER_USER
echo "──────────── STAGING_HETZNER_USER ─────────────────────────────"
echo "Usually 'root'"
echo ""

# STAGING_HETZNER_SSH_KEY
echo "──────────── STAGING_HETZNER_SSH_KEY ──────────────────────────"
echo "Paste your private SSH key here."
echo ""

# STAGING_ENV_FILE
echo "──────────── STAGING_ENV_FILE ─────────────────────────────────"
echo "Copy the contents of deploy/.env, adjusted for staging."
echo "Must include at least: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, CORS_ORIGIN"
echo ""

echo ""
echo "Shared prod secrets (used by promote-to-prod, default target):"
echo "  Files copied to: /opt/stock-central-prod"
echo "  Compose file:    deploy/docker-compose.prod.yml"
echo ""

# PROD_HETZNER_HOST
echo "──────────── PROD_HETZNER_HOST ────────────────────────────────"
echo "Shared prod server's public IP"
echo ""

# PROD_HETZNER_USER
echo "──────────── PROD_HETZNER_USER ────────────────────────────────"
echo "Usually 'root'"
echo ""

# PROD_HETZNER_SSH_KEY
echo "──────────── PROD_HETZNER_SSH_KEY ─────────────────────────────"
echo "Paste your private SSH key here."
echo ""

# PROD_ENV_FILE
echo "──────────── PROD_ENV_FILE ────────────────────────────────────"
echo "Copy the contents of deploy/.env, adjusted for production."
echo "Must include at least: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, CORS_ORIGIN"
echo ""

echo ""
echo "Standalone prod secrets (used only when workflow_dispatch target = standalone):"
echo "  Server managed by Terraform in deploy/terraform/"
echo "  Files copied to: /opt/stock-central-prod-standalone"
echo "  Compose file:    deploy/docker-compose.prod-standalone.yml"
echo ""

# PROD_STANDALONE_HETZNER_HOST
echo "──────────── PROD_STANDALONE_HETZNER_HOST ─────────────────────"
echo "$SERVER_IP"
echo ""

# PROD_STANDALONE_HETZNER_USER
echo "──────────── PROD_STANDALONE_HETZNER_USER ─────────────────────"
echo "root"
echo ""

# PROD_STANDALONE_HETZNER_SSH_KEY
PUB_KEY=$(grep "^ssh_public_key_path" "$TF_DIR/terraform.tfvars" 2>/dev/null | sed -E 's/.*= *"(.+)".*/\1/' || true)
DERIVED_PRIV="${PUB_KEY%.pub}"
echo "──────────── PROD_STANDALONE_HETZNER_SSH_KEY ──────────────────"
echo "Paste your private SSH key here."
if [ -n "$DERIVED_PRIV" ]; then
  echo "File: $DERIVED_PRIV"
else
  echo "File: ~/.ssh/id_ed25519 (or whatever key you used for Terraform)"
fi
echo ""

# PROD_STANDALONE_ENV_FILE
echo "──────────── PROD_STANDALONE_ENV_FILE ─────────────────────────"
echo "Copy the contents of deploy/.env (production environment file)"
echo ""

echo ""
echo "Optional secrets:"
echo ""

# CF_ORIGIN_CERT
echo "──────────── CF_ORIGIN_CERT (optional) ────────────────────────"
echo "Only used for standalone prod. If set, the workflow will auto-copy certs to the server."
echo "If you skip it, you must manually SCP certs once (see deploy/README.md)."
echo ""
terraform output -raw stockcentral_origin_certificate
echo ""

# CF_ORIGIN_KEY
echo "──────────── CF_ORIGIN_KEY (optional) ─────────────────────────"
echo ""
terraform output -raw stockcentral_origin_private_key
echo ""

# HCLOUD_TOKEN
echo "──────────── HCLOUD_TOKEN (optional) ──────────────────────────"
echo "Not needed for app deploys. Only required if you run Terraform in CI."
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Notes:"
echo "  • GH_TOKEN is shared across staging, shared prod, and standalone prod."
echo "  • Shared/staging servers run behind an external Traefik reverse proxy."
echo "    The compose files use the 'traefik' Docker network by default; override with TRAEFIK_NETWORK in the env file if needed."
echo "  • CF_ORIGIN_CERT/KEY are optional — only needed if you want CI to auto-deploy certs to standalone prod."
echo "    Otherwise, run 'make certs' locally after Terraform apply."
echo "  • HCLOUD_TOKEN is optional — only needed if you run Terraform in CI."
echo "  • ENV_FILE secrets must contain your production/staging .env values (Postgres, CORS_ORIGIN, etc.)"
echo ""
