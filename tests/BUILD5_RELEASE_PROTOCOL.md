# Scaffold Seeds Build 5 release protocol

Use this protocol for the final hosted candidate. Record browser/device, operating system, date, tester, printer and any follow-up. Automated checks are necessary but do not replace physical iPad, Safari, screen-reader or printer sign-off.

## 1. Automated gates

Run from the repository root:

```sh
node --check build5-data.js
node --check resource-engine.js
node --check verification-engine.js
node --check ai-companion.js
node --check persistence.js
node --check app.js
node --check sw.js
node tests/build4-engine.test.js
node tests/build5-persistence.test.js
node tests/build5-release.test.js
node tests/build5-static.test.js
node tests/build5-simulation.test.js
```

Expected release result:

- Build 4 regression: 390 assertions
- persistence: 48 assertions plus the recorded 17-check IndexedDB adapter smoke test
- Build 5 release gate: 97,204 assertions and 41,496 generated sweep cases
- static and offline integrity: 76 assertions across 17 cached routes
- end-to-end release simulation: 8,684 assertions, the full 1,064-case print-rule matrix and a 5,000-resource load
- combined automated total: 106,402 assertions
- no missing curriculum profile, invalid engine subject/family, removed core task, overclaimed diagram status, unknown print mode, raw hostile markup, `undefined`, `NaN` or generated-render crash

## 2. New-resource journey

Create one brand-new scaffold without AI:

1. Select year, subject and curriculum area; choose a suggested objective, then edit it in the same field.
2. Record a precise observed barrier that begins with what pupils can already do.
3. Confirm only one primary barrier is suggested and confidence language is proportionate.
4. State the subject decision pupils must retain.
5. Review three recommendations and their risks; choose one.
6. Edit the protected core task, support prompts, vocabulary and any diagram values.
7. Move through Seed, Sprout, Growth and Independent. Confirm the core decision remains and support reduces monotonically.
8. Run the quality audit. Resolve every error and inspect every teacher-review status.
9. Save, refresh and reopen from Library.
10. Add a named version, change the resource, restore the version and confirm the restored state is exact while the replaced state becomes another checkpoint.

Target: identify barrier → generate → adjust → preview → save within minutes, without a duplicate objective decision or unnecessary confirmation dialog.

## 3. Pedagogical and curriculum sampling

For every subject, sample EYFS/KS1/lower-KS2/upper-KS2 as applicable:

- verify the progression note and curriculum-source label are honest
- verify the disciplinary action is genuinely subject-specific
- confirm the scaffold reduces the named access barrier rather than the learning objective
- cover each support in planned order and identify evidence that it can disappear
- test a likely misconception with a diagnostic example rather than supplying the answer
- confirm pupil vocabulary is small and useful; richer guidance stays teacher-facing
- check that English composition does not become formulaic, maths representations match values, science separates observation/inference, history retains provenance, geography uses place/scale, computing preserves trace/debug decisions, and foundation subjects retain practical disciplinary activity
- for RE, confirm the locally applicable syllabus; for PSHE/Relationships, use fictional scenarios and school safeguarding routes

## 4. Print matrix

For all 19 formats, generate at least one physical preview in each valid paper/orientation combination. Across the matrix, exercise all seven print styles.

Confirm:

- Playwrite IT Moderna has loaded before print; fallback remains legible when font loading is deliberately blocked
- no measured overflow, hidden clipping, footer collision, label collision, orphan heading, split cut piece or type below the documented minimum
- A4 portrait, A4 landscape and A5 preserve physical aspect ratio in preview
- card count controls produce 4/6/8 pieces exactly
- vocabulary cards retain word, meaning/use spaces and a discreet teacher code
- desk strips/foldables show functional cut lines; irrelevant formats do not show cut/crop controls
- the booklet produces two imposed sides: outside pages 4–1 and inside pages 2–3, then folds correctly using short-edge duplex
- the intervention pack produces four intentional physical pages: Introduce, Use, Check, Reduce
- poster tiles have a clear order and align after trimming
- mixed packs keep one objective and comparable content without public support labels
- Greyscale, Pure black and white, High contrast and Ink saver rebuild borders/fills/hierarchy without colour-only meaning
- enlarged print reflows or blocks printing; it never shrinks type to fit

Print representative pages on colour inkjet, office laser and black-and-white photocopier where available.

## 5. Accessibility

Test current Chrome, Safari and iPad Safari with keyboard/touch and one screen reader used by the school.

- navigate every primary view and complete the scaffold workflow without a pointer
- verify tablists use arrow keys and expose one selected tab
- open each modal; focus enters, stays trapped, Escape closes and focus returns to the trigger
- open mobile navigation; focus moves inside and returns to the menu button when dismissed
- confirm every switch has an accessible name and current state
- inspect at 200% browser zoom and with large interface text
- enable reduced motion, increased contrast and forced colours
- verify visible focus on hidden checkbox/file-control wrappers
- confirm all touch targets are at least 44 × 44 CSS pixels on coarse pointers
- verify save/recovery status remains available to assistive technology on narrow screens
- confirm no instruction relies on hue, hover, drag or fine motor control alone

