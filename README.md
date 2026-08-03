# Scaffold Seeds

Scaffold Seeds is a local-first scaffold designer for primary teachers in England. It begins with one question: **Where are pupils getting stuck?** It helps a teacher identify the barrier, preserve the curriculum thinking, choose the smallest useful support and plan how that support will disappear.

This repository contains the Build 6 reduced release candidate. It preserves the Build 5 Gold Master engines, curriculum, verification, persistence and print systems while removing interface competition and repeated decisions.

## Release identity

- one four-decision teacher workflow: Need → Support → Shape → Use
- two permanent destinations: Home and Library; curriculum reference and preferences remain occasional utilities
- Print and AI appear only in the context of a completed scaffold rather than as competing starting points
- 78 local scaffold engines across 13 subject areas, EYFS to Year 6
- explicit curriculum-profile and year-progression routing, with honest England, locally determined RE and September 2026 RSHE/EYFS context labels
- a protected `coreTask` that remains visible while examples, vocabulary, prompts and adult cues reduce across Seed, Sprout, Growth and Independent
- evidence-based quality judgements that distinguish local checks from teacher review instead of claiming guaranteed effectiveness
- value-aware local diagrams, with schematic warnings whenever a relationship cannot be validated from supplied values
- Reflection Studio histories that record what worked, surprises, observed misconceptions, support removed and the next thing to fade, then surface relevant prior practice calmly

## Print Studio

Print Studio composes resources for their physical purpose rather than exporting web pages.

- 19 classroom formats, including A4/A5 workpages, desk strips, folded references, vocabulary cards, paired discussion cards, teacher guides, intervention packs, posters, mixed packs and a genuinely imposed two-sided four-page booklet
- seven semantic output styles: Full colour, Soft classroom colour, Pastel classroom colour, Greyscale, Pure black and white, High contrast and Ink saver
- locally hosted **Playwrite IT Moderna** throughout the interface and printed output, with a layout-safe sans-serif fallback
- format-aware paper/orientation presets, functional card counts, cut/crop controls only where meaningful, and derived duplex guidance
- preflight checks for format compatibility, diagram integrity, density and enlarged print, followed by measured overflow and footer-collision checks after fonts and images are ready
- no model-answer, photocopy or duplex controls that merely look functional

## AI Companion

External AI remains optional, provider-neutral and outside the application. Scaffold Seeds prepares a narrow prompt, preserves the local design, imports returned text as inert content, supports item-level review, verifies what it can locally and rebuilds the final resource itself.

- 56 focused Generate, Adapt, Critique, Verify and Enrich tasks
- Quick, Professional and Forensic prompt depths
- local pupil-information scrubber and cautious privacy language
- recoverable plain-text, markdown, list, table and JSON imports
- Accept, Edit, Reject, Keep original, manual mapping, comparison and visible trimming records
- structural, pedagogical, subject, language, inclusion, source and print verification
- deterministic mathematical checks where possible and transparent pattern-based warnings elsewhere
- human approval gate, provenance, source records, named rounds and pre-apply checkpoints
- no API keys, direct AI calls, backend, account, analytics or simulated generation

## Reliability and offline use

- schema-v5 IndexedDB persistence with transactional snapshots, checksums, revision conflicts, recovery checkpoints and multi-tab change signals
- localStorage retained only as a compatible emergency cache and Build 4 migration source
- full, selected and single-resource envelopes all pass through one validator and can round-trip
- import preview with Merge or Replace; replace is committed only after full validation and an automatic recovery checkpoint
- malformed records are quarantined individually instead of hiding the rest of a library
- recoverable deletion, exact version replacement and compact version snapshots that do not duplicate image data
- debounced library search and a 60-resource render window for large libraries
- installable static PWA shell and same-origin offline cache; no network dependency after the application shell is cached

## Accessibility and iPad

- named switches and exposed pressed/selected states
- modal focus trapping and focus restoration
- keyboard-operable tablists, visible focus, forced-colour support and retained status announcements on narrow screens
- coarse-pointer targets of at least 44 × 44 CSS pixels
- dynamic viewport and safe-area handling, responsive paper aspect ratios and hover effects limited to hover-capable pointers
- copy fallback, autosave before leaving for an external AI tool and resource-specific workspace recovery

## Architecture

- `data.js` — core curriculum, barriers and early scaffold knowledge
- `build3-data.js` — subject expansion, engine definitions and print formats
- `build4-data.js` — AI tasks, safeguards, return schemas and engine compatibility
- `build5-data.js` — release profiles, explicit curriculum routing, seven print modes and physical-format rules
- `resource-engine.js` — local composition, fading invariants, diagrams, print preflight and quality judgements
- `verification-engine.js` — deterministic and rule-based verification
- `ai-companion.js` — prompt construction, privacy scrubbing, safe import, comparison and provenance
- `persistence.js` — schema-v5 validation, IndexedDB transactions, conflicts, recovery and portability
- `app.js` — teacher workflow, Library, Reflection Studio, AI editorial desk and Print Studio
- `styles.css` — reduced Playwrite interface, semantic print palettes and responsive/accessibility rules
- `manifest.webmanifest` / `sw.js` — installable offline application shell

## Run locally

No build tool or runtime dependency is required. Serve the repository as static files:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Automated release gates

```sh
node tests/build4-engine.test.js
node tests/build5-persistence.test.js
node tests/build5-release.test.js
node tests/build5-static.test.js
node tests/build5-simulation.test.js
node tests/build6-reduction.test.js
```

The combined automated suite covers 106,444 assertions. Its core combinatorial gate generates 41,496 subject × year × engine × stage × format cases; the release simulation adds the complete 1,064-case print-rule matrix and a 5,000-resource library load. Build 6 adds explicit reduction gates for permanent navigation, the four-decision workflow, progressive disclosure and removal of superseded screens. See `tests/BUILD6_REDUCTION_PROTOCOL.md` for the reduction record and `tests/BUILD5_RELEASE_PROTOCOL.md` for the accessibility, iPad Safari and physical print sign-off that cannot be established by a static test runtime.

## Privacy

Scaffold Seeds has no account, backend, analytics or external AI connection. It does not send prompts, responses or pupil information anywhere. A prompt leaves only when a teacher copies or downloads it and then chooses to use another service. The local privacy scrubber is a review aid, not a guarantee; identifiable pupil information should never be placed into an external AI prompt.

The application is scoped to curriculum contexts for primary education in England. It does not imply that one curriculum model applies across all UK nations.
