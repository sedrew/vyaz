.PHONY: help install build test smoke pack-test lint check publish-core publish-renderer clean

PACKAGES := core renderer
DIST_TMP := /tmp/vyaz-pack-test

help:
	@echo "Available commands:"
	@echo "  make install         — Install dependencies (bun install)"
	@echo "  make build           — Build all packages"
	@echo "  make test            — Run unit tests"
	@echo "  make smoke           — Verify dist/ imports in Node"
	@echo "  make pack-test       — npm pack + clean install + import"
	@echo "  make browser-check   — Validate browser bundle exports"
	@echo "  make check           — Full pre-publish pipeline"
	@echo "  make publish-core PART=patch     — Publish @vyaz/core"
	@echo "  make publish-renderer PART=patch — Publish @vyaz/renderer"
	@echo "  make clean           — Remove dist/, node_modules, temp"
	@echo ""
	@echo "Examples:"
	@echo "  make check"
	@echo "  make publish-core PART=patch"

install:
	bun install --frozen-lockfile

build:
	bun run build

test:
	bun test

lint:
	@echo "No linter configured yet — skipping"

# ── Smoke test: verify built dist/ is valid Node.js ESM ──────────
smoke: build
	@for pkg in $(PACKAGES); do \
		echo "→ Smoke-testing @vyaz/$$pkg in Node.js"; \
		node --input-type=module -e " \
			import('./packages/$$pkg/dist/index.js') \
				.then(m => console.log('  ✅ @vyaz/$$pkg imported:', Object.keys(m).length, 'exports')) \
				.catch(err => { console.error('  ❌ @vyaz/$$pkg failed:', err.message); process.exit(1); }); \
		" || exit 1; \
	done

# ── Pack test: simulate what npm install actually delivers ──────
pack-test: build
	@rm -rf $(DIST_TMP)
	@mkdir -p $(DIST_TMP)
	@for pkg in $(PACKAGES); do \
		echo "→ Packing @vyaz/$$pkg"; \
		(cd packages/$$pkg && npm pack --pack-destination $(DIST_TMP) > /dev/null); \
	done
	@cd $(DIST_TMP) && npm init -y > /dev/null 2>&1
	@# Install in dependency order: core first, then renderer
	@cd $(DIST_TMP) && npm install ./vyaz-core-*.tgz > /dev/null 2>&1
	@cd $(DIST_TMP) && npm install ./vyaz-renderer-*.tgz > /dev/null 2>&1
	@echo "→ Testing imports from clean npm install..."
	@cd $(DIST_TMP) && node --input-type=module -e " \
		import('@vyaz/core').then(m => console.log('  ✅ @vyaz/core:', Object.keys(m).length, 'exports')); \
		import('@vyaz/renderer').then(m => console.log('  ✅ @vyaz/renderer:', Object.keys(m).length, 'exports')); \
	"
	@rm -rf $(DIST_TMP)
	@echo "✅ pack-test passed"

# ── Browser bundle export validation ─────────────────────────────
browser-check: build
	bun test packages/core/tests/build-browser.test.ts

# ── Full pre-publish pipeline ────────────────────────────────────
check: build test smoke pack-test browser-check
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  ✅ All checks passed — ready to publish"
	@echo "═══════════════════════════════════════════════"

# ── Publish ──────────────────────────────────────────────────────
publish-core: check
	@test -n "$(PART)" || (echo "ERROR: specify PART=patch|minor|major"; exit 1)
	cd packages/core && npm version $(PART) && npm publish --provenance --access public

publish-renderer: check
	@test -n "$(PART)" || (echo "ERROR: specify PART=patch|minor|major"; exit 1)
	cd packages/renderer && npm version $(PART) && npm publish --provenance --access public

clean:
	rm -rf packages/*/dist $(DIST_TMP) node_modules packages/*/node_modules