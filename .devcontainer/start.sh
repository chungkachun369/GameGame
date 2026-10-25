#!/usr/bin/env bash
set -euo pipefail
# Port collision is handled safely by tools/dev.py. Log stays outside the repo.
nohup python3 tools/dev.py > /tmp/river-chronicles-dev.log 2>&1 < /dev/null &
