# River Chronicles · Gods of the Nile

An editable English 3D educational browser game. Two modes: **Guided Journey** and **City Builder**. This repository includes the actual source, seven deity encounters, action duels, textbook collection-card crops, wearable rewards and the existing curriculum.

> **Prototype scope:** this is the Gods v6 feature update. The larger farming/logistics redesign in the Notion specification is not yet implemented. Models and animations are simplified. See [the implementation/test report](docs/GODS-V6-TEST-REPORT.md).

## Run in GitHub Codespaces

1. Switch to the `river-chronicles-codespaces` branch (or the branch into which this update is merged).
2. Select **Code → Codespaces → Create codespace**.
3. Wait for container setup. It installs Node development dependencies and builds the HTML.
4. The game preview starts automatically on **port 8000**. In the **Ports** panel, choose **Open in Browser** if the preview did not open.
5. Choose **Guided Journey → Gods → a card → Walk to…**, then meet the deity, answer the quiz and enter the duel.

Keep the forwarded port **Private** unless you intentionally want to publish the game. Codespaces usage may consume your GitHub allowance; this configuration is not a promise of free hosting. Codespaces is a development environment, not a permanent game deployment.

If the server did not start, use the integrated terminal:

```sh
npm run dev
```

If port 8000 is already running, use that existing preview rather than starting a second server. Logs for automatic startup are at `/tmp/river-chronicles-dev.log`. You can select another port with `PORT=8001 npm run dev` and forward it in the Ports panel.

## Edit the game

Open a source file, edit and save. The development server watches the source files and rebuilds `index.html` automatically. **Refresh the game preview** to load changes. This is rebuild-on-save, not live state-preserving hot reload; export your save before major changes.

| File | What to edit |
| --- | --- |
| `gods.js` | Encounter UI, quiz flow, action combat and collection interface |
| `gods-data.js` | God descriptions, questions, rewards and collection validation |
| `god-models.js` | Editable deity meshes, wearable outfits and statues |
| `scene.js` | Village scene, farmer, camera, world movement and sites |
| `game.js` | Existing teaching, journal, map, City Builder and input integration |
| `model.js` | Resource economy, save validation, migration and building rules |
| `style.css`, `body.html` | Interface layout, styles and initial page structure |
| `curriculum.js`, `*-bank.json` | Existing four-civilisation lessons and questions |
| `assets/gods/*.jpg` | Seven textbook portrait crops |
| `god-art.js` | Embedded portrait data used by the offline build |
| `build.py` | Builds the standalone offline `index.html` |
| `tools/dev.py` | HTTP preview server and source watcher |

**Do not edit `index.html` directly** for permanent changes: it is generated and overwritten by the next build.

To replace a card portrait, update its JPEG in `assets/gods/`, run `npm run build:art`, then refresh. That regenerates `god-art.js` from the JPEGs and rebuilds the HTML. Keep attribution/usage-rights records up to date.

## Commands

```sh
npm ci                    # Install pinned development dependencies
npm run dev               # Build, serve on 8000 and watch sources
npm run build             # Rebuild standalone HTML
npm run build:art          # Re-embed JPEG card images and rebuild
npm test                  # Build + JS syntax + model/data tests
npm run setup:browser     # One-time Chromium + Linux dependency installation
npm run test:browser      # Full browser suites (can take several minutes)
```

Python 3.12 and Node 22 are supplied by the devcontainer. Outside Codespaces, install Python 3 and Node 20+; building/playing does not require a backend. Browser tests use Playwright's Chromium, or `CHROMIUM_PATH=/path/to/chromium` if you need a custom executable. `qa/` is generated and gitignored.

Run the checks manually in the Codespaces terminal using the commands above. No GitHub Actions workflow is enabled: the upload uses public-repository authorization without the extra workflow permission.

## Play and export

- WASD / arrows: move.
- E: interact in the village.
- F / Attack: fire practice bolts in a duel; hold F for continuous fire.
- Space / Dodge: dodge in the recent movement direction.
- Esc: pause; return to the river without losing village resources.
- Touch: movement pad, Attack and Dodge.

Use **Menu → Export save** to back up progress. Saves are local to the browser and preview origin, not saved into GitHub. Opening a different Codespace/port or clearing browser storage may start a separate save. The v6 game uses its own local key and can import existing v4/v5 records under the documented migration rules.

`index.html` is a self-contained offline distribution: engine, curriculum and card art are embedded. Download/open it in a WebGL 2 browser if you want a standalone playable copy. No runtime CDN is required.

## Development workflow

Changes made inside Codespaces are not automatically published to GitHub. Use VS Code **Source Control** to review, commit and sync/push. Develop on a branch and open a pull request when ready. Only commit intentional source/asset changes, not saves or credentials.

## Artwork, licences and history

See [ASSET-SOURCES.md](ASSET-SOURCES.md). The seven card images are cropped from the user's supplied textbook photograph; they are **not** original illustrations or known public-domain assets. Before public redistribution, confirm rights or replace them with suitably licensed images. Original 3D models are stylised interpretations. Magical duels are game fiction, not proven historical events. Three.js has its own [MIT licence](vendor/THREE-LICENSE.txt). No blanket licence is asserted over textbook or supplied curriculum content.

The repository's original one-line README is preserved in `docs/REPOSITORY-README-original.md`.
