SHELL := /bin/bash

cnf ?= .env
include $(cnf)
export $(shell sed 's/=.*//' $(cnf))

.PHONY: help setup install-docker install-docker-if-not-already-installed \
        up down build-all-docker-images build logs set-up-db migrate seed reset-db shell ps \
        wipe-all wipe-volumes wipe-images psql pull push

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-38s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# --- FIRST-TIME SETUP -------------------------------------------------------------

setup: install-docker-if-not-already-installed down build-all-docker-images set-up-db up ## First-time setup: install Docker, build images, setup DB, start all services
	@echo ""
	@echo "Setup complete."
	@echo "  API        → http://localhost:MAPPED_PORT"
	@echo "  Swagger    → http://localhost:MAPPED_PORT/api-docs"
	@echo "  pgAdmin    → http://localhost:5050  (admin@admin.com / admin)"

install-docker: ## Install Docker and Docker Compose (Ubuntu only)
	@echo "Installing Docker..."
	@sudo apt-get update
	@sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
	@curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
	@sudo add-apt-repository \
		"deb [arch=amd64] https://download.docker.com/linux/ubuntu $$(lsb_release -cs) stable"
	@sudo apt-get update
	@sudo apt-get install -y --no-install-recommends docker-ce
	@sudo usermod --append --groups docker "$$USER"
	@sudo systemctl enable docker
	@echo "Waiting for Docker to start..."
	@sleep 3
	@sudo curl -L \
		"https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$$(uname -s)-$$(uname -m)" \
		-o /usr/local/bin/docker-compose
	@sudo chmod +x /usr/local/bin/docker-compose
	@sleep 5
	@echo "Docker installed successfully."

install-docker-if-not-already-installed: ## Install Docker only if not present
	@if [ -z "$$(which docker)" ]; then \
		make install-docker; \
	else \
		echo "Docker already installed: $$(docker --version)"; \
	fi

# ----- DOCKER -----------------------------------------------------------------

build-all-docker-images: ## Build all Docker images
	@echo "Building Docker images. Grab a coffee and wait."
	@docker-compose build --force-rm
	@echo "Docker images built."

build: build-all-docker-images ## Alias for build-all-docker-images

up: ## Start all services in the background (no rebuild)
	@docker-compose up -dV

down: ## Stop and remove containers
	@docker-compose down
	@docker-compose kill 2>/dev/null || true
	@docker-compose rm -vfs 2>/dev/null || true

logs: ## Tail app logs
	@docker-compose logs -f ease-commerce-backend

ps: ## Show running containers
	@docker-compose ps

shell: ## Open a shell inside the app container
	@docker-compose exec ease-commerce-backend sh

# --- DATABASE -----------------------------------------------------------------

set-up-db: ## Run migrations and seed data using a one-off container
	@echo "Running database setup..."
	@docker-compose run --rm ease-commerce-backend npm run db:migrate && exit 0
	@docker-compose run --rm ease-commerce-backend npm run db:seed && exit 0
	@echo "Database setup complete."

migrate: ## Run pending DB migrations (requires running containers)
	@docker-compose exec ease-commerce-backend npx sequelize-cli db:migrate

seed: ## Load seed data (requires running containers)
	@docker-compose exec ease-commerce-backend npx sequelize-cli db:seed:all

reset-db: ## Undo all migrations then re-run them — data loss!
	@docker-compose exec ease-commerce-backend npx sequelize-cli db:migrate:undo:all
	@docker-compose exec ease-commerce-backend npx sequelize-cli db:migrate

psql: ## Open a psql console connected to the database
	@docker-compose exec database psql -U $${DB_USER:-postgres} -d $${DB_NAME:-easecommerce}

# --- CLEANUP ------------------------------------------------------------------

wipe-all: down wipe-volumes wipe-images ## Remove containers, volumes and dangling images

wipe-volumes: ## Delete local volume data
	@sudo rm -rf docker_volumes_data
	@if [[ -n "$$(docker volume ls -qf dangling=true)" ]]; then \
		docker volume rm -f $$(docker volume ls -qf dangling=true); \
	fi

wipe-images: ## Remove dangling Docker images
	@if [[ -n "$$(docker images --filter 'dangling=true' -q --no-trunc)" ]]; then \
		docker rmi -f $$(docker images --filter 'dangling=true' -q --no-trunc); \
	fi

clean: wipe-all ## Alias for wipe-all

# --- GIT -----------------------------------------------------------------------

pull: ## Pull and rebase current branch
	@git pull origin $$(git branch --show-current) --rebase

push: ## Push current branch
	@git push origin $$(git branch --show-current) --force-with-lease

%:
	@:
