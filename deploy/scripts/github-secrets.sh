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
echo "Required secrets (5):"
echo ""

# HETZNER_HOST
echo "──────────── HETZNER_HOST ─────────────────────────────────────"
echo "$SERVER_IP"
echo ""

# HETZNER_USER
echo "──────────── HETZNER_USER ─────────────────────────────────────"
echo "root"
echo ""

# HETZNER_SSH_KEY
PUB_KEY=$(grep "^ssh_public_key_path" "$TF_DIR/terraform.tfvars" 2>/dev/null | sed -E 's/.*= *"(.+)".*/\1/' || true)
DERIVED_PRIV="${PUB_KEY%.pub}"
echo "──────────── HETZNER_SSH_KEY ──────────────────────────────────"
echo "Paste your private SSH key here."
if [ -n "$DERIVED_PRIV" ]; then
  echo "File: $DERIVED_PRIV"
else
  echo "File: ~/.ssh/id_ed25519 (or whatever key you used for Terraform)"
fi
echo ""

# GH_TOKEN
echo "──────────── GH_TOKEN ─────────────────────────────────────────"
echo "Create a Classic PAT: https://github.com/settings/tokens/new?type=classic"
echo "Required scope: read:packages"
echo ""

# ENV_FILE
echo "──────────── ENV_FILE ─────────────────────────────────────────"
echo "Copy the contents of deploy/.env (production environment file)"
echo ""

echo ""
echo "Optional secrets (3):"
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
echo "  • CF_ORIGIN_CERT/KEY are optional — only needed if you want CI to auto-deploy certs."
echo "    Otherwise, run 'make certs' locally after Terraform apply."
echo "  • HCLOUD_TOKEN is optional — only needed if you run Terraform in CI."
echo "  • ENV_FILE must contain your production .env values (Postgres, CORS_ORIGIN, etc.)"
echo ""
