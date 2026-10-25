# Codespaces packaging validation

The existing v6 source is retained as editable JavaScript/HTML/CSS and JSON, with vendored Three.js and seven textbook image crops.

Added: Python + Node devcontainer, private forwarded port 8000, automatic development server, source-change rebuild watcher, atomic HTML writes, deterministic npm lockfile, portable browser executable selection, artwork re-embedding tool and manual build/model check commands. GitHub Actions is not enabled because the granted public-repository authorization does not include workflow permission.

Local packaging checks:
- `npm ci --ignore-scripts`: success, zero vulnerabilities reported in the dependency audit at setup time.
- `npm test`: build, six module syntax checks and 99 model/data assertions passed.
- `CHROMIUM_PATH=/usr/local/bin/chromium node tests/gods-release.test.cjs`: 6 assertions passed with the repository's pinned Playwright.
- Development HTTP server: 4 checks passed (serves game, blocks dotfiles/repository internals, rebuilds changed source, restores matching HTML).

The previous 448-assertion game report is preserved separately as GODS-V6-TEST-REPORT.md. Full browser suites were not all rerun merely for the Codespaces packaging; the game implementation is unchanged. The actual GitHub Codespace container has not been provisioned or visually tested in this agent workspace. First launch downloads its base image/features; use the README recovery commands if preview startup is delayed.

GitHub Codespaces usage/allowances, account access and port policies are controlled by GitHub. The setup does not publish a GitHub Pages site or promise permanently hosted gameplay. Preview ports should remain private. Saved game progress remains in browser local storage, not Git commits.
