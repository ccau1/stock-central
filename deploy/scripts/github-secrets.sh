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
echo "Standalone prod secrets (auto-managed server by Terraform):"
echo "  Used by: Build & Deploy Standalone Prod (workflow_dispatch only)"
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
echo "Shared prod secrets (separate shared server):"
echo "  Used by: Build & Deploy → deploy-prod-shared"
echo "  Prefix: PROD_"
echo "  Required: PROD_HETZNER_HOST, PROD_HETZNER_USER, PROD_HETZNER_SSH_KEY, PROD_ENV_FILE"
echo ""

echo ""
echo "Staging secrets (separate staging server):"
echo "  Used by: Build & Deploy → deploy-staging"
echo "  Prefix: STAGING_"
echo "  Required: STAGING_HETZNER_HOST, STAGING_HETZNER_USER, STAGING_HETZNER_SSH_KEY, STAGING_ENV_FILE"
echo ""

echo ""
echo "Optional secrets (auto-managed server by Terraform):"
echo ""

# CF_ORIGIN_CERT
echo "──────────── CF_ORIGIN_CERT (optional) ────────────────────────"
echo "If you set this, the deploy workflow will auto-copy certs to the server."
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
echo "  • CF_ORIGIN_CERT/KEY are optional — only needed if you want CI to auto-deploy certs."
echo "    Otherwise, run 'make certs' locally after Terraform apply."
echo "  • HCLOUD_TOKEN is optional — only needed if you run Terraform in CI."
echo "  • ENV_FILE secrets must contain your production/staging .env values (Postgres, CORS_ORIGIN, etc.)"
echo ""
