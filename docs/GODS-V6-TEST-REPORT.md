# River Chronicles — Gods of the Nile / v6

## Outcome
Playable update of the existing English two-mode game. Seven visible 3D deities, encounter quizzes, real-time dodging/projectile combat, textbook collection portraits, wearable rewards, simple salute variants and shared-mode decorative statues are implemented. This is a feature prototype, not completion of the broader farming redesign.

## Automated results

| Suite | Passed | Coverage |
| --- | ---: | --- |
| model.test.cjs | 99 | Existing economy, buildings, irrigation, rewards, validated saves and legacy migration; adjusted loader to include gods-data.js and expected v6 |
| curriculum.test.cjs | 213 | All 40 commissions, 53 existing multiple-choice questions, 12 term blanks and saved notes |
| playable.test.cjs | 36 | Existing desktop/touch movement, teaching, farming practical, builder, import-related flow, local reload and layout |
| visual.test.cjs | 4 | Existing mobile builder control spacing, 44px targets and runtime check |
| gods.test.cjs | 74 | Seven encounter quizzes including wrong answers; seven victories through actual UI-fired collision projectiles; collection, equipment, statue, salute, damage, pause, saves and touch input |
| gods-final.test.cjs | 14 | Post-fix held-F firing, seven warning patterns, terminal-result close handling, quitting without reward, round-trip state and responsive rendering |
| gods-camera.test.cjs | 2 | Final mobile camera contains 32 positions around the playable radius; seven rendered model captures and no runtime exceptions |
| gods-release.test.cjs | 6 | Final title, startup migration from v5, original storage preserved, seven Egypt map entries and no phantom Egyptian god entries in China |
| Total | 448 | Distinct assertions, not 448 human play sessions |

All listed final suite results pass. Individual JSON results and logs are in `qa/`. Six updated JavaScript modules also pass `node --check`; `python build.py` produces the self-contained HTML.

## Method and limits of these numbers

- Chromium with software WebGL (SwiftShader), desktop 1440×900, embed-sized 900×600 and touch-emulated 390×844. This is not physical-phone testing or a 30/60 FPS certification.
- The comprehensive god flow uses the real quiz and combat buttons. Actors are placed near each god via the project's test interface to isolate interactions. It is not a claim of manually walking every route. Battles win through actual projectile travel and collision, without forcing enemy shield or player health.
- The final boundary suite deliberately seeds passed quiz records and forces terminal hp/shield states to test close/recovery behavior. These forced transitions are NOT counted as evidence of legitimately winning battles; that evidence is in gods.test.cjs.
- Mobile combat tests seed a passed quiz to isolate actual touch movement, attack and dodge. The same quiz paths are separately exercised for all seven deities.
- Tests ran across development revisions; final boundary, camera and release suites verify later fixes. The full curriculum/playable suites were run before final presentational and map-filter cleanup; no further curriculum/economy changes were made afterward. Model tests were rerun on the final release.
- Two harness corrections are preserved in logs: warning threshold changed from an accidental 1.2 seconds to the specification's at-least-approximately-1-second requirement; v5 test data moved to startup injection so the previous page's save-on-blur cannot overwrite the test setup. These are not hidden game failures.

## Visual inspection

Viewed the actual rendered title, world/encounter, battle warning, victory, desktop collection/card, mobile card/collection and combat states. Inspected the seven textbook crops and deity renderings. The mobile camera initially clipped the arena; camera fitting was corrected and its fog removed so distant mobile actors remain bright. Dangerous areas originally blended into the floor; darker fills and outlines now distinguish them. Checked control spacing and scrollability; long collection/card content intentionally scrolls inside the dialog.

## Fixed edge cases

- Closing a finished duel result now returns safely instead of leaving an inert arena.
- Pause, background tab and loss of focus stop battle simulation; no catch-up damage.
- Repeated victories do not duplicate fixed unlocks; reward state is settled before the celebration panel.
- Original village player position/resources are separate from temporary arena actors.
- New schema/key keeps original two-mode/v4 saves intact. Final release startup migration tested separately.
- Deity map filtering covers all seven gods, not only the previous Ra/Osiris pair.
- Mobile field of view fits the playable arena; original controls remain at least 44px.

## Assets and historical framing

Seven card portraits are direct crops of the supplied textbook photograph. No online substitute or generated portrait was needed. Original printed texture and some already-truncated edges remain. 3D models are simplified original interpretations, not identical textbook reconstructions. Magical attacks, rewards and arenas are explicitly fiction. ASSET-SOURCES.md records provenance and redistribution limits.

## Known limitations / not delivered

- Not the full new-world farming/logistics/shared-village redesign from the development spec. The existing two-mode agriculture/economy remains.
- Simplified geometric deity/costume models, reused arena and simple salute variations. No cinematic seven-boss animation set, voice acting or complex weapon/combo system.
- Three-question encounters include repeated evidence-versus-fantasy questions. No claim of 21 entirely distinct historical questions.
- Combat balance, target fight duration and sustained replay appeal have not been validated with students or new human players. No learning-effectiveness claim.
- No cloud accounts, multiplayer, anti-cheat, backend or public hosting deployment. Progress is local; export saves before changing devices or embeddings.
- If Notion's embed blocks WebGL or local storage, download the HTML and open it in a supporting browser; storage restrictions must be disclosed to the player.

## Reproduction

See README.md for exact build/test commands. Chromium path in browser tests is environment-specific and may need adjustment. RELEASE-MANIFEST.json records the released HTML and source hashes. The previous release's HTML/source files in Notion were not overwritten.
