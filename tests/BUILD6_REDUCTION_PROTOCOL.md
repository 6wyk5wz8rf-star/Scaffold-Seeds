# Scaffold Seeds Build 6 · Product Reduction Protocol

## Release purpose

Build 6 changes the amount of interface, not the educational ambition. The Build 5 curriculum, 78 scaffold engines, four growth stages, 19 print formats, seven print styles, AI review boundary, schema-v5 persistence and recovery systems remain authoritative.

The canonical teacher path is now:

1. **Need** — select the learning context and describe where independent success stops.
2. **Support** — accept or adjust the locally recommended barrier and smallest useful support.
3. **Shape** — edit the generated essentials while seeing the pupil resource.
4. **Use** — save, print or make one optional AI contribution.

## Measured subtraction

| Surface | Build 5 | Build 6 |
|---|---:|---:|
| Permanent navigation destinations | 7 | 2 |
| Creation screens | 7 | 4 |
| Home dashboard panels | 7 | 2 |
| Library secondary filter controls | 8 | 4 |
| Settings groups | 6 | 4 |
| Designer groups open by default | 1 broad group with repeated actions | 1 essentials group |
| Print choice groups visible before intent | 5–7 | 1 format choice |

The removed Home panels, creation screens and top-level destinations were deleted from the rendering path. Print and AI were not concealed as alternative starting points: they were relocated to the only context in which they are meaningful—a completed scaffold. Curriculum reference and device preferences are classified as occasional and placed behind one clearly named utility disclosure.

## Feature classification

### Essential · retained and foregrounded

- observed sticking point
- curriculum context
- protected pupil thinking
- barrier recommendation
- scaffold engine recommendation
- live pupil preview
- growth stage
- local quality judgement
- save and print

### Valuable · retained and simplified

- alternative barriers and scaffold engines
- diagrams and access adjustments
- Library search, favourites and review state
- print formats and specialist print controls
- per-resource reflection and version checkpoints

### Occasional · moved deeper

- curriculum reference browser
- accessibility and starting defaults
- backup, recovery and deletion
- batch Library actions
- AI contribution workflow
- stage comparison

### Duplicated, decorative or historical · removed from the interface

- Home inspiration card
- Home favourite-engine panel
- Home AI statistics and task shortcuts
- generic daily reflection panel
- separate Learning and Sticking point screens
- separate Protect thinking and Choose support screens
- separate Review and Output screens
- designer regeneration shortcuts
- duplicate print-format selection in the designer
- visible instruction-language and density configuration during ordinary shaping
- permanent Knowledge, AI, Print and Settings navigation entries

## Three release audits

### Subtraction audit

- one dominant action per first-use surface
- no permanent destination without a frequent standalone teacher task
- no duplicate format choice between designer and Print
- no duplicate save/print outcome screen
- no dashboard metric that asks the teacher to manage the software

### Interaction audit

- Home answers where the teacher is and what to press next within one view
- the app selects a best-fit barrier and engine before asking for confirmation
- alternatives are explicit but visually secondary
- the Library leads with search and current/archive state
- Print leads with readiness and the final print action
- specialist options use native `details` or labelled controls and remain keyboard reachable

### Classroom audit

- a teacher can reach a printable resource through four decisions
- classroom pressure actions use direct language: Create, Save, Print and Open
- no external AI action is presented before the local scaffold is complete
- no AI content can bypass item review, verification and teacher approval
- protected thinking and the next support to remove remain visible

## Automated gates

Run:

```sh
node tests/build4-engine.test.js
node tests/build5-persistence.test.js
node tests/build5-release.test.js
node tests/build5-simulation.test.js
node tests/build5-static.test.js
node tests/build6-reduction.test.js
```

The Build 6 gate adds 42 interface-reduction assertions to the existing 106,402 pedagogical, curriculum, print, AI, persistence, offline and load assertions.

A DOM journey also exercises:

Home → Need → Support → Shape → Use → Save → Library → Print → Edit.

## Physical promotion checks

The following still require real hardware and must not be marked as automated:

- iPad Safari portrait and landscape
- iPad split view at common widths
- Apple Pencil selection and text editing
- VoiceOver order through utility disclosures, step progress, designer details and Print options
- physical A4/A5 print, booklet duplex and card cutting
- installed PWA relaunch after an offline restart

Build 6 is ready for those physical checks when all automated gates remain green and the working tree contains only the intended reduction paths.
