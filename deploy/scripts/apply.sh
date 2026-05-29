#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
TF_DIR="$DEPLOY_DIR/terraform"

"$SCRIPT_DIR/select-ssh-key.sh"

echo ""
echo "🏗️  Running terraform apply..."
cd "$TF_DIR"
terraform apply "$@"

echo ""
"$SCRIPT_DIR/push-certs.sh"

echo ""
"$SCRIPT_DIR/github-secrets.sh"
