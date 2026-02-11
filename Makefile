SHELL := /bin/bash
COMPOSE ?= docker compose
SERVICE ?= profile-service

.PHONY: up down ps logs wait typecheck build test test-unit e2e \
	db-reset migrate seed secret-scan check gold

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down --remove-orphans

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f $(SERVICE)

wait:
	@set -euo pipefail; \
	cid="$$( $(COMPOSE) ps -q $(SERVICE) )"; \
	if [ -z "$$cid" ]; then echo "service container not found"; exit 1; fi; \
	for i in $$(seq 1 120); do \
	  status="$$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $$cid)"; \
	  if [ "$$status" = "healthy" ]; then echo "service is healthy"; exit 0; fi; \
	  sleep 1; \
	done; \
	echo "timeout waiting for healthy service"; exit 1

typecheck:
	npm run typecheck

build:
	npm run build

test:
	npm run test

test-unit:
	npm run test:unit

e2e:
	npm run test:e2e

db-reset:
	NODE_ENV=development ALLOW_ENV_FALLBACK=true npm run db:reset

migrate:
	npm run db:migrate

seed:
	npm run db:seed

secret-scan:
	@echo "Running lightweight secret scan..."
	@! rg -n --hidden --glob '!node_modules' --glob '!dist' --glob '!.git' --glob '!Makefile' \
	  --glob '!src/tests/**' --glob '!.env.example' --glob '!.env.local' \
	  "(BEGIN PRIVATE KEY|-----BEGIN [A-Z ]*PRIVATE KEY-----|postgres(?:ql)?://[^\s]+:[^\s]+@|redis://[^\s]+:[^\s]+@|JWT_SECRET\s*=\s*[^\s#]+|DB_PASSWORD\s*=\s*[^\s#]+)" .

check: typecheck test-unit secret-scan

gold:
	@set -euo pipefail; \
	$(MAKE) check; \
	$(MAKE) up; \
	trap '$(MAKE) down >/dev/null 2>&1 || true' EXIT; \
	$(MAKE) wait; \
	$(MAKE) migrate; \
	$(MAKE) e2e
