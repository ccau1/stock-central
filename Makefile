.PHONY: up down dev build-web build-server migrate-up migrate-create clean refresh-russell infra certs secrets

# Spin up the full local development stack (Docker Compose)
up:
	docker compose up --build -d

# Tear down the local development stack
down:
	docker compose down

# Start local development stack in foreground (legacy alias)
dev:
	docker compose up --build

# Build web for production
build-web:
	cd packages/web && npm run build

# Build server binary
build-server:
	cd packages/server && go build -o bin/server .

# Run DB migrations (requires running postgres container)
migrate-up:
	cd packages/server && go run . &
	@echo "Migrations run automatically on startup"

# Create a new migration (requires golang-migrate installed)
migrate-create:
	migrate create -ext sql -dir packages/server/internal/store/migrations -seq $(name)

# Refresh Russell index constituent JSON files from NASDAQ screener
refresh-russell:
	@test -d venv || python3 -m venv venv
	@venv/bin/pip install -q requests
	venv/bin/python scripts/refresh_russell.py

# Clean Docker volumes and containers
clean:
	docker compose down -v

infra:
	./deploy/scripts/apply.sh

certs:
	./deploy/scripts/push-certs.sh

secrets:
	./deploy/scripts/github-secrets.sh
