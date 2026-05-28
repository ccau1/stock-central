# Stock Central

A stock-analysis dashboard app with a **Vite + React** frontend and a **Go** backend. Dashboards contain draggable, resizable panels; each panel has a configurable **type** and typed inputs. Dashboards are serialised to/from YAML and persisted in PostgreSQL.

## Architecture

```
packages/
  web/              Vite + React + TypeScript
  server/           Go 1.22+ HTTP API
deploy/             DigitalOcean droplet deployment files
docker-compose.yml  Local development stack
```

## Quick Start (Local)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for web dev outside Docker)
- Go 1.22+ (for server dev outside Docker)

### Option 1: Docker Compose (recommended)

```bash
# Copy env and start everything
cp .env.example .env
docker compose up --build
```

Then open http://localhost

### Option 2: Run locally

**Database:**
```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=stockcentral \
  postgres:16-alpine
```

**Server:**
```bash
cd packages/server
cp ../../.env.example .env  # or set env vars
go run .
```

**Web:**
```bash
cd packages/web
npm install
npm run dev
```

Then open http://localhost:5000

## Panel Types

The frontend has an extensible panel type registry. Out of the box:

| Type | Inputs |
|------|--------|
| `line-chart` | `symbol`, `timeRange` |
| `metric-card` | `symbol`, `metric` |
| `news-feed` | `symbol`, `maxItems` |
| `placeholder` | `text` |

Adding a new panel type requires **zero server changes** — just add a new file in `packages/web/src/panel-registry/`.

## Dashboard YAML Format

Dashboards are stored as YAML:

```yaml
id: "dash_abc123"
name: "Tech Watch"
created_at: "2026-05-26T10:00:00Z"
updated_at: "2026-05-26T10:00:00Z"
panels:
  - id: "p1"
    type: "line-chart"
    title: "AAPL Price"
    layout:
      x: 0
      y: 0
      w: 6
      h: 4
    inputs:
      symbol: "AAPL"
      timeRange: "1y"
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboards` | List dashboards |
| POST | `/api/v1/dashboards` | Create dashboard |
| GET | `/api/v1/dashboards/{id}` | Get dashboard YAML |
| PUT | `/api/v1/dashboards/{id}` | Update dashboard |
| DELETE | `/api/v1/dashboards/{id}` | Delete dashboard |
| POST | `/api/v1/dashboards/{id}/clone` | Clone dashboard |

## Deploy to DigitalOcean

1. Create a Droplet (Ubuntu 24.04, 2GB RAM+)
2. Clone this repo to `/opt/stock-central`
3. Run the setup script:

```bash
cd /opt/stock-central
./deploy/setup-droplet.sh
```

4. Edit `deploy/.env` with your strong Postgres password and droplet IP/domain
5. Re-run the script to start services

## Makefile Commands

```bash
make dev          # docker compose up --build
make build-web    # npm run build
make build-server # go build
make clean        # docker compose down -v
```