## 6. iPad and Pencil

Test portrait/landscape at full screen and Split View:

- rotate during every create step and while Print Studio is open
- use hardware and software keyboards; verify the active field is not hidden
- copy a prompt, switch to another app, paste, return and confirm the same resource/phase remains
- paste a long response and edit/select sections with touch
- annotate only through normal OS/browser mechanisms; Apple Pencil must not block scrolling or control activation
- close the tab/app after a save, reopen offline and confirm the shell and latest durable snapshot load
- install to the Home Screen and launch standalone
- copy/paste, print preview and system print must work without horizontal page scrolling

## 7. Persistence, interruption and multi-tab

- create 1,000, then 5,000 summary resources from a fixture; confirm search is debounced and no more than 60 cards initially render
- save different resources in two tabs; both must survive
- edit the same resource in two tabs; the second change must surface a conflict rather than overwrite silently
- interrupt autosave immediately, at 50 ms and after the 420 ms durable debounce; reload and confirm either the previous complete snapshot or new complete snapshot, never a hybrid
- deliberately corrupt one legacy localStorage record; confirm it is isolated, a recovery notice appears and valid resources remain visible
- force IndexedDB unavailable; confirm a persistent storage warning and working export path
- load image-heavy resources near quota; confirm failure remains visible and is not cleared by a later small successful write
- delete an archived resource, restore it from Recently deleted, then permanently purge only after explicit confirmation

## 8. Import, export and recovery

Round-trip and compare canonical checksums for:

- full backup with response history
- reduced-history backup
- selected-resource export
- single portable resource envelope
- Build 4 backup migrated to schema 5

For every import:

- validate before mutation and show envelope/schema/accepted/quarantined/warning counts
- test Merge and Replace separately
- confirm ID conflicts become copies during Merge
- confirm Replace creates a recovery checkpoint and either commits completely or changes nothing
- inject invalid enum/class values, remote image URLs, dangerous object keys, malformed dates and one corrupt resource; confirm safe normalisation/quarantine and no executable markup
- restore the pre-import checkpoint, then restore the automatically created pre-restore checkpoint

## 9. AI editorial journey

Run one Routine, Careful and Forensic task:

- prepare/copy the prompt and confirm autosave precedes the copy message
- verify no network request or fake generation occurs
- import messy markdown/JSON/commentary and preserve the raw response within the 65,000-character bound
- Accept/Edit/Reject individual items; rejected content must not enter verification or rebuilding
- clear the import, then use Restore previous import
- generate deliberate maths, quotation, science, inference, RE and PSHE failures; confirm restrained but actionable severity
- resolve a serious finding, re-run checks, complete the human approval gate and rebuild locally
- confirm the pupil print contains no AI/provenance/private review label
- repeat an enhancement round and confirm approved content, rejected changes, objective, protected thinking and stage pathway do not drift

## 10. Reflection and Library

- after classroom use, record what worked, surprise, observed misconception, support removed, remove next and next professional decision
- save two reflections; confirm history is retained rather than overwritten
- create a genuinely similar scaffold; confirm one relevant “Last time…” note surfaces
- create an unrelated subject/profile/barrier; confirm the note does not surface
- test review/source/status/favourite/archive filters and all sort orders
- verify batch review never bulk-approves unresolved high-risk content
- check Archive → Recently deleted → Restore and version history are easy to understand

## 11. Offline and security

- first load online, then disable the network and reload from the installed/static origin
- confirm every service-worker shell path is cached and old Scaffold Seeds caches are removed on activation
- inspect CSP: scripts/fonts/workers are same-origin, images are self/data/blob, connections and objects are blocked
- confirm no direct AI endpoint, analytics, account, API key or remote font/image request exists
- confirm imported markup remains text and restored images accept only bounded local PNG/JPEG/WebP data URLs

## 12. Release simulation and sign-off

Complete one uninterrupted lesson-planning simulation:

barrier analysis → scaffold generation → editing → growth pathway → optional AI enhancement → verification → approval → print preflight → save → version history → full export → clear with checkpoint → restore → canonical comparison.

Sign off only when:

- no important content can be lost silently
- every screen uses the same restrained visual and language system
- every printed page looks intentionally typeset for its purpose
- each subject retains its own disciplinary identity
- every support has a credible removal path
- changing or removing another workflow would probably make the product worse

Physical Safari, iPad Safari, screen-reader and printer checks must be recorded here before the release candidate is promoted to a final published release.

## Sign-off record

| Gate | Environment / equipment | Tester and date | Outcome / follow-up |
| --- | --- | --- | --- |
| Desktop browsers |  |  |  |
| iPad Safari and Pencil |  |  |  |
| Keyboard and screen reader |  |  |  |
| Colour printer |  |  |  |
| Black-and-white printer / photocopier |  |  |  |
| Final lesson-planning simulation |  |  |  |
