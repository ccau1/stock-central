# Deploying Stock Central to Hetzner Cloud

## Architecture

A single Hetzner server runs everything via Docker Compose:

```
┌──────────────────────────────────────┐
│         Hetzner Cloud VM             │
│  ┌──────┐ ┌────────┐ ┌───────────┐  │
│  │ nginx│ │ server │ │  postgres │  │
│  │ :443 │ │ :8000  │ │   :5432   │  │
│  └──┬───┘ └────┬───┘ └─────┬─────┘  │
│     └──────────┴───────────┘         │
│           Docker Network             │
└──────────────────────────────────────┘
```

- **nginx** (port 80/443) serves the built React app and proxies `/api/` to the server
- **server** runs the Go API (internal port 8000)
- **postgres** runs the database (internal port 5432) with a persistent Docker volume

## Prerequisites

- [Hetzner Cloud](https://console.hetzner.cloud/) account
- [GitHub](https://github.com) repository (this one)
- Terraform or OpenTofu installed locally (`brew install terraform` or `brew install opentofu`)
- An SSH key pair (create one: `ssh-keygen -t ed25519 -C "deploy@stock-central"`)

---

## 1. Hetzner UI Setup (One-time)

You only need to do **one thing** in the Hetzner UI:

1. Go to [console.hetzner.cloud](https://console.hetzner.cloud/)
2. Create a new project (e.g., `stock-central`)
3. Navigate to **Security → API Tokens**
4. Generate a token with **Read & Write** permissions
5. **Save the token** — you won't see it again

## Optional: Cloudflare DNS Setup

If you want custom domains (e.g., `stocks.tribalorigin.com`), grab these from your Cloudflare dashboard:

| Value | Where to find it |
|-------|-----------------|
| **Zone ID** | Cloudflare → `tribalorigin.com` → Overview → right sidebar |
| **API Token** | Cloudflare → My Profile → API Tokens → Create Token → Use "Edit zone DNS" template |

The Terraform config will automatically create both DNS records and point them to your Hetzner server. If you set `cloudflare_proxied = true` (default), you get **free HTTPS + CDN** without setting up certs on the server.

> **No `cloudflare_account_id` needed** — the provider only needs `api_token` + `zone_id` to manage DNS records.

> **Cloudflare proxy is free** — the free plan includes DDoS protection, CDN caching, and free SSL. No credit card required.

---

## 2. Create the Server with Terraform (Local)

Everything — server, firewall, SSH key, DNS — is defined as code in `deploy/terraform/`.

```bash
cd deploy/terraform

# Copy example vars and add your tokens
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and paste your Hetzner + Cloudflare tokens

# Initialize and apply
terraform init
terraform plan
terraform apply
```

When complete, Terraform outputs your server's public IP and domains:

```
server_ip = "116.203.x.x"
domains   = [
  "stocks.tribalorigin.com",
  "stock-central.tribalorigin.com",
]
```

**What gets created:**
- `cx23` server (2 Intel vCPU / 4 GB RAM) running Ubuntu 24.04
- Firewall allowing only SSH (22), HTTP (80), and HTTPS (443)
- Your SSH key attached to the server
- Docker & Docker Compose pre-installed via cloud-init
- `/opt/stock-central` directory ready for the app
- Cloudflare DNS A records pointing both subdomains to your server

### Destroy infrastructure (if needed)

```bash
cd deploy/terraform
terraform destroy
```

---

## 3. SSL Certificate Setup (Cloudflare Origin CA)

Since we're using Cloudflare proxy, we use a **Cloudflare Origin CA certificate** — free, trusted by Cloudflare, and valid for 15 years.

Terraform creates this automatically, scoped to only your two subdomains.

### 3a. Extract the Certificate and Key

After `terraform apply`, run:

```bash
cd deploy/terraform

# Create SSL directory
mkdir -p ../ssl

# Extract certificate (safe to view, not sensitive)
terraform output -raw stockcentral_origin_certificate > ../ssl/cloudflare-origin.pem

# Extract private key (sensitive — never commit to git)
terraform output -raw stockcentral_origin_private_key > ../ssl/cloudflare-origin.key

# Set permissions
chmod 600 ../ssl/cloudflare-origin.key
chmod 644 ../ssl/cloudflare-origin.pem
```

### 3b. Upload to Server

```bash
# SSH to your server
ssh root@YOUR_SERVER_IP

# Create SSL directory
mkdir -p /opt/stock-central/ssl

# From your local machine, copy the files
scp deploy/ssl/cloudflare-origin.pem deploy/ssl/cloudflare-origin.key root@YOUR_SERVER_IP:/opt/stock-central/ssl/

# SSH back in and set permissions
ssh root@YOUR_SERVER_IP
chmod 600 /opt/stock-central/ssl/cloudflare-origin.key
chmod 644 /opt/stock-central/ssl/cloudflare-origin.pem
```

### 3c. Set Cloudflare SSL/TLS Mode

Go to **SSL/TLS** → **Overview** and set the mode to **"Full (strict)"**.

This tells Cloudflare to connect to your origin via HTTPS and validate the Origin CA certificate.

---

## 4. GitHub Secrets Setup

Go to **Settings → Secrets and variables → Actions** in your GitHub repo and add:

| Secret | Value | How to get it |
|--------|-------|---------------|
| `HETZNER_HOST` | Your server's public IP | `terraform output server_ip` |
| `HETZNER_USER` | `root` | Hetzner Ubuntu images default to root |
| `HETZNER_SSH_KEY` | Your **private** SSH key | `cat ~/.ssh/id_ed25519` — paste the full thing |
| `ENV_FILE` | Production environment variables | See format below |
| `GH_TOKEN` | GitHub token | See below |

### ENV_FILE format

```bash
POSTGRES_USER=stockcentral
POSTGRES_PASSWORD=change_me_to_a_very_strong_password
POSTGRES_DB=stockcentral
CORS_ORIGIN=https://stocks.tribalorigin.com
```

If you're not using a domain yet, replace with `http://YOUR_SERVER_IP`.

### Creating the GH_TOKEN (Classic PAT)

The server needs to pull Docker images from GitHub Container Registry (GHCR). `GITHUB_TOKEN` only works inside GitHub Actions, not on external servers.

1. Go to **GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Generate new token (classic)
3. Scopes needed: **`read:packages`**
4. Save the token as `GH_TOKEN` in your repo secrets

> **Note:** If your repo is public, you can skip `GH_TOKEN` and make the packages public. Go to the package settings after the first push and change visibility to public.

> **Fine-grained tokens don't work with GHCR** — this is a known GitHub limitation. Use classic tokens.

---

## 5. First Deploy

Push to `main` or trigger manually:

```bash
git push origin main
```

GitHub Actions will:
1. Build the Go server Docker image (only if server code changed)
2. Build the React web app + nginx Docker image (only if web code changed)
3. Push both to GHCR
4. SSH into your Hetzner server
5. Pull the images and run `docker compose up -d`
6. Run a health check against `/health`

You can also trigger a manual deploy from **Actions → Build & Deploy → Run workflow**.

### Verify it's running

```bash
ssh root@YOUR_SERVER_IP
cd /opt/stock-central
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

Then open `https://stocks.tribalorigin.com` in your browser.

---

## 6. Costs

| Component | Specs | Monthly Cost |
|-----------|-------|--------------|
| Server (`cx23`) | 2 vCPU Intel, 4 GB RAM | **~€3.99** |
| Server (`cpx22`) | 2 vCPU AMD, 4 GB RAM | **~€7.99** |
| Backups (optional) | 20% of server cost | **~€0.80** |
| Bandwidth | 20 TB included | **Free** |
| GHCR (images) | Public repos = free | **Free** |
| Cloudflare Proxy | Free plan | **Free** |
| Cloudflare Origin CA | Free | **Free** |

**Total: ~€4-8/month** depending on server size.

---

## 7. Backup Strategy

### Option A: Hetzner Snapshots (easiest)

Enable in `deploy/terraform/terraform.tfvars`:
```hcl
enable_backups = true
```
Then run `terraform apply`. Hetzner takes automated daily snapshots. You pay ~20% extra on the server cost.

### Option B: Database dumps (cheapest)

Add a cron job on the server:

```bash
ssh root@YOUR_SERVER_IP
mkdir -p /backups

# Add to crontab
crontab -e
# Add this line for daily 3 AM backups:
0 3 * * * docker exec stock-central-postgres-1 pg_dumpall -U stockcentral > /backups/postgres_$(date +\%F).sql 2>/dev/null
```

### Option C: Both

Snapshots for disaster recovery + pg_dump for granular restore.

---

## FAQ

**Q: Can I provision Hetzner entirely without clicking the UI?**
A: Almost. You need to create the Hetzner project and API token in the UI once. After that, everything (server, firewall, SSH keys, DNS) is Terraform code.

**Q: What if I want to change the server location?**
A: Edit `deploy/terraform/terraform.tfvars` and set `location = "fsn1"` (Falkenstein), `"hel1"` (Helsinki), `"ash"` (Ashburn), or `"hil"` (Hillsboro). Run `terraform apply` locally.

**Q: How do I scale up if I get more traffic?**
A: Run `terraform apply -var="server_type=cx33"` (4 vCPU / 8 GB, ~€6.49) or `terraform apply -var="server_type=cpx32"` (~€13.99). Docker Compose will start the containers on the bigger box automatically. For real horizontal scaling, you'd need to move to managed Postgres and multiple app servers behind a load balancer — but that's way down the road.

**Q: Why isn't Terraform run in GitHub Actions?**
A: Terraform state needs to live somewhere persistent between runs (a "backend"). For a personal project, running `terraform apply` locally is simpler than setting up Terraform Cloud, S3, or committing state files to git. Infrastructure changes are rare — you might change your server size once a year. App deployments are frequent — they run automatically in GitHub Actions every time you push code.

**Q: Do I need `cloudflare_account_id`?**
A: No. The Cloudflare provider only needs `api_token` + `zone_id` to manage DNS records. Account ID is only for account-level resources like creating zones.

**Q: Does Cloudflare proxy cost money?**
A: No. The free plan includes proxy, DDoS protection, CDN caching, and free SSL. You only pay if you upgrade to Pro/Business for advanced features.
