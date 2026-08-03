# Scaffold Seeds

Scaffold Seeds is a local-first classroom scaffold designer for primary teachers in England. It begins with one question: **Where are pupils getting stuck?**

The application reasons from year group, subject, curriculum area, learning objective and a teacher's observation. It then suggests likely barriers and recommends a scaffold structure designed to remove the barrier without lowering the challenge.

## Build 3 · Scaffold engineering

- seven-stage Learning → Sticking point → Protect thinking → Choose support → Build → Review → Output workflow
- 78 functional scaffold engines across 13 English-primary subject areas
- modular local composition of instructions, examples, prompts, vocabulary, oral rehearsal, diagrams, response spaces, teacher guidance and fading rules
- live split-view Scaffold Designer with section-level regeneration and controlled plain-text import
- four genuinely different Seed, Sprout, Growth and Independent resources, side-by-side comparison and discreet mixed packs
- 18 reflowing classroom formats, including desk strips, cards, foldables, mini-booklets, modelling pages, intervention packs, home support and tiled posters
- Print Studio 3 with five ink modes, photocopy intelligence, crop and cut lines, duplex guidance, enlarged print and selected growth stages
- browser-native SVG diagrams with type-specific checks for scale, labels, sequence and structure
- 11-part professional quality audit using explainable judgements rather than effectiveness percentages
- mature local library with archive, restore, favourites, detailed filters, reflections, named checkpoints and version restore
- bounded AI Companion tasks with subject-sensitive accuracy guardrails and editable compact or full prompts
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
- `resource-engine.js` — local composition, stage fading, SVG diagrams, validation and quality judgements
- `app.js` — interface, workflow, persistence, library, print production and exports

## Run locally

No build tools or dependencies are required. Serve the repository as static files:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Privacy

There is no account, backend, analytics or external AI connection. Scaffolds and settings are stored in the browser with `localStorage` and can be exported as JSON.
