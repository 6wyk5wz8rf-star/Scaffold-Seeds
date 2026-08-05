# Scaffold Seeds Build 7 · Release Certification

## Candidate and scope

Build 7 is the certification pass over the published Build 6 baseline (`6c53e362b2e81f39aaae1dd88e4055878dc98edb`). It does not add a new product or reopen the feature roadmap. It preserves the reduced four-decision workflow and tests whether the existing product is accurate, recoverable, accessible and fit to print.

This document separates what the repository can prove automatically from what still needs a physical runtime. A green automated suite is necessary, but it is not a substitute for Safari, VoiceOver, an iPad or a real printer.

## Certification decisions

| Audit | Automated decision | Physical promotion gate |
| --- | --- | --- |
| Product architecture | Pass: two permanent destinations and four teacher decisions remain protected by the Build 6 reduction gate. | Five-second first-use observation with a teacher unfamiliar with the product. |
| Functional behaviour | Pass: engines, AI review, persistence, import, recovery, library load and end-to-end state transitions are exercised. | Safari refresh/interruption, multiple physical tabs and native print dialog. |
| Visual communication | Pass: production-default pupil HTML, protected-decision routing, example ownership and deterministic diagrams have adversarial gates. | Child/teacher comprehension sample and 100% zoom inspection. |
| Print and export | Pass with physical condition: all format rules, seven semantic modes, purpose-built composition and measured horizontal/vertical overflow are checked. | A4/A5 colour and monochrome print, duplex booklet fold, cut resources and PDF preview. |
| User experience | Pass with physical condition: draft continuation, focus restoration, modal trapping, navigation isolation and responsive source gates are present. | iPad portrait/landscape, Split View, hardware keyboard and Apple Pencil selection. |
| Cognitive load | Pass: no top-level destination or creation step was reintroduced; teacher-only prompts are removed from pupil output. | Timed lesson-morning walkthrough without coaching. |
| Curriculum intelligence | Pass for the bundled England contexts: explicit title routing, selected-year metadata and Science year corrections have dedicated tests. | School curriculum lead review of local sequence, RE syllabus and any teacher-edited objective. |
| Design language | Pass with physical condition: local typography, semantic tokens, neutral print palettes, disabled/focus states and accessibility modes are source-gated. | Forced-colour/VoiceOver review and printer-specific contrast inspection. |

## Release blockers found and repaired

- Teacher assessment questions were routed into pupil prompts by production defaults. Pupil and teacher channels are now separate.
- The protected decision could fall back to a final support cue and was repeated across pupil pages. It now has a stable pupil-facing fallback and appears once at every stage.
- Sprout could present a complete model as a partial example. A partial model is shown only when one actually exists.
- Declared diagram values were sometimes replaced, dropped or merely claimed as checked. Array, fraction, bar, part–whole, number-line and place-value output is now tied to its supplied data; unsupported capacity is rejected.
- Multi-year curriculum buckets could overclaim exact-year alignment. Exact-year `Strong` status now requires objective-level or single-year evidence.
- Science topics and several subject profiles were routed to incorrect year/disciplinary contexts. Bundled titles now use explicit routes; unknown imports are flagged for review.
- Pure black-and-white and Ink Saver could erase fraction shading, while hard-coded colours defeated neutral print modes. Structural shading and mode-specific print tokens now preserve meaning.
- Print preflight checked only vertical overflow. It now checks width, descendant bounds and long unbroken content before recording a print.
- AI verification was reusable after accepted content, scaffold or source records changed. Approval is now bound to a canonical checksum and dated local verification result.
- Older approval records could retain an approved label without the current dated fingerprint and human sign-off structure. They now reopen as review required instead of inheriting stale trust.
- Clear-all, browser-cache reconciliation and Recently Deleted had recoverability gaps. Destructive operations now use exact committed snapshots, an atomic durable trash store, full-state recovery and generation-aware multi-tab conflict checks.
- Backup Merge could replace an unfinished draft and preferences, while destructive Replace could run without durable recovery. Merge now preserves the current working context; Replace fails closed when its checkpoint cannot persist.
- Version history implied that local image bytes rolled back even though they were not stored per checkpoint. It is now explicitly a text/layout history and preserves current local images unchanged.
- Saved drafts, stage comparison, disclosure state and keyboard focus could become dead ends after navigation or rerender. Continuation and focus/state restoration are now explicit.

## Automated gates

Run from the repository root:

```sh
node tests/build4-engine.test.js
node tests/build5-persistence.test.js
node tests/build5-release.test.js
node tests/build5-static.test.js
node tests/build5-simulation.test.js
node tests/build6-reduction.test.js
node tests/curriculum-data-correctness.test.js
node tests/build7-reliability.test.js
node tests/build7-certification.test.js
```

The Build 7 gates intentionally use hostile cases that were absent from the earlier combinatorial suite: stale verification reuse, empty numeric lists, exact-year negative curriculum probes, six-node truncation, 24-part fractions, 12 × 12 arrays, zero labels, production-default teacher leakage, complete-example leakage at Sprout, protected-decision duplication, specialist Independent-format expansion and horizontal print clipping.

Together, the nine automated gates pass **110,173 assertions**, including 41,496 generated subject × year × engine × stage × format cases, the 1,064-case print-rule matrix and the 5,000-resource library load.

The large-library gate proves correctness and bounded rendering. It does not certify physical-browser responsiveness: full-snapshot commits measured roughly 0.8–1.2 seconds in the Node memory adapter. Safari/iPad save latency under a representative school library therefore remains a named promotion condition rather than an automated performance claim.

## Required physical sign-off

Record device, OS/browser version, printer/PDF driver, tester and date for each result.

### Safari and iPad

- [ ] Safari on current macOS: first run, reload, offline relaunch and local save recovery.
- [ ] Representative large library: search, edit and repeated save remain comfortable; record observed save latency and any main-thread pause.
- [ ] iPad Safari portrait and landscape: all four creation decisions, Library, AI review and Print Studio.
- [ ] iPad Split View at approximately half width: no horizontal app scroll, hidden sidebar is not focusable, status remains visible.
- [ ] Touch targets and selection with finger and Apple Pencil; no hover-only instruction.
- [ ] Hardware keyboard: logical tab order, visible focus, modal loop, Escape close and focus return.
- [ ] VoiceOver: landmarks, headings, labels, selected/pressed state, save announcements and modal isolation.
- [ ] Larger interface text and forced colours: interface changes without altering pupil-page composition.

### Print and PDF

- [ ] A4 portrait and landscape in Full colour, Greyscale, Pure black and white and Ink Saver.
- [ ] A5 at 100% scale with no browser “fit to page” dependency.
- [ ] Fraction, bar, part–whole, array, number-line and place-value meaning survives monochrome output.
- [ ] Desk strips, vocabulary/cut cards and foldables align with visible cut guides; guides disappear when disabled.
- [ ] Mini-booklet prints double-sided, short-edge, folds into page order 1–4 and keeps safe margins.
- [ ] Poster single-sheet and 2 × 2 tiling align without clipped text.
- [ ] Large pupil text reflows rather than scales or clips.
- [ ] PDF export preserves local Playwrite typography or the declared layout-safe fallback.

## Promotion rule

Build 7 may be called the local release candidate when every automated gate is green. It may be called physically certified only after the Safari, iPad, VoiceOver and printer checklist above has named evidence. A failure in any physical gate reopens the relevant audit; it must not be waived by the automated assertion count.
