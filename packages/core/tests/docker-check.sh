#!/usr/bin/env bash
#
# Docker test for vyaz --check
#
# Tests two scenarios:
#   1. Without fontconfig — should fail on measureText
#   2. With fontconfig    — should pass all checks
#
# Usage:
#   bash packages/core/tests/docker-check.sh
#
# Requires: docker, bun (for building the CLI module)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Step 1: Build the CLI module ==="
cd "$PKG_DIR"
bun build ./src/cli/check.ts --outdir ./dist/cli --target bun \
  --external @napi-rs/canvas --external fontkit \
  --external @chenglou/pretext --external get-system-fonts 2>&1

echo ""
echo "=== Step 2: Build Docker test image ==="

cat > /tmp/Dockerfile.vyaz-check << 'DOCKERFILE'
FROM node:22-slim

# Copy the package source (dist + bin + package.json)
COPY packages/core /vyaz-core
WORKDIR /vyaz-core

# Install dependencies (including optional @napi-rs/canvas etc.)
RUN npm install 2>&1

# Test 1: without fontconfig — should fail on measureText
RUN echo "=== Test 1: Without fontconfig ===" && \
    node bin/vyaz.js --check; \
    EXIT_CODE=$?; \
    echo ""; \
    if [ $EXIT_CODE -ne 0 ]; then \
        echo "✅ Correctly detected missing fontconfig (exit $EXIT_CODE)"; \
    else \
        echo "❌ Should have failed without fontconfig"; \
        exit 1; \
    fi

# Install fontconfig
RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends fontconfig 2>&1 && \
    fc-cache -f 2>&1 && \
    rm -rf /var/lib/apt/lists/*

# Test 2: with fontconfig — should pass all
RUN echo "=== Test 2: With fontconfig ===" && \
    node bin/vyaz.js --check; \
    EXIT_CODE=$?; \
    echo ""; \
    if [ $EXIT_CODE -eq 0 ]; then \
        echo "✅ All checks passed with fontconfig"; \
    else \
        echo "❌ Should have passed with fontconfig"; \
        exit 1; \
    fi

CMD ["echo", "All tests passed"]
DOCKERFILE

REPO_ROOT="$(cd "$PKG_DIR/../.." && pwd)"
docker build \
  -f /tmp/Dockerfile.vyaz-check \
  -t vyaz-check-test \
  "$REPO_ROOT"

echo ""
echo "=== Step 3: Run Docker tests ==="
docker run --rm vyaz-check-test

echo ""
echo "=== Step 4: Cleanup ==="
docker rmi vyaz-check-test 2>/dev/null || true
rm -f /tmp/Dockerfile.vyaz-check

echo ""
echo "✅ Docker check complete"