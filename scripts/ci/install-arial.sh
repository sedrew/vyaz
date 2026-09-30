#!/usr/bin/env bash
#
# Install the real Arial on a Debian/Ubuntu CI runner.
#
# Part of the suite is calibrated against Arial's own tables (its classic
# `kern` table, PowerPoint's advances) and `DEFAULT_TEXT_STYLE.fontFamily` is
# 'Arial', so the tests need the real font. It cannot live in the repo (Monotype
# licence, public repo); `ttf-mscorefonts-installer` is the packaged route —
# the runner user accepts the EULA, nothing is redistributed from here.
#
# The postinst downloads from SourceForge, which is occasionally flaky, so retry.
# Tests then run with VYAZ_REQUIRE_ARIAL=1 (packages/core/tests/helpers.ts): if
# the install still failed the job fails loudly rather than skipping the
# Arial-dependent suites silently.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
sudo add-apt-repository -y multiverse >/dev/null
sudo apt-get update -qq
echo 'ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true' | sudo debconf-set-selections

for attempt in 1 2 3; do
  if sudo apt-get install -y -qq ttf-mscorefonts-installer && ls /usr/share/fonts/truetype/msttcorefonts/ | grep -qi '^arial\.ttf$'; then
    fc-cache -f >/dev/null 2>&1 || true
    echo "Arial installed (attempt $attempt)"
    exit 0
  fi
  echo "Arial install failed (attempt $attempt), retrying…"
  sudo apt-get install -y -qq --reinstall ttf-mscorefonts-installer || true
  sleep $((attempt * 5))
done
echo "::error::could not install Arial (ttf-mscorefonts-installer)"
exit 1
