# Scaffold Seeds

Scaffold Seeds is a local-first classroom scaffold designer for primary teachers in England. It begins with one question: **Where are pupils getting stuck?**

The application reasons from year group, subject, curriculum area, learning objective and a teacher's observation. It then suggests likely barriers and recommends a scaffold structure designed to remove the barrier without lowering the challenge.

## Build 4 · AI enhancement and verification

Build 4 keeps Scaffold Seeds as the architect, editor, verifier and print engine. External generative AI is optional, provider-neutral and never contacted by the application.

- five-stage Design locally → Request narrowly → Return safely → Review changes → Verify and rebuild workflow
- 56 focused Generate, Adapt, Critique, Verify and Enrich tasks, with Quick, Professional and Forensic prompt depths
- task-specific studios for passages, questions, examples and non-examples, models, misconceptions, vocabulary and teacher modelling
- modular prompt construction using only relevant curriculum, barrier, protected-thinking, engine, growth, safeguard, print and return-format sections
- plain, compact, structured, image-brief, verification-only and complete AI Prompt Packet exports
- local privacy scrubber for possible names, initials, contact details, dates of birth, addresses, schools, diagnoses and sensitive histories
- raw-response preservation and recovery from structured text, markdown, tables, lists, valid or malformed JSON, commentary and unexpected sections
- item- and section-level Accept, Edit, Reject, Keep original, Compare, Manual mapping and Regenerate-section controls
- transparent comparison of original and proposed content, including reading-length change and accessible plain comparison
- structural, pedagogical, subject, language, inclusion, source and print verification with restrained Information, Review, Important and Do not use yet findings
- deterministic arithmetic, conversion and local-diagram checks where possible, plus cautious subject-pattern checks across all 13 subjects
- human approval gate, automatic pre-apply checkpoint, named enhancement rounds, provenance, source records and rejected-change history
- per-resource recovery workspaces, schema-v4 migration, full or reduced-history backup and portable resource export
- optional local image preparation with crop-to-fit, rotation, greyscale and sampled contrast, ink and print-size checks, plus a computing manual-trace tool; no image upload, facial recognition, API key, backend or provider account
- Home and Library review states that keep local scaffold creation primary and prevent bulk approval of unresolved high-risk content

## Build 3 · Scaffold engineering retained

- seven-stage Learning → Sticking point → Protect thinking → Choose support → Build → Review → Output workflow
- 78 functional scaffold engines across 13 English-primary subject areas
- modular local composition of instructions, examples, prompts, vocabulary, oral rehearsal, diagrams, response spaces, teacher guidance and fading rules
- live split-view Scaffold Designer with section-level local regeneration
- four genuinely different Seed, Sprout, Growth and Independent resources, side-by-side comparison and discreet mixed packs
- 18 reflowing classroom formats, including desk strips, cards, foldables, mini-booklets, modelling pages, intervention packs, home support and tiled posters
- Print Studio 3 with five ink modes, photocopy intelligence, crop and cut lines, duplex guidance, enlarged print and selected growth stages
- browser-native SVG diagrams with type-specific checks for scale, labels, sequence and structure
- 11-part professional quality audit using explainable judgements rather than effectiveness percentages
- mature local library with archive, restore, favourites, detailed filters, reflections, named checkpoints and version restore
- the original bounded AI prompt generator, now superseded by the Build 4 editorial exchange
- local settings, transparent preference adaptation, safe JSON backup and no named pupil profiles

The foundation-subject model follows the current England primary curriculum. Religious Education is explicitly treated as locally determined, while PSHE and Relationships resources are designed around safeguarding-sensitive neutral scenarios and the revised statutory guidance for September 2026.

## Build 2 foundation retained

- EYFS to Year 6 curriculum contexts for English, mathematics, science, history, geography and computing
- subject-specific curriculum brains organised around big ideas, threshold concepts, prerequisite knowledge, small steps, disciplinary thinking, misconceptions, vocabulary, representations, assessment and teacher decisions
- distinct lenses for reading, fluency, composition, grammar, spelling, oracy, editing and handwriting; mathematical structures and representation choice; scientific knowledge and enquiry; historical concepts; geographical place, scale and fieldwork; and computing logic, data, systems and debugging
- 12 scaffold families and 15 distinctive engines with explained recommendations and caution conditions
- live, non-interrupting design guidance as a teacher describes the learning barrier
- Seed, Sprout, Growth and Independent versions that can be switched instantly
- an eight-part quality dashboard covering curriculum alignment, barrier precision, challenge, independence, clarity, cognitive load, print quality and fade potential
- Knowledge Studio for professional subject browsing
- 10 classroom print formats including workpages, reusable cards, desk strips, paired discussion cards, posters and foldables
- after-use reflection that informs future recommendations on the same device
- local library, accessibility controls, JSON backup/restore and detailed external AI prompts without data transfer

## Architecture

- `data.js` — Build 2 curriculum and barrier knowledge
- `build3-data.js` — subject expansion, professional engine definitions, formats and AI task vocabulary
- `build4-data.js` — focused AI tasks, prompt depths, subject safeguards, return schemas and per-engine compatibility metadata
- `resource-engine.js` — local composition, stage fading, SVG diagrams, validation and quality judgements
- `verification-engine.js` — deterministic and rule-based structural, pedagogical, subject, language, inclusion, source and print checks
- `ai-companion.js` — prompt construction, privacy scrubbing, safe import parsing, comparison, section decisions, provenance and portable exports
- `app.js` — interface, workflow, versioned local persistence, library, approval, print production and exports
- `tests/build4-engine.test.js` — automated Build 4 prompt, import, privacy, acceptance and verification coverage
- `tests/BUILD4_TEST_PROTOCOL.md` — full browser, iPad, print, persistence and professional review protocol

## Run locally

No build tools or dependencies are required. Serve the repository as static files:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Privacy

There is no account, backend, analytics or external AI connection. Scaffold Seeds never sends a prompt or response anywhere. A prompt leaves the application only when a teacher copies or downloads it and then chooses to use another service. Imported responses, review decisions and source records are stored in the browser with `localStorage` and can be exported as JSON. Identifiable pupil information should never be included in an external AI prompt; the local scrubber is a review aid, not a guarantee.

## Test

Run the dependency-free automated suite:

```sh
node tests/build4-engine.test.js
```

Then use the manual protocol for Safari, iPad Safari, clipboard, accessibility and physical print checks.
