#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(dirname "$SCRIPT_DIR")/terraform"
TFVARS="$TF_DIR/terraform.tfvars"

ensure_tfvars_exists() {
  if [ ! -f "$TFVARS" ]; then
    echo "⚠️  $TFVARS does not exist. Copying from example..."
    cp "$TFVARS.example" "$TFVARS"
  fi
}

current_key() {
  if [ -f "$TFVARS" ]; then
    grep "^ssh_public_key_path" "$TFVARS" 2>/dev/null | sed -E 's/.*= *"(.+)".*/\1/' || true
  fi
}

warn_passphrase() {
  local priv="${1%.pub}"
  if [ ! -f "$priv" ]; then
    echo ""
    echo "⚠️  Private key not found: $priv"
    echo ""
    return
  fi
  # Try to read with empty passphrase; fails immediately if encrypted
  if ! ssh-keygen -y -f "$priv" -P "" >/dev/null 2>&1; then
    echo ""
    echo "⚠️  WARNING: $priv has a passphrase."
    echo "   GitHub Actions will need the passphrase too (extra secret)."
    echo "   For CI automation, a passphrase-less key is strongly recommended."
    echo ""
  fi
}

ensure_tfvars_exists

CURRENT=$(current_key)

if [ -n "$CURRENT" ]; then
  echo "🔑 Current SSH key in terraform.tfvars: $CURRENT"
  read -rp "Keep this key? [Y/n]: " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]] || [ -z "$confirm" ]; then
    echo "✅ Keeping $CURRENT"
    exit 0
  fi
fi

echo ""
echo "Scanning ~/.ssh for public keys..."

KEYS=()
while IFS= read -r line; do
  [ -n "$line" ] && KEYS+=("$line")
done < <(find ~/.ssh -maxdepth 1 -name "*.pub" -type f 2>/dev/null | sort)

KEY_COUNT=${#KEYS[@]}

if [ "$KEY_COUNT" -gt 0 ]; then
  echo ""
  echo "Found these keys:"
  i=0
  while [ "$i" -lt "$KEY_COUNT" ]; do
    name=$(basename "${KEYS[$i]}")
    fp=$(ssh-keygen -lf "${KEYS[$i]}" 2>/dev/null | awk '{print $2}' || echo "?")
    echo "  $((i+1)). $name  ($fp)"
    i=$((i+1))
  done
  echo "  $((KEY_COUNT + 1)). ➕  Create a new SSH key"
  echo ""
  read -rp "Select a key (1-$((KEY_COUNT + 1))): " choice

  if [ "$choice" -le "$KEY_COUNT" ] 2>/dev/null && [ "$choice" -gt 0 ] 2>/dev/null; then
    SELECTED="${KEYS[$((choice-1))]}"
    warn_passphrase "$SELECTED"
  else
    CREATE_NEW=true
  fi
else
  echo "No existing keys found."
  CREATE_NEW=true
fi

if [ "$CREATE_NEW" = true ]; then
  echo ""
  read -rp "Name for new key (e.g. stock-central-deploy): " keyname
  [ -z "$keyname" ] && keyname="stock-central-deploy"
  
  KEY_PATH="$HOME/.ssh/$keyname"
  
  if [ -f "$KEY_PATH" ] || [ -f "$KEY_PATH.pub" ]; then
    echo "❌ Key already exists: $KEY_PATH"
    exit 1
  fi
  
  echo ""
  echo "Generating ed25519 key pair at $KEY_PATH ..."
  ssh-keygen -t ed25519 -C "deploy@stock-central" -f "$KEY_PATH" -N ""
  
  SELECTED="$KEY_PATH.pub"
  echo ""
  echo "✅ Created: $SELECTED (no passphrase — ideal for CI)"
fi

# Update terraform.tfvars
if grep -q "^ssh_public_key_path" "$TFVARS" 2>/dev/null; then
  # macOS sed syntax
  sed -i '' -E "s|^ssh_public_key_path.*|ssh_public_key_path = \"$SELECTED\"|" "$TFVARS"
else
  echo "" >> "$TFVARS"
  echo "ssh_public_key_path = \"$SELECTED\"" >> "$TFVARS"
fi

echo ""
echo "📝 Updated $TFVARS"
echo "   ssh_public_key_path = \"$SELECTED\""
